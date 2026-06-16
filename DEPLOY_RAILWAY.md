# Despliegue de SIEP en Railway

Esta guía despliega **todo en un solo servicio**: el backend Django (gunicorn)
sirve la API en `/api/...` y también el frontend Angular (el resto de rutas), más
una base de datos **PostgreSQL**. Como todo vive en un mismo dominio, no hay CORS
ni proxys que configurar.

> **Importante sobre la base de datos.** El esquema de tablas originalmente lo
> creaba Flyway (el backend Spring antiguo, que ya no se despliega). Por eso el
> repo incluye un volcado completo en [`deploy/db_seed.sql`](deploy/db_seed.sql)
> (esquema + datos + usuarios demo + caso `SIM-VBG-001`). En Railway **se restaura
> ese volcado** sobre el Postgres nuevo. No uses `migrate` desde cero: muchas
> tablas son `managed=False` y Django no las crea.

---

## 0. Requisitos previos

- Cuenta en https://railway.app (el plan gratuito/Trial sirve).
- El código subido a GitHub (rama actual: `codex/actualizacion-completa-simulador`).
- Opcional (recomendado): [Railway CLI](https://docs.railway.com/guides/cli)
  `npm i -g @railway/cli` y `railway login`.

Artefactos que ya dejé listos en el repo:
- `Dockerfile` (raíz): build de Angular + backend Django con gunicorn.
- `railway.json`: le dice a Railway que use el Dockerfile.
- `backend_django/psychosim/settings/production.py`: settings de producción.
- `deploy/db_seed.sql`: volcado de la BD para restaurar.

---

## 1. Crear el proyecto y la base de datos

1. Entra a Railway → **New Project**.
2. Elige **Deploy PostgreSQL** (o **+ New → Database → PostgreSQL**).
   Railway crea el servicio Postgres y expone la variable `DATABASE_URL`.

## 2. Añadir el servicio del backend (app)

1. En el mismo proyecto: **+ New → GitHub Repo** y selecciona este repositorio.
2. Railway detecta el `Dockerfile` de la raíz y lo usará para construir.
   - Si te pregunta el *Root Directory*, déjalo en la raíz del repo (`/`).
3. En el servicio de la app, pestaña **Variables**, agrega:

   | Variable | Valor |
   |---|---|
   | `DJANGO_SETTINGS_MODULE` | `psychosim.settings.production` |
   | `DJANGO_SECRET_KEY` | una cadena larga y aleatoria |
   | `JWT_SECRET` | otra cadena larga (≥ 32 caracteres) |
   | `DJANGO_ALLOWED_HOSTS` | el dominio que te dé Railway, p. ej. `siep-production.up.railway.app` |
   | `DATABASE_URL` | **referencia** a la del Postgres (ver abajo) |

   Para `DATABASE_URL`: usa **Add Reference → Postgres → DATABASE_URL** (así queda
   enlazada automáticamente). Alternativamente pega el valor de
   `DATABASE_URL` que aparece en el servicio Postgres.

   > Genera secretos seguros, por ejemplo en tu terminal:
   > `python -c "import secrets; print(secrets.token_urlsafe(48))"`

4. (Opcional) Variables extra ya soportadas: `JWT_EXPIRATION_HOURS` (default 8),
   `GOOGLE_OAUTH_CLIENT_ID`, `DEFAULT_FROM_EMAIL`, `CORS_ALLOWED_ORIGINS`
   (solo si algún día sirves el frontend en otro dominio).

## 3. Generar el dominio público

1. En el servicio de la app → **Settings → Networking → Generate Domain**.
2. Copia el dominio (p. ej. `siep-production.up.railway.app`) y confirma que está
   en `DJANGO_ALLOWED_HOSTS` (paso 2.3). Si lo cambias, la app se redepliega.

## 4. Restaurar la base de datos (una sola vez)

Con el Postgres ya creado, carga el esquema + datos del volcado.

**Opción A — Railway CLI (recomendada):**
```bash
railway login
railway link            # elige el proyecto
# Conéctate a la BD y restaura el volcado:
railway connect Postgres   # abre psql contra el Postgres del proyecto
# (dentro de psql)  \i deploy/db_seed.sql       ← si corres desde la raíz del repo
```
o, sin entrar a psql interactivo:
```bash
railway run -s Postgres bash -c 'psql "$DATABASE_URL" -f deploy/db_seed.sql'
```

**Opción B — psql local apuntando a Railway:**
1. En el servicio Postgres → **Variables**, copia `DATABASE_PUBLIC_URL`
   (la URL pública, no la interna).
2. En tu PC (con `psql` instalado):
   ```bash
   psql "PEGA_AQUI_DATABASE_PUBLIC_URL" -f deploy/db_seed.sql
   ```

El volcado usa `DROP ... IF EXISTS` antes de crear, así que es seguro re-ejecutarlo.

## 5. Verificar

1. Abre `https://TU-DOMINIO/` → debe cargar el simulador (pantalla de login).
2. `https://TU-DOMINIO/api/auth/me` sin token → `401` (la API responde).
3. Inicia sesión con un usuario demo del volcado:
   - Admin: `admin@psychosim.edu.co` / `Admin123!`
   - Docente: `profesora@psychosim.edu.co` / `Profesor123!`
   - Estudiante: `estudiante@psychosim.edu.co` / `Estudiante123!`

   > Cámbialas cuanto antes (o crea usuarios nuevos) si el despliegue es público.

---

## Notas y problemas comunes

- **Error 400 / DisallowedHost:** falta el dominio en `DJANGO_ALLOWED_HOSTS`.
- **500 al cargar / no conecta a la BD:** revisa que `DATABASE_URL` esté
  referenciada y que restauraste `deploy/db_seed.sql`.
- **La página carga pero las llamadas fallan con 404 en `/api`:** asegúrate de
  que el servicio es el del `Dockerfile` de la raíz (no solo el frontend).
- **Recargar una ruta interna (p. ej. `/portal/...`) da 404:** ya está resuelto
  por el catch-all del SPA en `psychosim/urls.py`; si pasa, es que el build de
  Angular no se copió (revisa el log de build del Dockerfile).
- **Actualizaciones:** cada push a la rama conectada redepliega automáticamente.
  La BD NO se toca en redeploys; solo restauras el volcado la primera vez.
- **Reflexiones cifradas:** los datos de reflexión del volcado se cifraron con el
  `JWT_SECRET` local. Si usas un `JWT_SECRET` distinto en Railway (recomendado),
  las reflexiones nuevas funcionan con normalidad; las viejas del volcado podrían
  no descifrarse. No afecta al resto de la app.
