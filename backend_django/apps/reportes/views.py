"""Reportes endpoints (solo-simulador). Todo el controller es PROFESOR/ADMIN.
El export CSV devuelve bytes crudos (attachment), NO el envoltorio JSON."""
from django.http import HttpResponse
from rest_framework.views import APIView

from shared.permissions import IsProfesorOrAdmin
from shared.response import api_ok

from . import services


def _long(value):
    if value is None or value == "":
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


class DashboardView(APIView):
    permission_classes = [IsProfesorOrAdmin]

    def get(self, request):
        return api_ok(services.get_dashboard())


class ReporteGrupoView(APIView):
    permission_classes = [IsProfesorOrAdmin]

    def get(self, request, grupo_id):
        case_version_id = _long(request.query_params.get("caseVersionId"))
        return api_ok(services.generar_reporte_grupo(grupo_id, case_version_id))


class ReporteGrupoExportView(APIView):
    permission_classes = [IsProfesorOrAdmin]

    def get(self, request, grupo_id):
        case_version_id = _long(request.query_params.get("caseVersionId"))
        csv = services.exportar_csv(grupo_id, case_version_id)
        response = HttpResponse(csv.encode("utf-8"), content_type="text/csv;charset=UTF-8")
        response["Content-Disposition"] = (
            f'attachment; filename="reporte-grupo-{grupo_id}.csv"'
        )
        return response
