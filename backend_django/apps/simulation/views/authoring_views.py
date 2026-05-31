"""Authoring endpoints — mirrors Spring SimulationAuthoringController.

All routes are ADMIN-only. Mutations return ApiResponse.ok(message, CaseEditorView);
GET/validate return ApiResponse.ok(view). Mounted at /api/admin/cases.
"""
from rest_framework.views import APIView

from shared.permissions import IsAdmin
from shared.response import api_ok

from ..services import authoring_service as svc


def _opt_long(value):
    if value is None or value == "":
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


class _AdminView(APIView):
    permission_classes = [IsAdmin]


# ─── Editor / publish / clone ────────────────────────────────────────────────
class EditorView(_AdminView):
    def get(self, request, case_version_id):
        return api_ok(svc.editor(case_version_id))


class PublishView(_AdminView):
    def post(self, request, case_version_id):
        return api_ok(svc.publish(case_version_id), "Caso publicado")


class CloneVersionView(_AdminView):
    def post(self, request, case_version_id):
        return api_ok(svc.clone_version(case_version_id, request.user), "Version clonada")


# ─── Node CRUD ────────────────────────────────────────────────────────────────
class NodeListView(_AdminView):
    def post(self, request, case_version_id):
        return api_ok(svc.create_node(case_version_id, request.data), "Nodo creado")


class NodeDetailView(_AdminView):
    def put(self, request, case_version_id, node_id):
        return api_ok(svc.update_node(case_version_id, node_id, request.data), "Nodo actualizado")

    def delete(self, request, case_version_id, node_id):
        return api_ok(svc.delete_node(case_version_id, node_id), "Nodo eliminado")


# ─── Decision CRUD ──────────────────────────────────────────────────────────
class DecisionListView(_AdminView):
    def post(self, request, case_version_id):
        return api_ok(svc.create_decision(case_version_id, request.data), "Decision creada")


class DecisionDetailView(_AdminView):
    def put(self, request, case_version_id, decision_id):
        return api_ok(svc.update_decision(case_version_id, decision_id, request.data), "Decision actualizada")

    def delete(self, request, case_version_id, decision_id):
        return api_ok(svc.delete_decision(case_version_id, decision_id), "Decision eliminada")


# ─── Map CRUD ────────────────────────────────────────────────────────────────
class MapListView(_AdminView):
    def post(self, request, case_version_id):
        return api_ok(svc.create_map(case_version_id, request.data), "Mapa creado")


class MapDetailView(_AdminView):
    def put(self, request, case_version_id, map_id):
        return api_ok(svc.update_map(case_version_id, map_id, request.data), "Mapa actualizado")

    def delete(self, request, case_version_id, map_id):
        return api_ok(svc.delete_map(case_version_id, map_id), "Mapa eliminado")


# ─── Map Object CRUD ─────────────────────────────────────────────────────────
class ObjectListView(_AdminView):
    def post(self, request, case_version_id, map_id):
        return api_ok(svc.create_object(case_version_id, map_id, request.data), "Objeto creado")


class ObjectDetailView(_AdminView):
    def put(self, request, case_version_id, object_id):
        return api_ok(svc.update_object(case_version_id, object_id, request.data), "Objeto actualizado")

    def delete(self, request, case_version_id, object_id):
        return api_ok(svc.delete_object(case_version_id, object_id), "Objeto eliminado")


# ─── Dialogue CRUD ────────────────────────────────────────────────────────────
class DialogueListView(_AdminView):
    def post(self, request, case_version_id, map_id):
        return api_ok(svc.create_dialogue(case_version_id, map_id, request.data), "Dialogo creado")


class DialogueDetailView(_AdminView):
    def put(self, request, case_version_id, tree_id):
        return api_ok(svc.update_dialogue(case_version_id, tree_id, request.data), "Dialogo actualizado")

    def delete(self, request, case_version_id, tree_id):
        return api_ok(svc.delete_dialogue(case_version_id, tree_id), "Dialogo eliminado")


# ─── Tool CRUD ──────────────────────────────────────────────────────────────
class ToolListView(_AdminView):
    def post(self, request, case_version_id):
        return api_ok(svc.create_tool(case_version_id, request.data), "Herramienta creada")


class ToolDetailView(_AdminView):
    def put(self, request, case_version_id, tool_id):
        return api_ok(svc.update_tool(case_version_id, tool_id, request.data), "Herramienta actualizada")

    def delete(self, request, case_version_id, tool_id):
        return api_ok(svc.delete_tool(case_version_id, tool_id), "Herramienta eliminada")


# ─── Checklist ──────────────────────────────────────────────────────────────
class ChecklistView(_AdminView):
    def put(self, request, case_version_id):
        return api_ok(
            svc.update_checklist(case_version_id, request.data, request.user),
            "Checklist actualizado",
        )


# ─── WorldDefinition v2 ───────────────────────────────────────────────────────
class WorldEditorView(_AdminView):
    def get(self, request, case_version_id):
        node_id = _opt_long(request.query_params.get("nodeId"))
        return api_ok(svc.world_editor(case_version_id, node_id))


class WorldSaveView(_AdminView):
    def put(self, request, case_version_id):
        node_id = _opt_long(request.query_params.get("nodeId"))
        return api_ok(svc.save_world(case_version_id, node_id, request.data), "Mundo guardado")


class WorldValidateView(_AdminView):
    def post(self, request, case_version_id):
        return api_ok(svc.validate_world(case_version_id))


class WorldPreviewView(_AdminView):
    def get(self, request, case_version_id):
        node_id = _opt_long(request.query_params.get("nodeId"))
        return api_ok(svc.world_preview(case_version_id, node_id))
