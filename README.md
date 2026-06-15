# SIEP - Sistema de Entrenamiento Psicosocial

Plataforma academica de simulacion psicosocial para el Programa de Psicologia. El proyecto combina un portal institucional con un juego tipo RPG clinico top-down, donde estudiantes exploran casos, hablan con NPCs, recolectan informacion, usan herramientas profesionales y responden intervenciones evaluables.

## Estado actual

- Rama principal de trabajo local: `codex/actualizacion-completa-simulador`.
- Repositorio remoto configurado: `https://github.com/EmersonAngel/SIEP.git`.
- Caso canonico actual: `SIM-VBG-001`, "Violencia Familiar y Tentativa de Feminicidio".
- Seed canonico: `backend_django/apps/simulation/management/commands/seed_caso_pdf.py`.
- Frontend: Angular 21 + Phaser 3 + Konva.
- Backend: Django 5.1 + DRF + JWT + PostgreSQL.

## Estructura del monorepo

```text
psico_project_v2/
  backend_django/    API Django, autenticacion, usuarios, grupos, casos, intentos y progreso
  frontend/          App Angular, portal, simulador Phaser y editor de casos
  docs/              Documentacion, prompt maestro y planes tecnicos
  tools/             Utilidades de apoyo
  docker-compose.yml PostgreSQL local para desarrollo
```

## Cambios realizados hasta el momento

### Simulador y caso principal

- Se actualizo el simulador para trabajar con el caso `SIM-VBG-001`.
- Se ajusto el flujo del caso de violencia familiar y tentativa de feminicidio.
- Se cambio el contexto narrativo de la senora preocupada: no es la madre de la nina, es la abuela de la nina fallecida y madre de la mujer herida.
- Se agrego introduccion narrativa para la primera escena, dividida para lectura con continuar/scroll.
- Se integro musica de introduccion con `PsicoLament`, reproduciendose durante la intro y deteniendose al continuar.
- Se agrego musica del proyecto desde Descargas, incluyendo `Musica_PsicoGame`.
- Se agregaron controles de audio: musica, ambiente y efectos/acciones.
- Se agrego opcion de mutear musica y ajustes tipo menu de juego.
- Se corrigio el menu Escape para que "Volver al simulador" regrese al juego y no al portal.
- Se corrigio que las herramientas desaparezcan del escenario al recogerlas.
- Se quitaron sprites tipo muneco en herramientas.
- Se elimino el personaje naranja del tutorial/guia que se acercaba al PAP.
- Se corrigieron bugs donde al interactuar aparecian NPCs en lugares incorrectos.
- Se ajusto el comportamiento posterior a la tercera escena, incluyendo movimiento lateral de personajes.

### Logica de evaluacion e informacion incompleta

- Se mantuvo la etiqueta de "informacion incompleta", pero ahora debe depender de evidencia real: hablar con NPCs, inspeccionar objetos o tener herramientas.
- Se implemento persistencia de interacciones con NPC para evitar que el sistema siga marcando informacion incompleta cuando el estudiante ya hablo con el NPC necesario.
- Se ajusto la logica para que las respuestas no muestren al estudiante etiquetas como "contraindicada" antes de responder.
- Si una respuesta es inadecuada o riesgosa, el estudiante debe recibir un mensaje y otra oportunidad para contestar.
- Se reviso el funcionamiento de corazones y barras `C` y `B`; deben mostrarse con nombres claros en la UI.
- Se agrego soporte para continuar con Enter en dialogos/botones de avance.

### Portal, roles y acceso

- Se corrigio el flujo de creacion de usuarios para que los usuarios nuevos puedan iniciar sesion con correo, contrasena y rol asignado.
- Se reviso y ajusto autenticacion.
- Se agrego funcionalidad de inicio de sesion con Google en backend y frontend.
- Se corrigieron problemas similares de formularios en usuarios y grupos.
- El rol docente/profesor puede revisar estudiantes dentro de sus grupos.
- Un estudiante no debe ver casos hasta que un docente lo agregue a un grupo y asigne el caso a ese grupo.
- Se reviso que el rol admin no tenga creacion de grupos si los requisitos indican que corresponde al docente.
- Se agrego carga de estudiantes mediante archivo Excel.
- Se quitaron intentos y estadisticas anteriores durante la depuracion solicitada.
- Se corrigio un bug visual donde al volver al catalogo quedaba la barra lateral superpuesta sobre el contenido.
- Se quito el bucle del personaje pixeleado en acceso institucional.

### Editor de casos para docentes/admin

- Se agrego una modalidad de edicion de casos exclusiva para roles administrativos/docentes segun flujo.
- El editor permite crear un nuevo caso.
- El docente puede configurar escenarios, puertas, objetos, herramientas, NPCs y conversaciones.
- El editor permite definir cuestionarios, respuestas correctas y condiciones para informacion incompleta.
- Se estandarizaron sprites, escenas y articulos para facilitar que un docente cree casos nuevos.
- Los NPCs del editor pueden personalizarse con genero, cuerpo, ropa, cabello, cara y expresion.
- Se agregaron plantillas de NPC y controles para editar avatares dentro del editor de mundo/caso.

### Sprites y personalizacion de personajes

- Se integro la carpeta `siep_character_editor_assets` desde Descargas en:

```text
frontend/src/assets/characters/modular/
```

- El kit modular nuevo contiene 59 archivos, incluyendo manifest, cuerpos, caras y cabello.
- Se reemplazo la logica limitada de cabello por un sistema combinable:
  - Formas: corto, medio, largo, recogido, sin cabello.
  - Colores: negro, castano, rubio, rojizo, gris.
- Se agrego seleccion de genero/cuerpo:
  - Mujer.
  - Hombre.
- Se agrego seleccion de color de ropa:
  - Morado.
  - Azul.
  - Verde.
  - Vinotinto.
  - Gris.
- Se corrigio el render lateral del avatar modular usando los frames correctos del manifest:
  - `idle_down`
  - `idle_side`
  - `idle_up`
- Se actualizo el personaje jugable desde `/portal/personaje`.
- Se actualizo el compositor Phaser para que el jugador y NPCs usen los mismos assets modulares.
- Se actualizaron presets de NPC para que no compartan todos el mismo cuerpo morado.

### GitHub y colaboracion

- Se configuro el remoto `origin` hacia el repositorio del usuario:

```bash
https://github.com/EmersonAngel/SIEP.git
```

- Se subio previamente la rama:

```bash
codex/actualizacion-completa-simulador
```

- Si un companero ve un caso viejo como "Atencion inicial en comisaria", revisar:
  - Que este en la rama correcta.
  - Que haya hecho `git pull`.
  - Que haya reseedeado la base de datos.
  - Que no este usando un volumen viejo de Docker con datos persistidos.

## Arranque local

### Base de datos

```powershell
docker compose up -d db
```

PostgreSQL queda disponible en `localhost:5433`, base `psychosim`.

### Backend Django

```powershell
cd backend_django
.\.venv\Scripts\python.exe manage.py runserver 8091
```

API local:

```text
http://localhost:8091
```

### Frontend Angular

```powershell
cd frontend
npm install
npm start
```

Frontend local:

```text
http://localhost:4200
```

Si el puerto 4200 esta ocupado:

```powershell
npx ng serve --host 127.0.0.1 --port 4300
```

## Seed del caso canonico

Para asegurar que el caso correcto este en la base de datos:

```powershell
cd backend_django
.\.venv\Scripts\python.exe manage.py seed_caso_pdf
```

Si se quiere limpiar completamente la base local de Docker, usar solo si no se necesita conservar datos:

```powershell
docker compose down -v
docker compose up -d db
```

Luego correr migraciones y seed.

## Credenciales demo

| Rol | Email | Contrasena |
|---|---|---|
| ADMIN | `admin@psychosim.edu.co` | `Admin123!` |
| PROFESOR | `profesora@psychosim.edu.co` | `Profesor123!` |
| ESTUDIANTE | `estudiante@psychosim.edu.co` | `Estudiante123!` |

## Verificaciones recientes

Frontend:

```powershell
cd frontend
npm run build
```

Pruebas especificas de avatar/sprites:

```powershell
cd frontend
npx jest src/app/features/character/avatar-config.util.spec.ts src/app/features/character/avatar-figure.component.spec.ts src/app/features/simulator/phaser-avatar-renderer.spec.ts src/app/features/simulator/npc-avatar-presets.spec.ts --runInBand
```

Resultado reciente:

```text
28 passed
```

Backend auth:

```powershell
cd backend_django
.\.venv\Scripts\python.exe -m pytest apps\users\tests\test_auth.py
```

Resultado reciente:

```text
21 passed
```

## Archivos clave

- `frontend/src/app/features/character/avatar.model.ts`
- `frontend/src/app/features/character/avatar-config.util.ts`
- `frontend/src/app/features/character/avatar-figure.component.ts`
- `frontend/src/app/features/character/character-editor.component.ts`
- `frontend/src/app/features/simulator/phaser-avatar-renderer.ts`
- `frontend/src/app/features/simulator/game-world.component.ts`
- `frontend/src/app/features/simulator/npc-avatar-presets.ts`
- `frontend/src/app/features/simulator/world-editor/world-editor.component.ts`
- `frontend/src/app/features/simulator/authoring-catalog.config.ts`
- `frontend/src/assets/characters/modular/manifest.json`
- `backend_django/apps/simulation/management/commands/seed_caso_pdf.py`

## Prompt para la proxima IA

Usa este prompt si otra IA va a continuar el proyecto:

```text
Estas trabajando en el proyecto SIEP, un simulador psicosocial academico tipo RPG clinico para Psicologia. El workspace local es psico_project_v2 y la rama de trabajo es codex/actualizacion-completa-simulador. El remoto del usuario es https://github.com/EmersonAngel/SIEP.git.

Objetivo general: mantener y mejorar una plataforma Angular + Django donde estudiantes juegan casos psicosociales, docentes administran grupos/casos y administradores gestionan la plataforma.

Contexto importante:
1. El caso canonico actual es SIM-VBG-001, "Violencia Familiar y Tentativa de Feminicidio".
2. El seed canonico esta en backend_django/apps/simulation/management/commands/seed_caso_pdf.py.
3. El catalogo de casos sale de la base de datos, no de archivos estaticos del frontend. Si aparece un caso viejo como "Atencion inicial en comisaria", revisar rama, seed y volumen de Docker.
4. Los estudiantes no deben ver casos hasta que un docente los agregue a un grupo y asigne el caso a ese grupo.
5. La informacion incompleta debe seguir existiendo, pero debe resolverse con evidencia real: hablar con NPCs, inspeccionar objetos o tener herramientas.
6. Las respuestas incorrectas no deben delatarse al estudiante como "contraindicada" en las opciones. Si responde algo riesgoso/inadecuado, debe recibir retroalimentacion y otra oportunidad.
7. El editor de casos debe permitir crear casos nuevos, escenarios, puertas, herramientas, NPCs, conversaciones, cuestionarios, respuesta correcta y condiciones de informacion incompleta.
8. Los NPCs y el personaje jugable usan sprites modulares en frontend/src/assets/characters/modular.
9. El personaje jugable se personaliza desde /portal/personaje.
10. El kit modular actual tiene cuerpos female/male, colores de ropa purple/blue/green/burgundy/gray, cabellos short/medium/long/tied con colores black/brown/blonde/red/gray, y caras neutral/calm/worried.

Antes de cambiar codigo:
- Ejecuta git status --short --branch.
- No reviertas cambios del usuario.
- Lee los archivos cercanos antes de editar.
- Usa apply_patch para ediciones manuales.

Verificaciones minimas:
- cd frontend && npm run build
- cd frontend && npx jest src/app/features/character/avatar-config.util.spec.ts src/app/features/character/avatar-figure.component.spec.ts src/app/features/simulator/phaser-avatar-renderer.spec.ts src/app/features/simulator/npc-avatar-presets.spec.ts --runInBand
- Para auth backend: cd backend_django && .\.venv\Scripts\python.exe -m pytest apps\users\tests\test_auth.py

Tareas recomendadas para seguir:
1. Revisar visualmente /portal/personaje y el editor de casos con navegador.
2. Probar en Phaser que el jugador y NPCs no se vean invertidos al moverse lateralmente.
3. Probar un caso completo como estudiante: grupo asignado, intro, musica, herramientas, NPCs, informacion incompleta y reintentos de respuesta.
4. Revisar que Google login tenga variables configuradas en .env y que el flujo este documentado para despliegue.
5. Revisar permisos exactos de admin/docente segun carpeta de requisitos.
6. Subir cualquier commit pendiente a la rama codex/actualizacion-completa-simulador si el usuario pide que GitHub quede actualizado.
```

