from django.http import HttpResponse
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import FormParser, MultiPartParser

from shared.permissions import IsProfesor
from shared.response import api_ok

from . import services
from .import_contract import STUDENT_IMPORT_TEMPLATE_FILENAME
from .serializers import (
    AgregarEstudianteSerializer,
    AsignarCasoSerializer,
    CrearGrupoSerializer,
    ImportarEstudiantesSerializer,
)


class GrupoListCreateView(APIView):
    permission_classes = [IsProfesor]

    def get(self, request):
        return api_ok(services.listar_de_profesor(request.user.id))

    def post(self, request):
        ser = CrearGrupoSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        dto = services.crear(ser.validated_data["nombre"], ser.validated_data["codigo"], request.user)
        return api_ok(dto, message="Grupo creado", http_status=201)


class GrupoEstudiantesView(APIView):
    permission_classes = [IsProfesor]

    def get(self, request, pk):
        return api_ok(services.listar_estudiantes(pk, request.user))

    def post(self, request, pk):
        ser = AgregarEstudianteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        dto = services.agregar_estudiante(pk, ser.validated_data["email"], request.user)
        return api_ok(dto, message="Estudiante agregado")


class GrupoEstudiantesImportView(APIView):
    permission_classes = [IsProfesor]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, pk):
        ser = ImportarEstudiantesSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        try:
            dto = services.importar_estudiantes(pk, ser.validated_data["file"], request.user)
        except services.ImportValidationError as exc:
            return Response(
                {"success": False, "message": exc.result["message"], "data": exc.result},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return api_ok(dto, message=dto["message"])
        return api_ok(dto, message="Importación de estudiantes procesada")


class GrupoEstudiantesImportSpecView(APIView):
    permission_classes = [IsProfesor]

    def get(self, request):
        return api_ok(services.import_spec())


class GrupoEstudiantesImportTemplateView(APIView):
    permission_classes = [IsProfesor]

    def get(self, request):
        response = HttpResponse(
            services.student_import_template_bytes(),
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        response["Content-Disposition"] = f'attachment; filename="{STUDENT_IMPORT_TEMPLATE_FILENAME}"'
        return response


class GrupoCasosView(APIView):
    permission_classes = [IsProfesor]

    def get(self, request, pk):
        return api_ok(services.listar_casos_asignados(pk, request.user))

    def post(self, request, pk):
        ser = AsignarCasoSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        return api_ok(
            services.asignar_caso(pk, ser.validated_data["caseVersionId"], request.user),
            message="Caso asignado",
        )


class GrupoCasoDetailView(APIView):
    permission_classes = [IsProfesor]

    def delete(self, request, pk, case_version_id):
        return api_ok(
            services.quitar_caso(pk, case_version_id, request.user),
            message="Caso retirado",
        )
