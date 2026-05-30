"""Legacy quiz-style case models, mapped to existing Flyway tables.

Columns verified against the live schema. ``created_by`` and ``mapa_key`` are
NOT NULL in the DB; ``on_delete=DO_NOTHING`` because Django must not drive
cascades on these Flyway-owned tables.
"""
from django.conf import settings
from django.db import models


class Caso(models.Model):
    titulo = models.CharField(max_length=255)
    descripcion = models.TextField(blank=True, null=True)
    contexto_narrativo = models.TextField(blank=True, null=True)
    activo = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.DO_NOTHING,
        db_column="created_by",
        related_name="casos_creados",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "casos"
        managed = False

    def __str__(self):
        return self.titulo


class Escenario(models.Model):
    caso = models.ForeignKey(
        Caso, on_delete=models.CASCADE, related_name="escenarios", db_column="caso_id"
    )
    orden = models.IntegerField(default=0)
    nombre = models.CharField(max_length=255)
    contexto = models.TextField(blank=True, null=True)
    mapa_key = models.CharField(max_length=255)

    class Meta:
        db_table = "escenarios"
        managed = False
        ordering = ["orden"]

    def __str__(self):
        return self.nombre


class Pregunta(models.Model):
    escenario = models.ForeignKey(
        Escenario, on_delete=models.CASCADE, related_name="preguntas",
        db_column="escenario_id",
    )
    orden = models.IntegerField(default=0)
    enunciado = models.TextField()
    puntos_correcta = models.IntegerField(default=10)

    class Meta:
        db_table = "preguntas"
        managed = False
        ordering = ["orden"]


class Opcion(models.Model):
    pregunta = models.ForeignKey(
        Pregunta, on_delete=models.CASCADE, related_name="opciones",
        db_column="pregunta_id",
    )
    texto = models.TextField()
    es_correcta = models.BooleanField(default=False)
    feedback_texto = models.TextField(blank=True, null=True)
    normativa_ref = models.CharField(max_length=500, blank=True, null=True)

    class Meta:
        db_table = "opciones"
        managed = False
