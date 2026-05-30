from django.conf import settings
from django.db import models


class SesionJuego(models.Model):
    estudiante = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.DO_NOTHING, db_column="estudiante_id"
    )
    caso = models.ForeignKey("casos.Caso", on_delete=models.DO_NOTHING, db_column="caso_id")
    fecha_inicio = models.DateTimeField(auto_now_add=True)
    fecha_fin = models.DateTimeField(null=True, blank=True)
    puntaje_total = models.IntegerField(default=0)
    completado = models.BooleanField(default=False)

    class Meta:
        db_table = "sesiones_juego"
        managed = False


class RespuestaEstudiante(models.Model):
    sesion = models.ForeignKey(
        SesionJuego, on_delete=models.CASCADE, related_name="respuestas", db_column="sesion_id"
    )
    pregunta = models.ForeignKey("casos.Pregunta", on_delete=models.DO_NOTHING, db_column="pregunta_id")
    opcion = models.ForeignKey("casos.Opcion", on_delete=models.DO_NOTHING, db_column="opcion_id")
    es_correcta = models.BooleanField()
    tiempo_respuesta_ms = models.IntegerField(null=True, blank=True)
    respondida_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "respuestas"
        managed = False
