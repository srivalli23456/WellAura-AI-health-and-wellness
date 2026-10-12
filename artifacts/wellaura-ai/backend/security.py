import base64
import hashlib
import json
import os
from typing import Any

from cryptography.fernet import Fernet, InvalidToken


def _build_cipher() -> Fernet:
    secret = os.environ.get("SESSION_SECRET")
    if not secret or len(secret) < 32:
        raise RuntimeError("SESSION_SECRET must be configured for encrypted wellness storage.")
    key_material = hashlib.sha256(
        b"wellaura-health-records-v1:" + secret.encode("utf-8")
    ).digest()
    return Fernet(base64.urlsafe_b64encode(key_material))


_cipher = _build_cipher()


def encrypt_payload(payload: dict[str, Any]) -> str:
    raw = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    return _cipher.encrypt(raw).decode("ascii")


def decrypt_payload(token: str) -> dict[str, Any]:
    try:
        raw = _cipher.decrypt(token.encode("ascii"))
        value = json.loads(raw)
    except (InvalidToken, UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise RuntimeError("Stored wellness data could not be decrypted.") from exc
    if not isinstance(value, dict):
        raise RuntimeError("Stored wellness data has an invalid format.")
    return value
