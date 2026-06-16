import json
from decimal import Decimal, ROUND_HALF_UP

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import NotFound, ValidationError

from apps.simulation.models import (
    CaseVersion,
    CriterionScore,
    Rubric,
    RubricCriterion,
    RubricEvaluation,
    SimulationAttempt,
    SimulationRubricAssignment,
)

BASIC_RUBRIC_NAME = "R\u00fabrica b\u00e1sica de desempe\u00f1o SIEP"
BASIC_RUBRIC_DESCRIPTION = (
    "Instrumento general para evaluar el análisis, la toma de decisiones, "
    "la actuación profesional, la argumentación y la reflexión del estudiante "
    "durante una simulación psicosocial."
)

BASIC_CRITERIA = [
    (
        "COMPRENSION_SITUACION",
        "Identificación y comprensión de la situación",
        "Reconoce el problema central, factores personales, familiares, sociales y contextuales; diferencia hechos, interpretaciones y supuestos; reconoce señales de riesgo y protección.",
        Decimal("20.00"),
    ),
    (
        "ANALISIS_ARGUMENTACION",
        "Análisis psicosocial y argumentación",
        "Relaciona la información del caso, sustenta decisiones, emplea conceptos pertinentes, evita conclusiones sin evidencia y demuestra pensamiento crítico.",
        Decimal("20.00"),
    ),
    (
        "DECISION_RUTA",
        "Toma de decisiones y ruta de atención",
        "Selecciona acciones adecuadas, establece prioridades, reconoce remisiones pertinentes, aplica la ruta de atención y evita acciones que aumenten el riesgo.",
        Decimal("20.00"),
    ),
    (
        "COMUNICACION_EMPATIA",
        "Comunicación, empatía y trato profesional",
        "Usa lenguaje respetuoso, escucha activa, evita juicios y estigmatización, valida emocionalmente y mantiene actitud ética.",
        Decimal("15.00"),
    ),
    (
        "PAP",
        "Aplicación de primeros auxilios psicológicos",
        "Establece contacto seguro, identifica necesidades inmediatas, reduce activación emocional, orienta y conecta con apoyos adecuados; reconoce los límites de los primeros auxilios psicológicos.",
        Decimal("15.00"),
    ),
    (
        "REFLEXION",
        "Reflexión, bitácora y aprendizaje",
        "Registra decisiones relevantes, reconoce aciertos y errores, reflexiona sobre consecuencias, integra retroalimentación y propone mejoras.",
        Decimal("10.00"),
    ),
]


def _decimal(value, default="0"):
    if value in (None, ""):
        return Decimal(default)
    return Decimal(str(value))


def _criteria_qs(rubric):
    return RubricCriterion.objects.filter(rubric_id=rubric.id, active=True).order_by("display_order", "id")


def _weight(criterion):
    return Decimal(criterion.weight or criterion.max_score or 0)


def _normalize_criteria_weights(criteria):
    total = sum((_weight(c) for c in criteria), Decimal("0"))
    if total == Decimal("100.00") or not criteria:
        return criteria
    each = (Decimal("100") / len(criteria)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    rubric_id = criteria[0].rubric_id
    for index, criterion in enumerate(criteria):
        weight = each
        if index == 0:
            weight += Decimal("100.00") - (each * len(criteria))
        RubricCriterion.objects.filter(pk=criterion.id).update(weight=weight)
    return list(_criteria_qs(Rubric.objects.get(pk=rubric_id)))


def _validate_weights(criteria):
    if not criteria:
        raise ValidationError("La rubrica debe tener al menos un criterio activo")
    total = sum((_weight(c) for c in criteria), Decimal("0"))
    if total != Decimal("100.00"):
        raise ValidationError("La suma de ponderaciones activas debe ser exactamente 100")


def _rubric_summary(rubric):
    criteria = list(RubricCriterion.objects.filter(rubric_id=rubric.id).order_by("display_order", "id"))
    total = sum((_weight(c) for c in criteria if c.active), Decimal("0"))
    return {
        "id": rubric.id,
        "name": rubric.name,
        "description": rubric.description,
        "active": rubric.active,
        "version": rubric.version,
        "isDefault": rubric.is_default,
        "totalWeight": float(total),
        "criteriaCount": len(criteria),
        "createdAt": rubric.created_at.isoformat() if rubric.created_at else None,
        "updatedAt": rubric.updated_at.isoformat() if rubric.updated_at else None,
    }


def rubric_detail(rubric):
    data = _rubric_summary(rubric)
    data["criteria"] = [
        {
            "id": c.id,
            "competency": c.competency,
            "title": c.title,
            "description": c.description,
            "weight": float(_weight(c)),
            "maxScore": c.max_score,
            "displayOrder": c.display_order,
            "active": c.active,
        }
        for c in RubricCriterion.objects.filter(rubric_id=rubric.id).order_by("display_order", "id")
    ]
    return data


def list_rubrics():
    return [_rubric_summary(r) for r in Rubric.objects.order_by("-is_default", "-active", "name", "id")]


def get_rubric(rubric_id):
    rubric = Rubric.objects.filter(pk=rubric_id).first()
    if not rubric:
        raise NotFound("Rubrica no encontrada")
    return rubric_detail(rubric)


def _write_criteria(rubric, criteria_payload):
    kept_ids = []
    for index, item in enumerate(criteria_payload or [], start=1):
        weight = _decimal(item.get("weight"))
        if weight < 0 or weight > 100:
            raise ValidationError("Cada ponderacion debe estar entre 0 y 100")
        criterion_id = item.get("id")
        criterion = None
        if criterion_id:
            criterion = RubricCriterion.objects.filter(pk=criterion_id, rubric_id=rubric.id).first()
        if not criterion:
            competency = str(item.get("competency") or item.get("title") or "").strip()[:100]
            criterion = RubricCriterion.objects.filter(rubric=rubric, competency=competency).first()
        if not criterion:
            criterion = RubricCriterion(rubric=rubric)
        criterion.competency = str(item.get("competency") or item.get("title") or "").strip()[:100]
        criterion.title = str(item.get("title") or item.get("name") or "").strip()
        criterion.description = str(item.get("description") or "").strip()
        criterion.weight = weight
        criterion.max_score = int(weight)
        criterion.active = bool(item.get("active", True))
        criterion.display_order = int(item.get("displayOrder") or item.get("order") or index)
        criterion.save()
        kept_ids.append(criterion.id)
    if kept_ids:
        RubricCriterion.objects.filter(rubric_id=rubric.id).exclude(id__in=kept_ids).update(active=False)
    else:
        RubricCriterion.objects.filter(rubric_id=rubric.id).update(active=False)


@transaction.atomic
def create_rubric(data, user):
    rubric = Rubric.objects.create(
        name=str(data.get("name") or "").strip(),
        description=data.get("description") or "",
        active=bool(data.get("active", False)),
        version=str(data.get("version") or "1.0"),
        is_default=False,
        updated_at=timezone.now(),
        created_by=user,
    )
    _write_criteria(rubric, data.get("criteria") or [])
    if rubric.active:
        _validate_weights(list(_criteria_qs(rubric)))
    if data.get("isDefault"):
        set_default(rubric.id)
    return rubric_detail(rubric)


@transaction.atomic
def update_rubric(rubric_id, data):
    rubric = Rubric.objects.filter(pk=rubric_id).first()
    if not rubric:
        raise NotFound("Rubrica no encontrada")
    if "name" in data:
        rubric.name = str(data.get("name") or "").strip()
    if "description" in data:
        rubric.description = data.get("description") or ""
    if "version" in data:
        rubric.version = str(data.get("version") or rubric.version)
    if "active" in data:
        rubric.active = bool(data.get("active"))
    rubric.updated_at = timezone.now()
    rubric.save()
    if "criteria" in data:
        _write_criteria(rubric, data.get("criteria") or [])
    if rubric.active:
        _validate_weights(list(_criteria_qs(rubric)))
    if data.get("isDefault"):
        set_default(rubric.id)
    return rubric_detail(rubric)


@transaction.atomic
def activate(rubric_id, active):
    rubric = Rubric.objects.filter(pk=rubric_id).first()
    if not rubric:
        raise NotFound("Rubrica no encontrada")
    if active:
        _validate_weights(list(_criteria_qs(rubric)))
    rubric.active = active
    if not active and rubric.is_default:
        rubric.is_default = False
    rubric.updated_at = timezone.now()
    rubric.save()
    return rubric_detail(rubric)


@transaction.atomic
def duplicate(rubric_id, user):
    source = Rubric.objects.filter(pk=rubric_id).first()
    if not source:
        raise NotFound("Rubrica no encontrada")
    clone = Rubric.objects.create(
        name=f"Copia de {source.name}",
        description=source.description,
        active=False,
        version=source.version,
        is_default=False,
        updated_at=timezone.now(),
        created_by=user,
    )
    for c in RubricCriterion.objects.filter(rubric_id=source.id).order_by("display_order", "id"):
        RubricCriterion.objects.create(
            rubric=clone,
            competency=c.competency,
            title=c.title,
            description=c.description,
            weight=_weight(c),
            max_score=c.max_score,
            active=c.active,
            display_order=c.display_order,
        )
    return rubric_detail(clone)


@transaction.atomic
def set_default(rubric_id):
    rubric = Rubric.objects.filter(pk=rubric_id).first()
    if not rubric:
        raise NotFound("Rubrica no encontrada")
    if not rubric.active:
        raise ValidationError("La rubrica predeterminada debe estar activa")
    _validate_weights(list(_criteria_qs(rubric)))
    Rubric.objects.exclude(pk=rubric.id).update(is_default=False)
    rubric.is_default = True
    rubric.updated_at = timezone.now()
    rubric.save()
    return rubric_detail(rubric)


@transaction.atomic
def assign_to_case_version(case_version_id, rubric_id, user):
    case_version = CaseVersion.objects.filter(pk=case_version_id).first()
    if not case_version:
        raise NotFound("Version de caso no encontrada")
    rubric = Rubric.objects.filter(pk=rubric_id, active=True).first()
    if not rubric:
        raise NotFound("Rubrica activa no encontrada")
    _validate_weights(list(_criteria_qs(rubric)))
    SimulationRubricAssignment.objects.filter(case_version=case_version, active=True).update(active=False)
    SimulationRubricAssignment.objects.create(
        case_version=case_version,
        rubric=rubric,
        assigned_by=user,
        active=True,
    )
    return {"caseVersionId": case_version.id, "rubric": rubric_detail(rubric)}


def rubric_for_case_version(case_version_id):
    assignment = (
        SimulationRubricAssignment.objects.filter(case_version_id=case_version_id, active=True)
        .select_related("rubric")
        .first()
    )
    if assignment:
        return assignment.rubric
    specific = Rubric.objects.filter(case_version_id=case_version_id, active=True).order_by("id").first()
    if specific:
        return specific
    default = Rubric.objects.filter(is_default=True, active=True).order_by("id").first()
    if default:
        return default
    raise NotFound("No existe rubrica activa para esta simulacion")


def case_version_rubric(case_version_id):
    return rubric_detail(rubric_for_case_version(case_version_id))


def attempt_rubric_view(attempt_id, instructor=None):
    attempt = SimulationAttempt.objects.filter(pk=attempt_id).select_related("case_version").first()
    if not attempt:
        raise NotFound("Intento no encontrado")
    rubric = rubric_for_case_version(attempt.case_version_id)
    evaluation = (
        RubricEvaluation.objects.filter(attempt_id=attempt.id, rubric_id=rubric.id)
        .select_related("rubric")
        .order_by("-updated_at", "-evaluated_at", "-id")
        .first()
    )
    scores = {}
    if evaluation:
        scores = {
            s.rubric_criterion_id: s
            for s in CriterionScore.objects.filter(rubric_evaluation=evaluation)
        }
    criteria = list(_criteria_qs(rubric))
    items = []
    for c in criteria:
        score = scores.get(c.id)
        items.append({
            "criterion_id": c.id,
            "criterionId": c.id,
            "name": c.title,
            "title": c.title,
            "description": c.description,
            "weight": float(_weight(c)),
            "score": float(score.score) if score else None,
            "observations": score.comment if score else "",
            "comment": score.comment if score else "",
            "displayOrder": c.display_order,
        })
    total = evaluation.total_score if evaluation else None
    return {
        "attempt_id": str(attempt.id),
        "attemptId": str(attempt.id),
        "rubric_id": rubric.id,
        "rubricId": rubric.id,
        "rubric_name": rubric.name,
        "rubricName": rubric.name,
        "description": rubric.description,
        "status": evaluation.status if evaluation else "PENDING",
        "items": items,
        "criteria": [
            {
                "id": item["criterionId"],
                "competency": "",
                "title": item["title"],
                "description": item["description"],
                "weight": item["weight"],
                "maxScore": 5,
                "displayOrder": item["displayOrder"],
            }
            for item in items
        ],
        "scores": [
            {
                "criterionId": item["criterionId"],
                "score": item["score"],
                "comment": item["comment"],
                "evidence": {},
            }
            for item in items if item["score"] is not None
        ],
        "total_score": float(total) if total is not None else None,
        "totalScore": float(total) if total is not None else None,
        "general_observations": evaluation.comment if evaluation else "",
        "comment": evaluation.comment if evaluation else "",
    }


def _rubric_snapshot(rubric, criteria):
    return json.dumps({
        "rubricId": rubric.id,
        "rubricName": rubric.name,
        "criteria": [
            {"id": c.id, "title": c.title, "weight": str(_weight(c)), "description": c.description}
            for c in criteria
        ],
    })


@transaction.atomic
def save_attempt_evaluation(attempt_id, data, instructor):
    attempt = SimulationAttempt.objects.filter(pk=attempt_id).first()
    if not attempt:
        raise NotFound("Intento no encontrado")
    rubric = rubric_for_case_version(attempt.case_version_id)
    criteria = _normalize_criteria_weights(list(_criteria_qs(rubric)))
    _validate_weights(criteria)

    raw_scores = data.get("scores") or data.get("items") or []
    score_by_id = {}
    for item in raw_scores:
        cid = int(item.get("criterionId") or item.get("criterion_id"))
        score = item.get("score")
        if score in (None, ""):
            continue
        score = _decimal(score)
        if score < Decimal("1.0") or score > Decimal("5.0"):
            raise ValidationError("Cada calificacion debe estar entre 1.0 y 5.0")
        score_by_id[cid] = {
            "score": score,
            "comment": item.get("comment") or item.get("observations") or "",
        }

    total = Decimal("0")
    for criterion in criteria:
        if criterion.id in score_by_id:
            total += score_by_id[criterion.id]["score"] * _weight(criterion) / Decimal("100")
    total = total.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    status = "EVALUATED" if len(score_by_id) == len(criteria) else "PENDING"

    evaluation = RubricEvaluation.objects.filter(
        attempt_id=attempt.id, rubric_id=rubric.id, instructor_id=instructor.id
    ).first()
    if not evaluation:
        evaluation = RubricEvaluation(
            attempt=attempt,
            rubric=rubric,
            instructor=instructor,
            created_at=timezone.now(),
        )
    evaluation.total_score = total
    evaluation.comment = data.get("comment") or data.get("general_observations") or ""
    evaluation.status = status
    evaluation.snapshot_json = _rubric_snapshot(rubric, criteria)
    evaluation.updated_at = timezone.now()
    evaluation.save()

    CriterionScore.objects.filter(rubric_evaluation=evaluation).delete()
    for criterion in criteria:
        payload = score_by_id.get(criterion.id)
        if not payload:
            continue
        CriterionScore.objects.create(
            rubric_evaluation=evaluation,
            rubric_criterion=criterion,
            score=payload["score"],
            comment=payload["comment"],
            evidence_json="{}",
        )
    return attempt_rubric_view(attempt.id, instructor)


@transaction.atomic
def seed_default_rubric(user):
    rubric = Rubric.objects.filter(
        name__in=[
            BASIC_RUBRIC_NAME,
            "R\u00fabrica b\u00e1sica de desempe\u0144o SIEP",
            "Rubrica basica de desempeno SIEP",
        ]
    ).order_by("-is_default", "id").first()
    if not rubric:
        rubric = Rubric.objects.create(
            name=BASIC_RUBRIC_NAME,
            description=BASIC_RUBRIC_DESCRIPTION,
            active=True,
            version="1.0",
            is_default=False,
            updated_at=timezone.now(),
            created_by=user,
        )
    else:
        rubric.name = BASIC_RUBRIC_NAME
        rubric.description = BASIC_RUBRIC_DESCRIPTION
        rubric.active = True
        rubric.version = rubric.version or "1.0"
        rubric.updated_at = timezone.now()
        rubric.save()

    existing = {c.competency: c for c in RubricCriterion.objects.filter(rubric=rubric)}
    seen = set()
    for order, (competency, title, description, weight) in enumerate(BASIC_CRITERIA, start=1):
        seen.add(competency)
        criterion = existing.get(competency)
        if not criterion:
            criterion = RubricCriterion(rubric=rubric, competency=competency)
        criterion.title = title
        criterion.description = description
        criterion.weight = weight
        criterion.max_score = int(weight)
        criterion.display_order = order
        criterion.active = True
        criterion.save()
    RubricCriterion.objects.filter(rubric=rubric).exclude(competency__in=seen).update(active=False)
    set_default(rubric.id)

    for case_version in CaseVersion.objects.filter(status="PUBLISHED", simulation_case__active=True):
        if not SimulationRubricAssignment.objects.filter(case_version=case_version, active=True).exists():
            SimulationRubricAssignment.objects.create(case_version=case_version, rubric=rubric, assigned_by=user)
    return rubric_detail(rubric)
