"""Builds the per-actor case catalog with linear unlock state.

Published cases ordered by created_at form the linear sequence. Case i is
unlocked iff the student completed case i-1 (case 0 always unlocked).
PROFESOR/ADMIN see everything unlocked.
"""
from apps.simulation.models import CaseVersion

from .models import StudentCaseCompletion


def build_catalog(actor):
    versions = list(
        CaseVersion.objects.filter(status="PUBLISHED", simulation_case__active=True)
        .select_related("simulation_case")
        .order_by("created_at", "id")
    )
    is_staff = getattr(actor, "role", None) in ("PROFESOR", "ADMIN")
    completed_ids = set()
    if not is_staff:
        completed_ids = set(
            StudentCaseCompletion.objects.filter(student_id=actor.id)
            .values_list("simulation_case_id", flat=True)
        )

    items = []
    prev_completed = True  # case 0 always unlocked
    for order, v in enumerate(versions):
        case_id = v.simulation_case_id
        completed = case_id in completed_ids
        unlocked = True if is_staff else prev_completed
        items.append({
            "caseVersionId": v.id,
            "code": v.simulation_case.code,
            "title": v.simulation_case.title,
            "description": v.simulation_case.description,
            "order": order,
            "unlocked": unlocked,
            "completed": completed,
            "locked": not unlocked,
        })
        prev_completed = True if is_staff else completed
    return items
