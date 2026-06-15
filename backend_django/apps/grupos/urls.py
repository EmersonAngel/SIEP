from django.urls import path

from .views import (
    GrupoCasoDetailView,
    GrupoCasosView,
    GrupoEstudiantesImportView,
    GrupoEstudiantesView,
    GrupoListCreateView,
)

# Mounted at "api/grupos/" when used through include.
urlpatterns = [
    path("", GrupoListCreateView.as_view()),
    path("<int:pk>/estudiantes", GrupoEstudiantesView.as_view()),
    path("<int:pk>/estudiantes/import", GrupoEstudiantesImportView.as_view()),
    path("<int:pk>/casos", GrupoCasosView.as_view()),
    path("<int:pk>/casos/<int:case_version_id>", GrupoCasoDetailView.as_view()),
]
