"""Root URL dispatcher. App includes are added as each module is implemented."""
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from apps.grupos.views import (
    GrupoCasoDetailView,
    GrupoCasosView,
    GrupoEstudiantesImportView,
    GrupoEstudiantesView,
    GrupoListCreateView,
)
from apps.users.views import AdminUserDetailView, AdminUserListCreateView, AdminUserStatusView

urlpatterns = [
    path("api/auth/", include("apps.users.urls")),
    path("api/grupos", GrupoListCreateView.as_view()),
    path("api/grupos/<int:pk>/estudiantes", GrupoEstudiantesView.as_view()),
    path("api/grupos/<int:pk>/estudiantes/import", GrupoEstudiantesImportView.as_view()),
    path("api/grupos/<int:pk>/casos", GrupoCasosView.as_view()),
    path("api/grupos/<int:pk>/casos/<int:case_version_id>", GrupoCasoDetailView.as_view()),
    path("api/reportes", include("apps.reportes.urls")),
    path("api/simulation", include("apps.simulation.urls")),
    path("api/admin/cases", include("apps.simulation.urls_admin")),
    path("api/admin/users", AdminUserListCreateView.as_view()),
    path("api/admin/users/<int:user_id>", AdminUserDetailView.as_view()),
    path("api/admin/users/<int:user_id>/status", AdminUserStatusView.as_view()),
    path("api/instructor", include("apps.simulation.urls_instructor")),
    path("schema/", SpectacularAPIView.as_view(), name="schema"),
    path("swagger-ui.html", SpectacularSwaggerView.as_view(url_name="schema")),
]
