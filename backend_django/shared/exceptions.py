"""DRF exception handler replicating Spring's ``GlobalExceptionHandler``.

Spring maps:
    EntityNotFoundException        -> 404, ex.message
    BadCredentialsException        -> 401, "Credenciales inválidas"
    AccessDeniedException          -> 403, "No tiene permisos para realizar esta acción"
    IllegalArgumentException       -> 400, ex.message
    MethodArgumentNotValidException-> 400, "field: msg, field2: msg2"
    Exception (uncaught)           -> 500, "Error interno del servidor"

All bodies use the ``{"success": false, "message": ...}`` envelope.
"""
from django.core.exceptions import PermissionDenied as DjangoPermissionDenied
from django.http import Http404
from rest_framework import status
from rest_framework.exceptions import (
    APIException,
    AuthenticationFailed,
    NotAuthenticated,
    PermissionDenied,
    ValidationError,
)
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler


class Conflict(APIException):
    """HTTP 409 — optimistic-lock / state conflict (Spring ResponseStatusException)."""

    status_code = status.HTTP_409_CONFLICT
    default_detail = "Conflicto"
    default_code = "conflict"


def _flatten(detail, prefix=""):
    parts = []
    if isinstance(detail, dict):
        for field, value in detail.items():
            key = f"{prefix}{field}"
            if isinstance(value, (list, tuple)):
                for item in value:
                    if isinstance(item, (dict, list)):
                        parts.extend(_flatten(item, f"{key}."))
                    else:
                        parts.append(f"{key}: {item}")
            elif isinstance(value, dict):
                parts.extend(_flatten(value, f"{key}."))
            else:
                parts.append(f"{key}: {value}")
    elif isinstance(detail, (list, tuple)):
        for item in detail:
            parts.append(str(item))
    else:
        parts.append(str(detail))
    return parts


def custom_exception_handler(exc, context):
    response = drf_exception_handler(exc, context)

    # Uncaught -> 500 "Error interno del servidor" (Spring handleGeneric).
    if response is None:
        return Response(
            {"success": False, "message": "Error interno del servidor"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    if isinstance(exc, ValidationError):
        message = ", ".join(_flatten(exc.detail))
    elif isinstance(exc, (PermissionDenied, DjangoPermissionDenied)):
        message = "No tiene permisos para realizar esta acción"
    elif isinstance(exc, AuthenticationFailed):
        message = "Credenciales inválidas"
    elif isinstance(exc, NotAuthenticated):
        message = "No autenticado"
    elif isinstance(exc, Http404):
        message = "Recurso no encontrado"
    else:
        detail = None
        if isinstance(response.data, dict):
            detail = response.data.get("detail")
        message = str(detail) if detail is not None else str(exc)

    response.data = {"success": False, "message": message}
    return response
