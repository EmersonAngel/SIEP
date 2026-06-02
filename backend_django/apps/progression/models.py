"""Per-student case progression (Django-OWNED table — first real migration).

Django now owns the schema (Spring retired). This is the source of truth for
"which cases a student has completed". Keys are stored as plain integers (no DB
FK to the Flyway-owned users/simulation_cases tables) so this managed table stays
fully decoupled and its migration has no cross-app dependencies.
"""
from django.db import models


class StudentCaseCompletion(models.Model):
    student_id = models.BigIntegerField()
    simulation_case_id = models.BigIntegerField()
    first_completed_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "student_case_completion"
        managed = True
        constraints = [
            models.UniqueConstraint(
                fields=["student_id", "simulation_case_id"],
                name="uq_student_case_completion",
            )
        ]
