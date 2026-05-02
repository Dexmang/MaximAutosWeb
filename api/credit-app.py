from http.server import BaseHTTPRequestHandler
import json
import os
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone

# Requires: cryptography (see requirements.txt)
from cryptography.fernet import Fernet


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


def _send_alert(data: dict, blob_url: str) -> None:
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
    <p><b>To fill DealerCenter automatically, run:</b></p>
    <pre>python db_tools/dc_credit_fill.py --url "{blob_url}"</pre>
    <p style="color:#888;font-size:12px">SSN and full data are encrypted. Not included in this email.</p>
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
    import sys
    try:
        with urllib.request.urlopen(req, timeout=8) as resp:
            print(f"RESEND_OK: {resp.status} {resp.read(200)}", file=sys.stderr)
    except urllib.error.HTTPError as e:
        print(f"RESEND_ERROR {e.code}: {e.read(500)}", file=sys.stderr)
    except Exception as e:
        print(f"RESEND_ERROR: {e}", file=sys.stderr)


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

            # Strip Formspree / honeypot fields
            for key in ("_subject", "_gotcha", "privacy_consent"):
                data.pop(key, None)

            # Encrypt and store
            ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
            blob_name = f"credit-app-{ts}.enc"
            encrypted = _encrypt(data)
            blob_url = _store_blob(encrypted, blob_name)

            # Alert Jerry (no SSN in email)
            _send_alert(data, blob_url)

            self.send_response(200)
            self._cors()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"ok": True}).encode())

        except Exception as e:
            self.send_response(500)
            self._cors()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"ok": False, "error": str(e)}).encode())

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "https://www.maximautos.com")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def log_message(self, fmt, *args):
        pass
