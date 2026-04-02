"""
Google OAuth helper.

Usage:
    python tools/google_auth.py

Run once to create token.json. After that, other tools import `get_credentials()`
to get a valid, auto-refreshed credential object.

Scopes needed by this project — extend as required:
    https://www.googleapis.com/auth/spreadsheets
    https://www.googleapis.com/auth/presentations
    https://www.googleapis.com/auth/drive
"""
import sys
from pathlib import Path

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow

ROOT = Path(__file__).resolve().parent.parent
CREDENTIALS_FILE = ROOT / "credentials.json"
TOKEN_FILE = ROOT / "token.json"

SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/presentations",
    "https://www.googleapis.com/auth/drive",
]


def get_credentials() -> Credentials:
    """Return valid Google credentials, refreshing or re-authorizing as needed."""
    creds = None

    if TOKEN_FILE.exists():
        creds = Credentials.from_authorized_user_file(str(TOKEN_FILE), SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not CREDENTIALS_FILE.exists():
                print(f"[ERROR] credentials.json not found at {CREDENTIALS_FILE}")
                print("        Download it from Google Cloud Console → APIs & Services → Credentials")
                sys.exit(1)
            flow = InstalledAppFlow.from_client_secrets_file(str(CREDENTIALS_FILE), SCOPES)
            creds = flow.run_local_server(port=0)

        TOKEN_FILE.write_text(creds.to_json())
        print(f"[OK] Token saved to {TOKEN_FILE}")

    return creds


if __name__ == "__main__":
    get_credentials()
    print("[OK] Google authentication successful.")
