"""RF-027: contextual assistant for the simulator.

The assistant is deliberately constrained: before a decision is taken it can
explain concepts and ask reflective questions, but it must not reveal which
option is correct.
"""
import json
import logging
import urllib.error
import urllib.request

from django.conf import settings
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.simulation.services import audit_service

logger = logging.getLogger(__name__)


class AIAssistantView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        attempt_id = request.data.get("attempt_id")
        question = (request.data.get("question") or "").strip()
        current_node_id = request.data.get("current_node_id")
        decision_already_taken = self._as_bool(request.data.get("decision_already_taken", False))

        if not attempt_id or not question:
            return Response({"error": "Parametros incompletos"}, status=400)

        try:
            from apps.simulation.models import SimulationAttempt
            attempt = SimulationAttempt.objects.select_related(
                "case_version__simulation_case"
            ).get(id=attempt_id, student=request.user)
        except SimulationAttempt.DoesNotExist:
            return Response({"error": "Intento no encontrado"}, status=404)

        context = self._build_context(attempt, current_node_id, decision_already_taken)
        try:
            response_text = self._call_llm(question, context)
        except NotConfigured:
            response_text = (
                "El asistente aun no esta configurado. Define AI_ASSISTANT_API_KEY "
                "en el entorno para activar respuestas inteligentes."
            )
        except Exception as exc:  # pragma: no cover - external provider
            logger.warning("AIAssistant provider error: %s", exc)
            response_text = "No pude consultar el asistente en este momento. Intenta de nuevo mas tarde."

        self._write_audit(request, attempt_id, question, current_node_id, decision_already_taken, response_text)
        return Response({"response": response_text})

    @staticmethod
    def _as_bool(value) -> bool:
        if isinstance(value, str):
            return value.strip().lower() in {"1", "true", "yes", "si"}
        return bool(value)

    def _build_context(self, attempt, node_id, decision_taken) -> str:
        try:
            case_title = attempt.case_version.simulation_case.title
        except Exception:
            case_title = "Caso SIEP"

        if decision_taken:
            restriction = (
                "El estudiante ya tomo una decision. Puedes explicar retroalimentacion "
                "conceptual sin dar calificaciones numericas ni etiquetas de respuesta."
            )
        else:
            restriction = (
                "El estudiante NO ha tomado una decision en este punto. No reveles la "
                "respuesta correcta ni indiques que opcion elegir. Orienta con preguntas, "
                "criterios eticos, conceptos de PAP y rutas institucionales."
            )

        return (
            "Eres un asistente pedagogico para estudiantes de psicologia social en SIEP.\n"
            f"Caso actual: {case_title}\n"
            f"Nodo actual: {node_id or 'sin nodo'}\n"
            f"{restriction}\n\n"
            "Mantente dentro del caso actual. Usa lenguaje breve, claro y formativo. "
            "Si falta informacion, sugiere que el estudiante hable con NPCs o use herramientas del caso."
        )

    def _call_llm(self, question: str, context: str) -> str:
        provider = getattr(settings, "AI_ASSISTANT_PROVIDER", "openai").lower()
        api_key = getattr(settings, "AI_ASSISTANT_API_KEY", "").strip()
        model = getattr(settings, "AI_ASSISTANT_MODEL", "gpt-4o-mini").strip()
        if not api_key:
            raise NotConfigured()

        if provider == "anthropic":
            return self._call_anthropic(api_key, model, context, question)
        return self._call_openai(api_key, model, context, question)

    def _call_openai(self, api_key: str, model: str, context: str, question: str) -> str:
        payload = {
            "model": model,
            "max_tokens": 512,
            "messages": [
                {"role": "system", "content": context},
                {"role": "user", "content": question},
            ],
        }
        data = self._post_json("https://api.openai.com/v1/chat/completions", payload, {
            "Authorization": f"Bearer {api_key}",
        })
        return (data.get("choices") or [{}])[0].get("message", {}).get("content", "").strip()

    def _call_anthropic(self, api_key: str, model: str, context: str, question: str) -> str:
        payload = {
            "model": model,
            "max_tokens": 512,
            "system": context,
            "messages": [{"role": "user", "content": question}],
        }
        data = self._post_json("https://api.anthropic.com/v1/messages", payload, {
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
        })
        content = data.get("content") or []
        return (content[0].get("text", "") if content else "").strip()

    @staticmethod
    def _post_json(url: str, payload: dict, headers: dict) -> dict:
        request = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                **headers,
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=20) as response:
                return json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            body = exc.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"provider returned {exc.code}: {body[:300]}") from exc

    def _write_audit(self, request, attempt_id, question, node_id, decision_taken, response_text):
        try:
            user = request.user
            actor_id = str(user.id) if getattr(user, "id", None) is not None else None
            actor_role = getattr(user, "role", None) or "STUDENT"
            forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
            ip = forwarded.split(",")[0].strip() if forwarded else request.META.get("REMOTE_ADDR")
            audit_service.append(
                actor_id=actor_id,
                actor_role=actor_role,
                action="AI_ASSISTANT_QUERY",
                resource_type="SimulationAttempt",
                resource_id=str(attempt_id),
                context={
                    "question": question[:500],
                    "node": node_id,
                    "decision_taken": decision_taken,
                    "response_length": len(response_text or ""),
                },
                ip_address=ip,
                user_agent=request.META.get("HTTP_USER_AGENT", ""),
                occurred_at=timezone.now(),
            )
        except Exception as exc:  # pragma: no cover - audit never blocks UX
            logger.warning("AIAssistant audit failed: %s", exc)


class NotConfigured(Exception):
    pass
