from django.urls import path

from apps.simulation.views.game_views import (
    ActiveAttemptView,
    AttemptView,
    CasesView,
    CompletionReportView,
    DecisionsView,
    ProgressMapView,
    ReflectionsView,
    SafeExitView,
    StartAttemptView,
)

# Mounted at "api/simulation".
urlpatterns = [
    path("/cases", CasesView.as_view()),
    path("/cases/<int:case_version_id>/active-attempt", ActiveAttemptView.as_view()),
    path("/attempts", StartAttemptView.as_view()),
    path("/attempts/<uuid:attempt_id>", AttemptView.as_view()),
    path("/attempts/<uuid:attempt_id>/completion-report", CompletionReportView.as_view()),
    path("/attempts/<uuid:attempt_id>/progress-map", ProgressMapView.as_view()),
    path("/attempts/<uuid:attempt_id>/decisions", DecisionsView.as_view()),
    path("/attempts/<uuid:attempt_id>/reflections", ReflectionsView.as_view()),
    path("/attempts/<uuid:attempt_id>/safe-exit", SafeExitView.as_view()),
]
