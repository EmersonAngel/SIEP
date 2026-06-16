"""Mirrors Spring InstructorSimulationService 1:1 (application/InstructorSimulationService.java).

Instructor review of student attempts: recent list, full trace (timeline +
DECRYPTED reflections for authorized review + rubric summaries, with anonymized
student alias), and rubric evaluation read/save.
"""
import json

from django.db import connection, transaction
from rest_framework.exceptions import NotFound, PermissionDenied

from apps.simulation.serializers import game_dtos as dto

from ..models import (
    AttemptEvent,
    CriterionScore,
    ReflectionJournal,
    Rubric,
    RubricCriterion,
    RubricEvaluation,
    SimulationAttempt,
)
from . import crypto_service, world_service
from . import rubric_service


def _dt(value):
    return value.isoformat() if value else None


def _anonymize(attempt):
    return f"Estudiante-{attempt.student_id if attempt.student_id is not None else 0}"


def _read_map(raw):
    if not raw or not str(raw).strip():
        return {}
    try:
        value = json.loads(raw)
        return value if isinstance(value, dict) else {}
    except (ValueError, TypeError):
        return {}


def _student_ids_for_instructor(instructor):
    if getattr(instructor, "role", None) == "ADMIN":
        return None
    with connection.cursor() as cur:
        cur.execute(
            "SELECT DISTINCT ge.estudiante_id "
            "FROM grupo_estudiante ge "
            "JOIN grupos g ON g.id = ge.grupo_id "
            "WHERE g.profesor_id = %s AND g.activo = TRUE",
            [instructor.id],
        )
        return [row[0] for row in cur.fetchall()]


def _require_attempt(attempt_id, instructor=None):
    attempt = (
        SimulationAttempt.objects.filter(pk=attempt_id)
        .select_related("case_version__simulation_case", "current_node", "student")
        .first()
    )
    if not attempt:
        raise NotFound("Intento no encontrado")
    if instructor is not None and getattr(instructor, "role", None) != "ADMIN":
        student_ids = _student_ids_for_instructor(instructor)
        if attempt.student_id not in student_ids:
            raise PermissionDenied("No tienes permiso para revisar este intento")
    return attempt


def recent_attempts(instructor):
    attempts = (
        SimulationAttempt.objects.select_related("case_version__simulation_case", "student")
        .filter(case_version__status="PUBLISHED", case_version__simulation_case__active=True)
        .order_by("-started_at")
    )
    student_ids = _student_ids_for_instructor(instructor)
    if student_ids is not None:
        if not student_ids:
            return []
        attempts = attempts.filter(student_id__in=student_ids)
    attempts = attempts[:20]
    return [
        {
            "attemptId": str(a.id),
            "studentAlias": _anonymize(a),
            "caseTitle": a.case_version.simulation_case.title,
            "status": a.status,
            "accumulatedScore": a.accumulated_score,
            "stressIndex": a.stress_index,
            "startedAt": _dt(a.started_at),
        }
        for a in attempts
    ]


@transaction.atomic
def trace(attempt_id, instructor=None):
    attempt = _require_attempt(attempt_id, instructor)
    events = list(
        AttemptEvent.objects.filter(attempt_id=attempt_id)
        .select_related("node", "decision_option")
        .order_by("occurred_at", "id")
    )
    report = dto.build_completion_report(attempt, events)
    total_duration = report["totalDurationSeconds"]
    if total_duration is None and attempt.started_at and events:
        last_at = events[-1].occurred_at
        if last_at:
            total_duration = int((last_at - attempt.started_at).total_seconds())
    return {
        "attemptId": str(attempt.id),
        "studentAlias": _anonymize(attempt),
        "caseTitle": attempt.case_version.simulation_case.title,
        "status": attempt.status,
        "accumulatedScore": attempt.accumulated_score,
        "stressIndex": attempt.stress_index,
        "metrics": dto.metrics(attempt),
        "startedAt": _dt(attempt.started_at),
        "endedAt": _dt(attempt.ended_at),
        "adequateDecisions": report["adequateDecisions"],
        "riskyDecisions": report["riskyDecisions"],
        "inadequateDecisions": report["inadequateDecisions"],
        "prohibitedDecisions": report["prohibitedDecisions"],
        "safeExitUsed": report["safeExitUsed"],
        "totalDurationSeconds": total_duration,
        "timeline": report["timeline"],
        "visitedNodeTitles": report["visitedNodeTitles"],
        "events": [_to_trace_event(e) for e in events],
        "world": world_service.world_for_attempt(attempt),
        "reflections": [
            {
                "nodeId": r.node_id,
                "nodeTitle": r.node.title,
                "text": crypto_service.decrypt(r.encrypted_text),
                "locked": r.locked,
            }
            for r in ReflectionJournal.objects.filter(attempt_id=attempt_id).select_related("node")
        ],
        "rubricEvaluations": [
            {
                "id": ev.id,
                "rubricName": ev.rubric.name,
                "totalScore": float(ev.total_score),
                "comment": ev.comment,
                "evaluatedAt": _dt(ev.evaluated_at),
            }
            for ev in RubricEvaluation.objects.filter(attempt_id=attempt_id)
            .select_related("rubric")
            .order_by("-evaluated_at")
        ],
    }


def rubric(attempt_id, instructor=None):
    _require_attempt(attempt_id, instructor)
    return rubric_service.attempt_rubric_view(attempt_id)


@transaction.atomic
def save_rubric(attempt_id, request, instructor):
    _require_attempt(attempt_id, instructor)
    return rubric_service.save_attempt_evaluation(attempt_id, request, instructor)


# ─── DTO builders ─────────────────────────────────────────────────────────────
def _to_trace_event(event):
    classification = event.decision_option.classification if event.decision_option_id else None
    return {
        "type": event.event_type,
        "classification": classification,
        "nodeTitle": event.node.title if event.node_id else None,
        "decisionText": event.decision_option.text if event.decision_option_id else None,
        "scoreDelta": event.score_delta,
        "stressDelta": event.stress_delta,
        "detail": event.detail,
        "occurredAt": _dt(event.occurred_at),
    }


def _criterion_view(criterion):
    return {
        "id": criterion.id,
        "competency": criterion.competency,
        "title": criterion.title,
        "description": criterion.description,
        "maxScore": criterion.max_score,
        "displayOrder": criterion.display_order,
    }


def _score_view(score):
    return {
        "criterionId": score.rubric_criterion_id,
        "score": float(score.score),
        "comment": score.comment,
        "evidence": _read_map(score.evidence_json),
    }


def _rubric_view(rubric_obj, scores, total_score, comment):
    return {
        "rubricId": rubric_obj.id,
        "rubricName": rubric_obj.name,
        "description": rubric_obj.description,
        "criteria": [
            _criterion_view(c)
            for c in RubricCriterion.objects.filter(rubric_id=rubric_obj.id).order_by("display_order")
        ],
        "scores": [_score_view(s) for s in scores],
        "totalScore": total_score,
        "comment": comment,
    }
