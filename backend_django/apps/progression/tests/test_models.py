from datetime import datetime

import pytest
from django.db import IntegrityError, transaction

from apps.progression.models import StudentCaseCompletion


@pytest.mark.django_db
def test_completion_is_unique_per_student_and_case():
    StudentCaseCompletion.objects.create(
        student_id=999001, simulation_case_id=999001,
        first_completed_at=datetime(2026, 1, 1, 8, 0, 0),
    )
    with pytest.raises(IntegrityError):
        with transaction.atomic():
            StudentCaseCompletion.objects.create(
                student_id=999001, simulation_case_id=999001,
                first_completed_at=datetime(2026, 1, 2, 8, 0, 0),
            )


@pytest.mark.django_db
def test_completion_allows_different_cases_for_same_student():
    StudentCaseCompletion.objects.create(
        student_id=999002, simulation_case_id=1,
        first_completed_at=datetime(2026, 1, 1, 8, 0, 0),
    )
    StudentCaseCompletion.objects.create(
        student_id=999002, simulation_case_id=2,
        first_completed_at=datetime(2026, 1, 1, 8, 0, 0),
    )
    assert StudentCaseCompletion.objects.filter(student_id=999002).count() == 2
