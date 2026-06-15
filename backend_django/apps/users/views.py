from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from rest_framework.exceptions import AuthenticationFailed, ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView

from shared.permissions import IsAdmin
from shared.response import api_ok

from .serializers import (
    AdminUserStatusSerializer,
    AdminUserSerializer,
    AdminUserWriteSerializer,
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


class AdminUserListCreateView(APIView):
    """GET/POST /api/admin/users — ADMIN only."""

    permission_classes = [IsAdmin]

    def get(self, request):
        users = User.objects.order_by("id")
        return api_ok(AdminUserSerializer(users, many=True).data)

    def post(self, request):
        ser = AdminUserWriteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        user = ser.save()
        return api_ok(AdminUserSerializer(user).data, message="Usuario creado correctamente")


class AdminUserDetailView(APIView):
    """PUT /api/admin/users/<id> — ADMIN only."""

    permission_classes = [IsAdmin]

    def put(self, request, user_id):
        user = get_object_or_404(User, pk=user_id)
        ser = AdminUserWriteSerializer(instance=user, data=request.data)
        ser.is_valid(raise_exception=True)
        user = ser.save()
        return api_ok(AdminUserSerializer(user).data, message="Usuario actualizado correctamente")


class AdminUserStatusView(APIView):
    """PATCH /api/admin/users/<id>/status — ADMIN only."""

    permission_classes = [IsAdmin]

    def patch(self, request, user_id):
        user = get_object_or_404(User, pk=user_id)
        ser = AdminUserStatusSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        user.activo = ser.validated_data["activo"]
        user.save(update_fields=["activo"])
        return api_ok(AdminUserSerializer(user).data, message="Estado actualizado correctamente")
