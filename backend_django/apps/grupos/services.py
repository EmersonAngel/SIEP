"""Mirrors Spring GrupoService 1:1.

GrupoDTO = {id, nombre, codigo, totalEstudiantes}. Permission/role failures use
IllegalArgumentException semantics -> 400 (ValidationError), not 403.
"""
from django.contrib.auth import get_user_model
from django.db import connection, transaction
from rest_framework.exceptions import NotFound, ValidationError

from .models import Grupo

User = get_user_model()


def _total_estudiantes(grupo_id):
    with connection.cursor() as cur:
        cur.execute("SELECT count(*) FROM grupo_estudiante WHERE grupo_id = %s", [grupo_id])
        return cur.fetchone()[0]


def grupo_dto(grupo):
    return {
        "id": grupo.id,
        "nombre": grupo.nombre,
        "codigo": grupo.codigo,
        "totalEstudiantes": _total_estudiantes(grupo.id),
    }


def listar_de_profesor(profesor_id):
    grupos = Grupo.objects.filter(profesor_id=profesor_id, activo=True)
    return [grupo_dto(g) for g in grupos]


@transaction.atomic
def crear(nombre, codigo, profesor):
    if Grupo.objects.filter(codigo=codigo).exists():
        raise ValidationError(f"Ya existe un grupo con el código: {codigo}")
    grupo = Grupo.objects.create(nombre=nombre, codigo=codigo, profesor=profesor)
    return grupo_dto(grupo)


@transaction.atomic
def agregar_estudiante(grupo_id, email, profesor):
    grupo = Grupo.objects.filter(pk=grupo_id).first()
    if not grupo:
        raise NotFound(f"Grupo no encontrado: {grupo_id}")
    if grupo.profesor_id != profesor.id:
        raise ValidationError("No tiene permiso sobre este grupo")
    estudiante = User.objects.filter(email=email).first()
    if not estudiante:
        raise NotFound(f"Usuario no encontrado: {email}")
    if estudiante.role != "ESTUDIANTE":
        raise ValidationError("El usuario no tiene rol de estudiante")
    with connection.cursor() as cur:
        cur.execute(
            "INSERT INTO grupo_estudiante (grupo_id, estudiante_id) VALUES (%s, %s) "
            "ON CONFLICT DO NOTHING",
            [grupo.id, estudiante.id],
        )
    return grupo_dto(grupo)
