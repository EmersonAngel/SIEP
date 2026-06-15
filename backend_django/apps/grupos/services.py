"""Mirrors Spring GrupoService 1:1.

GrupoDTO = {id, nombre, codigo, totalEstudiantes}. Permission/role failures use
IllegalArgumentException semantics -> 400 (ValidationError), not 403.
"""
from django.contrib.auth import get_user_model
from django.db import connection, transaction
from rest_framework.exceptions import NotFound, ValidationError

from apps.simulation.models import CaseVersion, SimulationNode
from apps.simulation.serializers import game_dtos as simulation_dto

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


def _require_grupo(grupo_id, profesor):
    grupo = Grupo.objects.filter(pk=grupo_id).first()
    if not grupo:
        raise NotFound(f"Grupo no encontrado: {grupo_id}")
    if grupo.profesor_id != profesor.id:
        raise ValidationError("No tiene permiso sobre este grupo")
    return grupo


def _student_dto(user):
    return {
        "id": user.id,
        "nombre": user.nombre,
        "apellido": user.apellido,
        "email": user.email,
        "role": user.role,
        "activo": user.activo,
    }


def listar_estudiantes(grupo_id, profesor):
    grupo = _require_grupo(grupo_id, profesor)
    with connection.cursor() as cur:
        cur.execute(
            """
            SELECT u.id
            FROM grupo_estudiante ge
            INNER JOIN users u ON u.id = ge.estudiante_id
            WHERE ge.grupo_id = %s
            ORDER BY u.apellido, u.nombre, u.email
            """,
            [grupo.id],
        )
        ids = [row[0] for row in cur.fetchall()]
    users = User.objects.filter(id__in=ids)
    by_id = {u.id: u for u in users}
    return [_student_dto(by_id[user_id]) for user_id in ids if user_id in by_id]


def _case_summary(case_version_id):
    version = (
        CaseVersion.objects.filter(pk=case_version_id)
        .select_related("simulation_case")
        .first()
    )
    if not version:
        raise NotFound(f"Version de caso no encontrada: {case_version_id}")
    node_count = SimulationNode.objects.filter(case_version_id=version.id).count()
    return simulation_dto.case_summary(version, node_count)


def listar_casos_asignados(grupo_id, profesor):
    grupo = _require_grupo(grupo_id, profesor)
    with connection.cursor() as cur:
        cur.execute(
            """
            SELECT case_version_id
            FROM grupo_case_version
            WHERE grupo_id = %s
            ORDER BY assigned_at DESC, case_version_id DESC
            """,
            [grupo.id],
        )
        ids = [row[0] for row in cur.fetchall()]
    return [_case_summary(case_version_id) for case_version_id in ids]


@transaction.atomic
def crear(nombre, codigo, profesor):
    if Grupo.objects.filter(codigo=codigo).exists():
        raise ValidationError(f"Ya existe un grupo con el código: {codigo}")
    grupo = Grupo.objects.create(nombre=nombre, codigo=codigo, profesor=profesor)
    return grupo_dto(grupo)


@transaction.atomic
def agregar_estudiante(grupo_id, email, profesor):
    grupo = _require_grupo(grupo_id, profesor)
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


@transaction.atomic
def asignar_caso(grupo_id, case_version_id, profesor):
    grupo = _require_grupo(grupo_id, profesor)
    version = (
        CaseVersion.objects.filter(pk=case_version_id)
        .select_related("simulation_case")
        .first()
    )
    if not version:
        raise NotFound(f"Version de caso no encontrada: {case_version_id}")
    if version.status != "PUBLISHED" or not version.simulation_case.active:
        raise ValidationError("Solo se pueden asignar casos publicados y activos")
    with connection.cursor() as cur:
        cur.execute(
            """
            INSERT INTO grupo_case_version (grupo_id, case_version_id)
            VALUES (%s, %s)
            ON CONFLICT DO NOTHING
            """,
            [grupo.id, version.id],
        )
    return listar_casos_asignados(grupo.id, profesor)


@transaction.atomic
def quitar_caso(grupo_id, case_version_id, profesor):
    grupo = _require_grupo(grupo_id, profesor)
    with connection.cursor() as cur:
        cur.execute(
            "DELETE FROM grupo_case_version WHERE grupo_id = %s AND case_version_id = %s",
            [grupo.id, case_version_id],
        )
    return listar_casos_asignados(grupo.id, profesor)
