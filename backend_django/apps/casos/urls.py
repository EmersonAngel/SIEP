from django.urls import path

from .views import CasoDetailView, CasoListCreateView

# Mounted at "api/casos" (no trailing slash) to match Spring's routing exactly.
urlpatterns = [
    path("", CasoListCreateView.as_view()),
    path("/<int:pk>", CasoDetailView.as_view()),
]
