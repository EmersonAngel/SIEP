"""Mirrors Spring SesionService 1:1."""
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import NotFound, PermissionDenied

from apps.casos.models import Caso, Opcion, Pregunta

from .models import RespuestaEstudiante, SesionJuego


def _dt(value):
    return value.isoformat() if value else None


def sesion_resumen_dto(sesion):
    return {
        "id": sesion.id,
        "casoId": sesion.caso_id,
        "casoTitulo": sesion.caso.titulo,
        "fechaInicio": _dt(sesion.fecha_inicio),
        "fechaFin": _dt(sesion.fecha_fin),
        "puntajeTotal": sesion.puntaje_total,
        "completado": sesion.completado,
    }


@transaction.atomic
def iniciar(caso_id, estudiante):
    caso = Caso.objects.filter(pk=caso_id, activo=True).first()
    if not caso:
        raise NotFound(f"Caso no encontrado: {caso_id}")
    return SesionJuego.objects.create(estudiante=estudiante, caso=caso)


def _obtener_propia(sesion_id, estudiante):
    sesion = SesionJuego.objects.filter(pk=sesion_id).first()
    if not sesion:
        raise NotFound(f"Sesión no encontrada: {sesion_id}")
    if sesion.estudiante_id != estudiante.id:
        raise PermissionDenied("Esta sesión no pertenece al usuario")
    return sesion


@transaction.atomic
def responder(sesion_id, pregunta_id, opcion_id, tiempo_ms, estudiante):
    sesion = _obtener_propia(sesion_id, estudiante)

    pregunta = Pregunta.objects.filter(
        pk=pregunta_id, escenario__caso_id=sesion.caso_id
    ).first()
    if not pregunta:
        raise NotFound(f"Pregunta no encontrada: {pregunta_id}")

    opcion = Opcion.objects.filter(pk=opcion_id, pregunta_id=pregunta.id).first()
    if not opcion:
        raise NotFound(f"Opción no encontrada: {opcion_id}")

    RespuestaEstudiante.objects.create(
        sesion=sesion,
        pregunta=pregunta,
        opcion=opcion,
        es_correcta=opcion.es_correcta,
        tiempo_respuesta_ms=tiempo_ms,
    )
    puntos = pregunta.puntos_correcta if opcion.es_correcta else 0
    sesion.puntaje_total += puntos
    sesion.save()

    correcta = Opcion.objects.filter(pregunta_id=pregunta.id, es_correcta=True).first() or opcion
    return {
        "esCorrecta": opcion.es_correcta,
        "feedback": opcion.feedback_texto,
        "normativaRef": opcion.normativa_ref,
        "puntosObtenidos": puntos,
        "opcionCorrectaId": correcta.id,
    }


@transaction.atomic
def finalizar(sesion_id, estudiante):
    sesion = _obtener_propia(sesion_id, estudiante)
    sesion.completado = True
    sesion.fecha_fin = timezone.now()
    sesion.save()
    return sesion_resumen_dto(sesion)


def mis_sesiones(estudiante):
    qs = SesionJuego.objects.filter(estudiante_id=estudiante.id).order_by("-fecha_inicio")
    return [sesion_resumen_dto(s) for s in qs]
