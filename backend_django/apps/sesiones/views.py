from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from shared.response import api_ok

from . import services
from .serializers import IniciarSesionSerializer, RespuestaSerializer


class SesionCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        ser = IniciarSesionSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        sesion = services.iniciar(ser.validated_data["casoId"], request.user)
        return api_ok(services.sesion_resumen_dto(sesion), http_status=201)


class SesionListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return api_ok(services.mis_sesiones(request.user))


class SesionRespuestaView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        ser = RespuestaSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        result = services.responder(
            pk,
            ser.validated_data["preguntaId"],
            ser.validated_data["opcionId"],
            ser.validated_data["tiempoMs"],
            request.user,
        )
        return api_ok(result)


class SesionFinalizarView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request, pk):
        return api_ok(services.finalizar(pk, request.user))
