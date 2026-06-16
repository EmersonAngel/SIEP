# Informe QA API - SIEP

## 1. Resumen general

Estado: APROBADO CON OBSERVACIONES.

La API backend Django REST esta parcialmente verificada por pruebas automatizadas y revision estatica de rutas. Despues de correcciones menores, `manage.py check` no reporta issues y el suite backend pasa completo. No se hizo una corrida manual HTTP contra un servidor vivo con tokens JWT porque el entorno local tiene el virtualenv roto y no se levanto el stack completo.

## 2. Entorno probado

- Fecha de prueba: 2026-06-16.
- Rama git: `codex/actualizacion-completa-simulador`.
- Framework backend detectado: Django 5.1.8 + Django REST Framework + SimpleJWT.
- Frontend detectado: Angular 21.
- Puerto backend esperado: `8091`, segun `scripts/dev-up.mjs` y `README.md`.
- Base URL esperada: `http://localhost:8091/api`.
- Base de datos esperada: PostgreSQL `psychosim` en `localhost:5433`.
- Settings de test: `psychosim.settings.test`, usando la BD `psychosim` con rollback por test.
- Nota de entorno: `backend_django/.venv/Scripts/python.exe` falla porque apunta a un Python inexistente. Para verificar backend se uso el Python empaquetado de Codex con `PYTHONPATH=backend_django/.venv/Lib/site-packages`.

Comandos ejecutados:

- `backend_django`: `manage.py check`
- `backend_django`: `pytest -q`
- `frontend`: `npm run build`
- `frontend`: `npm test -- --runInBand`

## 3. Resultado de build y tests

| Comando | Resultado | Observacion |
|---|---:|---|
| `npm install` | WARNING | No ejecutado; `frontend/node_modules` ya existe. |
| `manage.py check` | PASS | Sin issues despues de corregir rutas con slash inicial. |
| `pytest -q` | PASS | 160 passed in 30.77s. |
| `npm run build` | PASS | Compila Angular. Quedan warnings de budget CSS/fuentes. |
| `npm test -- --runInBand` | PASS | 36 suites, 202 tests passed. |
| Pruebas e2e | WARNING | No ejecutadas; no se levanto navegador/stack completo. |

## 4. Tabla general de endpoints

| Metodo | Ruta | Rol requerido | Estado esperado | Resultado obtenido | Estado final | Observacion |
|---|---|---|---|---|---|---|
| POST | `/api/auth/login` | Publico | 200/401 | Cubierto por tests auth | PASS | Ruta existe. |
| GET | `/api/auth/me` | Autenticado | 200/403 | Cubierto por tests auth | PASS | Ruta existe. |
| GET/POST | `/api/grupos` | Profesor/Admin | 200/403 | Cubierto por tests grupos | PASS | Ruta existe. |
| POST | `/api/grupos/:id/estudiantes` | Profesor/Admin | 200/400/403 | Cubierto por tests grupos | PASS | Ruta existe. |
| POST | `/api/grupos/:id/estudiantes/import` | Profesor/Admin | 200/400 | Cubierto por tests grupos | PASS | Frontend usa esta ruta. |
| GET/POST/DELETE | `/api/grupos/:id/casos` | Profesor/Admin | 200/403 | Cubierto por tests grupos | PASS | Asignacion de casos a grupos. |
| GET | `/api/simulation/cases` | Autenticado | 200 | Cubierto por tests simulation | PASS | Estudiantes ven solo casos asignados. |
| POST | `/api/simulation/attempts` | Estudiante/Admin | 200/403 | Cubierto por tests simulation | PASS | Requiere caso asignado al grupo. |
| GET | `/api/simulation/attempts/history` | Estudiante/Admin | 200/403 | Cubierto por tests simulation | PASS | Historial propio del estudiante. |
| POST | `/api/simulation/attempts/:id/decisions` | Estudiante/Admin | 200/400/404 | Cubierto por tests simulation | PASS | Valida token, caso y nodo. |
| POST | `/api/simulation/attempts/:id/reflections` | Estudiante/Admin | 200/400/404 | Cubierto por tests simulation | PASS | Guarda bitacora cifrada. |
| GET | `/api/instructor/attempts/recent` | Profesor/Admin | 200/403 | Cubierto por tests instructor | PASS | Ruta normalizada. |
| GET | `/api/instructor/attempts/:id/trace` | Profesor/Admin | 200/403/404 | Cubierto por tests instructor | PASS | Evidencia/revision docente. |
| GET/POST | `/api/instructor/attempts/:id/rubric-evaluation` | Profesor/Admin | 200/403/404 | Cubierto por tests instructor | PASS | Evaluacion docente. |
| GET/POST | `/api/admin/cases` | Admin | 200/403 | Cubierto por tests authoring | PASS | Se preservo URL sin slash final. |
| GET/POST/PUT/DELETE | `/api/admin/cases/:id/...` | Admin | 200/400/403/404 | Cubierto por tests authoring/world | PASS | Editor de casos, nodos, decisiones, mapas y mundo. |
| GET | `/api/reportes/dashboard` | Profesor/Admin | 200/403 | Cubierto por tests reportes | PASS | Ruta normalizada. |
| GET | `/api/reportes/grupo/:id` | Profesor/Admin | 200/404 | Cubierto por tests reportes | PASS | Reporte por grupo. |
| GET | `/api/reportes/grupo/:id/export` | Profesor/Admin | 200/404 | Cubierto por tests reportes | PASS | Export CSV. |

## 5. Fallos encontrados

### QA-001 - Warnings de rutas Django por slash inicial

- Endpoint afectado: `/api/simulation/*`, `/api/admin/cases/*`, `/api/instructor/*`, `/api/reportes/*`.
- Descripcion: Django reportaba `urls.W002` porque varios `path()` hijos empezaban con `/`.
- Pasos para reproducir: ejecutar `manage.py check`.
- Response recibido: 44 warnings antes de corregir; 0 issues despues.
- Posible causa: includes raiz sin slash final combinados con subrutas con slash inicial.
- Severidad: Baja.
- Correccion aplicada: normalizar includes raiz con slash final y rutas hijas sin slash inicial. Se preservo `/api/admin/cases` sin slash final porque el frontend/tests lo usan.

### QA-002 - Tests de reportes/progression no asignaban caso al grupo

- Endpoint afectado: `POST /api/simulation/attempts`.
- Descripcion: 4 tests fallaban con 403 al iniciar intento porque el estudiante no tenia el caso asignado a su grupo.
- Pasos para reproducir: ejecutar `pytest -q` antes de la correccion.
- Request usado: `POST /api/simulation/attempts {"caseVersionId": 1}`.
- Response recibido: 403 `El caso no ha sido asignado a tu grupo`.
- Posible causa: fixtures incompletas despues de introducir el guard de asignacion.
- Severidad: Media para CI, Baja para producto.
- Correccion aplicada: los tests crean la relacion `grupo_case_version` antes de iniciar el intento.

## 6. Problemas de seguridad o permisos

- Acceso sin token: cubierto parcialmente por tests auth/simulation/reportes.
- Rol incorrecto: cubierto por tests para estudiante bloqueado en reportes y profesor bloqueado en authoring admin.
- Acceso a datos de otros usuarios: cubierto por tests de reportes de estudiante e intentos.
- Regla critica verificada: estudiante no puede iniciar un caso no asignado a su grupo; retorna 403.
- Riesgo residual: no se ejecuto una matriz manual completa con token invalido/expirado por endpoint.

## 7. Problemas de integracion frontend-backend

- Frontend actual usa rutas reales Django: `/api/auth`, `/api/grupos`, `/api/simulation`, `/api/instructor`, `/api/admin/cases`, `/api/reportes`.
- Rutas del enunciado que no existen literalmente en este backend: `/api/usuarios`, `/api/casos`, `/api/simulacion/...`, `/api/grupos/:grupoId/importar-estudiantes`.
- Equivalencias reales:
  - Usuarios admin: `/api/admin/users`.
  - Casos authoring: `/api/admin/cases`.
  - Simulacion estudiante: `/api/simulation/...`.
  - Importacion estudiantes: `/api/grupos/:id/estudiantes/import`.
- Estado final: el frontend revisado coincide con las rutas reales del backend para los servicios principales.

## 8. Estado por modulo

| Modulo | Estado | Observacion |
|---|---|---|
| Auth | PASS | Login/me/register/access-request presentes y con tests. |
| Usuarios | PASS | Admin users y access requests presentes. |
| Grupos | PASS | CRUD/listado/asignacion estudiantes/casos cubiertos. |
| Importacion estudiantes | PASS | Ruta real `/estudiantes/import`; validar contrato exacto via prueba manual queda pendiente. |
| Casos | PASS | Authoring admin cubierto; rutas publicas del enunciado no existen literalmente. |
| Simulacion estudiante | PASS | Inicio, decisiones, historial, mundo, safe exit y reportes cubiertos. |
| Evidencias docente | PASS | Instructor trace y rubricas cubiertas. |
| Asignacion de casos | PASS | `grupo_case_version` requerida y probada. |
| Historial | PASS | Historial propio cubierto. |
| Revision de sesiones | PASS | Trace/rubric cubiertos. |

## 9. Recomendaciones prioritarias

Critico:

- Reparar/recrear `backend_django/.venv`; actualmente sus ejecutables apuntan a un Python inexistente y `npm run up` puede fallar en `ensureVenv()`.

Importante:

- Agregar una prueba e2e HTTP que levante `localhost:8091`, haga login real con ADMIN/PROFESOR/ESTUDIANTE y recorra la matriz de permisos con JWT invalido/sin token. **Hecho:** `npm run test:api:e2e` (`scripts/api-e2e.mjs`).
- Documentar en README las rutas reales Django, porque el listado historico usa `/api/simulacion`, `/api/usuarios` y `/api/casos`. **Hecho:** seccion API REST en `README.md`.

Mejorable:

- Resolver warnings de Angular budget en `landing.component.scss` y Google Fonts. **Hecho:** se elimino Google Fonts del login; landing reducido bajo budget.
- Agregar comandos npm raiz para backend test/check si se quiere una entrada unica de CI. **Hecho:** `npm run check:backend`, `test:backend`, `test:frontend`, `build:frontend`.

## 10. Conclusion

Veredicto: APROBADO CON OBSERVACIONES.

El backend queda en estado sano para CI local: `manage.py check` limpio y 160 tests backend pasando. El frontend tambien compila y pasa 202 tests. Para demo frente a docentes o ingenieros, el sistema es apto si se recrea primero el virtualenv y se valida una corrida manual end-to-end con PostgreSQL, backend en `8091` y Angular en `4200`.

## Cambios aplicados

- Se corrigieron rutas Django mal nombradas por slash inicial.
- Se preservo compatibilidad de `/api/admin/cases` sin slash final.
- Se ajustaron fixtures de tests para respetar la regla de caso asignado a grupo.
- No se hizo refactor masivo ni cambios de logica de negocio.
