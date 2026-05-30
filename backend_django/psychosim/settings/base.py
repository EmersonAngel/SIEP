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
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "rest_framework",
    "rest_framework_simplejwt",
    "corsheaders",
    "drf_spectacular",
    "apps.users",
    "apps.casos",
    "apps.grupos",
    "apps.sesiones",
    "apps.simulation",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
]

ROOT_URLCONF = "psychosim.urls"
WSGI_APPLICATION = "psychosim.wsgi.application"
AUTH_USER_MODEL = "users.CustomUser"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

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
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(
        hours=int(os.environ.get("JWT_EXPIRATION_HOURS", "8"))
    ),
    "TOKEN_OBTAIN_SERIALIZER": "apps.users.serializers.PsychoSimTokenObtainSerializer",
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "userId",
}

SPECTACULAR_SETTINGS = {
    "TITLE": "PsychoSim / SIEP API",
    "DESCRIPTION": "Backend Django para el simulador SIEP (contrato idéntico a Spring).",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
}

LANGUAGE_CODE = "es"
TIME_ZONE = "America/Bogota"
USE_I18N = True
USE_TZ = True
