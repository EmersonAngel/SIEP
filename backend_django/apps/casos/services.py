"""Service layer mirroring Spring's CasoService behavior 1:1."""
from django.db import transaction
from rest_framework.exceptions import NotFound, PermissionDenied

from .models import Caso, Escenario, Opcion, Pregunta


def listar_activos():
    return list(Caso.objects.filter(activo=True))


def obtener_detalle(caso_id):
    caso = Caso.objects.filter(pk=caso_id, activo=True).first()
    if not caso:
        raise NotFound(f"Caso no encontrado: {caso_id}")
    return caso


def _mapear_escenarios(caso, escenarios):
    for e in escenarios or []:
        escenario = Escenario.objects.create(
            caso=caso,
            orden=e.get("orden", 0),
            nombre=e["nombre"],
            contexto=e.get("contexto"),
            mapa_key=e.get("mapaKey") or "",
        )
        for p in e.get("preguntas", []):
            pregunta = Pregunta.objects.create(
                escenario=escenario,
                orden=p.get("orden", 0),
                enunciado=p["enunciado"],
                puntos_correcta=p.get("puntosCorrecta") if p.get("puntosCorrecta") is not None else 10,
            )
            for o in p.get("opciones", []):
                Opcion.objects.create(
                    pregunta=pregunta,
                    texto=o["texto"],
                    es_correcta=o.get("esCorrecta", False),
                    feedback_texto=o.get("feedbackTexto"),
                    normativa_ref=o.get("normativaRef"),
                )


@transaction.atomic
def crear(data, creador):
    caso = Caso.objects.create(
        titulo=data["titulo"],
        descripcion=data.get("descripcion"),
        contexto_narrativo=data.get("contextoNarrativo"),
        created_by=creador,
    )
    _mapear_escenarios(caso, data.get("escenarios"))
    return caso


@transaction.atomic
def actualizar(caso_id, data, usuario):
    caso = Caso.objects.filter(pk=caso_id).first()
    if not caso:
        raise NotFound(f"Caso no encontrado: {caso_id}")

    es_admin = usuario.role == "ADMIN"
    es_creador = caso.created_by_id == usuario.id
    if not es_admin and not es_creador:
        raise PermissionDenied("No tiene permiso para editar este caso")

    caso.titulo = data["titulo"]
    caso.descripcion = data.get("descripcion")
    caso.contexto_narrativo = data.get("contextoNarrativo")
    caso.save()
    # Full replace of nested content (matches CasoService.actualizar).
    caso.escenarios.all().delete()
    _mapear_escenarios(caso, data.get("escenarios"))
    return caso


@transaction.atomic
def eliminar(caso_id):
    caso = Caso.objects.filter(pk=caso_id).first()
    if not caso:
        raise NotFound(f"Caso no encontrado: {caso_id}")
    caso.activo = False
    caso.save()
