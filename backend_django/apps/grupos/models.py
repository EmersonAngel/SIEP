"""Grupo model (managed=False). The grupo_estudiante join table has a composite
PK (grupo_id, estudiante_id) and no surrogate id, so the M2M membership is
handled with raw SQL in the service rather than a Django M2M field."""
from django.conf import settings
from django.db import models


class Grupo(models.Model):
    nombre = models.CharField(max_length=255)
    codigo = models.CharField(max_length=50, unique=True)
    profesor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.DO_NOTHING,
        db_column="profesor_id",
        related_name="grupos_impartidos",
    )
    activo = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "grupos"
        managed = False

    def __str__(self):
        return f"{self.nombre} ({self.codigo})"
