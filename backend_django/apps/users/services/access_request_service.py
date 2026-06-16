"""Solicitudes de acceso públicas: persistencia + notificación al administrador."""
import logging

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.users.models import AccessRequest, AccessRequestStatus
from apps.users.serializers import normalize_email_value

User = get_user_model()
logger = logging.getLogger(__name__)


def _notify_admins(request: AccessRequest) -> None:
    recipients = [email.strip() for email in settings.ACCESS_REQUEST_NOTIFY_EMAILS if email.strip()]
    if not recipients:
        logger.warning("ACCESS_REQUEST_NOTIFY_EMAILS vacío; no se envió correo para solicitud %s", request.id)
        return

    subject = f"[SIEP] Nueva solicitud de acceso — {request.nombre} {request.apellido}"
    body = (
        "Se registró una nueva solicitud de acceso en SIEP.\n\n"
        f"Nombre: {request.nombre} {request.apellido}\n"
        f"Correo: {request.email}\n"
        f"Fecha: {request.created_at:%Y-%m-%d %H:%M}\n"
        f"ID solicitud: {request.id}\n\n"
        "Revisa el panel de administracion en Usuarios > Solicitudes pendientes."
    )
    send_mail(
        subject,
        body,
        settings.DEFAULT_FROM_EMAIL,
        recipients,
        fail_silently=False,
    )


def create_access_request(*, nombre, apellido, email):
    email = normalize_email_value(email)
    if User.objects.filter(email=email).exists():
        raise ValidationError("Ya existe una cuenta activa con este correo.")

    pending = AccessRequest.objects.filter(email=email, status=AccessRequestStatus.PENDING).first()
    if pending:
        raise ValidationError("Ya tienes una solicitud pendiente de revisión. El administrador te contactará pronto.")

    request = AccessRequest.objects.create(
        nombre=nombre.strip(),
        apellido=apellido.strip(),
        email=email,
    )

    try:
        _notify_admins(request)
    except Exception:
        logger.exception("No se pudo enviar el correo de solicitud %s; la solicitud quedó guardada.", request.id)

    return request


def list_access_requests(*, status=None):
    qs = AccessRequest.objects.all()
    if status:
        qs = qs.filter(status=status)
    return qs


def update_access_request_status(request_id, *, status):
    if status not in AccessRequestStatus.values:
        raise ValidationError("Estado de solicitud inválido.")

    request = AccessRequest.objects.filter(pk=request_id).first()
    if request is None:
        raise ValidationError("La solicitud no existe.")

    request.status = status
    request.reviewed_at = timezone.now()
    request.save(update_fields=["status", "reviewed_at"])
    return request


def resolve_pending_for_email(email):
    email = normalize_email_value(email)
    AccessRequest.objects.filter(email=email, status=AccessRequestStatus.PENDING).update(
        status=AccessRequestStatus.REVIEWED,
        reviewed_at=timezone.now(),
    )
