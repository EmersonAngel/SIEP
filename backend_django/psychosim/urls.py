"""Root URL dispatcher. App includes are added as each module is implemented."""
from django.conf import settings
from django.http import Http404, HttpResponse
from django.urls import include, path, re_path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView


def spa_index(request):
    """Sirve el index.html del SPA (Angular) para las rutas del cliente.

    WhiteNoise sirve los archivos que existen (assets, JS); las rutas de Angular
    que no son archivos (p. ej. /portal/personaje al recargar) llegan aquí.
    """
    index_path = getattr(settings, "SPA_DIST_DIR", None)
    if index_path is None or not (index_path / "index.html").exists():
        raise Http404("SPA build not available")
    return HttpResponse((index_path / "index.html").read_bytes(), content_type="text/html")

from apps.grupos.views import (
    GrupoCasoDetailView,
    GrupoCasosView,
    GrupoDetailView,
    GrupoEstudianteDetailView,
    GrupoEstudiantesImportView,
    GrupoEstudiantesImportSpecView,
    GrupoEstudiantesImportTemplateView,
    GrupoEstudiantesView,
    GrupoListCreateView,
)
from apps.users.views import (
    AdminAccessRequestListView,
    AdminAccessRequestStatusView,
    AdminUserDetailView,
    AdminUserListCreateView,
    AdminUserStatusView,
)
from apps.simulation.views.authoring_views import AdminCaseListCreateView

urlpatterns = [
    path("api/auth/", include("apps.users.urls")),
    path("api/grupos", GrupoListCreateView.as_view()),
    path("api/grupos/<int:pk>", GrupoDetailView.as_view()),
    path("api/grupos/<int:pk>/estudiantes", GrupoEstudiantesView.as_view()),
    path("api/grupos/<int:pk>/estudiantes/<int:estudiante_id>", GrupoEstudianteDetailView.as_view()),
    path("api/grupos/<int:pk>/estudiantes/import", GrupoEstudiantesImportView.as_view()),
    path("api/grupos/<int:pk>/estudiantes/import/", GrupoEstudiantesImportView.as_view()),
    path("api/grupos/estudiantes/import/spec", GrupoEstudiantesImportSpecView.as_view()),
    path("api/grupos/estudiantes/import/spec/", GrupoEstudiantesImportSpecView.as_view()),
    path("api/grupos/estudiantes/import/template", GrupoEstudiantesImportTemplateView.as_view()),
    path("api/grupos/estudiantes/import/template/", GrupoEstudiantesImportTemplateView.as_view()),
    path("api/grupos/<int:pk>/casos", GrupoCasosView.as_view()),
    path("api/grupos/<int:pk>/casos/<int:case_version_id>", GrupoCasoDetailView.as_view()),
    path("api/reportes/", include("apps.reportes.urls")),
    path("api/simulation/", include("apps.simulation.urls")),
    path("api/admin/cases", AdminCaseListCreateView.as_view()),
    path("api/admin/cases/", include("apps.simulation.urls_admin")),
    path("api/admin/users", AdminUserListCreateView.as_view()),
    path("api/admin/users/<int:user_id>", AdminUserDetailView.as_view()),
    path("api/admin/users/<int:user_id>/status", AdminUserStatusView.as_view()),
    path("api/admin/access-requests", AdminAccessRequestListView.as_view()),
    path("api/admin/access-requests/<int:request_id>/status", AdminAccessRequestStatusView.as_view()),
    path("api/instructor/", include("apps.simulation.urls_instructor")),
    path("api/rubrics/", include("apps.simulation.urls_rubrics")),
    path("schema/", SpectacularAPIView.as_view(), name="schema"),
    path("swagger-ui.html", SpectacularSwaggerView.as_view(url_name="schema")),
    # Catch-all del SPA (debe ir al final): cualquier ruta que no sea API,
    # schema o swagger devuelve el index.html de Angular.
    re_path(r"^(?!api/|schema/|swagger-ui|django-static/).*$", spa_index),
]
