"""Simulation core models (managed=False), mapped to the real Flyway schema.

Note: support_resources_json / required_tools_json are TEXT columns holding
JSON strings (not jsonb), so they are TextField and parsed in serializers.
"""
from django.conf import settings
from django.db import models


class CaseVersionStatus(models.TextChoices):
    DRAFT = "DRAFT"
    IN_REVIEW = "IN_REVIEW"
    PUBLISHED = "PUBLISHED"
    ARCHIVED = "ARCHIVED"


class DecisionClassification(models.TextChoices):
    ADEQUATE = "ADEQUATE"
    RISKY = "RISKY"
    INADEQUATE = "INADEQUATE"


class SimulationCase(models.Model):
    code = models.CharField(max_length=50, unique=True)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.DO_NOTHING, db_column="created_by",
        related_name="simulation_cases",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "simulation_cases"
        managed = False

    def __str__(self):
        return self.code


class CaseVersion(models.Model):
    simulation_case = models.ForeignKey(
        SimulationCase, on_delete=models.CASCADE, related_name="versions",
        db_column="simulation_case_id",
    )
    semantic_version = models.CharField(max_length=20)
    status = models.CharField(
        max_length=20, choices=CaseVersionStatus.choices, default=CaseVersionStatus.DRAFT
    )
    narrative_context = models.TextField(blank=True, null=True)
    cloned_from = models.ForeignKey(
        "self", null=True, blank=True, on_delete=models.DO_NOTHING, db_column="cloned_from_id"
    )
    published_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.DO_NOTHING, db_column="created_by",
        related_name="created_versions",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    # Optimistic-lock column (Spring @Version) + world schema version.
    version = models.BigIntegerField(default=0)
    world_schema_version = models.IntegerField(default=1)

    class Meta:
        db_table = "case_versions"
        managed = False

    def __str__(self):
        return f"{self.simulation_case.code} v{self.semantic_version}"


class SimulationNode(models.Model):
    case_version = models.ForeignKey(
        CaseVersion, on_delete=models.CASCADE, related_name="nodes", db_column="case_version_id"
    )
    node_key = models.CharField(max_length=100)
    title = models.CharField(max_length=255)
    narrative = models.TextField()
    support_resources_json = models.TextField(default="[]")
    required_tools_json = models.TextField(default="[]")
    sensitive_content = models.BooleanField(default=False)
    safe_exit_required = models.BooleanField(default=False)
    warning_message = models.TextField(blank=True, null=True)
    start_node = models.BooleanField(default=False)
    terminal_node = models.BooleanField(default=False)
    position_x = models.IntegerField(null=True, blank=True, default=0)
    position_y = models.IntegerField(null=True, blank=True, default=0)

    class Meta:
        db_table = "simulation_nodes"
        managed = False

    def __str__(self):
        return self.node_key


class DecisionOption(models.Model):
    case_version = models.ForeignKey(
        CaseVersion, on_delete=models.CASCADE, related_name="decisions", db_column="case_version_id"
    )
    option_key = models.CharField(max_length=100)
    source_node = models.ForeignKey(
        SimulationNode, on_delete=models.CASCADE, related_name="options", db_column="source_node_id"
    )
    target_node = models.ForeignKey(
        SimulationNode, on_delete=models.DO_NOTHING, related_name="incoming_options",
        db_column="target_node_id",
    )
    text = models.TextField()
    classification = models.CharField(max_length=20, choices=DecisionClassification.choices)
    score_delta = models.IntegerField(default=0)
    stress_delta = models.IntegerField(default=0)
    prohibited_penalty = models.IntegerField(default=0)
    immediate_feedback = models.TextField(default="")
    prohibited_conduct = models.BooleanField(default=False)
    prohibition_reason = models.TextField(blank=True, null=True)

    class Meta:
        db_table = "decision_options"
        managed = False

    def __str__(self):
        return self.option_key
