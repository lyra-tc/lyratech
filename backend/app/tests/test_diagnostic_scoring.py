from app.core.diagnostic_catalog import DEFAULT_QUESTIONS_SEED
from app.core.diagnostic_scoring import (
    compute_service_scores,
    recommend_services,
    determine_automation_approach,
)


def test_compute_service_scores_sums_matching_option_weights():
    answers = {
        "main_goal": ["reduce_manual_work"],
        "current_situation": ["have_process_not_working"],
    }
    scores = compute_service_scores(answers, DEFAULT_QUESTIONS_SEED)
    assert scores == {
        "process_automation": 5,
        "fixed_price_project": 0,
        "dedicated_team": 0,
    }


def test_compute_service_scores_ignores_open_text_and_unknown_values():
    answers = {
        "main_goal": ["reduce_manual_work"],
        "open_challenge": ["free text, not scored"],
        "main_pain": ["not_a_real_option"],
    }
    scores = compute_service_scores(answers, DEFAULT_QUESTIONS_SEED)
    assert scores["process_automation"] == 3


def test_recommend_services_picks_highest_as_primary():
    scores = {"process_automation": 5, "fixed_price_project": 2, "dedicated_team": 0}
    primary, secondary = recommend_services(scores)
    assert primary == "process_automation"
    assert secondary is None  # 2 < 60% of 5


def test_recommend_services_includes_secondary_above_threshold():
    scores = {"process_automation": 5, "fixed_price_project": 4, "dedicated_team": 0}
    primary, secondary = recommend_services(scores)
    assert primary == "process_automation"
    assert secondary == "fixed_price_project"  # 4 >= 60% of 5


def test_recommend_services_tie_break_uses_fixed_priority_order():
    scores = {"process_automation": 3, "fixed_price_project": 3, "dedicated_team": 3}
    primary, secondary = recommend_services(scores)
    assert primary == "process_automation"
    assert secondary == "fixed_price_project"


def test_recommend_services_all_zero_has_no_secondary():
    scores = {"process_automation": 0, "fixed_price_project": 0, "dedicated_team": 0}
    primary, secondary = recommend_services(scores)
    assert primary == "process_automation"
    assert secondary is None


def test_determine_automation_approach_ai_signal():
    answers = {"needs_context_or_rules": ["context_or_language"]}
    assert determine_automation_approach(answers) == "ai"


def test_determine_automation_approach_traditional_signal():
    answers = {"needs_context_or_rules": ["fixed_rules"]}
    assert determine_automation_approach(answers) == "traditional"


def test_determine_automation_approach_not_applicable_or_missing():
    assert determine_automation_approach({"needs_context_or_rules": ["not_applicable"]}) is None
    assert determine_automation_approach({}) is None
