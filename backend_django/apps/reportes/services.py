"""Reporting del simulador: dashboard global + reporte por grupo + export CSV.

Extraído de la app legacy ``sesiones`` (T3.2). Todas las métricas son
solo-simulación (SimulationAttempt / AttemptEvent / ReflectionJournal /
RubricEvaluation); se removió la mezcla del quiz legacy. El CSV se devuelve como
string plano (sin envoltorio JSON), con ``.`` decimal y ``,`` delimitador.
"""
from datetime import datetime, time

from django.contrib.auth import get_user_model
from django.db import connection
from django.db.models import Avg
from django.utils import timezone
from rest_framework.exceptions import NotFound

from apps.grupos.models import Grupo
from apps.simulation.models.attempt import (
    AttemptEvent,
    ReflectionJournal,
    SimulationAttempt,
)
from apps.simulation.models.rubric import RubricEvaluation

User = get_user_model()

DECISION_EVENT_TYPES = ["DECISION_SELECTED", "PROHIBITED_DECISION_SELECTED"]
SCORED_STATUSES = ["COMPLETED", "SAFE_EXITED"]


def _nombre_completo(user):
    return f"{user.nombre} {user.apellido}"


def _grupo_student_ids(grupo_id):
    with connection.cursor() as cur:
        cur.execute(
            "SELECT estudiante_id FROM grupo_estudiante WHERE grupo_id = %s", [grupo_id]
        )
        return [row[0] for row in cur.fetchall()]


def _count_decisions(attempt_ids, classification):
    if not attempt_ids:
        return 0
    return AttemptEvent.objects.filter(
        attempt_id__in=attempt_ids,
        event_type__in=DECISION_EVENT_TYPES,
        decision_option__classification=classification,
    ).count()


def _count_reflections(attempt_ids):
    if not attempt_ids:
        return 0
    return ReflectionJournal.objects.filter(attempt_id__in=attempt_ids).count()


def _count_rubrics(attempt_ids):
    if not attempt_ids:
        return 0
    return (
        RubricEvaluation.objects.filter(attempt_id__in=attempt_ids)
        .values("attempt_id")
        .distinct()
        .count()
    )


# --- Dashboard -------------------------------------------------------------
def get_dashboard():
    start_of_day = datetime.combine(timezone.now().date(), time.min)

    simulaciones_completadas_hoy = SimulationAttempt.objects.filter(
        status__in=SCORED_STATUSES, ended_at__gte=start_of_day
    ).count()
    simulaciones_en_progreso = SimulationAttempt.objects.filter(
        status="IN_PROGRESS"
    ).count()
    simulaciones_completadas = SimulationAttempt.objects.filter(
        status__in=SCORED_STATUSES
    ).count()
    avg_sim = float(
        SimulationAttempt.objects.filter(status__in=SCORED_STATUSES).aggregate(
            a=Avg("accumulated_score")
        )["a"]
        or 0
    )

    ultimos_intentos = [
        {
            "id": str(a.id),
            "casoTitulo": a.case_version.simulation_case.title,
            "estudiante": _nombre_completo(a.student),
            "puntaje": a.accumulated_score,
            "estado": a.status,
        }
        for a in SimulationAttempt.objects.select_related(
            "case_version__simulation_case", "student"
        ).order_by("-started_at")[:10]
    ]
    intentos_recientes = sorted(
        ultimos_intentos, key=lambda x: x["puntaje"], reverse=True
    )[:10]

    return {
        "estudiantesActivos": simulaciones_completadas_hoy,
        "simulacionesCompletadasHoy": simulaciones_completadas_hoy,
        "puntajePromedioGlobal": avg_sim,
        "simulacionesCompletadas": simulaciones_completadas,
        "simulacionesEnProgreso": simulaciones_en_progreso,
        "puntajePromedioSimulacion": avg_sim,
        "decisionesAdecuadas": AttemptEvent.objects.filter(
            event_type__in=DECISION_EVENT_TYPES,
            decision_option__classification="ADEQUATE",
        ).count(),
        "decisionesRiesgosas": AttemptEvent.objects.filter(
            event_type__in=DECISION_EVENT_TYPES,
            decision_option__classification="RISKY",
        ).count(),
        "decisionesInadecuadas": AttemptEvent.objects.filter(
            event_type__in=DECISION_EVENT_TYPES,
            decision_option__classification="INADEQUATE",
        ).count(),
        "decisionesProhibidas": AttemptEvent.objects.filter(
            event_type="PROHIBITED_DECISION_SELECTED"
        ).count(),
        "ultimosIntentos": ultimos_intentos,
        "intentosRecientes": intentos_recientes,
    }


# --- Group report ----------------------------------------------------------
def generar_reporte_grupo(grupo_id, case_version_id):
    grupo = Grupo.objects.filter(pk=grupo_id).first()
    if not grupo:
        raise NotFound(f"Grupo no encontrado: {grupo_id}")
    simulacion = (
        _build_simulation_report(grupo, case_version_id)
        if case_version_id is not None
        else None
    )
    return {
        "grupoId": grupo_id,
        "caseVersionId": case_version_id,
        "simulacion": simulacion,
    }


def _empty_simulation_report():
    return {
        "totalIntentos": 0,
        "intentosCompletados": 0,
        "intentosEnProgreso": 0,
        "intentosSalidaSegura": 0,
        "puntajePromedio": 0.0,
        "decisionesAdecuadas": 0,
        "decisionesRiesgosas": 0,
        "decisionesInadecuadas": 0,
        "bitacorasRegistradas": 0,
        "rubricasAplicadas": 0,
        "estudiantes": [],
    }


def _build_simulation_report(grupo, case_version_id):
    student_ids = _grupo_student_ids(grupo.id)
    if not student_ids:
        return _empty_simulation_report()

    attempts = list(
        SimulationAttempt.objects.filter(
            case_version_id=case_version_id, student_id__in=student_ids
        ).order_by("-started_at")
    )
    if not attempts:
        return _empty_simulation_report()

    completados = sum(1 for a in attempts if a.status == "COMPLETED")
    en_progreso = sum(1 for a in attempts if a.status == "IN_PROGRESS")
    salida_segura = sum(1 for a in attempts if a.status == "SAFE_EXITED")
    scored = [a for a in attempts if a.status in SCORED_STATUSES]
    puntaje_promedio = (
        sum(a.accumulated_score for a in scored) / len(scored) if scored else 0.0
    )

    attempt_ids = [a.id for a in attempts]
    by_student = {}
    for a in attempts:
        by_student.setdefault(a.student_id, []).append(a)

    students = list(User.objects.filter(id__in=student_ids))
    estudiantes = [
        _estudiante_sim_dto(st, by_student.get(st.id, [])) for st in students
    ]
    estudiantes.sort(key=lambda e: e["nombre"])

    return {
        "totalIntentos": len(attempts),
        "intentosCompletados": completados,
        "intentosEnProgreso": en_progreso,
        "intentosSalidaSegura": salida_segura,
        "puntajePromedio": float(puntaje_promedio),
        "decisionesAdecuadas": _count_decisions(attempt_ids, "ADEQUATE"),
        "decisionesRiesgosas": _count_decisions(attempt_ids, "RISKY"),
        "decisionesInadecuadas": _count_decisions(attempt_ids, "INADEQUATE"),
        "bitacorasRegistradas": _count_reflections(attempt_ids),
        "rubricasAplicadas": _count_rubrics(attempt_ids),
        "estudiantes": estudiantes,
    }


def _estudiante_sim_dto(student, attempts):
    completados = sum(1 for a in attempts if a.status == "COMPLETED")
    en_progreso = sum(1 for a in attempts if a.status == "IN_PROGRESS")
    salida_segura = sum(1 for a in attempts if a.status == "SAFE_EXITED")
    scored = [a for a in attempts if a.status in SCORED_STATUSES]
    puntaje = sum(a.accumulated_score for a in scored) / len(scored) if scored else 0.0
    attempt_ids = [a.id for a in attempts]

    if en_progreso > 0:
        estado = "EN_PROGRESO"
    elif completados > 0:
        estado = "COMPLETADO"
    elif salida_segura > 0:
        estado = "SAFE_EXITED"
    else:
        estado = "PENDIENTE"

    return {
        "id": student.id,
        "nombre": _nombre_completo(student),
        "totalIntentos": len(attempts),
        "intentosCompletados": completados,
        "intentosEnProgreso": en_progreso,
        "intentosSalidaSegura": salida_segura,
        "puntajePromedio": float(puntaje),
        "decisionesAdecuadas": _count_decisions(attempt_ids, "ADEQUATE"),
        "decisionesRiesgosas": _count_decisions(attempt_ids, "RISKY"),
        "decisionesInadecuadas": _count_decisions(attempt_ids, "INADEQUATE"),
        "bitacorasRegistradas": _count_reflections(attempt_ids),
        "rubricasAplicadas": _count_rubrics(attempt_ids),
        "estado": estado,
    }


# --- CSV export ------------------------------------------------------------
def exportar_csv(grupo_id, case_version_id):
    reporte = generar_reporte_grupo(grupo_id, case_version_id)
    parts = []
    if reporte["simulacion"] is not None:
        parts.append(
            "Estudiante,Intentos,Completados,En progreso,Salida segura,Puntaje prom.,"
            "Adecuadas,Riesgosas,Inadecuadas,Bitacoras,Rubricas,Estado\n"
        )
        for e in reporte["simulacion"]["estudiantes"]:
            parts.append(
                "{},{},{},{},{},{:.1f},{},{},{},{},{},{}\n".format(
                    e["nombre"],
                    e["totalIntentos"],
                    e["intentosCompletados"],
                    e["intentosEnProgreso"],
                    e["intentosSalidaSegura"],
                    e["puntajePromedio"],
                    e["decisionesAdecuadas"],
                    e["decisionesRiesgosas"],
                    e["decisionesInadecuadas"],
                    e["bitacorasRegistradas"],
                    e["rubricasAplicadas"],
                    e["estado"],
                )
            )
    return "".join(parts)
