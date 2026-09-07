from http.server import BaseHTTPRequestHandler
import hashlib
import hmac
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone

# Requires: cryptography (see requirements.txt)
from cryptography.fernet import Fernet

# ---------------------------------------------------------------------------
# Bot screening
#
# 2026-09-07: seven junk applications reached the alert inbox between Aug 15 and
# Sep 7 because the honeypot field was stripped instead of checked, and nothing
# else stood between a scripted POST and the email. All seven shared one
# fingerprint: consonant-soup names, a random mixed-case employer string, a two
# digit monthly income, and a Gmail local part packed with dots. The gates
# below turn that fingerprint into a silent drop, log the reason with IP and
# user agent, and return the same body a real submission gets so the bot has
# nothing to adapt to. A human who mistypes a phone or email gets a 400 with a
# message the form shows, so a real lead is never lost silently.
# ---------------------------------------------------------------------------

ALLOWED_ORIGINS = {"https://www.maximautos.com", "https://maximautos.com"}
MIN_FILL_MS = 5000          # nobody completes a lender grade credit app in five seconds
SPAM_SCORE_DROP = 2         # soft signals needed before a submission is dropped

# Browser equivalent check: HTML5 type=email accepts "name@host" without a TLD,
# and a real applicant once submitted exactly that. Do not be stricter than the form.
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+$")

REJECT_MESSAGES = {
    "en": {
        "missing_name": "Please enter your first and last name.",
        "bad_phone": "Please enter a valid 10 digit cell phone number.",
        "bad_email": "Please enter a valid email address.",
    },
    "es": {
        "missing_name": "Por favor ingrese su nombre y apellido.",
        "bad_phone": "Por favor ingrese un numero de celular valido de 10 digitos.",
        "bad_email": "Por favor ingrese un correo electronico valido.",
    },
}


def _digits(value) -> str:
    return re.sub(r"\D", "", str(value or ""))


def _valid_phone(value) -> bool:
    d = _digits(value)
    if len(d) == 11 and d[0] == "1":
        d = d[1:]
    return len(d) == 10 and d[0] in "23456789" and d[3] in "23456789"


def _valid_email(value) -> bool:
    return bool(EMAIL_RE.match(str(value or "").strip()))


def _case_flips(word: str) -> int:
    letters = [c for c in word if c.isalpha()]
    return sum(1 for a, b in zip(letters, letters[1:]) if a.isupper() != b.isupper())


def _looks_random(text) -> bool:
    """True for strings like 'wKAeFyEnaAhHBJBkUafl': one long word whose case flips every letter or two."""
    for word in str(text or "").split():
        if len(word) >= 10 and _case_flips(word) >= 5:
            return True
    return False


def _no_vowels(text) -> bool:
    s = str(text or "").strip()
    return len(s) >= 6 and not re.search(r"[aeiouAEIOU]", s)


def _fill_ms(data: dict) -> int:
    try:
        return int(float(data.get("_t", 0) or 0))
    except (TypeError, ValueError):
        return 0


def _allowed_origin(origin: str) -> bool:
    if origin in ALLOWED_ORIGINS:
        return True
    return origin.startswith("https://") and origin.endswith(".vercel.app")


def _screen(data: dict, headers: dict):
    """Return (verdict, reasons).

    verdict: 'pass'   store, alert, 200
             'drop'   silent 200, nothing stored (bot fingerprint)
             'reject' 400 with a message the form shows (human typo)
    """
    reasons = []
    hard = False

    if str(data.get("_gotcha", "") or "").strip():
        reasons.append("honeypot_filled")
        hard = True
    if str(data.get("_js", "") or "") != "1":
        reasons.append("no_js_token")
        hard = True
    fill_ms = _fill_ms(data)
    if fill_ms < MIN_FILL_MS:
        reasons.append(f"filled_in_{fill_ms}ms")
        hard = True

    origin = str(headers.get("origin", "") or "")
    if origin and not _allowed_origin(origin):
        reasons.append(f"bad_origin:{origin[:60]}")
        hard = True

    if hard:
        return "drop", reasons

    first = str(data.get("buyer_first_name", "") or "").strip()
    last = str(data.get("buyer_last_name", "") or "").strip()
    if not first or not last:
        return "reject", ["missing_name"]
    if not _valid_phone(data.get("buyer_cell_phone")):
        return "reject", ["bad_phone"]
    if not _valid_email(data.get("buyer_email")):
        return "reject", ["bad_email"]

    # Soft signals. Each one matches the Aug/Sep bot; none alone condemns a human.
    score = 0
    if not origin:
        score += 1
        reasons.append("no_origin")
    if _no_vowels(first) or _no_vowels(last):
        score += 1
        reasons.append("name_no_vowels")
    if _looks_random(data.get("buyer_employer")):
        score += 1
        reasons.append("employer_random_case")
    local = str(data.get("buyer_email", "") or "").split("@")[0]
    if local.count(".") >= 3:
        score += 1
        reasons.append("email_dotted")
    income = _digits(data.get("buyer_monthly_income"))
    if income and 0 < int(income) < 200:
        score += 1
        reasons.append("income_under_200")

    if score >= SPAM_SCORE_DROP:
        return "drop", reasons
    return "pass", reasons


# ---------------------------------------------------------------------------
# Storage and alert
# ---------------------------------------------------------------------------

def _make_view_url(blob_url: str) -> str:
    key = os.environ["CREDIT_APP_KEY"].encode()
    sig = hmac.new(key, blob_url.encode(), hashlib.sha256).hexdigest()
    params = urllib.parse.urlencode({"blob": blob_url, "sig": sig})
    return f"https://www.maximautos.com/api/credit-app-view?{params}"


def _encrypt(data: dict) -> bytes:
    key = os.environ["CREDIT_APP_KEY"].encode()
    f = Fernet(key)
    return f.encrypt(json.dumps(data).encode())


def _store_blob(encrypted: bytes, blob_name: str) -> str:
    token = os.environ["BLOB_READ_WRITE_TOKEN"]
    req = urllib.request.Request(
        f"https://blob.vercel-storage.com/{blob_name}",
        data=encrypted,
        method="PUT",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/octet-stream",
            "x-api-version": "7",
            "x-vercel-blob-access": "private",
        },
    )
    with urllib.request.urlopen(req) as resp:
        result = json.loads(resp.read())
    return result.get("url", blob_name)


def _send_alert(data: dict, blob_url: str, view_url: str) -> None:
    api_key = os.environ.get("RESEND_API_KEY", "")
    if not api_key:
        return

    name = f"{data.get('buyer_first_name', '')} {data.get('buyer_last_name', '')}".strip()
    phone = data.get("buyer_cell_phone", "N/A")
    email = data.get("buyer_email", "N/A")
    employer = data.get("buyer_employer", "N/A")
    income = data.get("buyer_monthly_income", "N/A")

    html = f"""
    <h2 style="color:#0a2540">New Credit Application — Maxim Autos</h2>
    <table>
      <tr><td><b>Name</b></td><td>{name}</td></tr>
      <tr><td><b>Phone</b></td><td>{phone}</td></tr>
      <tr><td><b>Email</b></td><td>{email}</td></tr>
      <tr><td><b>Employer</b></td><td>{employer}</td></tr>
      <tr><td><b>Monthly Income</b></td><td>${income}</td></tr>
    </table>
    <br>
    <p>
      <a href="{view_url}" style="display:inline-block;background:#0a2540;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:700;font-size:15px">
        View Full Application
      </a>
    </p>
    <br>
    <p><b>To fill DealerCenter automatically, run:</b></p>
    <pre>python db_tools/dc_credit_fill.py --url "{blob_url}"</pre>
    """

    payload = json.dumps(
        {
            "from": "Maxim Autos <onboarding@resend.dev>",
            "to": ["frostjay1@gmail.com"],
            "subject": f"New Credit App — {name} — {phone}",
            "html": html,
        }
    ).encode()

    req = urllib.request.Request(
        "https://api.resend.com/emails",
        data=payload,
        method="POST",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "User-Agent": "MaximAutos/1.0",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=8) as resp:
            print(f"RESEND_OK: {resp.status} {resp.read(200)}", file=sys.stderr)
    except urllib.error.HTTPError as e:
        print(f"RESEND_ERROR {e.code}: {e.read(500)}", file=sys.stderr)
    except Exception as e:
        print(f"RESEND_ERROR: {e}", file=sys.stderr)


# ---------------------------------------------------------------------------
# Handler
# ---------------------------------------------------------------------------

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self._cors()
        self.end_headers()

    def do_POST(self):
        try:
            length = int(self.headers.get("Content-Length", 0))
            raw = self.rfile.read(length).decode("utf-8")

            ct = self.headers.get("Content-Type", "")
            if "application/json" in ct:
                data = json.loads(raw)
            else:
                parsed = urllib.parse.parse_qs(raw, keep_blank_values=True)
                data = {k: v[0] for k, v in parsed.items()}
            if not isinstance(data, dict):
                data = {}

            headers = {k.lower(): v for k, v in self.headers.items()}
            ip = (headers.get("x-forwarded-for", "") or headers.get("x-real-ip", "") or "").split(",")[0].strip()
            ua = (headers.get("user-agent", "") or "")[:200]
            lang = "es" if "/es/" in (headers.get("referer", "") or "") else "en"

            verdict, reasons = _screen(data, headers)

            who = f"{data.get('buyer_first_name', '')} {data.get('buyer_last_name', '')}".strip()
            print(
                "CREDIT_APP_" + verdict.upper() + " " + json.dumps({
                    "reasons": reasons,
                    "ip": ip,
                    "ua": ua,
                    "name": who[:60],
                    "email": str(data.get("buyer_email", "") or "")[:80],
                }),
                file=sys.stderr,
            )

            if verdict == "reject":
                self._respond(400, {"ok": False, "error": REJECT_MESSAGES[lang][reasons[0]]}, verdict)
                return
            if verdict == "drop":
                # Same body a real submission gets, so a bot learns nothing. The header is for our own checks.
                self._respond(200, {"ok": True}, verdict)
                return

            fill_ms = _fill_ms(data)
            for key in ("_subject", "_gotcha", "privacy_consent", "_js", "_t"):
                data.pop(key, None)
            data["_meta"] = {
                "submitted_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                "ip": ip,
                "ua": ua,
                "origin": headers.get("origin", ""),
                "fill_ms": fill_ms,
                "screen": reasons,
            }

            ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
            blob_name = f"credit-app-{ts}.enc"
            encrypted = _encrypt(data)
            blob_url = _store_blob(encrypted, blob_name)

            view_url = _make_view_url(blob_url)
            _send_alert(data, blob_url, view_url)

            self._respond(200, {"ok": True}, verdict)

        except Exception as e:
            self._respond(500, {"ok": False, "error": str(e)}, "error")

    def _respond(self, status: int, body: dict, verdict: str):
        self.send_response(status)
        self._cors()
        self.send_header("Content-Type", "application/json")
        self.send_header("X-Maxim-Filter", verdict)
        self.end_headers()
        self.wfile.write(json.dumps(body).encode())

    def _cors(self):
        origin = self.headers.get("Origin", "") or ""
        allow = origin if _allowed_origin(origin) else "https://www.maximautos.com"
        self.send_header("Access-Control-Allow-Origin", allow)
        self.send_header("Vary", "Origin")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def log_message(self, fmt, *args):
        pass
