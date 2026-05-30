from django.urls import path

from .views import (
    SesionCreateView,
    SesionFinalizarView,
    SesionListView,
    SesionRespuestaView,
)

# Mounted at "api/sesiones".
urlpatterns = [
    path("", SesionCreateView.as_view()),
    path("/mis-sesiones", SesionListView.as_view()),
    path("/<int:pk>/respuesta", SesionRespuestaView.as_view()),
    path("/<int:pk>/finalizar", SesionFinalizarView.as_view()),
]
