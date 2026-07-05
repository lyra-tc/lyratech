"""Thin OpenRouter chat-completions client for Diagnóstico GO, plus a
template-based fallback used when the LLM is unavailable or errors — the
submit flow must never block on this.
"""

import json
import logging
from typing import Dict, List, Optional

import httpx

from ..config import settings
from .diagnostic_catalog import SERVICE_CATALOG

logger = logging.getLogger(__name__)

OPENROUTER_CHAT_COMPLETIONS_PATH = "/chat/completions"


class OpenRouterError(Exception):
    pass


_REQUIRED_RESULT_FIELDS = (
    "headline",
    "summary",
    "why_it_fits",
    "key_opportunities",
    "suggested_next_steps",
)


def _validate_result(result: dict) -> None:
    for field in _REQUIRED_RESULT_FIELDS:
        if not result.get(field):
            raise OpenRouterError(f"OpenRouter response missing required field: {field}")


def _build_system_prompt(locale: str) -> str:
    return (
        "You are a business consultant for Lyra Tech, a software studio. "
        "Respond ONLY with a single valid JSON object — no markdown, no prose outside the JSON. "
        "Never invent services outside the provided catalog. Never promise timelines or outcomes not "
        "supported by the input. Tone: consultative, clear, professional, business-first (not overly technical). "
        f"Respond entirely in this language locale: {locale}. "
        "Required JSON fields: headline, summary, why_it_fits, key_opportunities (array of short strings), "
        "suggested_next_steps (array of short strings), confidence_note, email_subject, email_preview, "
        "open_answer_en (English translation of the user's open-text answer, or empty string if none was given)."
    )


def _build_user_prompt(
    *,
    normalized_answers: Dict[str, List[str]],
    service_scores: Dict[str, int],
    recommended_primary: str,
    recommended_secondary: Optional[str],
    automation_approach: Optional[str],
) -> str:
    catalog_lines = [
        f"{key}: {SERVICE_CATALOG[key]['name']['en']} — {SERVICE_CATALOG[key]['description']['en']}"
        for key in SERVICE_CATALOG
    ]
    payload = {
        "service_catalog": catalog_lines,
        "normalized_answers_en": normalized_answers,
        "computed_service_scores": service_scores,
        "computed_recommended_primary_service": recommended_primary,
        "computed_recommended_secondary_service": recommended_secondary,
        "automation_approach_hint": automation_approach,
    }
    return (
        "Write the diagnostic result using this pre-computed context (the recommendation is already "
        "decided — do not change it, only explain and elaborate on it):\n"
        f"{json.dumps(payload, ensure_ascii=False)}"
    )


def generate_diagnostic(
    *,
    locale: str,
    normalized_answers: Dict[str, List[str]],
    service_scores: Dict[str, int],
    recommended_primary: str,
    recommended_secondary: Optional[str],
    automation_approach: Optional[str],
) -> dict:
    if not settings.OPENROUTER_API_KEY:
        raise OpenRouterError("OPENROUTER_API_KEY not configured")

    body = {
        "model": settings.OPENROUTER_MODEL,
        "temperature": 0.4,
        "max_tokens": 700,
        "response_format": {"type": "json_object"},
        "messages": [
            {"role": "system", "content": _build_system_prompt(locale)},
            {
                "role": "user",
                "content": _build_user_prompt(
                    normalized_answers=normalized_answers,
                    service_scores=service_scores,
                    recommended_primary=recommended_primary,
                    recommended_secondary=recommended_secondary,
                    automation_approach=automation_approach,
                ),
            },
        ],
    }
    headers = {"Authorization": f"Bearer {settings.OPENROUTER_API_KEY}"}

    try:
        response = httpx.post(
            f"{settings.OPENROUTER_BASE_URL}{OPENROUTER_CHAT_COMPLETIONS_PATH}",
            json=body,
            headers=headers,
            timeout=settings.OPENROUTER_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        data = response.json()
        content = data["choices"][0]["message"]["content"]
        result = json.loads(content)
    except (httpx.HTTPError, KeyError, IndexError, TypeError, json.JSONDecodeError) as exc:
        logger.warning("OpenRouter call failed: %s", exc)
        raise OpenRouterError(str(exc)) from exc

    _validate_result(result)
    return result


_FALLBACK_COPY = {
    "es": {
        "headline": "Diagnóstico calculado con base en tus respuestas",
        "summary_prefix": "Con base en tus respuestas, el servicio que mejor se ajusta a tu situación es",
        "why_it_fits": "Esta recomendación se calculó a partir del puntaje de tus respuestas, priorizando el servicio con mayor afinidad.",
        "opportunity": "Agenda una llamada para revisar el alcance exacto de tu proyecto.",
        "next_step": "Contáctanos para definir los siguientes pasos con más detalle.",
        "confidence_note": "Este resultado se generó automáticamente a partir de tus respuestas; un especialista puede afinarlo contigo.",
        "email_subject": "Tu diagnóstico Lyra Tech",
        "email_preview": "Aquí tienes el resultado de tu diagnóstico.",
    },
    "en": {
        "headline": "Diagnostic computed from your answers",
        "summary_prefix": "Based on your answers, the service that best fits your situation is",
        "why_it_fits": "This recommendation was computed from your answer scoring, prioritizing the highest-affinity service.",
        "opportunity": "Book a call to review the exact scope of your project.",
        "next_step": "Contact us to define the next steps in more detail.",
        "confidence_note": "This result was generated automatically from your answers; a specialist can refine it with you.",
        "email_subject": "Your Lyra Tech diagnostic",
        "email_preview": "Here is your diagnostic result.",
    },
    "fr": {
        "headline": "Diagnostic calculé à partir de vos réponses",
        "summary_prefix": "D'après vos réponses, le service qui correspond le mieux à votre situation est",
        "why_it_fits": "Cette recommandation a été calculée à partir du score de vos réponses, en priorisant le service ayant la plus grande affinité.",
        "opportunity": "Réservez un appel pour examiner le périmètre exact de votre projet.",
        "next_step": "Contactez-nous pour définir les prochaines étapes plus en détail.",
        "confidence_note": "Ce résultat a été généré automatiquement à partir de vos réponses ; un spécialiste peut l'affiner avec vous.",
        "email_subject": "Votre diagnostic Lyra Tech",
        "email_preview": "Voici le résultat de votre diagnostic.",
    },
    "de": {
        "headline": "Anhand deiner Antworten berechnete Diagnose",
        "summary_prefix": "Basierend auf deinen Antworten passt am besten der Service",
        "why_it_fits": "Diese Empfehlung wurde anhand der Bewertung deiner Antworten berechnet und priorisiert den Service mit der höchsten Übereinstimmung.",
        "opportunity": "Vereinbare einen Anruf, um den genauen Umfang deines Projekts zu besprechen.",
        "next_step": "Kontaktiere uns, um die nächsten Schritte im Detail festzulegen.",
        "confidence_note": "Dieses Ergebnis wurde automatisch aus deinen Antworten generiert; ein Spezialist kann es gemeinsam mit dir verfeinern.",
        "email_subject": "Deine Lyra Tech Diagnose",
        "email_preview": "Hier ist das Ergebnis deiner Diagnose.",
    },
}


def build_fallback_result(*, locale: str, recommended_primary: str) -> dict:
    copy = _FALLBACK_COPY.get(locale, _FALLBACK_COPY["en"])
    service_name = SERVICE_CATALOG[recommended_primary]["name"].get(
        locale, SERVICE_CATALOG[recommended_primary]["name"]["en"]
    )
    return {
        "headline": copy["headline"],
        "summary": f"{copy['summary_prefix']} {service_name}.",
        "why_it_fits": copy["why_it_fits"],
        "key_opportunities": [copy["opportunity"]],
        "suggested_next_steps": [copy["next_step"]],
        "confidence_note": copy["confidence_note"],
        "email_subject": copy["email_subject"],
        "email_preview": copy["email_preview"],
        "open_answer_en": "",
    }
