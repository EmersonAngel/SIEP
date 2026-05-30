"""Casos request parsing + response DTOs.

Read side mirrors Spring CasoDTO EXACTLY:
  - list  -> resumen: escenarios = null
  - detail-> detalle: nested escenarios/preguntas/opciones
  - OpcionDTO exposes ONLY {id, texto}: esCorrecta/feedbackTexto/normativaRef
    are NEVER sent to the client (answer key stays hidden).
Write side mirrors CasoService.CasoRequest (camelCase in, snake_case stored).
"""
from rest_framework import serializers


# --- Request (write) serializers -------------------------------------------
class OpcionRequestSerializer(serializers.Serializer):
    texto = serializers.CharField()
    esCorrecta = serializers.BooleanField(default=False)
    feedbackTexto = serializers.CharField(
        required=False, allow_blank=True, allow_null=True, default=None
    )
    normativaRef = serializers.CharField(
        required=False, allow_blank=True, allow_null=True, default=None
    )


class PreguntaRequestSerializer(serializers.Serializer):
    orden = serializers.IntegerField(default=0)
    enunciado = serializers.CharField()
    puntosCorrecta = serializers.IntegerField(required=False, allow_null=True, default=None)
    opciones = OpcionRequestSerializer(many=True, default=list)


class EscenarioRequestSerializer(serializers.Serializer):
    orden = serializers.IntegerField(default=0)
    nombre = serializers.CharField()
    contexto = serializers.CharField(required=False, allow_blank=True, allow_null=True, default=None)
    mapaKey = serializers.CharField(default="")
    preguntas = PreguntaRequestSerializer(many=True, default=list)


class CasoRequestSerializer(serializers.Serializer):
    titulo = serializers.CharField()
    descripcion = serializers.CharField(required=False, allow_blank=True, allow_null=True, default=None)
    contextoNarrativo = serializers.CharField(required=False, allow_blank=True, allow_null=True, default=None)
    escenarios = EscenarioRequestSerializer(many=True, required=False, default=list)


# --- Response (read) DTO builders ------------------------------------------
def _dt(value):
    return value.isoformat() if value else None


def opcion_dto(opcion):
    # ONLY id + texto (esCorrecta never leaves the server).
    return {"id": opcion.id, "texto": opcion.texto}


def pregunta_dto(pregunta):
    return {
        "id": pregunta.id,
        "orden": pregunta.orden,
        "enunciado": pregunta.enunciado,
        "puntosCorrecta": pregunta.puntos_correcta,
        "opciones": [opcion_dto(o) for o in pregunta.opciones.all()],
    }


def escenario_dto(escenario):
    return {
        "id": escenario.id,
        "orden": escenario.orden,
        "nombre": escenario.nombre,
        "contexto": escenario.contexto,
        "mapaKey": escenario.mapa_key,
        "preguntas": [pregunta_dto(p) for p in escenario.preguntas.all()],
    }


def caso_resumen(caso):
    return {
        "id": caso.id,
        "titulo": caso.titulo,
        "descripcion": caso.descripcion,
        "contextoNarrativo": caso.contexto_narrativo,
        "activo": caso.activo,
        "createdAt": _dt(caso.created_at),
        "escenarios": None,
    }


def caso_detalle(caso):
    data = caso_resumen(caso)
    data["escenarios"] = [escenario_dto(e) for e in caso.escenarios.all()]
    return data
