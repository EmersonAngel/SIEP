"""Root URL dispatcher. App includes are added as each module is implemented."""
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path("api/auth/", include("apps.users.urls")),
    path("api/casos", include("apps.casos.urls")),
    path("api/grupos", include("apps.grupos.urls")),
    path("api/sesiones", include("apps.sesiones.urls")),
    path("api/simulation", include("apps.simulation.urls")),
    path("schema/", SpectacularAPIView.as_view(), name="schema"),
    path("swagger-ui.html", SpectacularSwaggerView.as_view(url_name="schema")),
]
