> ⚠️ **DOCUMENTO HISTÓRICO.** La migración a Django descrita aquí **ya se completó** (`backend_django` existe y replica el contrato Spring). Se conserva como registro del encargo de migración; la fuente de verdad vigente es **`PROMPT_MAESTRO.md`**.

# PROMPT MAESTRO — Construcción del backend SIEP en Django (proyecto nuevo, respaldo intacto)

> **Cómo usar este documento:** este es un **prompt autónomo** para entregar a un agente en frío (sin memoria de la conversación previa). Contiene todo el contexto, requisitos, reglas, contrato de API, stack y plan de ejecución necesarios para construir, **desde cero y en un proyecto nuevo**, el backend de SIEP usando **Django + Django REST Framework**, replicando 1:1 lo que hoy existe en Spring Boot.
>
> **Regla de oro de este encargo:** NO se toca, ni se modifica, ni se elimina nada del proyecto Spring Boot actual. El proyecto actual queda como **respaldo de seguridad** para poder volver a él si algo falla. Todo el trabajo Django ocurre en un directorio **nuevo y separado**.

---

## 1. ROL Y MISIÓN

Actúa como **ingeniero backend senior** especializado en Python/Django, con criterio en arquitectura limpia, seguridad, privacidad por diseño y dominios sensibles (salud mental). Tu misión:

1. Crear un **proyecto Django nuevo** (`backend_django/`) que conviva, sin interferir, con el proyecto Spring Boot existente (`backend/`).
2. Replicar **toda** la funcionalidad actual del backend (autenticación, casos legacy, grupos, sesiones, reportes, simulador DAG, autoría, panel docente, auditoría).
3. Mantener el **contrato de API idéntico** (mismas rutas, mismo envoltorio de respuesta, mismos claims JWT) para que el **frontend Angular 21 no requiera ningún cambio**.
4. Honrar **todos** los requisitos del cliente (Área/Facultad de Psicología): de negocio, funcionales, no funcionales y reglas éticas/clínicas.
5. Ejecutar el plan de migración por tareas con TDD y commits frecuentes.

---

## 2. CONTEXTO DEL CLIENTE Y DEL PRODUCTO

- **Producto:** **SIEP — Sistema de Entrenamiento Psicosocial**. Plataforma web académica de simulación formativa para la **Corporación Universitaria Empresarial Alexander Von Humboldt** (Programa de Psicología, Armenia, Colombia, SNIES 101645).
- **Identificadores técnicos históricos:** el repo conserva `psychosim` / `com.psychosim` por compatibilidad. La marca visible es **SIEP**. En Django, los identificadores de proyecto pueden usar `psychosim` (para alinear con la base de datos existente), pero la marca de cara al usuario es **SIEP**.
- **Naturaleza del dominio:** simulación de **casos clínicos psicosociales sensibles** (violencia basada en género, tentativa de feminicidio, NNA) y no sensibles, en formato **RPG top-down explorable**, con fines de **entrenamiento ético y evaluación formativa por competencias**.
- **Roles de usuario:** `ADMIN`, `PROFESOR` (alias visible: DOCENTE), `ESTUDIANTE`.

---

## 3. REQUISITOS DE NEGOCIO (RQ-NEG-001 … RQ-NEG-008)

El backend Django debe garantizar:

- **RQ-NEG-001 — Catálogo versionado y publicación controlada.** Los casos se gestionan como contenedores (`SimulationCase`) con versiones (`CaseVersion`) en estados `DRAFT → IN_REVIEW → PUBLISHED → ARCHIVED`. Solo versiones `PUBLISHED` son jugables por estudiantes.
- **RQ-NEG-002 — Inmutabilidad de lo publicado.** Una versión publicada no se modifica destructivamente: se **clona** y se **versiona** (incremento progresivo `1.0.0 → 1.1.0 → …`), reiniciando el checklist de publicación.
- **RQ-NEG-003 — Motor por grafos (DAG), no contenido hardcodeado.** Toda la simulación se modela como grafo dirigido acíclico: nodos (`SimulationNode`) y decisiones (`DecisionOption`) como aristas con clasificación `ADEQUATE | RISKY | INADEQUATE`. El contenido vive en datos, nunca embebido en el frontend.
- **RQ-NEG-004 — Evaluación formativa por competencias.** Rúbricas (`Rubric`, `RubricCriterion`, `RubricEvaluation`) evaluables por docentes, con puntajes por criterio.
- **RQ-NEG-005 — Trazabilidad académica.** Cada intento (`SimulationAttempt`) registra eventos (`AttemptEvent`) auditables: decisiones, uso de herramientas, interacciones de mundo, salida segura.
- **RQ-NEG-006 — Bitácoras de reflexión cifradas.** El estudiante escribe reflexiones (`ReflectionJournal`) que se **cifran en reposo** y se **bloquean** al finalizar el intento o ejecutar salida segura.
- **RQ-NEG-007 — Validación experta antes de publicar.** Checklist ético/académico (`PublicationChecklist`) como gate de publicación; un caso no pasa a `PUBLISHED` sin cumplir las reglas de validación de mundo.
- **RQ-NEG-008 — Analíticas y reportes docentes.** Dashboards y reportes por grupo/cohorte; las analíticas agregadas anonimizan por defecto; las vistas individuales identificables solo para docentes autorizados.

---

## 4. REQUISITOS FUNCIONALES (por módulo)

Cada módulo Django debe replicar el comportamiento actual. **El contrato HTTP es idéntico al de Spring (mismas rutas y formas).**

### 4.1 Autenticación y usuarios (`/api/auth`)
- `POST /api/auth/login` (público) → `{ token, user: { id, nombre, apellido, email, role } }`.
- `POST /api/auth/register` (solo ADMIN) → crea usuario con rol.
- `GET /api/auth/me` (autenticado) → resumen del usuario actual.
- JWT **stateless** con claims `userId` y `role` (mismos nombres que Spring). Expiración 8 horas configurable.
- Contraseñas hasheadas (compatibilidad de verificación con los hashes existentes en la tabla `users`; si el algoritmo difiere, ver §10.4).

### 4.2 Casos legacy (`/api/casos`)
- `GET /api/casos` (autenticado): lista casos activos con escenarios/preguntas/opciones anidados.
- `GET /api/casos/{id}` (autenticado): detalle.
- `POST /api/casos` (PROFESOR/ADMIN): crear.
- `PUT /api/casos/{id}` (PROFESOR/ADMIN o creador): actualizar.
- `DELETE /api/casos/{id}` (solo ADMIN): baja lógica (`activo=false`).

### 4.3 Grupos (`/api/grupos`)
- `GET /api/grupos` (PROFESOR/ADMIN): grupos del profesor.
- `POST /api/grupos` (PROFESOR/ADMIN): crear grupo (código único autogenerado si no se envía).
- `POST /api/grupos/{id}/estudiantes` (PROFESOR/ADMIN): inscribir estudiante (M2M `grupo_estudiante`).

### 4.4 Sesiones legacy (`/api/sesiones`)
- `POST /api/sesiones` (autenticado): iniciar sesión sobre un caso.
- `POST /api/sesiones/{id}/respuesta`: registrar respuesta; suma puntaje si la opción es correcta.
- `PUT /api/sesiones/{id}/finalizar`: cerrar sesión.
- `GET /api/sesiones/mis-sesiones`: sesiones del estudiante actual.

### 4.5 Reportes (`/api/reportes`)
- `GET /api/reportes/dashboard` (PROFESOR/ADMIN): métricas agregadas.
- `GET /api/reportes/grupo/{grupoId}` (PROFESOR/ADMIN): desempeño por estudiante del grupo.
- `GET /api/reportes/grupo/{grupoId}/export` (PROFESOR/ADMIN): exportación CSV (usar módulo `csv` de Python; reproducir las columnas del export actual).

### 4.6 Simulador — flujo estudiante (`/api/simulation`)
- `GET /api/simulation/cases`: casos publicados jugables.
- `POST /api/simulation/attempts`: iniciar intento (token aleatorio; persistir **hash SHA-256** del token, nunca el token en claro).
- `GET /api/simulation/attempts/{id}`: estado del intento (nodo actual, métricas, feedback).
- `POST /api/simulation/attempts/{id}/decisions`: seleccionar decisión; aplica deltas de puntaje/estrés/métricas clínicas; penaliza conductas prohibidas; finaliza en nodo terminal.
- `POST /api/simulation/attempts/{id}/reflections`: guardar reflexión cifrada.
- `POST /api/simulation/attempts/{id}/safe-exit`: salida segura (guarda estado, devuelve recursos de apoyo, bloquea bitácora).
- `GET /api/simulation/attempts/{id}/world` y `PATCH …/world-state`: cargar/persistir estado del mundo (posición jugador, inventario, objetos inspeccionados, diálogos vistos, herramientas usadas).
- `POST /api/simulation/attempts/{id}/interactions/{key}`: abrir interacción de mapa.
- `POST /api/simulation/attempts/{id}/tools/use`: usar herramienta clínica.

> **Métricas clínicas del intento (deben existir y comportarse igual):** `accumulatedScore` (puntaje profesional), `stressIndex` (estrés de escena 0–100), `victimRisk`, `userTrust`, `institutionalRouteActivated`, `revictimizationRisk`.

### 4.7 Autoría administrativa (`/api/admin/cases`)
- `GET /{caseVersionId}/editor`: estado completo del editor (nodos, decisiones, mapas, objetos, diálogos, herramientas, checklist).
- CRUD granular: `POST/PUT/DELETE` para `nodes`, `decisions`, `maps`, `objects`, `dialogues`, `tools`.
- `PUT /{caseVersionId}/checklist`: actualizar checklist (6 ítems booleanos, 100% = 6/6).
- `POST /{caseVersionId}/publish`: publicar (gate de validación de mundo).
- `POST /{caseVersionId}/clone-version`: clonar a nueva versión (nodos, decisiones, mapas, colisiones, objetos, diálogos, herramientas, rúbricas/criterios).
- `POST /{caseVersionId}/world/validate` (o `/validate`): correr validación de mundo y devolver issues tipados.
- Todas las versiones no-`DRAFT` rechazan mutaciones (`ensureDraft`).

### 4.8 Panel docente / instructor (`/api/instructor`)
- `GET /attempts/recent`: intentos recientes (lista para docente).
- `GET /attempts/{id}/trace`: trazabilidad (línea de tiempo de eventos, bitácoras **descifradas solo para revisión individual autorizada**).
- `GET/POST /attempts/{id}/rubric-evaluation`: leer/guardar evaluación por rúbrica.

### 4.9 Auditoría (transversal)
- Toda acción sensible (CRUD de autoría, decisiones de juego, bitácora, salida segura, publicación, clonación) genera un registro en `audit_logs`.
- Implementar con **Django signals** (equivalente al AOP de Spring): la auditoría **nunca** interrumpe la operación de negocio (captura y loguea errores sin relanzar).
- Retención mínima **12 meses**; tarea programada que purga registros expirados (equivalente al scheduler diario 03:00).
- `actor_id` es **nullable** (acciones del sistema / tareas programadas).

---

## 5. REQUISITOS NO FUNCIONALES (RNF-001 … RNF-010)

- **RNF-001 — Seguridad:** JWT stateless; RBAC por rol en cada endpoint (mismos niveles que Spring); CSRF deshabilitado para la API; CORS restringido al frontend (`http://localhost:4200` en dev).
- **RNF-002 — Privacidad por diseño y minimización de datos:** cifrado en reposo de textos libres sensibles (bitácoras) con **AES-GCM**; nunca persistir contenido sensible en claro ni exponerlo en logs.
- **RNF-003 — Trazabilidad y auditoría:** registro de usuario, rol, acción, recurso, contexto, IP, user-agent y sello de tiempo; retención 12 meses.
- **RNF-004 — Integridad del dominio:** invariantes del DAG y de publicación garantizadas en el backend (no confiar en el frontend).
- **RNF-005 — Compatibilidad de contrato:** API idéntica para no romper el frontend Angular; envoltorio de respuesta `{"data": <payload>, "message": <texto>}`.
- **RNF-006 — Documentación de API:** OpenAPI 3 (usar `drf-spectacular`), Swagger UI servida (equivalente al `/swagger-ui.html` de Springdoc).
- **RNF-007 — Pruebas:** unitarias de dominio/servicios + de integración contra base real; TDD por tarea; suite verde antes de declarar una tarea completa.
- **RNF-008 — Rendimiento y concurrencia:** uso de transacciones atómicas y bloqueos pesimistas/optimistas donde aplique (p. ej. `select_for_update` en decisiones; campo de versión en `case_versions` para edición concurrente, devolviendo 409 en conflicto).
- **RNF-009 — Configuración externalizada:** settings por entorno (`local`/`test`/`production`); secretos (JWT, llave de cifrado, credenciales DB) por variables de entorno en producción.
- **RNF-010 — No regresión de datos:** Django **no** debe tomar posesión destructiva del esquema existente. Los modelos mapean tablas Flyway con `managed = False`; cualquier cambio de esquema se discute antes de implementarse.

---

## 6. REGLAS CRÍTICAS / INVARIANTES (NO ROMPER)

- Un caso en `DRAFT` **no** es visible/jugable para estudiantes.
- Una versión `PUBLISHED` **no** se modifica destructivamente: se clona y versiona.
- Las **decisiones prohibidas** generan penalización drástica e inmutable; toda decisión `prohibitedConduct=true` debe tener `prohibitionReason` no vacío.
- Todo intento finalizado **bloquea** la bitácora.
- La **salida segura** debe estar **siempre alcanzable**, guardar estado y devolver recursos de apoyo.
- Las analíticas agregadas **anonimizan** por defecto; las vistas individuales identificables solo para docentes autorizados.
- Los textos libres sensibles se **cifran** en reposo.
- Los logs registran usuario, rol, acción, contexto y sello de tiempo.
- **No** persistir contenido sensible en `localStorage` ni en claro.

---

## 7. STACK OBJETIVO (Django)

| Capa | Tecnología |
|---|---|
| Lenguaje | Python 3.12 |
| Framework | Django 5.1 |
| API | Django REST Framework 3.15 |
| Auth JWT | `djangorestframework-simplejwt` 5.3 (claims `userId`, `role`) |
| CORS | `django-cors-headers` 4.4 |
| DB | PostgreSQL (la misma base que usa Spring; ver §10) |
| Driver | `psycopg2-binary` 2.9 |
| Cifrado | `cryptography` 42 (AES-GCM) |
| Docs API | `drf-spectacular` 0.27 (OpenAPI 3 + Swagger UI) |
| Tests | `pytest`, `pytest-django` 4.8, `factory-boy` 3.3 |

---

## 8. MAPA DE EQUIVALENCIAS Spring → Django

| Spring Boot | Django / DRF |
|---|---|
| `@RestController` | `APIView` / `ViewSet` |
| `@Service` (capa aplicación) | clases de servicio en `apps/<app>/services/` |
| `JpaRepository` | Django ORM `QuerySet` / `Manager` |
| Spring Security + JWT | DRF + `simplejwt` |
| `@PreAuthorize("hasRole(...)")` | clases de permiso (`IsAdmin`, `IsProfesorOrAdmin`, `IsEstudianteOrAdmin`) |
| Flyway (V1–V8) | dueño del esquema; Django mapea con `managed=False` |
| Bean Validation | validación en serializers DRF |
| `ApiResponse.ok(...)` | helper `api_ok(...)` → `{"data": ..., "message": ...}` |
| AOP `@Auditable` + Aspect | Django signals (`post_save`) → `AuditLog` |
| `@Scheduled` cleanup | comando de gestión + cron / tarea programada |
| AES-GCM `ReflectionCryptoService` | `cryptography` AES-GCM |
| DTO `record` | serializers DRF (con `source=` para mapear snake_case ↔ camelCase) |

> **Convención de nombres en serializers:** la base de datos usa `snake_case`; el contrato JSON del frontend usa `camelCase`. Usar `source="campo_snake"` en cada campo del serializer para preservar el contrato (p. ej. `nodeKey = serializers.CharField(source="node_key")`).

---

## 9. CONTRATO DE RESPUESTA Y CLAIMS (idénticos a Spring)

- **Envoltorio:** toda respuesta REST se envuelve en `{"data": <payload-o-null>, "message": <texto>}`.
- **JWT claims:** además de los estándar, incluir `userId` (id numérico) y `role` (cadena `ADMIN|PROFESOR|ESTUDIANTE`).
- **Códigos:** 200 OK, 201 Created, 400 validación, 401 no autenticado, 403 sin rol, 404 no encontrado, 409 conflicto de edición concurrente.

---

## 10. BASE DE DATOS — ESTRATEGIA DE CONVIVENCIA

### 10.1 Principio
El esquema PostgreSQL ya existe y es propiedad de **Flyway (V1–V8)**. Django **no** lo recrea ni lo migra destructivamente. Todos los modelos usan `class Meta: managed = False` y `db_table = "<tabla_existente>"`.

### 10.2 Tablas a mapear (resumen)
- **Legacy:** `users`, `casos`, `escenarios`, `preguntas`, `opciones`, `grupos`, `grupo_estudiante`, `sesiones_juego`, `respuestas`.
- **Simulación core:** `simulation_cases`, `case_versions`, `simulation_nodes`, `decision_options`, `simulation_attempts_v2` (PK UUID), `attempt_events`, `reflection_journals`, `attempt_world_states`.
- **Mundo:** `scene_maps`, `map_objects`, `collision_zones`, `dialogue_trees`, `dialogue_lines`, `dialogue_choices`, `clinical_tools`, `criterion_scores`.
- **Evaluación/auditoría:** `rubrics`, `rubric_criteria`, `rubric_evaluations`, `publication_checklists`, `audit_logs`.

### 10.3 Migraciones Django
Crear migraciones **vacías** (`operations = []`) para que Django registre las apps sin intentar crear tablas ya existentes. Los tests corren contra la **misma** base o una base de pruebas con el esquema Flyway aplicado.

### 10.4 Compatibilidad de hashes de contraseña
Spring usa **BCrypt**. Django por defecto usa PBKDF2. Para verificar los hashes existentes sin re-sembrar usuarios:
- Configurar `PASSWORD_HASHERS` incluyendo `django.contrib.auth.hashers.BCryptSHA256PasswordHasher` / `BCryptPasswordHasher`, e instalar `bcrypt`.
- Si los hashes BCrypt de Spring no llevan el prefijo que Django espera, normalizarlos en un hasher personalizado o re-emitir el hash en el primer login válido. **Verificar contra las credenciales demo antes de continuar.**

---

## 11. ENTORNO, PUERTOS Y CREDENCIALES

- **Working dir actual:** `D:\Sua_Files\IdeaProjects\psicologia_proyecto`
- **Proyecto nuevo:** `backend_django/` (hermano de `backend/` y `admin-panel/`).
- **Puertos:** Spring sigue en `:8090`. Django corre en **`:8091`** para no colisionar. El frontend Angular sigue en `:4200`.
- **Base de datos:** PostgreSQL local (la misma que Spring; revisar `application.yml` para host/puerto/credenciales — referencia: DB `psychosim`, puerto `5433`).
- **Credenciales demo (sembradas por Flyway):**

| Rol | Email | Password |
|---|---|---|
| ADMIN | `admin@psychosim.edu.co` | `Admin123!` |
| DOCENTE/PROFESOR | `profesora@psychosim.edu.co` | `Profesor123!` |
| ESTUDIANTE | `estudiante@psychosim.edu.co` | `Estudiante123!` |

- **Caso jugable de referencia:** `SIM-VBG-001` — "Violencia Familiar y Tentativa de Feminicidio", 6 nodos DAG, 12 decisiones.

---

## 12. PLAN DE EJECUCIÓN

Sigue el plan detallado y por tareas (TDD, pasos de 2–5 min, commits frecuentes) en:

**`docs/superpowers/plans/2026-05-30-spring-to-django-migration.md`**

Resumen de las 17 tareas:

1. Scaffolding del proyecto Django (settings por entorno, estructura de apps, requirements).
2. Helper `api_ok`/`api_error`, clases de permiso por rol, URLs raíz.
3. Modelo `CustomUser` mapeando la tabla `users` (`managed=False`).
4. Endpoints JWT: login, register, me (claims `userId`/`role`).
5. Modelos legacy: Caso/Escenario/Pregunta/Opcion.
6. API de Casos (CRUD con RBAC y baja lógica).
7. Grupos + Sesiones (modelos y endpoints).
8. Reportes (dashboard, grupo, export CSV).
9. Simulación core: Case/CaseVersion/Node/Decision.
10. Modelos de intento: Attempt (UUID)/Event/Reflection/WorldState.
11. Modelos de mundo + rúbrica/checklist/audit.
12. `SimulationGameService` (máquina de estados DAG) + cifrado AES-GCM de reflexiones.
13. API de juego: cases, attempts, decisions, reflections, world, safe-exit.
14. `AuthoringService` + API admin (editor, nodos, decisiones, publish, validate, clone).
15. Endpoints de instructor + serializers de mundo/diálogo.
16. Auditoría vía Django signals → `audit_logs` (12 meses + purga programada).
17. CORS, settings de producción, verificación end-to-end (login real, suite de tests, server en `:8091`).

> Si el plan referido no está presente en el repo nuevo, **regenéralo** a partir de este prompt antes de ejecutar, respetando la granularidad TDD.

---

## 12.bis. INTEGRACIÓN CON EL FRONTEND ANGULAR (sin migrarlo)

> **Decisión de arquitectura:** el frontend Angular 21 + Phaser + Konva **se conserva intacto**. NO se migra a plantillas Django. SIEP es una SPA contra una API REST; esa separación es la correcta y se mantiene. Django solo reemplaza el backend.

Para que el Angular existente hable con el backend Django, basta **reapuntar el proxy** — sin tocar componentes ni servicios:

- En `admin-panel/proxy.conf.json`, cambiar el `target` de `http://localhost:8090` a `http://localhost:8091` (puerto de Django).
- Verificar que `CORS_ALLOWED_ORIGINS` en Django incluya `http://localhost:4200` y `http://127.0.0.1:4200`.
- No cambiar `simulation.service.ts` ni los modelos: el contrato (`{"data": ..., "message": ...}`, rutas y claims) es idéntico por diseño (§9).
- **Estrategia de respaldo a nivel frontend:** mantener dos archivos de proxy (`proxy.spring.json` → `:8090`, `proxy.django.json` → `:8091`) permite alternar entre backends con un flag de `ng serve`, facilitando comparar comportamiento y volver al respaldo Spring al instante si algo falla.

---

## 13. CRITERIOS DE ACEPTACIÓN (Definition of Done del backend Django)

- El **frontend Angular existente funciona sin cambios** apuntando al backend Django en `:8091` (o reconfigurando el proxy a `:8091`), incluyendo: login por los 3 roles, catálogo, jugar `SIM-VBG-001` completo, editor administrativo, panel docente.
- Todos los endpoints de §4 responden con el **mismo contrato** que Spring (mismas rutas, mismo envoltorio, mismos claims).
- Las **reglas críticas de §6** se cumplen y están cubiertas por pruebas.
- Reflexiones **cifradas** en reposo; bitácora **bloqueada** al finalizar; **salida segura** siempre alcanzable.
- Auditoría persistente con retención 12 meses; la auditoría nunca rompe la operación.
- Suite de tests **verde** (`pytest`); `python manage.py check` sin errores; OpenAPI/Swagger disponible.
- El proyecto Spring Boot original permanece **intacto** (verificable con `git status` limpio en `backend/`).

---

## 14. DISCIPLINA DE TRABAJO

- **TDD obligatorio:** test que falla → implementación mínima → test verde → commit.
- **No tirar lo que funciona:** este es un backend nuevo, pero la lógica de negocio se replica fielmente desde Spring; ante dudas de comportamiento, leer el código Java de referencia en `backend/`.
- **Commits frecuentes y descriptivos**, en una rama nueva (no en `main`/default).
- **Documentar** cada bloque terminado y actualizar la memoria del proyecto al cerrar.
- **Verificar** con `pytest` + arranque real del server + prueba HTTP de login antes de declarar cualquier tarea completa.
- Ante cualquier decisión que cambie el esquema de datos o el contrato de API: **detenerse y consultar** antes de implementar (RNF-010).

---

### Arranque sugerido

> "Lee este prompt completo y el plan en `docs/superpowers/plans/2026-05-30-spring-to-django-migration.md`. Confirma el entorno (Python, PostgreSQL accesible, credenciales demo válidas). Luego ejecuta la Tarea 1 del plan con TDD, sin tocar el directorio `backend/`. Trabaja en una rama nueva."
