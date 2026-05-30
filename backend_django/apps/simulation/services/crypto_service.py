"""AES-GCM reflection encryption — byte-compatible with Spring's
ReflectionCryptoService (AES/GCM/NoPadding, 12-byte IV prepended, 128-bit tag,
key = SHA-256(secret)[:32], standard Base64)."""
import base64
import hashlib
import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from django.conf import settings

_IV_BYTES = 12
_KEY_REF = "local-aes-gcm-v1"


def _key():
    secret = settings.REFLECTION_ENCRYPTION_KEY.encode("utf-8")
    return hashlib.sha256(secret).digest()[:32]


def encrypt(plain_text: str) -> str:
    iv = os.urandom(_IV_BYTES)
    # AESGCM.encrypt returns ciphertext || 16-byte tag (same layout as Java GCM).
    ct = AESGCM(_key()).encrypt(iv, plain_text.encode("utf-8"), None)
    return base64.b64encode(iv + ct).decode("ascii")


def decrypt(encrypted_text: str) -> str:
    payload = base64.b64decode(encrypted_text)
    iv, ct = payload[:_IV_BYTES], payload[_IV_BYTES:]
    return AESGCM(_key()).decrypt(iv, ct, None).decode("utf-8")


def key_ref() -> str:
    return _KEY_REF
