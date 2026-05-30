from django.urls import path

from .views import GrupoEstudiantesView, GrupoListCreateView

# Mounted at "api/grupos".
urlpatterns = [
    path("", GrupoListCreateView.as_view()),
    path("/<int:pk>/estudiantes", GrupoEstudiantesView.as_view()),
]
