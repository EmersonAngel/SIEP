from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from apps.simulation.services.rubric_service import seed_default_rubric


class Command(BaseCommand):
    help = "Create or update the default SIEP rubric and assign it to active published simulations."

    def handle(self, *args, **options):
        User = get_user_model()
        user = User.objects.filter(email="admin@psychosim.edu.co").first() or User.objects.filter(role="ADMIN").first()
        if not user:
            user = User.objects.create_user(
                email="admin@psychosim.edu.co",
                password="Admin123!",
                nombre="Admin",
                apellido="SIEP",
                role="ADMIN",
                activo=True,
            )
        rubric = seed_default_rubric(user)
        self.stdout.write(
            self.style.SUCCESS(
                f"Rubrica predeterminada lista: {rubric['name']} "
                f"({rubric['criteriaCount']} criterios, {rubric['totalWeight']}%)."
            )
        )
