"""Root URL dispatcher. App includes are added as each module is implemented."""
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from apps.grupos.views import (
    GrupoCasoDetailView,
    GrupoCasosView,
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
    path("api/grupos/<int:pk>/estudiantes", GrupoEstudiantesView.as_view()),
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
]
