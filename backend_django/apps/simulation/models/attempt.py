"""Attempt-related models (managed=False).

Only the columns that actually exist are mapped. The real attempts table tracks
accumulated_score + stress_index (no victim_risk/user_trust columns).
attempt_world_states is keyed 1:1 by attempt_id (no surrogate id).
"""
import uuid

from django.conf import settings
from django.db import models

from .case import CaseVersion, DecisionOption, SimulationNode


class AttemptStatus(models.TextChoices):
    IN_PROGRESS = "IN_PROGRESS"
    SAFE_EXITED = "SAFE_EXITED"
    COMPLETED = "COMPLETED"


class SimulationAttempt(models.Model):
    AttemptStatus = AttemptStatus

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    attempt_token_hash = models.CharField(max_length=255, unique=True)
    case_version = models.ForeignKey(
        CaseVersion, on_delete=models.DO_NOTHING, db_column="case_version_id"
    )
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.DO_NOTHING, db_column="student_id"
    )
    current_node = models.ForeignKey(
        SimulationNode, on_delete=models.DO_NOTHING, db_column="current_node_id"
    )
    status = models.CharField(
        max_length=20, choices=AttemptStatus.choices, default=AttemptStatus.IN_PROGRESS
    )
    accumulated_score = models.IntegerField(default=0)
    stress_index = models.IntegerField(default=0)
    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    locked_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "simulation_attempts_v2"
        managed = False


class AttemptEvent(models.Model):
    attempt = models.ForeignKey(
        SimulationAttempt, on_delete=models.CASCADE, related_name="events", db_column="attempt_id"
    )
    event_type = models.CharField(max_length=50)
    node = models.ForeignKey(
        SimulationNode, on_delete=models.DO_NOTHING, null=True, blank=True, db_column="node_id"
    )
    decision_option = models.ForeignKey(
        DecisionOption, on_delete=models.DO_NOTHING, null=True, blank=True,
        db_column="decision_option_id",
    )
    score_delta = models.IntegerField(default=0)
    stress_delta = models.IntegerField(default=0)
    detail = models.TextField(null=True, blank=True)
    occurred_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "attempt_events"
        managed = False
        ordering = ["occurred_at", "id"]


class ReflectionJournal(models.Model):
    attempt = models.ForeignKey(
        SimulationAttempt, on_delete=models.CASCADE, related_name="reflections",
        db_column="attempt_id",
    )
    node = models.ForeignKey(SimulationNode, on_delete=models.DO_NOTHING, db_column="node_id")
    encrypted_text = models.TextField()
    encryption_key_ref = models.CharField(max_length=255)
    locked = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "reflection_journals"
        managed = False


class AttemptWorldState(models.Model):
    attempt = models.OneToOneField(
        SimulationAttempt, on_delete=models.CASCADE, primary_key=True,
        db_column="attempt_id", related_name="world_state",
    )
    scene_map = models.ForeignKey(
        "simulation.SceneMap", on_delete=models.DO_NOTHING, null=True, blank=True,
        db_column="scene_map_id",
    )
    player_x = models.IntegerField(default=0)
    player_y = models.IntegerField(default=0)
    inventory_json = models.TextField(default="[]")
    inspected_object_keys_json = models.TextField(default="[]")
    viewed_dialogue_keys_json = models.TextField(default="[]")
    used_tool_keys_json = models.TextField(default="[]")
    flags_json = models.TextField(default="{}")
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "attempt_world_states"
        managed = False
