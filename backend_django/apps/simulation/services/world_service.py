"""Mirrors Spring SimulationWorldService 1:1 (application/SimulationWorldService.java).

The explorable-world runtime: world snapshot, player movement, object interactions
(with dialogue/tool unlocks), and clinical-tool usage with pertinence feedback.
Reuses game_service's token hashing + owner/staff attempt guard.
"""
import json

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import NotFound, ValidationError

from ..models import (
    AttemptEvent,
    AttemptWorldState,
    ClinicalTool,
    CollisionZone,
    DialogueChoice,
    DialogueLine,
    DialogueTree,
    MapObject,
    SceneMap,
)
from . import game_service
from shared.jsonutils import (
    coerce_int as _int,
    read_map as _read_map,
    read_string_list as _read_string_list,
    write_map as _write_map,
)


# ─── json helpers ─────────────────────────────────────────────────────────────
def _append_unique(raw_json, value):
    items = _read_string_list(raw_json)
    if value not in items:
        items.append(value)
    return json.dumps(items)


def _clamp(value, low, high):
    return max(low, min(high, value))


# ─── public API ───────────────────────────────────────────────────────────────
@transaction.atomic
def get_world(attempt_id, attempt_token, actor):
    attempt = game_service._require_attempt(attempt_id, attempt_token, actor)
    world_state = require_world_state(attempt)
    return _to_world_state(attempt, world_state)


@transaction.atomic
def update_position(attempt_id, attempt_token, player_x, player_y, actor):
    attempt = game_service._require_attempt(attempt_id, attempt_token, actor)
    _require_in_progress(attempt)
    world_state = require_world_state(attempt)
    world_state.player_x = _clamp(player_x, 0, 960)
    world_state.player_y = _clamp(player_y, 0, 540)
    world_state.save()
    _save_event(attempt, "WORLD_POSITION_UPDATED", "Posicion de jugador actualizada")
    return _to_world_state(attempt, world_state)


@transaction.atomic
def open_interaction(attempt_id, attempt_token, interaction_key, actor):
    attempt = game_service._require_attempt(attempt_id, attempt_token, actor)
    _require_in_progress(attempt)
    world_state = require_world_state(attempt)
    map_object = MapObject.objects.filter(
        scene_map_id=world_state.scene_map_id, object_key=interaction_key
    ).first()
    if not map_object:
        raise NotFound("Interaccion no encontrada")

    world_state.inspected_object_keys_json = _append_unique(
        world_state.inspected_object_keys_json, map_object.object_key
    )

    dialogue = _to_dialogue(map_object)
    if dialogue is not None:
        world_state.viewed_dialogue_keys_json = _append_unique(
            world_state.viewed_dialogue_keys_json, dialogue["key"]
        )

    unlocked_tool = None
    if map_object.tool_code and map_object.tool_code.strip():
        world_state.inventory_json = _append_unique(
            world_state.inventory_json, map_object.tool_code
        )
        unlocked_tool = map_object.tool_code

    world_state.save()
    _save_event(attempt, "MAP_INTERACTION_OPENED", map_object.interaction_prompt)

    return {
        "world": _to_world_state(attempt, world_state),
        "interaction": _to_map_object(map_object),
        "dialogue": dialogue,
        "preparedDecisionOptionId": map_object.decision_option_id,
        "unlockedToolCode": unlocked_tool,
    }


@transaction.atomic
def use_tool(attempt_id, attempt_token, tool_code, target_interaction_key, actor):
    attempt = game_service._require_attempt(attempt_id, attempt_token, actor)
    world_state = require_world_state(attempt)
    if attempt.status != "IN_PROGRESS":
        raise ValidationError("El intento ya no acepta herramientas")
    tool = ClinicalTool.objects.filter(
        case_version_id=attempt.case_version_id, tool_code=tool_code
    ).first()
    if not tool:
        raise NotFound("Herramienta no encontrada")

    world_state.inventory_json = _append_unique(world_state.inventory_json, tool_code)

    usage_key = (
        tool_code
        if not target_interaction_key or not target_interaction_key.strip()
        else f"{tool_code}@{target_interaction_key}"
    )
    world_state.used_tool_keys_json = _append_unique(world_state.used_tool_keys_json, usage_key)
    world_state.save()

    pertinent = _evaluate_tool_pertinence(tool_code, target_interaction_key, world_state)
    stress_delta = -5 if pertinent else 3
    feedback_message = _generate_tool_feedback(tool, target_interaction_key, pertinent)

    attempt.stress_index = _clamp(attempt.stress_index + stress_delta, 0, 100)
    attempt.save()

    sign = "+" if stress_delta >= 0 else ""
    detail = (
        f"Herramienta usada: {tool_code}"
        + (f" sobre {target_interaction_key}" if target_interaction_key is not None else "")
        + f" — {'pertinente' if pertinent else 'no pertinente'}"
        + f" (estres {sign}{stress_delta}%)"
    )
    _save_event(attempt, "TOOL_USED", detail)

    return {
        "world": _to_world_state(attempt, world_state),
        "toolCode": tool_code,
        "targetKey": target_interaction_key,
        "pertinent": pertinent,
        "stressDelta": stress_delta,
        "feedbackMessage": feedback_message,
    }


def world_for_attempt(attempt):
    return _to_world_state(attempt, require_world_state(attempt))


@transaction.atomic
def enter_room(attempt_id, attempt_token, target_node_key, entry_x, entry_y, actor):
    """Fase 5 — spatial door: load the target room's map for the attempt at the entry
    point, WITHOUT advancing the DAG or scoring. Decoupled from the node via
    flags.syncedNodeId so the next /world load won't reset it (until a decision does)."""
    attempt = game_service._require_attempt(attempt_id, attempt_token, actor)
    _require_in_progress(attempt)
    target = (
        SceneMap.objects.select_related("node")
        .filter(node__case_version_id=attempt.current_node.case_version_id,
                node__node_key=target_node_key)
        .first()
    )
    if not target:
        raise NotFound(f"No hay sala para el nodo destino: {target_node_key}")
    state = require_world_state(attempt)
    state.scene_map = target
    state.player_x = _clamp(_int(entry_x), 0, target.width or 960)
    state.player_y = _clamp(_int(entry_y), 0, target.height or 540)
    flags = _read_map(state.flags_json)
    flags["syncedNodeId"] = attempt.current_node_id  # keep — door room is intentional
    state.flags_json = _write_map(flags)
    state.save()
    _save_event(attempt, "ROOM_ENTERED", f"Puerta hacia sala {target_node_key}")
    return _to_world_state(attempt, state)


# ─── internals ────────────────────────────────────────────────────────────────
def require_world_state(attempt):
    expected_map = SceneMap.objects.filter(node_id=attempt.current_node_id).first()
    if not expected_map:
        raise NotFound("La escena no tiene mapa configurado")
    state = (
        AttemptWorldState.objects.filter(attempt_id=attempt.id)
        .select_related("scene_map")
        .first()
    )
    if state is None:
        state = AttemptWorldState(
            attempt=attempt,
            scene_map=expected_map,
            player_x=expected_map.spawn_x,
            player_y=expected_map.spawn_y,
        )
    # Fase 5: the displayed room is reset to the DAG node's map ONLY when the node
    # changed (e.g. a decision advanced it), tracked via flags.syncedNodeId. Between
    # node changes, a spatial door may have set a different room — respect it.
    flags = _read_map(state.flags_json)
    if state.scene_map_id is None or flags.get("syncedNodeId") != attempt.current_node_id:
        state.scene_map = expected_map
        state.player_x = expected_map.spawn_x
        state.player_y = expected_map.spawn_y
        flags["syncedNodeId"] = attempt.current_node_id
        state.flags_json = _write_map(flags)
    state.save()  # updated_at is auto_now
    return state


def _require_in_progress(attempt):
    if attempt.status != "IN_PROGRESS":
        raise ValidationError("El intento ya no acepta interacciones en el mundo")


def _evaluate_tool_pertinence(tool_code, target_key, world_state):
    if not target_key or not target_key.strip():
        return True
    obj = MapObject.objects.filter(
        scene_map_id=world_state.scene_map_id, object_key=target_key
    ).first()
    if not obj:
        return False
    if tool_code == obj.tool_code:
        return True
    tree = DialogueTree.objects.filter(map_object_id=obj.id).first()
    if not tree:
        return False
    return DialogueChoice.objects.filter(
        dialogue_tree_id=tree.id, required_tool_code=tool_code
    ).exists()


def _generate_tool_feedback(tool, target_key, pertinent):
    if pertinent:
        return (
            f"Has aplicado {tool.label} de forma pertinente"
            + (" en el contexto adecuado" if target_key is not None else "")
            + ". Esto contribuye a una intervencion profesional y etica."
        )
    return (
        f"Has utilizado {tool.label}, pero este no es el contexto mas apropiado "
        "para esta herramienta. Considera revisar que herramienta se ajusta mejor "
        "a la situacion actual."
    )


def _save_event(attempt, event_type, detail):
    AttemptEvent.objects.create(
        attempt=attempt,
        event_type=event_type,
        node=attempt.current_node,
        detail=detail,
    )


# ─── DTO builders ─────────────────────────────────────────────────────────────
def _to_world_state(attempt, state):
    scene_map = state.scene_map
    return {
        "attemptId": str(attempt.id),
        "status": attempt.status,
        "map": {
            "id": scene_map.id,
            "key": scene_map.map_key,
            "title": scene_map.title,
            "width": scene_map.width,
            "height": scene_map.height,
            "theme": scene_map.theme,
            "spawnX": scene_map.spawn_x,
            "spawnY": scene_map.spawn_y,
            "ambient": _read_map(scene_map.ambient_json),
        },
        "player": {"x": state.player_x, "y": state.player_y},
        "objects": [
            _to_map_object(o)
            for o in MapObject.objects.filter(
                scene_map_id=scene_map.id, visible=True
            ).order_by("id")
        ],
        "collisions": [
            _to_collision_zone(c)
            for c in CollisionZone.objects.filter(scene_map_id=scene_map.id).order_by("id")
        ],
        "tools": [
            _to_clinical_tool(t)
            for t in ClinicalTool.objects.filter(
                case_version_id=attempt.case_version_id, active=True
            ).order_by("id")
        ],
        "inventory": _read_string_list(state.inventory_json),
        "inspectedObjectKeys": _read_string_list(state.inspected_object_keys_json),
        "viewedDialogueKeys": _read_string_list(state.viewed_dialogue_keys_json),
        "usedToolKeys": _read_string_list(state.used_tool_keys_json),
        "flags": _read_map(state.flags_json),
    }


def _to_map_object(o):
    return {
        "key": o.object_key,
        "label": o.label,
        "type": o.object_type,
        "x": o.position_x,
        "y": o.position_y,
        "width": o.width,
        "height": o.height,
        "color": o.color_hex,
        "icon": o.icon,
        "shortCode": o.short_code,
        "collision": o.collision,
        "interactionPrompt": o.interaction_prompt,
        "interactionText": o.interaction_text,
        "decisionOptionId": o.decision_option_id,
        "toolCode": o.tool_code,
        "dialogue": _to_dialogue(o),
        # ── B1: additive movement passthrough (authored motion can override the
        #     frontend default later; authoring itself is deferred to sub-project E) ──
        "movementPattern": _read_map(o.movement_pattern_json),
        "facing": o.facing,
        "metadata": _read_map(o.metadata_json),
    }


def _to_collision_zone(c):
    return {
        "key": c.zone_key,
        "label": c.label,
        "x": c.position_x,
        "y": c.position_y,
        "width": c.width,
        "height": c.height,
    }


def _to_clinical_tool(t):
    return {
        "code": t.tool_code,
        "label": t.label,
        "icon": t.icon,
        "category": t.category,
        "description": t.description,
        "active": t.active,
    }


def _to_dialogue(map_object):
    tree = DialogueTree.objects.filter(map_object_id=map_object.id).first()
    if not tree:
        return None
    return {
        "key": tree.tree_key,
        "speakerName": tree.speaker_name,
        "portraitKey": tree.portrait_key,
        "emotion": tree.emotion,
        "lines": [
            {"order": l.display_order, "speakerName": l.speaker_name, "text": l.text, "emotion": l.emotion}
            for l in DialogueLine.objects.filter(dialogue_tree_id=tree.id).order_by("display_order")
        ],
        "choices": [
            {
                "key": c.choice_key,
                "text": c.text,
                "decisionOptionId": c.decision_option_id,
                "requiredToolCode": c.required_tool_code,
                "effect": _read_map(c.effect_json),
            }
            for c in DialogueChoice.objects.filter(dialogue_tree_id=tree.id).order_by("display_order")
        ],
    }
