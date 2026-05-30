from rest_framework.views import APIView

from shared.permissions import IsProfesorOrAdmin
from shared.response import api_ok

from . import services
from .serializers import AgregarEstudianteSerializer, CrearGrupoSerializer


class GrupoListCreateView(APIView):
    permission_classes = [IsProfesorOrAdmin]

    def get(self, request):
        return api_ok(services.listar_de_profesor(request.user.id))

    def post(self, request):
        ser = CrearGrupoSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        dto = services.crear(ser.validated_data["nombre"], ser.validated_data["codigo"], request.user)
        return api_ok(dto, message="Grupo creado", http_status=201)


class GrupoEstudiantesView(APIView):
    permission_classes = [IsProfesorOrAdmin]

    def post(self, request, pk):
        ser = AgregarEstudianteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        dto = services.agregar_estudiante(pk, ser.validated_data["email"], request.user)
        return api_ok(dto, message="Estudiante agregado")
