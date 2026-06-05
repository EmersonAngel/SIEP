"""Student simulation API — /api/simulation. Mirrors SimulationGameController."""
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from shared.permissions import IsEstudianteOrAdmin
from shared.response import api_ok

from apps.simulation.serializers.requests import (
    ReflectionRequest,
    SafeExitRequest,
    SelectDecisionRequest,
    StartAttemptRequest,
)
from apps.simulation.services import game_service, world_service


def _int(value, default=0):
    if value is None:
        return default
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


class CasesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return api_ok(game_service.list_published_cases())


class StartAttemptView(APIView):
    permission_classes = [IsEstudianteOrAdmin]

    def post(self, request):
        ser = StartAttemptRequest(data=request.data)
        ser.is_valid(raise_exception=True)
        state = game_service.start_attempt(
            ser.validated_data["caseVersionId"], request.user, ser.validated_data["forceNew"]
        )
        return api_ok(state, message="Intento iniciado")


class ActiveAttemptView(APIView):
    permission_classes = [IsEstudianteOrAdmin]

    def get(self, request, case_version_id):
        state = game_service.find_active_attempt(case_version_id, request.user)
        if state is None:
            return Response(status=204)
        return api_ok(state)


class AttemptView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, attempt_id):
        token = request.query_params.get("attemptToken")
        return api_ok(game_service.get_attempt(attempt_id, token, request.user))


class CompletionReportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, attempt_id):
        token = request.query_params.get("attemptToken")
        return api_ok(game_service.get_completion_report(attempt_id, token, request.user))


class ProgressMapView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, attempt_id):
        token = request.query_params.get("attemptToken")
        return api_ok(game_service.get_progress_map(attempt_id, token, request.user))


class DecisionsView(APIView):
    permission_classes = [IsEstudianteOrAdmin]

    def post(self, request, attempt_id):
        ser = SelectDecisionRequest(data=request.data)
        ser.is_valid(raise_exception=True)
        state = game_service.choose_decision(
            attempt_id, ser.validated_data["attemptToken"],
            ser.validated_data["decisionOptionId"], request.user,
        )
        return api_ok(state, message="Decision procesada")


class ReflectionsView(APIView):
    permission_classes = [IsEstudianteOrAdmin]

    def post(self, request, attempt_id):
        ser = ReflectionRequest(data=request.data)
        ser.is_valid(raise_exception=True)
        saved = game_service.save_reflection(
            attempt_id, ser.validated_data["attemptToken"],
            ser.validated_data["nodeId"], ser.validated_data["text"], request.user,
        )
        return api_ok(saved, message="Bitacora guardada")


class SafeExitView(APIView):
    permission_classes = [IsEstudianteOrAdmin]

    def post(self, request, attempt_id):
        ser = SafeExitRequest(data=request.data)
        ser.is_valid(raise_exception=True)
        state = game_service.safe_exit(
            attempt_id, ser.validated_data["attemptToken"],
            ser.validated_data["reason"], request.user,
        )
        return api_ok(state, message="Salida segura registrada")


# ─── Explorable world (SimulationWorldService) ───────────────────────────────
class WorldView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, attempt_id):
        token = request.query_params.get("attemptToken")
        return api_ok(world_service.get_world(attempt_id, token, request.user))


class WorldStateView(APIView):
    permission_classes = [IsEstudianteOrAdmin]

    def patch(self, request, attempt_id):
        state = world_service.update_position(
            attempt_id,
            request.data.get("attemptToken"),
            _int(request.data.get("playerX")),
            _int(request.data.get("playerY")),
            request.user,
        )
        return api_ok(state, message="Estado de mundo actualizado")


class InteractionView(APIView):
    permission_classes = [IsEstudianteOrAdmin]

    def post(self, request, attempt_id, interaction_key):
        result = world_service.open_interaction(
            attempt_id, request.data.get("attemptToken"), interaction_key, request.user
        )
        return api_ok(result, message="Interaccion registrada")


class ToolUseView(APIView):
    permission_classes = [IsEstudianteOrAdmin]

    def post(self, request, attempt_id):
        result = world_service.use_tool(
            attempt_id,
            request.data.get("attemptToken"),
            request.data.get("toolCode"),
            request.data.get("targetInteractionKey"),
            request.user,
        )
        return api_ok(result, message="Herramienta usada")


class EnterRoomView(APIView):
    permission_classes = [IsEstudianteOrAdmin]

    def post(self, request, attempt_id):
        result = world_service.enter_room(
            attempt_id,
            request.data.get("attemptToken"),
            request.data.get("targetNodeKey"),
            request.data.get("entryX"),
            request.data.get("entryY"),
            request.user,
        )
        return api_ok(result, message="Sala cambiada")


class CatalogView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.progression.catalog import build_catalog
        return api_ok(build_catalog(request.user))
