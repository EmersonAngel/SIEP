from django.urls import path

from .views import DashboardView, ReporteGrupoExportView, ReporteGrupoView

# Mounted at "api/reportes/".
urlpatterns = [
    path("dashboard", DashboardView.as_view()),
    path("grupo/<int:grupo_id>", ReporteGrupoView.as_view()),
    path("grupo/<int:grupo_id>/export", ReporteGrupoExportView.as_view()),
]
