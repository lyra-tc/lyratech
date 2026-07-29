"""Deterministic, auditable scoring engine for Diagnóstico GO.

The LLM never picks the recommended service — this module does, from the
user's closed-question answers. The LLM only writes up the result.
"""

from typing import Dict, List, Optional, Tuple

SERVICE_KEYS = ["process_automation", "fixed_price_project", "dedicated_team"]
SECONDARY_THRESHOLD_RATIO = 0.6
TIE_BREAK_ORDER = ["process_automation", "fixed_price_project", "dedicated_team"]


def compute_service_scores(
    answers: Dict[str, List[str]],
    questions: List[dict],
) -> Dict[str, int]:
    """Sum per-service score_weights for every selected option.

    `questions` is a list of question dicts shaped like
    `diagnostic_catalog.DEFAULT_QUESTIONS_SEED` entries (or the equivalent
    read from the `diagnostic_questions` table): each has `key`, `type`, and
    `config_json` with an `options` list of `{value, score_weights}`.
    """
    scores = {key: 0 for key in SERVICE_KEYS}
    options_by_question: Dict[str, Dict[str, dict]] = {
        question["key"]: {
            option["value"]: option
            for option in question.get("config_json", {}).get("options", [])
        }
        for question in questions
        if question.get("type") != "open_text"
    }

    for question_key, selected_values in answers.items():
        options = options_by_question.get(question_key)
        if not options:
            continue
        for value in selected_values:
            option = options.get(value)
            if not option:
                continue
            for service_key, weight in option.get("score_weights", {}).items():
                if service_key in scores:
                    scores[service_key] += weight

    return scores


def recommend_services(scores: Dict[str, int]) -> Tuple[str, Optional[str]]:
    """Return (primary, secondary_or_None) from computed scores."""
    ordered = sorted(
        SERVICE_KEYS,
        key=lambda key: (-scores[key], TIE_BREAK_ORDER.index(key)),
    )
    primary, secondary_candidate = ordered[0], ordered[1]

    if scores[primary] > 0 and scores[secondary_candidate] > 0:
        if scores[secondary_candidate] >= scores[primary] * SECONDARY_THRESHOLD_RATIO:
            return primary, secondary_candidate

    return primary, None


def determine_automation_approach(answers: Dict[str, List[str]]) -> Optional[str]:
    """Only meaningful when the primary recommendation is process_automation."""
    values = answers.get("needs_context_or_rules", [])
    if "context_or_language" in values:
        return "ai"
    if "fixed_rules" in values:
        return "traditional"
    return None
