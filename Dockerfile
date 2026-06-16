# SIEP — imagen única para Railway: build de Angular + backend Django (gunicorn).
# El backend Django sirve la API en /api y el SPA de Angular en el resto de rutas
# (WhiteNoise para los estáticos), así todo vive en un solo dominio sin CORS.

# ---------- Stage 1: build del frontend (Angular) ----------
FROM node:20-alpine AS frontend
WORKDIR /fe
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---------- Stage 2: backend (Django + gunicorn) ----------
FROM python:3.13-slim AS backend
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    DJANGO_SETTINGS_MODULE=psychosim.settings.production
WORKDIR /app

COPY backend_django/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend_django/ ./
# El build de Angular (carpeta browser/) se copia a frontend_dist para WhiteNoise.
COPY --from=frontend /fe/dist/psychosim-admin-panel/browser ./frontend_dist

EXPOSE 8000
# Railway inyecta $PORT. Gunicorn sirve la app WSGI de Django.
CMD ["sh", "-c", "gunicorn psychosim.wsgi:application --bind 0.0.0.0:${PORT:-8000} --workers 3 --timeout 120"]
