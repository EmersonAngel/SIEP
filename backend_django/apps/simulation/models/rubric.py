"""Rubric / checklist / audit models (managed=False)."""
from django.conf import settings
from django.db import models

from .attempt import SimulationAttempt
from .case import CaseVersion


class Rubric(models.Model):
    case_version = models.ForeignKey(
        CaseVersion, on_delete=models.CASCADE, null=True, blank=True,
        related_name="rubrics", db_column="case_version_id",
    )
    name = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.DO_NOTHING, db_column="created_by",
        related_name="rubrics_creadas",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "rubrics"
        managed = False


class RubricCriterion(models.Model):
    rubric = models.ForeignKey(
        Rubric, on_delete=models.CASCADE, related_name="criteria", db_column="rubric_id"
    )
    competency = models.CharField(max_length=100)
    title = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    max_score = models.IntegerField(default=0)
    display_order = models.IntegerField(default=0)

    class Meta:
        db_table = "rubric_criteria"
        managed = False
        ordering = ["display_order"]


class RubricEvaluation(models.Model):
    attempt = models.ForeignKey(
        SimulationAttempt, on_delete=models.CASCADE, related_name="rubric_evaluations",
        db_column="attempt_id",
    )
    rubric = models.ForeignKey(Rubric, on_delete=models.DO_NOTHING, db_column="rubric_id")
    instructor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.DO_NOTHING, db_column="instructor_id"
    )
    total_score = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    comment = models.TextField(null=True, blank=True)
    evaluated_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "rubric_evaluations"
        managed = False


class CriterionScore(models.Model):
    rubric_evaluation = models.ForeignKey(
        RubricEvaluation, on_delete=models.CASCADE, related_name="criterion_scores",
        db_column="rubric_evaluation_id",
    )
    rubric_criterion = models.ForeignKey(
        RubricCriterion, on_delete=models.DO_NOTHING, db_column="rubric_criterion_id"
    )
    score = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    comment = models.TextField(null=True, blank=True)
    evidence_json = models.TextField(default="[]")

    class Meta:
        db_table = "criterion_scores"
        managed = False


class PublicationChecklist(models.Model):
    case_version = models.ForeignKey(
        CaseVersion, on_delete=models.CASCADE, related_name="checklists", db_column="case_version_id"
    )
    submitted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.DO_NOTHING, db_column="submitted_by"
    )
    completion_ratio = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    status = models.CharField(max_length=30, default="")
    submitted_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "publication_checklists"
        managed = False


class PublicationChecklistItem(models.Model):
    checklist = models.ForeignKey(
        PublicationChecklist, on_delete=models.CASCADE, related_name="items", db_column="checklist_id"
    )
    code = models.CharField(max_length=50)
    label = models.CharField(max_length=255)
    required = models.BooleanField(default=True)
    fulfilled = models.BooleanField(default=False)
    evidence_note = models.TextField(null=True, blank=True)

    class Meta:
        db_table = "publication_checklist_items"
        managed = False


class AuditLog(models.Model):
    actor_id = models.BigIntegerField(null=True, blank=True)
    actor_role = models.CharField(max_length=20, null=True, blank=True)
    action = models.CharField(max_length=100)
    resource_type = models.CharField(max_length=100, null=True, blank=True)
    resource_id = models.CharField(max_length=100, null=True, blank=True)
    context_json = models.TextField(default="{}")
    ip_address = models.CharField(max_length=64, null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)
    occurred_at = models.DateTimeField(auto_now_add=True)
    retention_until = models.DateTimeField()

    class Meta:
        db_table = "audit_logs"
        managed = False
