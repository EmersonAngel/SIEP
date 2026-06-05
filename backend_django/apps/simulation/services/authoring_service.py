"""Mirrors Spring SimulationAuthoringService 1:1 (application/SimulationAuthoringService.java).

Admin case editor: CRUD over nodes/decisions/maps/objects/dialogues/tools,
checklist, publish (gated by checklist=100% + world validation), clone-version
(deep copy to a new DRAFT), and the WorldDefinition v2 editor/save/validate/preview.

Error mapping (maintainer decision — semantic codes):
- requireVersion / requireXInVersion missing  -> NotFound (404)
- ownership / argument errors (IllegalArgument) -> ValidationError (400)
- ensureDraft + publish guards (IllegalState)  -> ValidationError (400)
- saveWorld revision mismatch (ResponseStatus) -> Conflict (409)

Mutations run inside transactions; each mutator returns the full CaseEditorView.
"""
import json
import time

from django.db import transaction
from rest_framework.exceptions import NotFound, ValidationError

from shared.exceptions import Conflict

from ..models import (
    CaseVersion,
    ClinicalTool,
    CollisionZone,
    DecisionOption,
    DialogueChoice,
    DialogueLine,
    DialogueTree,
    MapObject,
    PublicationChecklist,
    Rubric,
    RubricCriterion,
    SceneMap,
    SimulationNode,
)
from . import world_validation
from .audit_service import auditable
from shared.jsonutils import (
    coerce_int as _int,
    read_map as _read_map,
    read_string_list as _read_string_list,
    write_map as _write_map,
)

VALID_CLASSIFICATIONS = {"ADEQUATE", "RISKY", "INADEQUATE"}


# ─── tiny helpers (read_map/write_map/read_string_list/coerce_int → shared/jsonutils) ──
def _flag(request, key):
    return bool(request.get(key))


def _write_string_list(value):
    return json.dumps(value) if value is not None else "[]"


# ─── guards ──────────────────────────────────────────────────────────────────
def _require_version(case_version_id):
    version = CaseVersion.objects.filter(pk=case_version_id).first()
    if not version:
        raise NotFound("Version de caso no encontrada")
    return version


def _ensure_draft(case_version_id):
    version = _require_version(case_version_id)
    if version.status != "DRAFT":
        raise ValidationError(
            "Solo se puede modificar una versión en estado DRAFT. "
            f"Estado actual: {version.status}. "
            "Use 'Clonar versión' para crear una copia editable."
        )
    return version


def _require_node_in_version(node_id, case_version_id):
    node = SimulationNode.objects.filter(pk=node_id).first()
    if not node:
        raise NotFound(f"Nodo no encontrado: {node_id}")
    if node.case_version_id != case_version_id:
        raise ValidationError(f"El nodo {node_id} no pertenece a la versión {case_version_id}")
    return node


def _require_map_in_version(map_id, case_version_id):
    scene_map = SceneMap.objects.filter(pk=map_id).first()
    if not scene_map:
        raise NotFound(f"Mapa no encontrado: {map_id}")
    if scene_map.case_version_id != case_version_id:
        raise ValidationError(f"El mapa {map_id} no pertenece a la versión {case_version_id}")
    return scene_map


def _require_object_in_version(object_id, case_version_id):
    obj = MapObject.objects.filter(pk=object_id).select_related("scene_map").first()
    if not obj:
        raise NotFound(f"Objeto no encontrado: {object_id}")
    if obj.scene_map.case_version_id != case_version_id:
        raise ValidationError(f"El objeto {object_id} no pertenece a la versión {case_version_id}")
    return obj


def _require_tool_in_version(tool_id, case_version_id):
    tool = ClinicalTool.objects.filter(pk=tool_id).first()
    if not tool:
        raise NotFound(f"Herramienta no encontrada: {tool_id}")
    if tool.case_version_id != case_version_id:
        raise ValidationError(f"La herramienta {tool_id} no pertenece a la versión {case_version_id}")
    return tool


def _require_dialogue_in_version(tree_id, case_version_id):
    tree = DialogueTree.objects.filter(pk=tree_id).select_related("scene_map").first()
    if not tree:
        raise NotFound(f"Diálogo no encontrado: {tree_id}")
    if tree.scene_map.case_version_id != case_version_id:
        raise ValidationError(f"El diálogo {tree_id} no pertenece a la versión {case_version_id}")
    return tree


# ─── editor view assembly ────────────────────────────────────────────────────
def editor(case_version_id):
    version = _require_version(case_version_id)
    nodes = list(SimulationNode.objects.filter(case_version_id=case_version_id).order_by("id"))
    decisions = list(
        DecisionOption.objects.filter(case_version_id=case_version_id)
        .select_related("source_node", "target_node")
        .order_by("id")
    )
    maps = list(
        SceneMap.objects.filter(case_version_id=case_version_id)
        .select_related("node")
        .order_by("id")
    )
    objects = []
    for scene_map in maps:
        objects.extend(
            MapObject.objects.filter(scene_map_id=scene_map.id).order_by("id")
        )
    checklist = _latest_checklist_ratio(case_version_id)

    return {
        "caseVersionId": version.id,
        "title": version.simulation_case.title,
        "semanticVersion": version.semantic_version,
        "status": version.status,
        "nodes": [_node_editor_state(n) for n in nodes],
        "decisions": [_decision_edge(d) for d in decisions],
        "maps": [_map_editor_state(m) for m in maps],
        "objects": [_map_object_editor(o) for o in objects],
        "tools": [
            _clinical_tool_editor(t)
            for t in ClinicalTool.objects.filter(case_version_id=case_version_id).order_by("id")
        ],
        "rubrics": [
            _rubric_view(r)
            for r in Rubric.objects.filter(case_version_id=case_version_id, active=True).order_by("id")
        ],
        "checklistCompletion": checklist,
        "publishable": checklist >= 100,
    }


def _latest_checklist_ratio(case_version_id):
    latest = (
        PublicationChecklist.objects.filter(case_version_id=case_version_id)
        .order_by("-submitted_at")
        .first()
    )
    return int(latest.completion_ratio) if latest else 0


# ─── Node CRUD ────────────────────────────────────────────────────────────────
@transaction.atomic
def create_node(case_version_id, request):
    version = _ensure_draft(case_version_id)
    node = SimulationNode(case_version=version)
    _apply_node_request(node, request)
    node.save()
    return editor(case_version_id)


@transaction.atomic
def update_node(case_version_id, node_id, request):
    _ensure_draft(case_version_id)
    node = _require_node_in_version(node_id, case_version_id)
    _apply_node_request(node, request)
    node.save()
    return editor(case_version_id)


@transaction.atomic
def delete_node(case_version_id, node_id):
    _ensure_draft(case_version_id)
    node = _require_node_in_version(node_id, case_version_id)
    node.delete()
    return editor(case_version_id)


def _apply_node_request(node, request):
    node.node_key = request.get("nodeKey")
    node.title = request.get("title")
    node.narrative = request.get("narrative")
    node.required_tools_json = _write_string_list(request.get("requiredTools"))
    node.support_resources_json = _write_string_list(request.get("supportResources"))
    node.sensitive_content = _flag(request, "sensitiveContent")
    node.safe_exit_required = _flag(request, "safeExitRequired")
    node.warning_message = request.get("warningMessage")
    node.terminal_node = _flag(request, "terminal")
    node.start_node = _flag(request, "startNode")
    node.position_x = request.get("positionX")
    node.position_y = request.get("positionY")


# ─── Decision CRUD ──────────────────────────────────────────────────────────
@transaction.atomic
def create_decision(case_version_id, request):
    version = _ensure_draft(case_version_id)
    decision = DecisionOption(case_version=version)
    _apply_decision_request(decision, request)
    decision.save()
    return editor(case_version_id)


@transaction.atomic
def update_decision(case_version_id, decision_id, request):
    _ensure_draft(case_version_id)
    decision = DecisionOption.objects.filter(pk=decision_id).first()
    if not decision:
        raise NotFound(f"Decision no encontrada: {decision_id}")
    if decision.case_version_id != case_version_id:
        raise ValidationError(f"La decisión {decision_id} no pertenece a la versión {case_version_id}")
    _apply_decision_request(decision, request)
    decision.save()
    return editor(case_version_id)


@transaction.atomic
def delete_decision(case_version_id, decision_id):
    _ensure_draft(case_version_id)
    decision = DecisionOption.objects.filter(pk=decision_id).first()
    if not decision:
        raise NotFound(f"Decision no encontrada: {decision_id}")
    if decision.case_version_id != case_version_id:
        raise ValidationError(f"La decisión {decision_id} no pertenece a la versión {case_version_id}")
    decision.delete()
    return editor(case_version_id)


def _apply_decision_request(decision, request):
    src = SimulationNode.objects.filter(pk=request.get("sourceNodeId")).first()
    if not src:
        raise NotFound(f"Nodo origen: {request.get('sourceNodeId')}")
    tgt = SimulationNode.objects.filter(pk=request.get("targetNodeId")).first()
    if not tgt:
        raise NotFound(f"Nodo destino: {request.get('targetNodeId')}")
    option_key = request.get("optionKey")
    decision.option_key = option_key if option_key is not None else (
        f"{src.node_key}->{tgt.node_key}-{int(time.time() * 1000)}"
    )
    decision.source_node = src
    decision.target_node = tgt
    decision.text = request.get("text")
    classification = request.get("classification")
    if classification not in VALID_CLASSIFICATIONS:
        raise ValidationError(f"Clasificación inválida: {classification}")
    decision.classification = classification
    decision.prohibited_conduct = _flag(request, "prohibitedConduct")
    decision.prohibition_reason = request.get("prohibitionReason")
    decision.score_delta = _int(request.get("scoreDelta"))
    decision.stress_delta = _int(request.get("stressDelta"))
    decision.prohibited_penalty = _int(request.get("prohibitedPenalty"))
    feedback = request.get("immediateFeedback")
    decision.immediate_feedback = feedback if feedback is not None else ""


# ─── Map CRUD ────────────────────────────────────────────────────────────────
@transaction.atomic
def create_map(case_version_id, request):
    version = _ensure_draft(case_version_id)
    node = SimulationNode.objects.filter(pk=request.get("nodeId")).first()
    if not node:
        raise NotFound(f"Nodo no encontrado: {request.get('nodeId')}")
    scene_map = SceneMap(case_version=version, node=node)
    _apply_map_request(scene_map, request)
    scene_map.save()
    return editor(case_version_id)


@transaction.atomic
def update_map(case_version_id, map_id, request):
    _ensure_draft(case_version_id)
    scene_map = _require_map_in_version(map_id, case_version_id)
    if request.get("nodeId") is not None:
        node = SimulationNode.objects.filter(pk=request.get("nodeId")).first()
        if not node:
            raise NotFound(f"Nodo no encontrado: {request.get('nodeId')}")
        scene_map.node = node
    _apply_map_request(scene_map, request)
    scene_map.save()
    return editor(case_version_id)


@transaction.atomic
def delete_map(case_version_id, map_id):
    _ensure_draft(case_version_id)
    scene_map = _require_map_in_version(map_id, case_version_id)
    scene_map.delete()
    return editor(case_version_id)


def _apply_map_request(scene_map, request):
    scene_map.map_key = request.get("mapKey")
    scene_map.title = request.get("title")
    width = _int(request.get("width"))
    height = _int(request.get("height"))
    scene_map.width = width if width > 0 else 960
    scene_map.height = height if height > 0 else 540
    scene_map.theme = request.get("theme") if request.get("theme") is not None else "clinical-soft"
    scene_map.spawn_x = _int(request.get("spawnX"))
    scene_map.spawn_y = _int(request.get("spawnY"))


# ─── Map Object CRUD ─────────────────────────────────────────────────────────
@transaction.atomic
def create_object(case_version_id, map_id, request):
    _ensure_draft(case_version_id)
    scene_map = _require_map_in_version(map_id, case_version_id)
    obj = MapObject(scene_map=scene_map)
    _apply_object_request(obj, request)
    obj.save()
    return editor(case_version_id)


@transaction.atomic
def update_object(case_version_id, object_id, request):
    _ensure_draft(case_version_id)
    obj = _require_object_in_version(object_id, case_version_id)
    _apply_object_request(obj, request)
    obj.save()
    return editor(case_version_id)


@transaction.atomic
def delete_object(case_version_id, object_id):
    _ensure_draft(case_version_id)
    obj = _require_object_in_version(object_id, case_version_id)
    obj.delete()
    return editor(case_version_id)


def _apply_object_request(obj, request):
    obj.object_key = request.get("objectKey")
    obj.label = request.get("label")
    obj.object_type = request.get("objectType")
    obj.position_x = _int(request.get("x"))
    obj.position_y = _int(request.get("y"))
    width = _int(request.get("width"))
    height = _int(request.get("height"))
    obj.width = width if width > 0 else 48
    obj.height = height if height > 0 else 48
    obj.color_hex = request.get("colorHex") if request.get("colorHex") is not None else "#4FA3A5"
    obj.icon = request.get("icon") if request.get("icon") is not None else "psychology"
    obj.short_code = request.get("shortCode") if request.get("shortCode") is not None else "ACT"
    obj.collision = _flag(request, "collision")
    obj.visible = _flag(request, "visible")
    obj.interaction_prompt = request.get("interactionPrompt")
    obj.interaction_text = request.get("interactionText")
    obj.tool_code = request.get("toolCode")
    decision_option_id = request.get("decisionOptionId")
    if decision_option_id is not None:
        decision = DecisionOption.objects.filter(pk=decision_option_id).first()
        if decision:
            obj.decision_option = decision
    else:
        obj.decision_option = None


# ─── Dialogue CRUD ────────────────────────────────────────────────────────────
@transaction.atomic
def create_dialogue(case_version_id, map_id, request):
    _ensure_draft(case_version_id)
    scene_map = _require_map_in_version(map_id, case_version_id)
    map_object = None
    if request.get("mapObjectId") is not None:
        map_object = MapObject.objects.filter(pk=request.get("mapObjectId")).first()
    tree = DialogueTree(scene_map=scene_map, map_object=map_object)
    _apply_dialogue_request(tree, request)
    tree.save()
    _save_dialogue_lines(tree, request.get("lines"))
    return editor(case_version_id)


@transaction.atomic
def update_dialogue(case_version_id, tree_id, request):
    _ensure_draft(case_version_id)
    tree = _require_dialogue_in_version(tree_id, case_version_id)
    _apply_dialogue_request(tree, request)
    tree.save()
    DialogueLine.objects.filter(dialogue_tree_id=tree_id).delete()
    _save_dialogue_lines(tree, request.get("lines"))
    return editor(case_version_id)


@transaction.atomic
def delete_dialogue(case_version_id, tree_id):
    _ensure_draft(case_version_id)
    tree = _require_dialogue_in_version(tree_id, case_version_id)
    tree.delete()
    return editor(case_version_id)


def _apply_dialogue_request(tree, request):
    tree.tree_key = request.get("treeKey")
    tree.speaker_name = request.get("speakerName")
    tree.portrait_key = request.get("portraitKey")
    tree.emotion = request.get("emotion") if request.get("emotion") is not None else "neutral"


def _save_dialogue_lines(tree, lines):
    if lines is None:
        return
    for line_req in lines:
        DialogueLine.objects.create(
            dialogue_tree=tree,
            display_order=_int(line_req.get("displayOrder")),
            speaker_name=line_req.get("speakerName"),
            text=line_req.get("text"),
            emotion=line_req.get("emotion") if line_req.get("emotion") is not None else "neutral",
        )


def _save_dialogue_choices(tree, choices, case_version_id):
    if not choices:
        return
    for ch in choices:
        decision = None
        if ch.get("decisionOptionId") is not None:
            decision = DecisionOption.objects.filter(
                pk=ch.get("decisionOptionId"), case_version_id=case_version_id
            ).first()
        DialogueChoice.objects.create(
            dialogue_tree=tree,
            choice_key=ch.get("key") or "",
            text=ch.get("text") or "",
            decision_option=decision,
            required_tool_code=ch.get("requiredToolCode"),
            effect_json=_write_map(ch.get("effect")),
            display_order=_int(ch.get("displayOrder")),
        )


# ─── Tool CRUD ────────────────────────────────────────────────────────────────
@transaction.atomic
def create_tool(case_version_id, request):
    version = _ensure_draft(case_version_id)
    tool = ClinicalTool(case_version=version)
    _apply_tool_request(tool, request)
    tool.save()
    return editor(case_version_id)


@transaction.atomic
def update_tool(case_version_id, tool_id, request):
    _ensure_draft(case_version_id)
    tool = _require_tool_in_version(tool_id, case_version_id)
    _apply_tool_request(tool, request)
    tool.save()
    return editor(case_version_id)


@transaction.atomic
def delete_tool(case_version_id, tool_id):
    _ensure_draft(case_version_id)
    tool = _require_tool_in_version(tool_id, case_version_id)
    tool.delete()
    return editor(case_version_id)


def _apply_tool_request(tool, request):
    tool.tool_code = request.get("toolCode")
    tool.label = request.get("label")
    tool.icon = request.get("icon") if request.get("icon") is not None else "psychology"
    tool.category = request.get("category") if request.get("category") is not None else "clinical"
    tool.description = request.get("description")
    tool.active = True


# ─── Checklist ────────────────────────────────────────────────────────────────
@transaction.atomic
def update_checklist(case_version_id, request, actor):
    version = _ensure_draft(case_version_id)
    true_count = sum(
        1 for key in (
            "contentOriginal", "ethicsReviewed", "safetyProtocols",
            "noStigmatizing", "triggerWarnings", "accessibilityOk",
        ) if _flag(request, key)
    )
    ratio = round(true_count * 100.0 / 6)
    checklist = PublicationChecklist(
        case_version=version,
        submitted_by=actor,
        completion_ratio=ratio,
        status="COMPLETE" if ratio >= 100 else "PENDING",
    )
    if ratio >= 100:
        from django.utils import timezone
        checklist.completed_at = timezone.now()
    checklist.save()
    return editor(case_version_id)


# ─── Publish ──────────────────────────────────────────────────────────────────
@transaction.atomic
def publish(case_version_id):
    version = _require_version(case_version_id)

    if version.status == "PUBLISHED":
        raise ValidationError(
            "El caso ya está publicado. Use 'Clonar versión' para crear una nueva."
        )
    if version.status == "ARCHIVED":
        raise ValidationError("No se puede publicar una versión archivada.")

    if _latest_checklist_ratio(case_version_id) < 100:
        raise ValidationError(
            "El checklist ético y académico debe estar al 100% antes de publicar."
        )

    validation = _run_world_validation(version)
    if validation["errors"]:
        summary = " | ".join(
            f"[{i['code']}] {i['message']}" for i in validation["errors"]
        ) or "Errores de validación detectados"
        raise ValidationError(
            f"El caso no puede publicarse con errores de validación: {summary}"
        )

    from django.utils import timezone
    version.status = "PUBLISHED"
    version.published_at = timezone.now()
    version.save()
    return editor(case_version_id)


# ─── Clone version ──────────────────────────────────────────────────────────
@transaction.atomic
def clone_version(case_version_id, actor):
    source = _require_version(case_version_id)
    clone = CaseVersion.objects.create(
        simulation_case=source.simulation_case,
        semantic_version=_next_minor(source),
        status="DRAFT",
        narrative_context=source.narrative_context,
        cloned_from=source,
        created_by=actor,
    )

    node_copies = _clone_nodes(source, clone)
    decision_copies = _clone_decisions(source, clone, node_copies)
    map_copies = _clone_maps(source, clone, node_copies)
    _clone_collision_zones(map_copies)
    object_copies = _clone_map_objects(map_copies, decision_copies)
    _clone_dialogues(map_copies, object_copies, decision_copies)
    _clone_clinical_tools(source, clone)
    _clone_rubrics(source, clone, actor)
    _create_draft_checklist(clone, actor)

    return editor(clone.id)


def _clone_nodes(source, clone):
    copies = {}
    for node in SimulationNode.objects.filter(case_version_id=source.id).order_by("id"):
        copy = SimulationNode.objects.create(
            case_version=clone,
            node_key=node.node_key,
            title=node.title,
            narrative=node.narrative,
            support_resources_json=node.support_resources_json,
            required_tools_json=node.required_tools_json,
            sensitive_content=node.sensitive_content,
            safe_exit_required=node.safe_exit_required,
            warning_message=node.warning_message,
            start_node=node.start_node,
            terminal_node=node.terminal_node,
            position_x=node.position_x,
            position_y=node.position_y,
        )
        copies[node.id] = copy
    return copies


def _clone_decisions(source, clone, node_copies):
    copies = {}
    for d in DecisionOption.objects.filter(case_version_id=source.id).order_by("id"):
        copy = DecisionOption.objects.create(
            case_version=clone,
            option_key=d.option_key,
            source_node=node_copies.get(d.source_node_id),
            target_node=node_copies.get(d.target_node_id),
            text=d.text,
            classification=d.classification,
            score_delta=d.score_delta,
            stress_delta=d.stress_delta,
            prohibited_penalty=d.prohibited_penalty,
            immediate_feedback=d.immediate_feedback,
            prohibited_conduct=d.prohibited_conduct,
            prohibition_reason=d.prohibition_reason,
        )
        copies[d.id] = copy
    return copies


def _clone_maps(source, clone, node_copies):
    copies = {}
    for m in SceneMap.objects.filter(case_version_id=source.id).order_by("id"):
        copy = SceneMap.objects.create(
            case_version=clone,
            node=node_copies.get(m.node_id),
            map_key=m.map_key,
            title=m.title,
            width=m.width,
            height=m.height,
            theme=m.theme,
            spawn_x=m.spawn_x,
            spawn_y=m.spawn_y,
            ambient_json=m.ambient_json,
        )
        copies[m.id] = copy
    return copies


def _clone_collision_zones(map_copies):
    for source_map_id, cloned_map in map_copies.items():
        for zone in CollisionZone.objects.filter(scene_map_id=source_map_id).order_by("id"):
            CollisionZone.objects.create(
                scene_map=cloned_map,
                zone_key=zone.zone_key,
                label=zone.label,
                position_x=zone.position_x,
                position_y=zone.position_y,
                width=zone.width,
                height=zone.height,
            )


def _clone_map_objects(map_copies, decision_copies):
    copies = {}
    for source_map_id, cloned_map in map_copies.items():
        for obj in MapObject.objects.filter(scene_map_id=source_map_id).order_by("id"):
            copy = MapObject.objects.create(
                scene_map=cloned_map,
                object_key=obj.object_key,
                label=obj.label,
                object_type=obj.object_type,
                position_x=obj.position_x,
                position_y=obj.position_y,
                width=obj.width,
                height=obj.height,
                color_hex=obj.color_hex,
                icon=obj.icon,
                short_code=obj.short_code,
                collision=obj.collision,
                visible=obj.visible,
                interaction_prompt=obj.interaction_prompt,
                interaction_text=obj.interaction_text,
                decision_option=decision_copies.get(obj.decision_option_id) if obj.decision_option_id else None,
                tool_code=obj.tool_code,
                unlock_condition_json=obj.unlock_condition_json,
                z_index=obj.z_index,
                facing=obj.facing,
                movement_pattern_json=obj.movement_pattern_json,
                metadata_json=obj.metadata_json,
            )
            copies[obj.id] = copy
    return copies


def _clone_dialogues(map_copies, object_copies, decision_copies):
    for source_map_id, cloned_map in map_copies.items():
        for tree in DialogueTree.objects.filter(scene_map_id=source_map_id).order_by("id"):
            tree_copy = DialogueTree.objects.create(
                scene_map=cloned_map,
                map_object=object_copies.get(tree.map_object_id) if tree.map_object_id else None,
                tree_key=tree.tree_key,
                speaker_name=tree.speaker_name,
                portrait_key=tree.portrait_key,
                emotion=tree.emotion,
            )
            for line in DialogueLine.objects.filter(dialogue_tree_id=tree.id).order_by("display_order"):
                DialogueLine.objects.create(
                    dialogue_tree=tree_copy,
                    display_order=line.display_order,
                    speaker_name=line.speaker_name,
                    text=line.text,
                    emotion=line.emotion,
                )
            for choice in DialogueChoice.objects.filter(dialogue_tree_id=tree.id).order_by("display_order"):
                DialogueChoice.objects.create(
                    dialogue_tree=tree_copy,
                    choice_key=choice.choice_key,
                    text=choice.text,
                    decision_option=decision_copies.get(choice.decision_option_id) if choice.decision_option_id else None,
                    required_tool_code=choice.required_tool_code,
                    effect_json=choice.effect_json,
                    display_order=choice.display_order,
                )


def _clone_clinical_tools(source, clone):
    for tool in ClinicalTool.objects.filter(case_version_id=source.id).order_by("id"):
        ClinicalTool.objects.create(
            case_version=clone,
            tool_code=tool.tool_code,
            label=tool.label,
            icon=tool.icon,
            category=tool.category,
            description=tool.description,
            active=tool.active,
        )


def _clone_rubrics(source, clone, actor):
    for rubric in Rubric.objects.filter(case_version_id=source.id).order_by("id"):
        rubric_copy = Rubric.objects.create(
            case_version=clone,
            name=rubric.name,
            description=rubric.description,
            active=rubric.active,
            created_by=actor,
        )
        for criterion in RubricCriterion.objects.filter(rubric_id=rubric.id).order_by("display_order"):
            RubricCriterion.objects.create(
                rubric=rubric_copy,
                competency=criterion.competency,
                title=criterion.title,
                description=criterion.description,
                max_score=criterion.max_score,
                display_order=criterion.display_order,
            )


def _create_draft_checklist(clone, actor):
    PublicationChecklist.objects.create(
        case_version=clone,
        submitted_by=actor,
        completion_ratio=0,
        status="PENDING",
    )


def _next_minor(source):
    version = source.semantic_version
    parts = version.split(".")
    if len(parts) != 3:
        return version + ".1"
    major = _parse_part(parts[0], -1)
    max_minor = _parse_part(parts[1], 0)
    for other in CaseVersion.objects.filter(
        simulation_case_id=source.simulation_case_id
    ).order_by("-created_at"):
        other_parts = other.semantic_version.split(".")
        if len(other_parts) != 3:
            continue
        if _parse_part(other_parts[0], -1) != major:
            continue
        minor = _parse_part(other_parts[1], 0)
        if minor > max_minor:
            max_minor = minor
    return f"{major}.{max_minor + 1}.0"


def _parse_part(value, fallback):
    try:
        return int(value)
    except (TypeError, ValueError):
        return fallback


# ─── editor-state DTO builders ────────────────────────────────────────────────
def _node_editor_state(node):
    return {
        "id": node.id,
        "key": node.node_key,
        "title": node.title,
        "narrative": node.narrative,
        "supportResources": _read_string_list(node.support_resources_json),
        "requiredTools": _read_string_list(node.required_tools_json),
        "sensitiveContent": node.sensitive_content,
        "safeExitRequired": node.safe_exit_required,
        "warningMessage": node.warning_message,
        "terminal": node.terminal_node,
        "startNode": node.start_node,
        "positionX": node.position_x,
        "positionY": node.position_y,
    }


def _decision_edge(d):
    return {
        "id": d.id,
        "optionKey": d.option_key,
        "sourceNodeId": d.source_node_id,
        "sourceKey": d.source_node.node_key,
        "targetNodeId": d.target_node_id,
        "targetKey": d.target_node.node_key,
        "text": d.text,
        "classification": d.classification,
        "prohibitedConduct": d.prohibited_conduct,
        "prohibitionReason": d.prohibition_reason,
        "scoreDelta": d.score_delta,
        "stressDelta": d.stress_delta,
        "prohibitedPenalty": d.prohibited_penalty,
        "immediateFeedback": d.immediate_feedback,
    }


def _map_editor_state(m):
    return {
        "id": m.id,
        "key": m.map_key,
        "title": m.title,
        "width": m.width,
        "height": m.height,
        "theme": m.theme,
        "spawnX": m.spawn_x,
        "spawnY": m.spawn_y,
        "nodeId": m.node_id,
        "nodeKey": m.node.node_key,
    }


def _map_object_editor(o):
    return {
        "id": o.id,
        "key": o.object_key,
        "label": o.label,
        "type": o.object_type,
        "x": o.position_x,
        "y": o.position_y,
        "width": o.width,
        "height": o.height,
        "colorHex": o.color_hex,
        "icon": o.icon,
        "shortCode": o.short_code,
        "collision": o.collision,
        "visible": o.visible,
        "interactionPrompt": o.interaction_prompt,
        "interactionText": o.interaction_text,
        "decisionOptionId": o.decision_option_id,
        "toolCode": o.tool_code,
        "mapId": o.scene_map_id,
    }


def _clinical_tool_editor(t):
    return {
        "id": t.id,
        "code": t.tool_code,
        "label": t.label,
        "icon": t.icon,
        "category": t.category,
        "description": t.description,
        "active": t.active,
    }


def _rubric_view(rubric):
    return {
        "rubricId": rubric.id,
        "rubricName": rubric.name,
        "description": rubric.description,
        "criteria": [
            {
                "id": c.id,
                "competency": c.competency,
                "title": c.title,
                "description": c.description,
                "maxScore": c.max_score,
                "displayOrder": c.display_order,
            }
            for c in RubricCriterion.objects.filter(rubric_id=rubric.id).order_by("display_order")
        ],
        "scores": [],
        "totalScore": None,
        "comment": None,
    }


# ─── WorldDefinition v2 ───────────────────────────────────────────────────────
def world_editor(case_version_id, node_id):
    version = _require_version(case_version_id)
    all_maps = list(SceneMap.objects.filter(case_version_id=case_version_id).order_by("id"))

    if node_id is not None:
        scene_map = next((m for m in all_maps if m.node_id == node_id), None)
        if scene_map is None:
            raise NotFound(f"No hay mapa para el nodo {node_id} en versión {case_version_id}")
    else:
        scene_map = all_maps[0] if all_maps else None
        if scene_map is None:
            raise NotFound("Esta versión no tiene mapas aún")

    objects = list(MapObject.objects.filter(scene_map_id=scene_map.id).order_by("id"))
    collisions = list(CollisionZone.objects.filter(scene_map_id=scene_map.id).order_by("id"))
    dialogue_trees = list(DialogueTree.objects.filter(scene_map_id=scene_map.id).order_by("id"))
    tools = list(ClinicalTool.objects.filter(case_version_id=case_version_id).order_by("id"))

    exit_objects = [o for o in objects if (o.object_type or "").upper() == "EXIT"]
    has_safe_exit = bool(exit_objects)
    exit_key = exit_objects[0].object_key if exit_objects else None

    validation = _run_world_validation(version)
    outgoing = list(
        DecisionOption.objects.filter(source_node_id=scene_map.node_id)
        .select_related("target_node")
        .order_by("id")
    )

    return {
        "schemaVersion": 2,
        "caseVersionId": case_version_id,
        "revision": version.version,
        "nodeId": scene_map.node_id,
        "map": _scene_map_definition(scene_map),
        "objects": [_world_object(o) for o in objects],
        "collisionZones": [_world_collision_zone(c) for c in collisions],
        "dialogues": [_world_dialogue_tree(t) for t in dialogue_trees],
        "clinicalTools": [_world_clinical_tool(t) for t in tools],
        "safeExit": {
            "configured": has_safe_exit,
            "exitObjectKey": exit_key,
            "supportResources": [],
        },
        "validation": validation,
        "availableDecisions": [
            {
                "id": d.id,
                "optionKey": d.option_key,
                "text": d.text,
                "classification": d.classification,
                "targetNodeKey": d.target_node.node_key,
                "prohibitedConduct": d.prohibited_conduct,
            }
            for d in outgoing
        ],
        "rooms": [
            {"nodeId": mm.node_id, "nodeKey": mm.node.node_key, "mapKey": mm.map_key, "title": mm.title}
            for mm in SceneMap.objects.filter(case_version_id=case_version_id)
            .select_related("node").order_by("id")
        ],
    }


def world_preview(case_version_id, node_id):
    return world_editor(case_version_id, node_id)


def validate_world(case_version_id):
    version = _require_version(case_version_id)
    return _run_world_validation(version)


@transaction.atomic
def save_world(case_version_id, node_id, request):
    version = _ensure_draft(case_version_id)

    revision = request.get("revision")
    if revision is not None and revision != version.version:
        raise Conflict("Este caso fue modificado en otra sesión. Recarga el editor para continuar.")

    all_maps = list(SceneMap.objects.filter(case_version_id=case_version_id).order_by("id"))
    if node_id is not None:
        scene_map = next((m for m in all_maps if m.node_id == node_id), None)
        if scene_map is None:
            raise NotFound(f"No hay mapa para el nodo {node_id}")
    else:
        scene_map = all_maps[0] if all_maps else None
        if scene_map is None:
            raise NotFound("Esta versión no tiene mapas aún")

    map_def = request.get("map")
    if map_def is not None:
        if _int(map_def.get("width")) > 0:
            scene_map.width = _int(map_def.get("width"))
        if _int(map_def.get("height")) > 0:
            scene_map.height = _int(map_def.get("height"))
        if _int(map_def.get("spawnX"), -1) >= 0:
            scene_map.spawn_x = _int(map_def.get("spawnX"))
        if _int(map_def.get("spawnY"), -1) >= 0:
            scene_map.spawn_y = _int(map_def.get("spawnY"))
        if map_def.get("theme") is not None:
            scene_map.theme = map_def.get("theme")
        if map_def.get("ambient") is not None:
            scene_map.ambient_json = _write_map(map_def.get("ambient"))
        scene_map.save()

    objects = request.get("objects")
    if objects is not None:
        for wo in objects:
            obj = None
            if wo.get("id") is not None:
                obj = MapObject.objects.filter(pk=wo.get("id")).first()
            if obj is None:
                obj = MapObject()
            obj.scene_map = scene_map
            obj.object_key = wo.get("key")
            obj.label = wo.get("label")
            obj.object_type = wo.get("type")
            obj.position_x = _int(wo.get("x"))
            obj.position_y = _int(wo.get("y"))
            obj.width = _int(wo.get("width")) if _int(wo.get("width")) > 0 else 48
            obj.height = _int(wo.get("height")) if _int(wo.get("height")) > 0 else 48
            obj.z_index = _int(wo.get("zIndex"))
            obj.facing = wo.get("facing") if wo.get("facing") is not None else "down"
            obj.color_hex = wo.get("colorHex") if wo.get("colorHex") is not None else "#4FA3A5"
            obj.icon = wo.get("icon") if wo.get("icon") is not None else "psychology"
            obj.short_code = wo.get("shortCode") if wo.get("shortCode") is not None else "ACT"
            obj.collision = bool(wo.get("collision"))
            obj.visible = bool(wo.get("visible"))
            obj.interaction_prompt = wo.get("interactionPrompt") if wo.get("interactionPrompt") is not None else ""
            obj.interaction_text = wo.get("interactionText") if wo.get("interactionText") is not None else ""
            obj.tool_code = wo.get("toolCode")
            obj.unlock_condition_json = _write_map(wo.get("unlockCondition"))
            obj.movement_pattern_json = _write_map(wo.get("movementPattern"))
            obj.metadata_json = _write_map(wo.get("metadata"))
            if wo.get("decisionOptionId") is not None:
                decision = DecisionOption.objects.filter(pk=wo.get("decisionOptionId")).first()
                if decision:
                    obj.decision_option = decision
            else:
                obj.decision_option = None
            obj.save()

    dialogues = request.get("dialogues")
    if dialogues is not None:
        obj_by_key = {o.object_key: o for o in MapObject.objects.filter(scene_map=scene_map)}
        kept_tree_ids = []
        for dt in dialogues:
            tree = None
            if dt.get("id") is not None:
                tree = DialogueTree.objects.filter(pk=dt.get("id"), scene_map=scene_map).first()
            if tree is None:
                tree = DialogueTree(scene_map=scene_map)
            owner = None
            if dt.get("mapObjectKey") is not None:
                owner = obj_by_key.get(dt.get("mapObjectKey"))
            if owner is None and dt.get("mapObjectId") is not None:
                owner = MapObject.objects.filter(pk=dt.get("mapObjectId"), scene_map=scene_map).first()
            tree.scene_map = scene_map
            tree.map_object = owner
            tree.tree_key = dt.get("key") or ""
            tree.speaker_name = dt.get("speakerName") or ""
            tree.portrait_key = dt.get("portraitKey")
            tree.emotion = dt.get("emotion") if dt.get("emotion") is not None else "neutral"
            tree.save()
            kept_tree_ids.append(tree.id)
            DialogueLine.objects.filter(dialogue_tree=tree).delete()
            for ln in (dt.get("lines") or []):
                DialogueLine.objects.create(
                    dialogue_tree=tree,
                    display_order=_int(ln.get("order")),
                    speaker_name=ln.get("speakerName") or tree.speaker_name,
                    text=ln.get("text") or "",
                    emotion=ln.get("emotion") if ln.get("emotion") is not None else "neutral",
                )
            DialogueChoice.objects.filter(dialogue_tree=tree).delete()
            _save_dialogue_choices(tree, dt.get("choices"), case_version_id)
        DialogueTree.objects.filter(scene_map=scene_map).exclude(pk__in=kept_tree_ids).delete()

    # Spring calls caseVersionRepository.save(version); @Version only bumps when the
    # entity is dirty (it isn't here), so the revision is intentionally left unchanged.
    return world_editor(case_version_id, node_id)


# ─── world-snapshot validation ────────────────────────────────────────────────
def _run_world_validation(version):
    case_version_id = version.id
    nodes = list(SimulationNode.objects.filter(case_version_id=case_version_id).order_by("id"))
    decisions = list(
        DecisionOption.objects.filter(case_version_id=case_version_id)
        .order_by("id")
    )
    maps = list(SceneMap.objects.filter(case_version_id=case_version_id).order_by("id"))

    all_objects, all_collisions, all_dialogues = [], [], []
    for m in maps:
        all_objects.extend(MapObject.objects.filter(scene_map_id=m.id).order_by("id"))
        all_collisions.extend(CollisionZone.objects.filter(scene_map_id=m.id).order_by("id"))
        all_dialogues.extend(DialogueTree.objects.filter(scene_map_id=m.id).order_by("id"))

    has_safe_exit = any((o.object_type or "").upper() == "EXIT" for o in all_objects)

    snapshot = {
        "nodes": [
            {
                "id": n.id,
                "startNode": n.start_node,
                "terminalNode": n.terminal_node,
                "x": n.position_x if n.position_x is not None else 0,
                "y": n.position_y if n.position_y is not None else 0,
            }
            for n in nodes
        ],
        "decisions": [
            {
                "id": d.id,
                "sourceNodeId": d.source_node_id,
                "targetNodeId": d.target_node_id,
                "prohibitedConduct": d.prohibited_conduct,
                "prohibitionReason": d.prohibition_reason,
            }
            for d in decisions
        ],
        "maps": [
            {
                "id": m.id,
                "width": m.width,
                "height": m.height,
                "spawnX": m.spawn_x,
                "spawnY": m.spawn_y,
            }
            for m in maps
        ],
        "objects": [
            {
                "id": o.id,
                "mapId": o.scene_map_id,
                "x": o.position_x,
                "y": o.position_y,
                "width": o.width,
                "height": o.height,
                "type": o.object_type,
            }
            for o in all_objects
        ],
        "collisions": [
            {
                "id": c.id,
                "mapId": c.scene_map_id,
                "x": c.position_x,
                "y": c.position_y,
                "width": c.width,
                "height": c.height,
            }
            for c in all_collisions
        ],
        "dialogues": [{"id": d.id, "mapId": d.scene_map_id} for d in all_dialogues],
        "hasSafeExit": has_safe_exit,
    }
    return world_validation.validate(snapshot)


# ─── world-definition DTO builders ────────────────────────────────────────────
def _scene_map_definition(m):
    return {
        "id": m.id,
        "key": m.map_key,
        "title": m.title,
        "width": m.width,
        "height": m.height,
        "theme": m.theme,
        "spawnX": m.spawn_x,
        "spawnY": m.spawn_y,
        "ambient": _read_map(m.ambient_json),
    }


def _world_object(o):
    return {
        "id": o.id,
        "key": o.object_key,
        "label": o.label,
        "type": o.object_type,
        "x": o.position_x,
        "y": o.position_y,
        "width": o.width,
        "height": o.height,
        "zIndex": o.z_index,
        "facing": o.facing,
        "colorHex": o.color_hex,
        "icon": o.icon,
        "shortCode": o.short_code,
        "collision": o.collision,
        "visible": o.visible,
        "interactionPrompt": o.interaction_prompt,
        "interactionText": o.interaction_text,
        "decisionOptionId": o.decision_option_id,
        "toolCode": o.tool_code,
        "unlockCondition": _read_map(o.unlock_condition_json),
        "movementPattern": _read_map(o.movement_pattern_json),
        "metadata": _read_map(o.metadata_json),
    }


def _world_collision_zone(c):
    return {
        "id": c.id,
        "key": c.zone_key,
        "label": c.label,
        "x": c.position_x,
        "y": c.position_y,
        "width": c.width,
        "height": c.height,
    }


def _world_dialogue_tree(tree):
    lines = [
        {"order": l.display_order, "speakerName": l.speaker_name, "text": l.text, "emotion": l.emotion}
        for l in DialogueLine.objects.filter(dialogue_tree_id=tree.id).order_by("display_order")
    ]
    choices = [
        {
            "key": c.choice_key,
            "text": c.text,
            "decisionOptionId": c.decision_option_id,
            "requiredToolCode": c.required_tool_code,
            "effect": _read_map(c.effect_json),
            "displayOrder": c.display_order,
        }
        for c in DialogueChoice.objects.filter(dialogue_tree_id=tree.id).order_by("display_order")
    ]
    return {
        "id": tree.id,
        "key": tree.tree_key,
        "speakerName": tree.speaker_name,
        "portraitKey": tree.portrait_key,
        "emotion": tree.emotion,
        "mapObjectId": tree.map_object_id,
        "lines": lines,
        "choices": choices,
    }


def _world_clinical_tool(t):
    return {
        "id": t.id,
        "code": t.tool_code,
        "label": t.label,
        "icon": t.icon,
        "category": t.category,
        "description": t.description,
        "active": t.active,
    }


# ─── Audit instrumentation (parity with Spring @Auditable) ───────────────────
# Applied here (outside @transaction.atomic) so the audit write runs after the
# business transaction. resource_id_param_index mirrors the Java annotations.
create_node = auditable("ADMIN_CREATE_NODE", "CASE_VERSION")(create_node)
update_node = auditable("ADMIN_UPDATE_NODE", "NODE", 1)(update_node)
delete_node = auditable("ADMIN_DELETE_NODE", "NODE", 1)(delete_node)
create_decision = auditable("ADMIN_CREATE_DECISION", "CASE_VERSION")(create_decision)
update_decision = auditable("ADMIN_UPDATE_DECISION", "DECISION", 1)(update_decision)
delete_decision = auditable("ADMIN_DELETE_DECISION", "DECISION", 1)(delete_decision)
create_map = auditable("ADMIN_CREATE_MAP", "CASE_VERSION")(create_map)
update_map = auditable("ADMIN_UPDATE_MAP", "MAP", 1)(update_map)
delete_map = auditable("ADMIN_DELETE_MAP", "MAP", 1)(delete_map)
create_object = auditable("ADMIN_CREATE_OBJECT", "MAP", 1)(create_object)
update_object = auditable("ADMIN_UPDATE_OBJECT", "OBJECT", 1)(update_object)
delete_object = auditable("ADMIN_DELETE_OBJECT", "OBJECT", 1)(delete_object)
create_dialogue = auditable("ADMIN_CREATE_DIALOGUE", "MAP", 1)(create_dialogue)
update_dialogue = auditable("ADMIN_UPDATE_DIALOGUE", "DIALOGUE", 1)(update_dialogue)
delete_dialogue = auditable("ADMIN_DELETE_DIALOGUE", "DIALOGUE", 1)(delete_dialogue)
create_tool = auditable("ADMIN_CREATE_TOOL", "CASE_VERSION")(create_tool)
update_tool = auditable("ADMIN_UPDATE_TOOL", "TOOL", 1)(update_tool)
delete_tool = auditable("ADMIN_DELETE_TOOL", "TOOL", 1)(delete_tool)
update_checklist = auditable("ADMIN_CHECKLIST_UPDATE", "CASE_VERSION")(update_checklist)
publish = auditable("ADMIN_PUBLISH_CASE", "CASE_VERSION")(publish)
clone_version = auditable("ADMIN_CLONE_VERSION", "CASE_VERSION")(clone_version)
save_world = auditable("ADMIN_SAVE_WORLD", "CASE_VERSION")(save_world)
