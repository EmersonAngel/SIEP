from django.contrib.auth import get_user_model
from rest_framework.exceptions import AuthenticationFailed, ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView

from shared.permissions import IsAdmin
from shared.response import api_ok

from .serializers import (
    LoginSerializer,
    RegisterSerializer,
    UserSummarySerializer,
    generate_access_token,
)

User = get_user_model()


class LoginView(APIView):
    """POST /api/auth/login — public. Mirrors Spring AuthController.login."""

    permission_classes = [AllowAny]

    def post(self, request):
        ser = LoginSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        email = ser.validated_data["email"]
        password = ser.validated_data["password"]

        user = User.objects.filter(email=email).first()
        if not user or not user.activo or not user.check_password(password):
            # 401 "Credenciales inválidas" (Spring BadCredentialsException)
            raise AuthenticationFailed("Credenciales inválidas")

        return api_ok({
            "token": generate_access_token(user),
            "user": UserSummarySerializer(user).data,
        })


class RegisterView(APIView):
    """POST /api/auth/register — ADMIN only. Mirrors Spring AuthController.register."""

    permission_classes = [IsAdmin]

    def post(self, request):
        ser = RegisterSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        if User.objects.filter(email=ser.validated_data["email"]).exists():
            raise ValidationError("El email ya está registrado")
        user = ser.save()
        # Spring returns 200 OK with message + data.
        return api_ok(UserSummarySerializer(user).data, message="Usuario creado exitosamente")


class MeView(APIView):
    """GET /api/auth/me — authenticated."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return api_ok(UserSummarySerializer(request.user).data)
