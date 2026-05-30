"""Explorable-world models (managed=False), mapped to the real schema."""
from django.db import models

from .case import CaseVersion, DecisionOption, SimulationNode


class SceneMap(models.Model):
    case_version = models.ForeignKey(
        CaseVersion, on_delete=models.CASCADE, related_name="scene_maps", db_column="case_version_id"
    )
    node = models.ForeignKey(SimulationNode, on_delete=models.CASCADE, db_column="node_id")
    map_key = models.CharField(max_length=100)
    title = models.CharField(max_length=255)
    width = models.IntegerField(default=0)
    height = models.IntegerField(default=0)
    theme = models.CharField(max_length=100, default="")
    spawn_x = models.IntegerField(default=0)
    spawn_y = models.IntegerField(default=0)
    ambient_json = models.TextField(default="{}")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "scene_maps"
        managed = False


class MapObject(models.Model):
    scene_map = models.ForeignKey(
        SceneMap, on_delete=models.CASCADE, related_name="map_objects", db_column="scene_map_id"
    )
    object_key = models.CharField(max_length=100)
    label = models.CharField(max_length=255)
    object_type = models.CharField(max_length=50)
    position_x = models.IntegerField(default=0)
    position_y = models.IntegerField(default=0)
    width = models.IntegerField(default=1)
    height = models.IntegerField(default=1)
    color_hex = models.CharField(max_length=20, default="")
    icon = models.CharField(max_length=50, default="")
    short_code = models.CharField(max_length=20, default="")
    collision = models.BooleanField(default=False)
    visible = models.BooleanField(default=True)
    interaction_prompt = models.CharField(max_length=255, default="")
    interaction_text = models.TextField(default="")
    decision_option = models.ForeignKey(
        DecisionOption, on_delete=models.DO_NOTHING, null=True, blank=True,
        db_column="decision_option_id",
    )
    tool_code = models.CharField(max_length=50, null=True, blank=True)
    unlock_condition_json = models.TextField(default="{}")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    z_index = models.IntegerField(default=0)
    facing = models.CharField(max_length=20, default="")
    movement_pattern_json = models.TextField(default="{}")
    metadata_json = models.TextField(default="{}")

    class Meta:
        db_table = "map_objects"
        managed = False


class CollisionZone(models.Model):
    scene_map = models.ForeignKey(
        SceneMap, on_delete=models.CASCADE, related_name="collision_zones", db_column="scene_map_id"
    )
    zone_key = models.CharField(max_length=100)
    label = models.CharField(max_length=255, null=True, blank=True)
    position_x = models.IntegerField(default=0)
    position_y = models.IntegerField(default=0)
    width = models.IntegerField(default=1)
    height = models.IntegerField(default=1)

    class Meta:
        db_table = "collision_zones"
        managed = False


class DialogueTree(models.Model):
    scene_map = models.ForeignKey(
        SceneMap, on_delete=models.CASCADE, related_name="dialogue_trees", db_column="scene_map_id"
    )
    map_object = models.ForeignKey(
        MapObject, on_delete=models.DO_NOTHING, null=True, blank=True, db_column="map_object_id"
    )
    tree_key = models.CharField(max_length=100)
    speaker_name = models.CharField(max_length=255)
    portrait_key = models.CharField(max_length=100, null=True, blank=True)
    emotion = models.CharField(max_length=50, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "dialogue_trees"
        managed = False


class DialogueLine(models.Model):
    dialogue_tree = models.ForeignKey(
        DialogueTree, on_delete=models.CASCADE, related_name="lines", db_column="dialogue_tree_id"
    )
    display_order = models.IntegerField(default=0)
    speaker_name = models.CharField(max_length=255)
    text = models.TextField()
    emotion = models.CharField(max_length=50, default="")

    class Meta:
        db_table = "dialogue_lines"
        managed = False
        ordering = ["display_order"]


class DialogueChoice(models.Model):
    dialogue_tree = models.ForeignKey(
        DialogueTree, on_delete=models.CASCADE, related_name="choices", db_column="dialogue_tree_id"
    )
    choice_key = models.CharField(max_length=100)
    text = models.TextField()
    decision_option = models.ForeignKey(
        DecisionOption, on_delete=models.DO_NOTHING, null=True, blank=True,
        db_column="decision_option_id",
    )
    required_tool_code = models.CharField(max_length=50, null=True, blank=True)
    effect_json = models.TextField(default="{}")
    display_order = models.IntegerField(default=0)

    class Meta:
        db_table = "dialogue_choices"
        managed = False
        ordering = ["display_order"]


class ClinicalTool(models.Model):
    case_version = models.ForeignKey(
        CaseVersion, on_delete=models.CASCADE, null=True, blank=True,
        related_name="clinical_tools", db_column="case_version_id",
    )
    tool_code = models.CharField(max_length=50)
    label = models.CharField(max_length=255)
    icon = models.CharField(max_length=50, default="")
    category = models.CharField(max_length=50, default="")
    description = models.TextField(default="")
    active = models.BooleanField(default=True)

    class Meta:
        db_table = "clinical_tools"
        managed = False
