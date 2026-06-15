"""Response DTO builders for the student simulation flow — field names match
Spring SimulationDtos exactly (camelCase JSON)."""
import json

from apps.simulation.models import (
    DecisionOption,
    ReflectionJournal,
)
from apps.simulation.services import case_effects

SAFE_EXIT_RESOURCES = [
    "Puedes pausar el intento y retomarlo con acompañamiento docente.",
    "Si el contenido activa malestar, contacta al Centro Integral de Psicología o a Bienestar Universitario.",
    "En riesgo inmediato, prioriza líneas locales de emergencia y rutas institucionales de protección.",
]


def read_string_list(raw):
    if not raw:
        return []
    try:
        value = json.loads(raw)
        return value if isinstance(value, list) else []
    except (ValueError, TypeError):
        return []


def metrics(attempt):
    return {
        "professionalScore": attempt.accumulated_score,
        "sceneStress": attempt.stress_index,
        "victimRisk": attempt.victim_risk,
        "userTrust": attempt.user_trust,
        "institutionalRouteActivated": attempt.institutional_route_activated,
        "revictimizationRisk": attempt.revictimization_risk,
    }


def case_summary(version, node_count):
    case = version.simulation_case
    return {
        "caseVersionId": version.id,
        "code": case.code,
        "title": case.title,
        "description": case.description,
        "semanticVersion": version.semantic_version,
        "nodeCount": node_count,
        "status": version.status,
    }


def decision_option_state(option):
    return {
        "id": option.id,
        "text": option.text,
        "classification": option.classification,
        "prohibitedConduct": option.prohibited_conduct,
    }


def node_state(node, include_options):
    if include_options and not node.terminal_node:
        options = [
            decision_option_state(o)
            for o in DecisionOption.objects.filter(source_node_id=node.id).order_by("id")
        ]
    else:
        options = []
    return {
        "id": node.id,
        "key": node.node_key,
        "title": node.title,
        "narrative": node.narrative,
        "supportResources": read_string_list(node.support_resources_json),
        "requiredTools": read_string_list(node.required_tools_json),
        "sensitiveContent": node.sensitive_content,
        "safeExitRequired": node.safe_exit_required,
        "warningMessage": node.warning_message,
        "terminal": node.terminal_node,
        "options": options,
    }


def feedback_dto(decision, effects, message):
    return {
        "classification": decision.classification,
        "scoreDelta": effects.score_delta,
        "stressDelta": effects.stress_delta,
        "trustDelta": effects.trust_delta,
        "victimRiskDelta": effects.victim_risk_delta,
        "prohibitedConduct": decision.prohibited_conduct,
        "institutionalRouteActivated": effects.institutional_route_activated,
        "revictimizationRisk": effects.revictimization_risk,
        "message": message,
        "prohibitionReason": decision.prohibition_reason,
    }


TIMELINE_EVENT_TYPES = {
    "DECISION_SELECTED", "PROHIBITED_DECISION_SELECTED",
    "DECISION_RETRY_REQUIRED", "PROHIBITED_DECISION_RETRY_REQUIRED",
    "TOOL_USED", "ROOM_ENTERED", "SAFE_EXIT_REQUESTED",
}


def _format_mmss(seconds):
    if seconds is None:
        return "--:--"
    minutes, secs = divmod(max(0, int(seconds)), 60)
    return f"{minutes:02d}:{secs:02d}"


def build_timeline(attempt, events):
    """Línea de tiempo de decisiones/acciones clave para el reporte del estudiante."""
    start = attempt.started_at
    timeline = []
    for ev in events:
        if ev.event_type not in TIMELINE_EVENT_TYPES:
            continue
        seconds = None
        if start and ev.occurred_at:
            seconds = int((ev.occurred_at - start).total_seconds())
        decision = ev.decision_option if ev.decision_option_id else None
        timeline.append({
            "atSeconds": seconds,
            "time": _format_mmss(seconds),
            "type": ev.event_type,
            "classification": decision.classification if decision else None,
            "prohibited": bool(decision.prohibited_conduct) if decision else False,
            "label": (decision.text if decision else ev.detail) or "",
            "scoreDelta": ev.score_delta,
            "stressDelta": ev.stress_delta,
        })
    return timeline


def build_completion_report(attempt, events):
    adequate = risky = inadequate = prohibited = tools_used = 0
    visited = []
    seen = set()
    for ev in events:
        if ev.node_id and ev.event_type == "NODE_ENTERED":
            title = ev.node.title
            if title not in seen:
                seen.add(title)
                visited.append(title)
        if ev.event_type == "TOOL_USED":
            tools_used += 1
        if ev.decision_option_id is None:
            continue
        c = ev.decision_option.classification
        if c == "ADEQUATE":
            adequate += 1
        elif c == "RISKY":
            risky += 1
        elif c == "INADEQUATE":
            inadequate += 1
        if ev.decision_option.prohibited_conduct:
            prohibited += 1

    reflections_count = ReflectionJournal.objects.filter(attempt_id=attempt.id).count()

    competencies = []
    if attempt.institutional_route_activated:
        competencies.append("Articulación con rutas institucionales de protección")
    if adequate > 0:
        competencies.append("Comunicación ética y contención emocional")
    if tools_used > 0:
        competencies.append("Uso pertinente de herramientas clínicas")
    if reflections_count > 0:
        competencies.append("Reflexión clínica documentada")

    recommendations = []
    if risky > 0 or inadequate > 0:
        recommendations.append("Revisa las decisiones riesgosas o inadecuadas con tu docente en sesión de retroalimentación.")
    if attempt.stress_index >= 70:
        recommendations.append("Practica estrategias de autorregulación antes de escenarios de alta carga emocional.")
    if attempt.revictimization_risk:
        recommendations.append("Repasa los principios de no revictimización y el marco ético de intervención.")
    if attempt.status == "SAFE_EXITED":
        recommendations.append("Retoma el caso con acompañamiento docente cuando te sientas preparado/a.")
    if not recommendations:
        recommendations.append("Consolida el aprendizaje repitiendo el caso con foco en la ruta institucional y la bitácora reflexiva.")

    summary = {
        "COMPLETED": "Intento finalizado. Tu recorrido quedó registrado para evaluación formativa.",
        "SAFE_EXITED": "Salida segura registrada. No se aplicó penalización; el intento quedó disponible para revisión docente.",
        "IN_PROGRESS": "Intento en progreso.",
    }[attempt.status]

    return {
        "attemptId": str(attempt.id),
        "caseTitle": attempt.case_version.simulation_case.title,
        "status": attempt.status,
        "finalScore": attempt.accumulated_score,
        "finalStress": attempt.stress_index,
        "metrics": metrics(attempt),
        "adequateDecisions": adequate,
        "riskyDecisions": risky,
        "inadequateDecisions": inadequate,
        "prohibitedDecisions": prohibited,
        "toolsUsed": tools_used,
        "reflectionsCount": reflections_count,
        "safeExitUsed": attempt.status == "SAFE_EXITED",
        "visitedNodeTitles": visited,
        "competencies": competencies,
        "recommendations": recommendations,
        "summaryMessage": summary,
        "totalDurationSeconds": (
            int((attempt.ended_at - attempt.started_at).total_seconds())
            if attempt.started_at and attempt.ended_at else None
        ),
        "timeline": build_timeline(attempt, events),
        # Efecto mariposa: final canónico (1-4) + flags/métricas acumuladas.
        "ending": case_effects.compute_ending(attempt, events),
    }


def attempt_state(attempt, raw_token, feedback, events=None):
    in_progress = attempt.status == "IN_PROGRESS"
    completion_report = None
    if not in_progress:
        if events is None:
            from apps.simulation.models import AttemptEvent
            events = list(AttemptEvent.objects.filter(attempt_id=attempt.id).order_by("occurred_at", "id"))
        completion_report = build_completion_report(attempt, events)
    return {
        "attemptId": str(attempt.id),
        "attemptToken": raw_token,
        "caseVersionId": attempt.case_version_id,
        "caseTitle": attempt.case_version.simulation_case.title,
        "status": attempt.status,
        "accumulatedScore": attempt.accumulated_score,
        "stressIndex": attempt.stress_index,
        "metrics": metrics(attempt),
        "currentNode": node_state(attempt.current_node, in_progress),
        "feedback": feedback,
        "completionReport": completion_report,
        "supportResources": SAFE_EXIT_RESOURCES if attempt.status == "SAFE_EXITED" else [],
    }


def progress_map_node(node):
    label = node.title or "Nodo"
    label = label.strip()
    if len(label) > 14:
        label = label[:13] + "…"
    return {
        "key": node.node_key,
        "label": label,
        "start": node.start_node,
        "terminal": node.terminal_node,
    }
