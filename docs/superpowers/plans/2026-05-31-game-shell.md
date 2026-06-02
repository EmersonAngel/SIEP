# Game Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the student entry into a Phaser "menu-world" (walk up to clinic doors = cases, arrows to move, walk in to play) gated by per-student linear progression (completing a case unlocks the next).

**Architecture:** New **Django-managed** table `student_case_completion` (first real Django migration — Django now owns the schema, Spring retired) records completions; a completion hook in `game_service.choose_decision` writes it on COMPLETED; a new `GET /api/simulation/catalog` endpoint returns published cases with per-student `unlocked/completed/locked`. The Angular frontend adds a `GameMenuComponent` hosting a `ClinicMenuScene` (Phaser) at route `/portal/jugar`; the existing in-case game (`simulation-play`) is unchanged and is navigated into with a `caseVersionId`.

**Tech Stack:** Django 5.1 + DRF, pytest-django (real `psychosim` DB, `--reuse-db --nomigrations`, rollback per test); Angular 21 standalone components + Phaser 3; Playwright (smoke). Backend repo: `psico_project_v2/backend_django`. Frontend repo: `psicologia_proyecto/admin-panel`.

**Branching:** Backend work on branch `feat/game-shell` (off `feat/django-migration`) in `psico_project_v2`. Frontend work on branch `feat/game-shell` in `psicologia_proyecto`. (Execution skill + `using-git-worktrees` set this up.)

---

## File Structure

**Backend (`psico_project_v2/backend_django`):**
- Create `apps/progression/__init__.py` — new Django app package.
- Create `apps/progression/apps.py` — AppConfig.
- Create `apps/progression/models.py` — `StudentCaseCompletion` (managed=True).
- Create `apps/progression/migrations/__init__.py` + `apps/progression/migrations/0001_initial.py` — real migration creating the table.
- Create `apps/progression/services.py` — `record_case_completion()` (best-effort writer).
- Create `apps/progression/catalog.py` — `build_catalog(actor)` (progression computation).
- Create `apps/progression/tests/__init__.py`, `test_models.py`, `test_completion_hook.py`, `test_catalog.py`.
- Modify `psychosim/settings/base.py` — add `apps.progression` to `INSTALLED_APPS`.
- Modify `apps/simulation/services/game_service.py` — completion hook in `choose_decision`.
- Modify `apps/simulation/views/game_views.py` — add `CatalogView`.
- Modify `apps/simulation/urls.py` — add `/catalog` route.

**Frontend (`psicologia_proyecto/admin-panel/src/app`):**
- Modify `core/models/simulation.model.ts` — add `CatalogItem`.
- Modify `core/api/simulation.service.ts` — add `getCatalog()`.
- Create `core/api/simulation-catalog.service.spec.ts` — jest test for `getCatalog()`.
- Create `features/simulator/game-menu.component.ts` — `ClinicMenuScene` + `GameMenuComponent`.
- Modify `app.routes.ts` — add `path: 'jugar'` under `portal`.
- Modify `shared/layout/shell.component.ts` — add "Jugar" nav item.

---

## Task 1: `progression` app + completion table (first Django-managed table)

**Files:**
- Create: `apps/progression/__init__.py`, `apps/progression/apps.py`, `apps/progression/models.py`
- Create: `apps/progression/migrations/__init__.py`, `apps/progression/migrations/0001_initial.py`
- Create: `apps/progression/tests/__init__.py`, `apps/progression/tests/test_models.py`
- Modify: `psychosim/settings/base.py`

- [ ] **Step 1: Write the failing test**

Create `apps/progression/tests/__init__.py` (empty) and `apps/progression/tests/test_models.py`:

```python
from datetime import datetime

import pytest
from django.db import IntegrityError, transaction

from apps.progression.models import StudentCaseCompletion


@pytest.mark.django_db
def test_completion_is_unique_per_student_and_case():
    StudentCaseCompletion.objects.create(
        student_id=999001, simulation_case_id=999001,
        first_completed_at=datetime(2026, 1, 1, 8, 0, 0),
    )
    with pytest.raises(IntegrityError):
        with transaction.atomic():
            StudentCaseCompletion.objects.create(
                student_id=999001, simulation_case_id=999001,
                first_completed_at=datetime(2026, 1, 2, 8, 0, 0),
            )


@pytest.mark.django_db
def test_completion_allows_different_cases_for_same_student():
    StudentCaseCompletion.objects.create(
        student_id=999002, simulation_case_id=1,
        first_completed_at=datetime(2026, 1, 1, 8, 0, 0),
    )
    StudentCaseCompletion.objects.create(
        student_id=999002, simulation_case_id=2,
        first_completed_at=datetime(2026, 1, 1, 8, 0, 0),
    )
    assert StudentCaseCompletion.objects.filter(student_id=999002).count() == 2
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend_django && .venv/Scripts/python.exe -m pytest apps/progression/tests/test_models.py -q`
Expected: FAIL — `ModuleNotFoundError: No module named 'apps.progression'` (app/model don't exist yet).

- [ ] **Step 3: Create the app package + AppConfig + model**

`apps/progression/__init__.py` — empty file.

`apps/progression/apps.py`:

```python
from django.apps import AppConfig


class ProgressionConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.progression"
```

`apps/progression/models.py`:

```python
"""Per-student case progression (Django-OWNED table — first real migration).

Django now owns the schema (Spring retired). This is the source of truth for
"which cases a student has completed". Keys are stored as plain integers (no DB
FK to the Flyway-owned users/simulation_cases tables) so this managed table stays
fully decoupled and its migration has no cross-app dependencies.
"""
from django.db import models


class StudentCaseCompletion(models.Model):
    student_id = models.BigIntegerField()
    simulation_case_id = models.BigIntegerField()
    first_completed_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "student_case_completion"
        managed = True
        constraints = [
            models.UniqueConstraint(
                fields=["student_id", "simulation_case_id"],
                name="uq_student_case_completion",
            )
        ]
```

- [ ] **Step 4: Add the app to INSTALLED_APPS**

Modify `psychosim/settings/base.py` — add `"apps.progression",` to the end of the `INSTALLED_APPS` list:

```python
    "apps.sesiones",
    "apps.simulation",
    "apps.progression",
]
```

- [ ] **Step 5: Write the migration**

`apps/progression/migrations/__init__.py` — empty file.

`apps/progression/migrations/0001_initial.py`:

```python
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True
    dependencies = []
    operations = [
        migrations.CreateModel(
            name="StudentCaseCompletion",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("student_id", models.BigIntegerField()),
                ("simulation_case_id", models.BigIntegerField()),
                ("first_completed_at", models.DateTimeField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={"db_table": "student_case_completion", "managed": True},
        ),
        migrations.AddConstraint(
            model_name="studentcasecompletion",
            constraint=models.UniqueConstraint(
                fields=("student_id", "simulation_case_id"), name="uq_student_case_completion"
            ),
        ),
    ]
```

- [ ] **Step 6: Apply the migration to the real `psychosim` DB**

This is the authorized schema change (creates only `student_case_completion`; migrating the single app avoids touching the already-existing contrib/auth tables).

Run: `cd backend_django && .venv/Scripts/python.exe manage.py migrate progression --settings=psychosim.settings.local`
Expected: `Applying progression.0001_initial... OK`.

Verify the table exists:
Run: `docker exec psychosim-db psql -U psychosim -d psychosim -c "\d student_case_completion"`
Expected: table description with `student_id`, `simulation_case_id`, `first_completed_at`, `created_at` and the unique constraint.

- [ ] **Step 7: Run the test to verify it passes**

Run: `cd backend_django && .venv/Scripts/python.exe -m pytest apps/progression/tests/test_models.py -q`
Expected: PASS (2 passed). (Tests reuse `psychosim` via `--reuse-db`, so the table created in Step 6 is present.)

- [ ] **Step 8: Confirm the full suite still passes**

Run: `cd backend_django && .venv/Scripts/python.exe -m pytest -q`
Expected: all prior tests + 2 new = green.

- [ ] **Step 9: Commit**

```bash
git add backend_django/apps/progression backend_django/psychosim/settings/base.py
git commit -m "feat(progression): StudentCaseCompletion table (first Django-managed migration)"
```

---

## Task 2: Completion hook — record on COMPLETED

**Files:**
- Create: `apps/progression/services.py`
- Modify: `apps/simulation/services/game_service.py` (the `choose_decision` COMPLETED branch)
- Create: `apps/progression/tests/test_completion_hook.py`

- [ ] **Step 1: Write the failing test**

`apps/progression/tests/test_completion_hook.py`:

```python
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.progression.models import StudentCaseCompletion
from apps.simulation.models import CaseVersion

User = get_user_model()


@pytest.fixture
def estudiante(db):
    return User.objects.create_user(
        email="est_prog@x.com", password="x", nombre="Est", apellido="Prog", role="ESTUDIANTE"
    )


@pytest.fixture
def case_version_id(db):
    return CaseVersion.objects.get(simulation_case__code="SIM-VBG-001", status="PUBLISHED").id


def _cl(user):
    c = APIClient()
    c.force_authenticate(user=user)
    return c


def test_completing_case_records_completion(estudiante, case_version_id):
    c = _cl(estudiante)
    start = c.post("/api/simulation/attempts", {"caseVersionId": case_version_id}, format="json").data["data"]
    token, attempt_id = start["attemptToken"], start["attemptId"]
    state = start
    for _ in range(25):
        if state["status"] != "IN_PROGRESS":
            break
        options = state["currentNode"]["options"]
        assert options
        state = c.post(
            f"/api/simulation/attempts/{attempt_id}/decisions",
            {"attemptToken": token, "decisionOptionId": options[0]["id"]},
            format="json",
        ).data["data"]
    assert state["status"] == "COMPLETED"
    case_id = CaseVersion.objects.get(pk=case_version_id).simulation_case_id
    assert StudentCaseCompletion.objects.filter(
        student_id=estudiante.id, simulation_case_id=case_id
    ).count() == 1


def test_safe_exit_does_not_record_completion(estudiante, case_version_id):
    c = _cl(estudiante)
    start = c.post("/api/simulation/attempts", {"caseVersionId": case_version_id}, format="json").data["data"]
    c.post(
        f"/api/simulation/attempts/{start['attemptId']}/safe-exit",
        {"attemptToken": start["attemptToken"], "reason": "pausa"},
        format="json",
    )
    case_id = CaseVersion.objects.get(pk=case_version_id).simulation_case_id
    assert not StudentCaseCompletion.objects.filter(
        student_id=estudiante.id, simulation_case_id=case_id
    ).exists()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend_django && .venv/Scripts/python.exe -m pytest apps/progression/tests/test_completion_hook.py -q`
Expected: FAIL on `test_completing_case_records_completion` (no completion row written yet).

- [ ] **Step 3: Write the recorder service**

`apps/progression/services.py`:

```python
"""Records case completions. Best-effort: must NEVER break gameplay."""
import logging

from django.db import IntegrityError
from django.utils import timezone

from .models import StudentCaseCompletion

logger = logging.getLogger(__name__)


def record_case_completion(student_id, simulation_case_id):
    """Mark a case completed for a student (idempotent, never raises)."""
    try:
        StudentCaseCompletion.objects.get_or_create(
            student_id=student_id,
            simulation_case_id=simulation_case_id,
            defaults={"first_completed_at": timezone.now()},
        )
    except IntegrityError:
        pass  # concurrent insert — already recorded
    except Exception as ex:  # pragma: no cover - must not break gameplay
        logger.warning(
            "record_case_completion failed (student=%s case=%s): %s",
            student_id, simulation_case_id, ex,
        )
```

- [ ] **Step 4: Hook it into `choose_decision`**

In `apps/simulation/services/game_service.py`, find the COMPLETED branch at the end of `choose_decision`:

```python
    if attempt.status == "COMPLETED":
        _save_event(attempt, "ATTEMPT_COMPLETED", decision.target_node, None, 0, 0, "Intento finalizado")
```

Replace it with:

```python
    if attempt.status == "COMPLETED":
        _save_event(attempt, "ATTEMPT_COMPLETED", decision.target_node, None, 0, 0, "Intento finalizado")
        from apps.progression.services import record_case_completion
        record_case_completion(attempt.student_id, attempt.case_version.simulation_case_id)
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd backend_django && .venv/Scripts/python.exe -m pytest apps/progression/tests/test_completion_hook.py -q`
Expected: PASS (2 passed).

- [ ] **Step 6: Commit**

```bash
git add backend_django/apps/progression/services.py backend_django/apps/progression/tests/test_completion_hook.py backend_django/apps/simulation/services/game_service.py
git commit -m "feat(progression): record StudentCaseCompletion when an attempt reaches COMPLETED"
```

---

## Task 3: `/api/simulation/catalog` endpoint

**Files:**
- Create: `apps/progression/catalog.py`
- Modify: `apps/simulation/views/game_views.py`
- Modify: `apps/simulation/urls.py`
- Create: `apps/progression/tests/test_catalog.py`

- [ ] **Step 1: Write the failing test**

`apps/progression/tests/test_catalog.py`:

```python
import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from apps.progression.models import StudentCaseCompletion
from apps.simulation.models import CaseVersion, SimulationCase

User = get_user_model()


def _cl(user):
    c = APIClient()
    c.force_authenticate(user=user)
    return c


@pytest.fixture
def admin(db):
    return User.objects.create_user(
        email="admin_cat@x.com", password="x", nombre="Ad", apellido="Cat", role="ADMIN"
    )


@pytest.fixture
def estudiante(db):
    return User.objects.create_user(
        email="est_cat@x.com", password="x", nombre="Est", apellido="Cat", role="ESTUDIANTE"
    )


@pytest.fixture
def second_case(db, admin):
    """A second PUBLISHED case so progression/unlock is testable (only SIM-VBG-001 is seeded)."""
    case = SimulationCase.objects.create(
        code="SIM-CAT-TEST-002", title="Caso de prueba 2", description="stub",
        active=True, created_by=admin,
    )
    return CaseVersion.objects.create(
        simulation_case=case, semantic_version="1.0.0", status="PUBLISHED",
        created_by=admin, published_at=timezone.now(),
    )


def test_student_sees_first_unlocked_rest_locked(estudiante, second_case):
    data = _cl(estudiante).get("/api/simulation/catalog").data["data"]
    assert len(data) >= 2
    assert data[0]["unlocked"] is True and data[0]["order"] == 0
    # the freshly-created second case is last (ordered by created_at) and locked
    last = data[-1]
    assert last["caseVersionId"] == second_case.id
    assert last["unlocked"] is False and last["locked"] is True
    for key in ("caseVersionId", "code", "title", "description", "order", "unlocked", "completed", "locked"):
        assert key in data[0]


def test_completing_first_unlocks_second(estudiante, second_case):
    first = _cl(estudiante).get("/api/simulation/catalog").data["data"][0]
    first_case_id = CaseVersion.objects.get(pk=first["caseVersionId"]).simulation_case_id
    StudentCaseCompletion.objects.create(
        student_id=estudiante.id, simulation_case_id=first_case_id,
        first_completed_at=timezone.now(),
    )
    data = _cl(estudiante).get("/api/simulation/catalog").data["data"]
    assert data[0]["completed"] is True
    assert data[1]["unlocked"] is True  # next case now unlocked


def test_staff_sees_everything_unlocked(admin, second_case):
    data = _cl(admin).get("/api/simulation/catalog").data["data"]
    assert all(item["unlocked"] for item in data)
    assert all(not item["locked"] for item in data)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend_django && .venv/Scripts/python.exe -m pytest apps/progression/tests/test_catalog.py -q`
Expected: FAIL — 404 (`/api/simulation/catalog` not mounted).

- [ ] **Step 3: Write the catalog builder**

`apps/progression/catalog.py`:

```python
"""Builds the per-actor case catalog with linear unlock state.

Published cases ordered by created_at form the linear sequence. Case i is
unlocked iff the student completed case i-1 (case 0 always unlocked).
PROFESOR/ADMIN see everything unlocked.
"""
from apps.simulation.models import CaseVersion

from .models import StudentCaseCompletion


def build_catalog(actor):
    versions = list(
        CaseVersion.objects.filter(status="PUBLISHED", simulation_case__active=True)
        .select_related("simulation_case")
        .order_by("created_at", "id")
    )
    is_staff = getattr(actor, "role", None) in ("PROFESOR", "ADMIN")
    completed_ids = set()
    if not is_staff:
        completed_ids = set(
            StudentCaseCompletion.objects.filter(student_id=actor.id)
            .values_list("simulation_case_id", flat=True)
        )

    items = []
    prev_completed = True  # case 0 always unlocked
    for order, v in enumerate(versions):
        case_id = v.simulation_case_id
        completed = case_id in completed_ids
        unlocked = True if is_staff else prev_completed
        items.append({
            "caseVersionId": v.id,
            "code": v.simulation_case.code,
            "title": v.simulation_case.title,
            "description": v.simulation_case.description,
            "order": order,
            "unlocked": unlocked,
            "completed": completed,
            "locked": not unlocked,
        })
        prev_completed = True if is_staff else completed
    return items
```

- [ ] **Step 4: Add the view**

In `apps/simulation/views/game_views.py`, add this class at the end of the file (the imports `APIView`, `IsAuthenticated`, `api_ok` are already present):

```python
class CatalogView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.progression.catalog import build_catalog
        return api_ok(build_catalog(request.user))
```

- [ ] **Step 5: Mount the route**

In `apps/simulation/urls.py`, add `CatalogView` to the import from `game_views` and add the route as the first entry in `urlpatterns`:

```python
from apps.simulation.views.game_views import (
    ActiveAttemptView,
    AttemptView,
    CasesView,
    CatalogView,
    CompletionReportView,
    DecisionsView,
    InteractionView,
    ProgressMapView,
    ReflectionsView,
    SafeExitView,
    StartAttemptView,
    ToolUseView,
    WorldStateView,
    WorldView,
)

# Mounted at "api/simulation".
urlpatterns = [
    path("/catalog", CatalogView.as_view()),
    path("/cases", CasesView.as_view()),
    # ... (leave the rest unchanged) ...
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `cd backend_django && .venv/Scripts/python.exe -m pytest apps/progression/tests/test_catalog.py -q`
Expected: PASS (3 passed).

- [ ] **Step 7: Run the full suite + check**

Run: `cd backend_django && .venv/Scripts/python.exe -m pytest -q && .venv/Scripts/python.exe manage.py check`
Expected: all green; `check` exits 0 (only benign `urls.W002` warnings).

- [ ] **Step 8: Commit**

```bash
git add backend_django/apps/progression/catalog.py backend_django/apps/progression/tests/test_catalog.py backend_django/apps/simulation/views/game_views.py backend_django/apps/simulation/urls.py
git commit -m "feat(progression): GET /api/simulation/catalog with per-student unlock state"
```

---

## Task 4: Frontend API — `getCatalog()` + `CatalogItem`

**Repo:** `psicologia_proyecto/admin-panel`

**Files:**
- Modify: `src/app/core/models/simulation.model.ts`
- Modify: `src/app/core/api/simulation.service.ts`
- Create: `src/app/core/api/simulation-catalog.service.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `src/app/core/api/simulation-catalog.service.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { SimulationService } from './simulation.service';

describe('SimulationService.getCatalog', () => {
  let service: SimulationService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SimulationService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SimulationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('GETs /api/simulation/catalog and unwraps the envelope', () => {
    const items = [
      { caseVersionId: 1, code: 'SIM-VBG-001', title: 'Caso 1', description: 'd',
        order: 0, unlocked: true, completed: false, locked: false },
    ];
    let result: unknown;
    service.getCatalog().subscribe(r => (result = r));
    const req = httpMock.expectOne('/api/simulation/catalog');
    expect(req.request.method).toBe('GET');
    req.flush({ data: items });
    expect(result).toEqual(items);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd admin-panel && npm test -- --testPathPattern simulation-catalog.service`
Expected: FAIL — `service.getCatalog is not a function` (and `CatalogItem` import unresolved if referenced).

- [ ] **Step 3: Add the `CatalogItem` model**

In `src/app/core/models/simulation.model.ts`, add (anywhere among the exported interfaces):

```typescript
export interface CatalogItem {
  caseVersionId: number;
  code: string;
  title: string;
  description: string;
  order: number;
  unlocked: boolean;
  completed: boolean;
  locked: boolean;
}
```

- [ ] **Step 4: Add `getCatalog()` to the service**

In `src/app/core/api/simulation.service.ts`, add `CatalogItem` to the import list from `../models/simulation.model`, then add this method right after `listCases()`:

```typescript
  getCatalog() {
    return this.http.get<ApiResponse<CatalogItem[]>>(`${this.API}/catalog`)
      .pipe(map(response => response.data));
  }
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd admin-panel && npm test -- --testPathPattern simulation-catalog.service`
Expected: PASS (1 test).

- [ ] **Step 6: Commit (frontend repo)**

```bash
cd /d/Sua_Files/IdeaProjects/psicologia_proyecto
git add admin-panel/src/app/core/models/simulation.model.ts admin-panel/src/app/core/api/simulation.service.ts admin-panel/src/app/core/api/simulation-catalog.service.spec.ts
git commit -m "feat(game-shell): SimulationService.getCatalog() + CatalogItem model"
```

---

## Task 5: `GameMenuComponent` + `ClinicMenuScene` + route + nav

**Repo:** `psicologia_proyecto/admin-panel`

**Files:**
- Create: `src/app/features/simulator/game-menu.component.ts`
- Modify: `src/app/app.routes.ts`
- Modify: `src/app/shared/layout/shell.component.ts`

- [ ] **Step 1: Create the component + Phaser scene**

Create `src/app/features/simulator/game-menu.component.ts`:

```typescript
import { CommonModule } from '@angular/common';
import { Component, ElementRef, NgZone, OnDestroy, ViewChild, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import Phaser from 'phaser';
import { SimulationService } from '../../core/api/simulation.service';
import { CatalogItem } from '../../core/models/simulation.model';

interface MenuCallbacks {
  onEnter: (caseVersionId: number) => void;
  onFocus: (item: CatalogItem | null) => void;
}

class ClinicMenuScene extends Phaser.Scene {
  private player?: Phaser.GameObjects.Container;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys?: Record<string, Phaser.Input.Keyboard.Key>;
  private doors: { item: CatalogItem; x: number }[] = [];
  private nearestId: number | null = null;
  private readonly worldW: number;
  private readonly spacing = 260;
  private readonly doorY = 320;
  private readonly floorY = 380;

  constructor(private readonly items: CatalogItem[], private readonly cb: MenuCallbacks) {
    super('ClinicMenuScene');
    this.worldW = Math.max(960, 220 + items.length * this.spacing + 200);
  }

  create() {
    const W = this.worldW, H = 540;
    this.cameras.main.setBounds(0, 0, W, H);
    this.add.rectangle(0, 0, W, H, 0x0e141a).setOrigin(0, 0);
    this.add.rectangle(0, this.floorY, W, H - this.floorY, 0x1b2733).setOrigin(0, 0);
    this.add.rectangle(0, 120, W, this.doorY - 60, 0x223247).setOrigin(0, 0);
    this.add.text(24, 140, 'CLÍNICA · SIEP', {
      fontFamily: 'monospace', fontSize: '22px', color: '#9dc0e8',
    }).setScrollFactor(1);

    this.doors = [];
    this.items.forEach((item, i) => {
      const x = 220 + i * this.spacing;
      const open = item.unlocked;
      const color = item.completed ? 0x2f7476 : open ? 0x4f7cac : 0x3a3f47;
      const door = this.add.rectangle(x, this.doorY, 96, 140, color).setOrigin(0.5, 1);
      door.setStrokeStyle(3, open ? 0x9dc0e8 : 0x555a63);
      this.add.text(x, this.doorY - 168, item.title, {
        fontFamily: 'sans-serif', fontSize: '15px', color: open ? '#e8f0f4' : '#7a808a',
        align: 'center', wordWrap: { width: 180 },
      }).setOrigin(0.5, 1);
      const badge = item.completed ? '✓ Resuelto' : open ? '▶ Disponible' : '🔒 Bloqueado';
      this.add.text(x, this.doorY - 150, badge, {
        fontFamily: 'monospace', fontSize: '12px',
        color: item.completed ? '#8cbfa6' : open ? '#9dc0e8' : '#7a808a',
      }).setOrigin(0.5, 1);
      this.doors.push({ item, x });
    });

    const body = this.add.rectangle(0, 0, 22, 34, 0x8a6cff).setStrokeStyle(2, 0xffffff);
    const head = this.add.circle(0, -24, 9, 0xf2c9a0);
    this.player = this.add.container(220, this.floorY - 17, [body, head]);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    this.cursors = this.input.keyboard?.createCursorKeys();
    this.keys = this.input.keyboard?.addKeys('A,D,E,SPACE,ENTER') as Record<string, Phaser.Input.Keyboard.Key>;

    this.add.text(12, 12, '← → / A D  mover · E entrar', {
      fontFamily: 'monospace', fontSize: '13px', color: 'rgba(232,240,244,0.5)',
    }).setScrollFactor(0);
  }

  override update(_t: number, dt: number) {
    if (!this.player || !this.keys) return;
    const speed = 0.3 * dt;
    let vx = 0;
    if (this.cursors?.left?.isDown || this.keys['A']?.isDown) vx -= speed;
    if (this.cursors?.right?.isDown || this.keys['D']?.isDown) vx += speed;
    this.player.setPosition(Phaser.Math.Clamp(this.player.x + vx, 40, this.worldW - 40), this.player.y);

    let near: { item: CatalogItem; x: number } | null = null;
    let nd = Infinity;
    for (const d of this.doors) {
      const dist = Math.abs(d.x - this.player.x);
      if (dist < nd) { nd = dist; near = d; }
    }
    const nextId = near && nd <= 70 ? near.item.caseVersionId : null;
    if (nextId !== this.nearestId) {
      this.nearestId = nextId;
      this.cb.onFocus(near && nd <= 70 ? near.item : null);
    }

    const pressed =
      Phaser.Input.Keyboard.JustDown(this.keys['E']) ||
      Phaser.Input.Keyboard.JustDown(this.keys['SPACE']) ||
      Phaser.Input.Keyboard.JustDown(this.keys['ENTER']);
    if (pressed && near && nd <= 70) {
      if (near.item.unlocked) this.cb.onEnter(near.item.caseVersionId);
      else this.cameras.main.shake(180, 0.004);
    }
  }
}

@Component({
  selector: 'app-game-menu',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatProgressBarModule],
  template: `
    <div class="menu-root">
      @if (loading()) { <mat-progress-bar mode="indeterminate" aria-label="Cargando casos" /> }
      @if (error()) {
        <div class="menu-error" role="alert"><mat-icon>error</mat-icon><span>{{ error() }}</span></div>
      }
      <div #host class="phaser-host" role="application"
           aria-label="Menú de casos. Flechas o A/D para moverte, E para entrar a una puerta disponible."></div>

      @if (focused(); as f) {
        <div class="case-banner" [class.case-banner--locked]="!f.unlocked" aria-live="polite">
          <strong>{{ f.title }}</strong>
          <span>{{ f.completed ? 'Resuelto' : f.unlocked ? 'Disponible — pulsa E para entrar' : 'Bloqueado — completa el caso anterior' }}</span>
        </div>
      }

      @if (entering(); as title) {
        <div class="enter-card" aria-hidden="true"><p class="psy-eyebrow">Entrando al caso</p><h2>{{ title }}</h2></div>
      }

      <ul class="sr-only">
        @for (c of catalog(); track c.caseVersionId) {
          <li><button type="button" [disabled]="!c.unlocked" (click)="enter(c.caseVersionId)">
            {{ c.title }} — {{ c.completed ? 'resuelto' : c.unlocked ? 'disponible' : 'bloqueado' }}
          </button></li>
        }
      </ul>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .menu-root { position: fixed; inset: 0; overflow: hidden; background: #0a0f14; }
    .phaser-host { position: absolute; inset: 0; }
    :host ::ng-deep .phaser-host canvas { display: block; width: 100% !important; height: 100% !important; }
    .menu-error {
      position: absolute; inset: 0; z-index: 30; display: flex; gap: 12px;
      align-items: center; justify-content: center; color: #e8f0f4; background: rgba(8,12,18,.9);
    }
    .case-banner {
      position: absolute; bottom: 24px; left: 50%; transform: translateX(-50%); z-index: 20;
      display: grid; gap: 4px; text-align: center; padding: 12px 22px; border-radius: 14px;
      background: rgba(8,12,18,.86); border: 1px solid rgba(79,163,165,.35); color: #e8f0f4; min-width: 280px;
    }
    .case-banner strong { font-size: 1.05rem; color: #9dc0e8; }
    .case-banner span { font-size: .82rem; color: rgba(232,240,244,.72); }
    .case-banner--locked { border-color: rgba(168,80,98,.4); }
    .case-banner--locked span { color: rgba(212,160,128,.85); }
    .enter-card {
      position: absolute; inset: 0; z-index: 40; display: flex; flex-direction: column;
      align-items: center; justify-content: center; gap: 6px; text-align: center;
      background: rgba(8,12,18,.96); color: #e8f0f4; animation: fadein 200ms ease both;
    }
    .enter-card h2 { margin: 0; font-family: 'Poppins', system-ui, sans-serif; font-size: 1.8rem; }
    @keyframes fadein { from { opacity: 0; } to { opacity: 1; } }
    .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
  `]
})
export class GameMenuComponent implements OnDestroy {
  private readonly sim = inject(SimulationService);
  private readonly router = inject(Router);
  private readonly zone = inject(NgZone);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly catalog = signal<CatalogItem[]>([]);
  readonly focused = signal<CatalogItem | null>(null);
  readonly entering = signal<string>('');

  private game?: Phaser.Game;
  private host?: ElementRef<HTMLDivElement>;

  @ViewChild('host')
  set hostRef(value: ElementRef<HTMLDivElement> | undefined) {
    this.host = value;
    if (value) this.load();
  }

  private load() {
    this.sim.getCatalog().subscribe({
      next: items => { this.catalog.set(items); this.loading.set(false); this.boot(items); },
      error: () => { this.error.set('No pudimos cargar los casos.'); this.loading.set(false); },
    });
  }

  private boot(items: CatalogItem[]) {
    if (!this.host || this.game) return;
    this.zone.runOutsideAngular(() => {
      const scene = new ClinicMenuScene(items, {
        onEnter: id => this.zone.run(() => this.enter(id)),
        onFocus: item => this.zone.run(() => this.focused.set(item)),
      });
      this.game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: this.host!.nativeElement,
        width: 960, height: 540,
        backgroundColor: '#0e141a',
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 960, height: 540 },
        scene,
      });
    });
  }

  enter(caseVersionId: number) {
    if (this.entering()) return;
    const item = this.catalog().find(c => c.caseVersionId === caseVersionId);
    if (item && !item.unlocked) return;
    this.entering.set(item?.title ?? 'Caso');
    window.setTimeout(() => this.router.navigate(['/portal/simulador', caseVersionId]), 900);
  }

  ngOnDestroy() { this.game?.destroy(true); }
}
```

- [ ] **Step 2: Add the route**

In `src/app/app.routes.ts`, add this child route inside the `portal` `children` array, right before the `simulador` entry:

```typescript
      {
        path: 'jugar',
        loadComponent: () => import('./features/simulator/game-menu.component').then(m => m.GameMenuComponent)
      },
```

- [ ] **Step 3: Add the nav item**

In `src/app/shared/layout/shell.component.ts`, find the nav array entry for `Simulador` (around line 211) and add a `Jugar` entry immediately before it:

```typescript
    { label: 'Jugar',      icon: 'sports_esports', route: '/portal/jugar',     caption: 'Modo juego',           roles: ['ESTUDIANTE', 'PROFESOR', 'ADMIN'] },
    { label: 'Simulador',  icon: 'play_circle',  route: '/portal/simulador',             caption: 'Simulación formativa', roles: ['ESTUDIANTE', 'PROFESOR', 'ADMIN'] },
```

- [ ] **Step 4: Build to verify it compiles**

Run: `cd admin-panel && npx ng build --configuration development`
Expected: "Application bundle generation complete" with no TypeScript errors (a lazy chunk `game-menu-component` appears).

- [ ] **Step 5: Commit (frontend repo)**

```bash
cd /d/Sua_Files/IdeaProjects/psicologia_proyecto
git add admin-panel/src/app/features/simulator/game-menu.component.ts admin-panel/src/app/app.routes.ts admin-panel/src/app/shared/layout/shell.component.ts
git commit -m "feat(game-shell): Phaser clinic menu-world at /portal/jugar with progression doors"
```

---

## Task 6: End-to-end smoke verification

**Files:** none committed (throwaway script under the OS temp dir).

- [ ] **Step 1: Start both servers**

Backend (background): `cd backend_django && .venv/Scripts/python.exe manage.py runserver 8091 --noreload --settings=psychosim.settings.local`
Frontend (background): `cd admin-panel && npm start` (serves `:4200`, proxy → `:8091`). Wait for "Application bundle generation complete".

- [ ] **Step 2: Write the Playwright smoke**

Create `%TEMP%\siep_menu_smoke.py`:

```python
import os
from playwright.sync_api import sync_playwright

SHOTS = os.path.join(os.environ.get("TEMP", "/tmp"), "siep_shots")
os.makedirs(SHOTS, exist_ok=True)
BASE = "http://localhost:4200"

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    pg = b.new_page(viewport={"width": 1440, "height": 900})
    pg.goto(f"{BASE}/login", wait_until="networkidle", timeout=60000)
    pg.wait_for_timeout(500)
    pg.fill('input[type="email"]', "estudiante@psychosim.edu.co")
    pg.fill('input[type="password"]', "Estudiante123!")
    try:
        pg.get_by_role("button", name="Ingresar").first.click(timeout=4000)
    except Exception:
        pg.locator('button[type="submit"]').first.click()
    pg.wait_for_load_state("networkidle"); pg.wait_for_timeout(800)

    pg.goto(f"{BASE}/portal/jugar", wait_until="networkidle", timeout=60000)
    pg.wait_for_selector("canvas", timeout=15000)
    pg.wait_for_timeout(2500)
    items = pg.eval_on_selector_all('.menu-root ul.sr-only button', "els=>els.map(e=>e.innerText.trim())")
    print("CATALOG DOORS:", items)
    assert any("disponible" in t.lower() for t in items), "expected at least one available case"
    pg.screenshot(path=os.path.join(SHOTS, "10-menu.png"))

    # enter the first available case via the accessible list
    pg.evaluate("""() => {
      const b=[...document.querySelectorAll('.menu-root ul.sr-only button')].find(x=>!x.disabled);
      if(b)b.click();
    }""")
    pg.wait_for_timeout(1500)
    pg.wait_for_url("**/portal/simulador/**", timeout=15000)
    print("ENTERED:", pg.url)
    pg.wait_for_selector("app-simulation-hud", timeout=15000)
    pg.screenshot(path=os.path.join(SHOTS, "11-entered.png"))
    b.close()
print("MENU SMOKE OK")
```

- [ ] **Step 3: Run the smoke**

Run: `cd backend_django && .venv/Scripts/python.exe "%TEMP%\siep_menu_smoke.py"`
Expected: prints `CATALOG DOORS:` with at least one "disponible", `ENTERED: .../portal/simulador/1`, and `MENU SMOKE OK`. Review `10-menu.png` (clinic doors) and `11-entered.png` (case loaded).

- [ ] **Step 4: Stop the servers**

Stop the backend (`:8091`) and frontend (`:4200`) background processes.

---

## Self-Review

**1. Spec coverage:**
- Menu-world (Phaser, arrows, doors, walk-in) → Task 5. ✅
- Intro cinematic (title card → fade → start) → `entering` overlay in Task 5. ✅
- Progression backend (Django-owned table) → Task 1. ✅
- Completion on COMPLETED only (not SAFE_EXITED) → Task 2 (+ negative test). ✅
- `/api/simulation/catalog` with locked/unlocked/completed; staff all-unlocked; `/cases` untouched → Task 3. ✅
- Linear order by `created_at` → Task 3 (`build_catalog`). ✅
- New route `/portal/jugar`, `/portal/simulador` kept → Task 5. ✅
- Existing game/admin/teacher unchanged → only additive changes; the COMPLETED branch in `choose_decision` is appended, not rewritten. ✅
- Migration applied to real DB + test-DB availability → Task 1 Steps 6-8. ✅
- Testing (backend TDD + frontend smoke) → Tasks 1-4 (unit) + Task 6 (smoke). ✅

**2. Placeholder scan:** No TBD/TODO; every code step has complete content. ✅

**3. Type consistency:** `CatalogItem` fields `{caseVersionId, code, title, description, order, unlocked, completed, locked}` are identical across the backend dict (Task 3 `build_catalog`), the frontend interface (Task 4), and the menu scene/component usage (Task 5). `StudentCaseCompletion` columns `{student_id, simulation_case_id, first_completed_at, created_at}` match across model (Task 1), recorder (Task 2), and catalog query (Task 3). `record_case_completion(student_id, simulation_case_id)` signature matches its call site in `choose_decision`. ✅

---

## Notes / risks (carried from the spec)

- `student_case_completion` is the first Django-managed table. Tests reuse `psychosim` (`--reuse-db`), so applying the migration once (Task 1 Step 6) makes the table available to pytest. If a run uses `--create-db`, re-apply `migrate progression` first.
- Art is intentionally simple (rectangles/text) — visual polish belongs to Sub-project B (living world). The look is iterated live in-browser.
- Cross-repo: backend commits land in `psico_project_v2`; frontend commits in `psicologia_proyecto/admin-panel`.
