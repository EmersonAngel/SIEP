from rest_framework import status
from rest_framework.views import APIView

from shared.permissions import IsProfesorOrAdmin
from shared.response import api_ok

from ..services import rubric_service


class RubricListCreateView(APIView):
    permission_classes = [IsProfesorOrAdmin]

    def get(self, request):
        return api_ok(rubric_service.list_rubrics())

    def post(self, request):
        return api_ok(
            rubric_service.create_rubric(request.data, request.user),
            message="Rubrica creada",
            http_status=status.HTTP_201_CREATED,
        )


class RubricDetailView(APIView):
    permission_classes = [IsProfesorOrAdmin]

    def get(self, request, rubric_id):
        return api_ok(rubric_service.get_rubric(rubric_id))

    def put(self, request, rubric_id):
        return api_ok(rubric_service.update_rubric(rubric_id, request.data), message="Rubrica actualizada")

    def patch(self, request, rubric_id):
        return self.put(request, rubric_id)


class RubricActivateView(APIView):
    permission_classes = [IsProfesorOrAdmin]

    def post(self, request, rubric_id):
        return api_ok(rubric_service.activate(rubric_id, True), message="Rubrica activada")


class RubricDeactivateView(APIView):
    permission_classes = [IsProfesorOrAdmin]

    def post(self, request, rubric_id):
        return api_ok(rubric_service.activate(rubric_id, False), message="Rubrica desactivada")


class RubricDuplicateView(APIView):
    permission_classes = [IsProfesorOrAdmin]

    def post(self, request, rubric_id):
        return api_ok(rubric_service.duplicate(rubric_id, request.user), message="Rubrica duplicada")


class RubricDefaultView(APIView):
    permission_classes = [IsProfesorOrAdmin]

    def post(self, request, rubric_id):
        return api_ok(rubric_service.set_default(rubric_id), message="Rubrica predeterminada actualizada")


class CaseVersionRubricView(APIView):
    permission_classes = [IsProfesorOrAdmin]

    def get(self, request, case_version_id):
        return api_ok(rubric_service.case_version_rubric(case_version_id))

    def put(self, request, case_version_id):
        return api_ok(
            rubric_service.assign_to_case_version(case_version_id, request.data.get("rubricId"), request.user),
            message="Rubrica asignada",
        )

    def post(self, request, case_version_id):
        return self.put(request, case_version_id)
