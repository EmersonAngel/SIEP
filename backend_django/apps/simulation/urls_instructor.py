from django.urls import path

from .views.instructor_views import (
    AttemptTraceView,
    RecentAttemptsView,
    RubricEvaluationView,
)

# Mounted at "api/instructor" (no trailing slash) — sub-routes start with "/".
urlpatterns = [
    path("attempts/recent", RecentAttemptsView.as_view()),
    path("attempts/<uuid:attempt_id>/trace", AttemptTraceView.as_view()),
    path("attempts/<uuid:attempt_id>/rubric-evaluation", RubricEvaluationView.as_view()),
]
