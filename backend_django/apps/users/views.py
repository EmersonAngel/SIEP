from django.conf import settings
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.exceptions import APIException
from rest_framework.exceptions import AuthenticationFailed, ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView

from shared.permissions import IsAdmin
from shared.response import api_created, api_ok

from .serializers import (
    AccessRequestCreateSerializer,
    AccessRequestSerializer,
    AccessRequestStatusSerializer,
    AdminUserStatusSerializer,
    AdminUserSerializer,
    AdminUserWriteSerializer,
    GoogleLoginSerializer,
    LoginSerializer,
    RegisterSerializer,
    UserSummarySerializer,
    generate_access_token,
    normalize_email_value,
)
from .services import access_request_service

User = get_user_model()


class GoogleAuthenticationError(APIException):
    status_code = status.HTTP_401_UNAUTHORIZED
    default_detail = "No fue posible iniciar sesión con Google"
    default_code = "google_auth_failed"


def verify_google_credential(credential, audience):
    try:
        from google.auth.transport import requests
        from google.oauth2 import id_token
    except ImportError as exc:
        raise ValidationError("El proveedor de Google no está instalado en el backend") from exc

    try:
        return id_token.verify_oauth2_token(
            credential,
            requests.Request(),
            audience,
        )
    except ValueError as exc:
        raise GoogleAuthenticationError("No fue posible validar la cuenta de Google") from exc


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


class GoogleConfigView(APIView):
    """GET /api/auth/google/config - expone el client id público de Google.

    El client id de OAuth no es secreto (se usa en el navegador). El frontend lo
    pide para inicializar Google Identity Services; si está vacío, oculta el botón.
    """

    permission_classes = [AllowAny]

    def get(self, request):
        client_id = getattr(settings, "GOOGLE_OAUTH_CLIENT_ID", "") or ""
        return api_ok({"clientId": client_id, "enabled": bool(client_id)})


class GoogleLoginView(APIView):
    """POST /api/auth/google - public Google Identity Services login."""

    permission_classes = [AllowAny]

    def post(self, request):
        client_id = getattr(settings, "GOOGLE_OAUTH_CLIENT_ID", "")
        if not client_id:
            raise ValidationError("El inicio de sesión con Google no está configurado")

        ser = GoogleLoginSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        payload = verify_google_credential(ser.validated_data["credential"], client_id)

        if not payload.get("email_verified"):
            raise GoogleAuthenticationError("La cuenta de Google no tiene el correo verificado")

        email = normalize_email_value(payload.get("email", ""))
        if not email:
            raise GoogleAuthenticationError("La cuenta de Google no entregó un correo válido")

        try:
            user = User.objects.filter(email=email).first()
        except Exception as exc:
            raise GoogleAuthenticationError(
                "La cuenta de Google no está asociada a un usuario activo"
            ) from exc

        if not user or not user.activo:
            raise GoogleAuthenticationError("La cuenta de Google no está asociada a un usuario activo")

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


class AccessRequestCreateView(APIView):
    """POST /api/auth/access-request — public student access request."""

    permission_classes = [AllowAny]

    def post(self, request):
        ser = AccessRequestCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        created = access_request_service.create_access_request(**ser.validated_data)
        return api_created(
            AccessRequestSerializer(created).data,
            message="Solicitud enviada. El administrador revisará tu acceso pronto.",
        )


class AdminAccessRequestListView(APIView):
    """GET /api/admin/access-requests — ADMIN only."""

    permission_classes = [IsAdmin]

    def get(self, request):
        status = request.query_params.get("status")
        requests = access_request_service.list_access_requests(status=status)
        return api_ok(AccessRequestSerializer(requests, many=True).data)


class AdminAccessRequestStatusView(APIView):
    """PATCH /api/admin/access-requests/<id>/status — ADMIN only."""

    permission_classes = [IsAdmin]

    def patch(self, request, request_id):
        ser = AccessRequestStatusSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        updated = access_request_service.update_access_request_status(
            request_id, status=ser.validated_data["status"]
        )
        return api_ok(
            AccessRequestSerializer(updated).data,
            message="Estado de solicitud actualizado.",
        )


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
        access_request_service.resolve_pending_for_email(user.email)
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
