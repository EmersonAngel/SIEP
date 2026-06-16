from django.urls import path

from .views import DashboardView, ReporteGrupoExportView, ReporteGrupoView

# Montado en "api/reportes" (sin slash final) — sub-rutas empiezan con "/".
urlpatterns = [
    path("dashboard", DashboardView.as_view()),
    path("grupo/<int:grupo_id>", ReporteGrupoView.as_view()),
    path("grupo/<int:grupo_id>/export", ReporteGrupoExportView.as_view()),
]
