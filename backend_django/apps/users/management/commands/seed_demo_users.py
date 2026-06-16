"""Crea la tabla users y usuarios demo si la BD local está vacía."""
from django.core.management.base import BaseCommand
from django.db import connection

from apps.users.models import CustomUser, UserRole

USERS_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'ESTUDIANTE',
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
"""

DEMO_USERS = [
    {
        "email": "admin@psychosim.edu.co",
        "password": "Admin123!",
        "nombre": "Admin",
        "apellido": "SIEP",
        "role": UserRole.ADMIN,
    },
    {
        "email": "profesora@psychosim.edu.co",
        "password": "Profesor123!",
        "nombre": "Profesora",
        "apellido": "Demo",
        "role": UserRole.PROFESOR,
    },
    {
        "email": "estudiante@psychosim.edu.co",
        "password": "Estudiante123!",
        "nombre": "Estudiante",
        "apellido": "Demo",
        "role": UserRole.ESTUDIANTE,
    },
]


class Command(BaseCommand):
    help = "Crea tabla users (si falta) y sembrar credenciales demo de desarrollo."

    def handle(self, *args, **options):
        with connection.cursor() as cursor:
            cursor.execute(USERS_TABLE_SQL)

        created = 0
        for spec in DEMO_USERS:
            if CustomUser.objects.filter(email=spec["email"]).exists():
                self.stdout.write(f"Ya existe: {spec['email']}")
                continue
            CustomUser.objects.create_user(**spec)
            created += 1
            self.stdout.write(self.style.SUCCESS(f"Creado: {spec['email']}"))

        self.stdout.write(self.style.SUCCESS(f"Listo. Usuarios nuevos: {created}"))
