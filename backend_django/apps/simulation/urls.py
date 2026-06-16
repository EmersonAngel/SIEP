from django.urls import path

from apps.simulation.views.game_views import (
    ActiveAttemptView,
    AttemptHistoryView,
    AttemptView,
    CasesView,
    CatalogView,
    CompletionReportView,
    DecisionsView,
    EnterRoomView,
    InteractionView,
    NpcInteractionView,
    ProgressMapView,
    ReflectionsView,
    SafeExitView,
    StartAttemptView,
    StudentReportView,
    ToolUseView,
    WorldStateView,
    WorldView,
)

# Mounted at "api/simulation".
urlpatterns = [
    path("catalog", CatalogView.as_view()),
    path("cases", CasesView.as_view()),
    path("cases/<int:case_version_id>/active-attempt", ActiveAttemptView.as_view()),
    path("attempts", StartAttemptView.as_view()),
    path("attempts/history", AttemptHistoryView.as_view()),
    path("attempts/<uuid:attempt_id>", AttemptView.as_view()),
    path("attempts/<uuid:attempt_id>/student-report", StudentReportView.as_view()),
    path("attempts/<uuid:attempt_id>/completion-report", CompletionReportView.as_view()),
    path("attempts/<uuid:attempt_id>/progress-map", ProgressMapView.as_view()),
    path("attempts/<uuid:attempt_id>/decisions", DecisionsView.as_view()),
    path("attempts/<uuid:attempt_id>/reflections", ReflectionsView.as_view()),
    path("attempts/<uuid:attempt_id>/world", WorldView.as_view()),
    path("attempts/<uuid:attempt_id>/world-state", WorldStateView.as_view()),
    path("attempts/<uuid:attempt_id>/enter-room", EnterRoomView.as_view()),
    path("attempts/<uuid:attempt_id>/interactions/<str:interaction_key>", InteractionView.as_view()),
    path("attempts/<uuid:attempt_id>/npcs/<str:npc_key>", NpcInteractionView.as_view()),
    path("attempts/<uuid:attempt_id>/tools/use", ToolUseView.as_view()),
    path("attempts/<uuid:attempt_id>/safe-exit", SafeExitView.as_view()),
]
