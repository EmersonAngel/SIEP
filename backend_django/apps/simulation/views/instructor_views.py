"""Instructor simulation API — /api/instructor. Mirrors InstructorSimulationController.

All endpoints PROFESOR/ADMIN.
"""
from rest_framework.views import APIView

from shared.permissions import IsProfesorOrAdmin
from shared.response import api_ok

from apps.simulation.services import instructor_service


class RecentAttemptsView(APIView):
    permission_classes = [IsProfesorOrAdmin]

    def get(self, request):
        return api_ok(instructor_service.recent_attempts(request.user))


class AttemptTraceView(APIView):
    permission_classes = [IsProfesorOrAdmin]

    def get(self, request, attempt_id):
        return api_ok(instructor_service.trace(attempt_id, request.user))


class RubricEvaluationView(APIView):
    permission_classes = [IsProfesorOrAdmin]

    def get(self, request, attempt_id):
        return api_ok(instructor_service.rubric(attempt_id, request.user))

    def post(self, request, attempt_id):
        return api_ok(
            instructor_service.save_rubric(attempt_id, request.data, request.user),
            message="Rubrica guardada",
        )
