"""Port of Spring's DecisionEffectCalculator (1:1)."""
from dataclasses import dataclass


@dataclass
class DecisionEffects:
    score_delta: int
    stress_delta: int
    trust_delta: int
    victim_risk_delta: int
    institutional_route_activated: bool
    revictimization_risk: bool


_TRUST = {"ADEQUATE": 10, "RISKY": -5, "INADEQUATE": -12}
_VICTIM = {"ADEQUATE": -5, "RISKY": 8, "INADEQUATE": 12}


def _clamp(value, lo, hi):
    return max(lo, min(hi, value))


def _contains_route_keyword(value):
    if not value:
        return False
    n = value.lower()
    return any(k in n for k in ("ruta", "proteccion", "protección", "institucional"))


def resolve(decision) -> DecisionEffects:
    score_delta = decision.score_delta + (decision.prohibited_penalty if decision.prohibited_conduct else 0)
    stress_delta = decision.stress_delta + (40 if decision.prohibited_conduct else 0)

    classification = decision.classification
    trust_delta = _TRUST[classification]
    victim_risk_delta = _VICTIM[classification]

    revictimization = decision.prohibited_conduct
    if revictimization:
        trust_delta -= 20
        victim_risk_delta += 15

    target = decision.target_node
    institutional_route = (
        classification == "ADEQUATE"
        and target is not None
        and (_contains_route_keyword(target.node_key) or _contains_route_keyword(target.title))
    )

    return DecisionEffects(
        score_delta, stress_delta, trust_delta, victim_risk_delta,
        institutional_route, revictimization,
    )


def apply(attempt, effects: DecisionEffects):
    attempt.accumulated_score += effects.score_delta
    attempt.stress_index = _clamp(attempt.stress_index + effects.stress_delta, 0, 100)
    attempt.user_trust = _clamp(attempt.user_trust + effects.trust_delta, 0, 100)
    attempt.victim_risk = _clamp(attempt.victim_risk + effects.victim_risk_delta, 0, 100)
    if effects.institutional_route_activated:
        attempt.institutional_route_activated = True
    if effects.revictimization_risk:
        attempt.revictimization_risk = True


def format_feedback(decision, effects: DecisionEffects) -> str:
    fb = decision.immediate_feedback or ""
    if decision.prohibited_conduct:
        return ("Alerta ética: la intervención puede aumentar el riesgo de revictimización. " + fb)
    return {
        "ADEQUATE": "Decisión adecuada: fortaleciste la contención profesional. " + fb,
        "RISKY": "Decisión con riesgo: revisa las implicaciones clínicas y procedimentales. " + fb,
        "INADEQUATE": "Decisión inadecuada: la ruta elegida puede aumentar el riesgo para la persona. " + fb,
    }[decision.classification]
