"""Role-based permission classes — equivalent to Spring's @PreAuthorize."""
from rest_framework.permissions import BasePermission


def _has_role(request, *roles):
    user = request.user
    return bool(user and user.is_authenticated and getattr(user, "role", None) in roles)


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return _has_role(request, "ADMIN")


class IsProfesorOrAdmin(BasePermission):
    def has_permission(self, request, view):
        return _has_role(request, "PROFESOR", "ADMIN")


class IsEstudianteOrAdmin(BasePermission):
    def has_permission(self, request, view):
        return _has_role(request, "ESTUDIANTE", "ADMIN")
