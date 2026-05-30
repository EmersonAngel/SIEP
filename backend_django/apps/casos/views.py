from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from shared.permissions import IsAdmin, IsProfesorOrAdmin
from shared.response import api_ok

from . import services
from .serializers import CasoRequestSerializer, caso_detalle, caso_resumen


class CasoListCreateView(APIView):
    def get_permissions(self):
        if self.request.method == "POST":
            return [IsProfesorOrAdmin()]
        return [IsAuthenticated()]

    def get(self, request):
        casos = services.listar_activos()
        return api_ok([caso_resumen(c) for c in casos])

    def post(self, request):
        ser = CasoRequestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        caso = services.crear(ser.validated_data, request.user)
        # Spring returns 201 CREATED + "Caso creado" + resumen.
        return api_ok(caso_resumen(caso), message="Caso creado", http_status=201)


class CasoDetailView(APIView):
    def get_permissions(self):
        if self.request.method == "DELETE":
            return [IsAdmin()]
        if self.request.method == "PUT":
            return [IsProfesorOrAdmin()]
        return [IsAuthenticated()]

    def get(self, request, pk):
        caso = services.obtener_detalle(pk)
        return api_ok(caso_detalle(caso))

    def put(self, request, pk):
        ser = CasoRequestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        caso = services.actualizar(pk, ser.validated_data, request.user)
        return api_ok(caso_resumen(caso), message="Caso actualizado")

    def delete(self, request, pk):
        services.eliminar(pk)
        return api_ok(message="Caso eliminado")
