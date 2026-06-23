"""Shared Django settings for the PsychoSim (SIEP) backend.

The PostgreSQL schema is owned by Flyway (Spring side). Every domain model maps
to an existing table with ``managed = False`` so Django never mutates the schema.
"""
import os
from datetime import timedelta
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent

SECRET_KEY = os.environ.get(
    "DJANGO_SECRET_KEY", "django-insecure-change-in-production"
)

INSTALLED_APPS = [
    # auth + contenttypes are required by djangorestframework-simplejwt (it
    # imports django.contrib.auth.models at load time). Our user model is custom
    # (managed=False, no PermissionsMixin); these apps only add Django's small
    # housekeeping tables (content_type/permission) — additive and ignored by
    # Spring. The running server never auto-creates tables (only migrate does).
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "rest_framework",
    "rest_framework_simplejwt",
    "corsheaders",
    "drf_spectacular",
    "apps.users",
    "apps.grupos",
    "apps.simulation",
    "apps.reportes",
    "apps.progression",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    # WhiteNoise sirve los estáticos del SPA (Angular) y del backend en
    # producción sin necesidad de un servidor web aparte.
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    # Binds the request to a thread-local for audit-trail actor/IP capture.
    "apps.simulation.middleware.AuditContextMiddleware",
]

ROOT_URLCONF = "psychosim.urls"
WSGI_APPLICATION = "psychosim.wsgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {"context_processors": []},
    }
]
AUTH_USER_MODEL = "users.CustomUser"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# En Railway (y otros PaaS) la base de datos se inyecta como DATABASE_URL.
# Si existe, se usa; si no, se arma con las variables DB_* (desarrollo local).
_DATABASE_URL = os.environ.get("DATABASE_URL")
if _DATABASE_URL:
    import dj_database_url

    DATABASES = {
        "default": dj_database_url.parse(_DATABASE_URL, conn_max_age=600),
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": os.environ.get("DB_NAME", "psychosim"),
            "USER": os.environ.get("DB_USER", "psychosim"),
            "PASSWORD": os.environ.get("DB_PASSWORD", "psychosim_secret"),
            "HOST": os.environ.get("DB_HOST", "localhost"),
            "PORT": os.environ.get("DB_PORT", "5433"),
        }
    }

# Spring uses BCrypt ($2a/$2b). Keep BCrypt first so newly created users are
# written in a format Spring can also verify; CustomUser.check_password also
# handles raw BCrypt hashes already present in the Flyway-seeded ``users`` table.
PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.BCryptSHA256PasswordHasher",
    "django.contrib.auth.hashers.BCryptPasswordHasher",
    "django.contrib.auth.hashers.PBKDF2PasswordHasher",
]

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "EXCEPTION_HANDLER": "shared.exceptions.custom_exception_handler",
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(
        hours=int(os.environ.get("JWT_EXPIRATION_HOURS", "8"))
    ),
    "TOKEN_OBTAIN_SERIALIZER": "apps.users.serializers.PsychoSimTokenObtainSerializer",
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "userId",
}

# Reflection-at-rest encryption key (defaults to the JWT secret, like Spring's
# simulation.reflection.encryption-key:${jwt.secret}).
JWT_SECRET = os.environ.get(
    "JWT_SECRET",
    "psychosim-jwt-secret-key-must-be-at-least-256-bits-long-for-hs256",
)
REFLECTION_ENCRYPTION_KEY = os.environ.get("REFLECTION_ENCRYPTION_KEY", JWT_SECRET)
GOOGLE_OAUTH_CLIENT_ID = os.environ.get("GOOGLE_OAUTH_CLIENT_ID", "").strip()
AI_ASSISTANT_PROVIDER = os.environ.get("AI_ASSISTANT_PROVIDER", "openai").strip()
AI_ASSISTANT_API_KEY = os.environ.get("AI_ASSISTANT_API_KEY", "").strip()
AI_ASSISTANT_MODEL = os.environ.get("AI_ASSISTANT_MODEL", "gpt-4o-mini").strip()

ACCESS_REQUEST_NOTIFY_EMAILS = [
    email.strip()
    for email in os.environ.get(
        "ACCESS_REQUEST_NOTIFY_EMAILS",
        "admin@psychosim.edu.co,secretariapsicologia@cue.edu.co",
    ).split(",")
    if email.strip()
]
EMAIL_BACKEND = os.environ.get(
    "EMAIL_BACKEND",
    "django.core.mail.backends.console.EmailBackend",
)
DEFAULT_FROM_EMAIL = os.environ.get("DEFAULT_FROM_EMAIL", "siep@psychosim.edu.co")

SPECTACULAR_SETTINGS = {
    "TITLE": "PsychoSim / SIEP API",
    "DESCRIPTION": "Backend Django para el simulador SIEP (contrato idéntico a Spring).",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
}

LANGUAGE_CODE = "es"
TIME_ZONE = "America/Bogota"
USE_I18N = True
# Spring uses LocalDateTime and the columns are "timestamp without time zone";
# keep datetimes naive so the JSON contract matches Spring exactly.
USE_TZ = False

# ── Archivos estáticos / SPA (Angular) servidos por WhiteNoise ───────────────
# Los estáticos propios de Django (p. ej. swagger) se recogen en STATIC_ROOT.
STATIC_URL = "/django-static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

# El build de Angular se copia a backend_django/frontend_dist en el contenedor.
# Si existe, WhiteNoise lo sirve en la raíz (index.html incluido); las rutas del
# SPA que no son archivos caen en el catch-all de urls.py.
SPA_DIST_DIR = BASE_DIR / "frontend_dist"
if SPA_DIST_DIR.exists():
    WHITENOISE_ROOT = str(SPA_DIST_DIR)
    WHITENOISE_INDEX_FILE = True
