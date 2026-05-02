from http.server import BaseHTTPRequestHandler
import hashlib
import hmac
import json
import os
import urllib.parse
import urllib.request

from cryptography.fernet import Fernet


def _verify_sig(blob_url: str, sig: str) -> bool:
    key = os.environ["CREDIT_APP_KEY"].encode()
    expected = hmac.new(key, blob_url.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, sig)


def _fetch_and_decrypt(blob_url: str) -> dict:
    token = os.environ.get("BLOB_READ_WRITE_TOKEN", "")
    req = urllib.request.Request(
        blob_url,
        headers={"Authorization": f"Bearer {token}"} if token else {},
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        raw = resp.read()
    key = os.environ["CREDIT_APP_KEY"].encode()
    return json.loads(Fernet(key).decrypt(raw))


def _row(label: str, value) -> str:
    v = value if value not in (None, "", "None") else "<span style='color:#bbb'>—</span>"
    return f"<tr><td style='color:#666;padding:6px 12px 6px 0;white-space:nowrap'>{label}</td><td style='padding:6px 0'><b>{v}</b></td></tr>"


def _section(title: str) -> str:
    return f"<tr><td colspan='2' style='padding:18px 0 6px;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#0a2540;border-bottom:2px solid #0a2540'>{title}</td></tr>"


def _render(data: dict) -> str:
    ssn = data.get("buyer_ssn", "")
    if ssn and len(ssn.replace("-", "")) == 9:
        s = ssn.replace("-", "")
        ssn = f"{s[:3]}-{s[3:5]}-{s[5:]}"

    refs = []
    for i in (1, 2, 3):
        n = data.get(f"ref{i}_name", "")
        if n:
            refs.append(f"{n} — {data.get(f'ref{i}_phone','')} ({data.get(f'ref{i}_relationship','')})")

    rows = [
        _section("Buyer — Personal"),
        _row("First Name", data.get("buyer_first_name")),
        _row("Last Name", data.get("buyer_last_name")),
        _row("Email", data.get("buyer_email")),
        _row("Cell Phone", data.get("buyer_cell_phone")),
        _row("Home Phone", data.get("buyer_home_phone")),
        _row("Date of Birth", data.get("buyer_dob")),
        _row("SSN", ssn or data.get("buyer_ssn")),
        _row("DL Number", data.get("buyer_dl_number")),
        _row("DL State", data.get("buyer_dl_state")),

        _section("Buyer — Address"),
        _row("Address", data.get("buyer_address")),
        _row("City", data.get("buyer_city")),
        _row("State", data.get("buyer_state")),
        _row("ZIP", data.get("buyer_zip")),
        _row("Housing Type", data.get("buyer_housing_type")),
        _row("Monthly Housing", data.get("buyer_monthly_housing")),
        _row("Years at Address", data.get("buyer_years_address")),
        _row("Months at Address", data.get("buyer_months_address")),
        _row("Prev Address", data.get("buyer_prev_address")),
        _row("Prev City", data.get("buyer_prev_city")),
        _row("Prev State", data.get("buyer_prev_state")),
        _row("Prev ZIP", data.get("buyer_prev_zip")),

        _section("Buyer — Employment"),
        _row("Status", data.get("buyer_employment_status")),
        _row("Employer", data.get("buyer_employer")),
        _row("Title", data.get("buyer_title")),
        _row("Employer Phone", data.get("buyer_employer_phone")),
        _row("Monthly Income", data.get("buyer_monthly_income")),
        _row("Years at Job", data.get("buyer_years_job")),
        _row("Months at Job", data.get("buyer_months_job")),
        _row("Prev Employer", data.get("buyer_prev_employer")),
        _row("Prev Title", data.get("buyer_prev_title")),
    ]

    has_cobuyer = any(data.get(k) for k in ("cobuyer_first_name", "cobuyer_last_name"))
    if has_cobuyer:
        rows += [
            _section("Co-Buyer"),
            _row("First Name", data.get("cobuyer_first_name")),
            _row("Last Name", data.get("cobuyer_last_name")),
            _row("Cell Phone", data.get("cobuyer_cell_phone")),
            _row("Date of Birth", data.get("cobuyer_dob")),
            _row("Employer", data.get("cobuyer_employer")),
            _row("Monthly Income", data.get("cobuyer_monthly_income")),
        ]

    rows += [
        _section("Vehicle of Interest"),
        _row("Stock #", data.get("vehicle_stock")),
        _row("Year", data.get("vehicle_year")),
        _row("Make", data.get("vehicle_make")),
        _row("Model", data.get("vehicle_model")),
        _row("Price", data.get("vehicle_price")),
        _row("Down Payment", data.get("vehicle_down_payment")),
    ]

    has_trade = any(data.get(k) for k in ("trade_make", "trade_model"))
    if has_trade:
        rows += [
            _section("Trade-In"),
            _row("Year", data.get("trade_year")),
            _row("Make", data.get("trade_make")),
            _row("Model", data.get("trade_model")),
            _row("Mileage", data.get("trade_mileage")),
            _row("VIN", data.get("trade_vin")),
            _row("Payoff", data.get("trade_payoff")),
        ]

    if refs:
        rows.append(_section("References"))
        for r in refs:
            rows.append(_row("", r))

    name = f"{data.get('buyer_first_name','')} {data.get('buyer_last_name','')}".strip()

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Credit App — {name}</title>
<style>
  body{{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;margin:0;background:#f4f6f9;color:#1a1a2e}}
  .wrap{{max-width:680px;margin:32px auto;background:#fff;border-radius:8px;box-shadow:0 2px 12px rgba(0,0,0,.08);overflow:hidden}}
  .hdr{{background:#0a2540;color:#fff;padding:24px 32px}}
  .hdr h1{{margin:0;font-size:20px;font-weight:700}}
  .hdr p{{margin:4px 0 0;font-size:14px;opacity:.7}}
  .body{{padding:24px 32px 32px}}
  table{{width:100%;border-collapse:collapse;font-size:15px}}
  @media(max-width:480px){{.wrap{{margin:0}}.hdr,.body{{padding:20px}}}}
</style>
</head>
<body>
<div class="wrap">
  <div class="hdr">
    <h1>Credit Application</h1>
    <p>{name}</p>
  </div>
  <div class="body">
    <table>{''.join(rows)}</table>
  </div>
</div>
</body>
</html>"""


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        qs = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        blob_url = qs.get("blob", [""])[0]
        sig = qs.get("sig", [""])[0]

        if not blob_url or not sig or not _verify_sig(blob_url, sig):
            self.send_response(403)
            self.send_header("Content-Type", "text/plain")
            self.end_headers()
            self.wfile.write(b"Forbidden")
            return

        try:
            data = _fetch_and_decrypt(blob_url)
            html = _render(data)
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(html.encode())
        except Exception as e:
            self.send_response(500)
            self.send_header("Content-Type", "text/plain")
            self.end_headers()
            self.wfile.write(str(e).encode())

    def log_message(self, fmt, *args):
        pass
