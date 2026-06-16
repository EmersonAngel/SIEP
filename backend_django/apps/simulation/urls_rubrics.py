from django.urls import path

from .views.rubric_views import (
    CaseVersionRubricView,
    RubricActivateView,
    RubricDeactivateView,
    RubricDefaultView,
    RubricDetailView,
    RubricDuplicateView,
    RubricListCreateView,
)

urlpatterns = [
    path("", RubricListCreateView.as_view()),
    path("<int:rubric_id>", RubricDetailView.as_view()),
    path("<int:rubric_id>/", RubricDetailView.as_view()),
    path("<int:rubric_id>/activate", RubricActivateView.as_view()),
    path("<int:rubric_id>/activate/", RubricActivateView.as_view()),
    path("<int:rubric_id>/deactivate", RubricDeactivateView.as_view()),
    path("<int:rubric_id>/deactivate/", RubricDeactivateView.as_view()),
    path("<int:rubric_id>/duplicate", RubricDuplicateView.as_view()),
    path("<int:rubric_id>/duplicate/", RubricDuplicateView.as_view()),
    path("<int:rubric_id>/default", RubricDefaultView.as_view()),
    path("<int:rubric_id>/default/", RubricDefaultView.as_view()),
    path("case-versions/<int:case_version_id>", CaseVersionRubricView.as_view()),
    path("case-versions/<int:case_version_id>/", CaseVersionRubricView.as_view()),
]
