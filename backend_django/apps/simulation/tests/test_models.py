"""Validate that every simulation model's column mapping matches the live schema.

Issuing a full SELECT (.first()) against each managed=False table will raise if
any mapped column does not exist, so these double as schema-contract tests.
"""
import pytest

from apps.simulation.models import (
    AttemptEvent,
    AttemptWorldState,
    AuditLog,
    CaseVersion,
    ClinicalTool,
    CollisionZone,
    CriterionScore,
    DecisionOption,
    DialogueChoice,
    DialogueLine,
    DialogueTree,
    MapObject,
    PublicationChecklist,
    PublicationChecklistItem,
    ReflectionJournal,
    Rubric,
    RubricCriterion,
    RubricEvaluation,
    SceneMap,
    SimulationAttempt,
    SimulationCase,
    SimulationNode,
)

ALL_MODELS = [
    SimulationCase, CaseVersion, SimulationNode, DecisionOption,
    SimulationAttempt, AttemptEvent, ReflectionJournal, AttemptWorldState,
    SceneMap, MapObject, CollisionZone, DialogueTree, DialogueLine,
    DialogueChoice, ClinicalTool,
    Rubric, RubricCriterion, RubricEvaluation, CriterionScore,
    PublicationChecklist, PublicationChecklistItem, AuditLog,
]


@pytest.mark.django_db
@pytest.mark.parametrize("model", ALL_MODELS, ids=[m.__name__ for m in ALL_MODELS])
def test_model_columns_match_schema(model):
    # Forces a SELECT of all mapped columns; raises if a column is missing.
    list(model.objects.all()[:1])


@pytest.mark.django_db
def test_reference_case_seed_present():
    # The Flyway seed ships SIM-VBG-001 with 6 nodes / 12 decisions.
    case = SimulationCase.objects.filter(code="SIM-VBG-001").first()
    assert case is not None
    published = CaseVersion.objects.filter(
        simulation_case=case, status="PUBLISHED"
    ).first()
    assert published is not None
    assert SimulationNode.objects.filter(case_version=published).count() == 6
    assert DecisionOption.objects.filter(case_version=published).count() == 12
