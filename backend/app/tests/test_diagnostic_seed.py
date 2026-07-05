from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.core.diagnostic_catalog import DEFAULT_QUESTIONS_SEED
from app.core.diagnostic_seed import seed_diagnostic_questions
from app.models.diagnostic_question import DiagnosticQuestion


def _session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    return sessionmaker(bind=engine)()


def test_seed_inserts_nine_questions_when_empty():
    db = _session()
    seed_diagnostic_questions(db)
    assert db.query(DiagnosticQuestion).count() == 9


def test_seed_is_idempotent():
    db = _session()
    seed_diagnostic_questions(db)
    seed_diagnostic_questions(db)
    assert db.query(DiagnosticQuestion).count() == 9


def test_seed_skips_when_questions_already_exist():
    db = _session()
    db.add(DiagnosticQuestion(key="custom", type="open_text", sort_order=1, config_json={}))
    db.commit()
    seed_diagnostic_questions(db)
    assert db.query(DiagnosticQuestion).count() == 1


def test_seed_recovers_from_integrity_error_when_another_worker_seeds_first(monkeypatch):
    """Simulates the multi-worker race: another process already committed the
    default question set, but our emptiness check ran before that commit was
    visible to us, so we still attempt to insert and hit the unique
    constraint on `key`. seed_diagnostic_questions must swallow that
    IntegrityError instead of crashing the worker.
    """
    db = _session()

    # Another worker won the race and already seeded the full default set.
    for question in DEFAULT_QUESTIONS_SEED:
        db.add(
            DiagnosticQuestion(
                key=question["key"],
                type=question["type"],
                sort_order=question["sort_order"],
                is_active=True,
                is_required=question["is_required"],
                config_json=question["config_json"],
            )
        )
    db.commit()
    assert db.query(DiagnosticQuestion).count() == 9

    # Force our own emptiness check to report "table is empty" even though
    # rows already exist, reproducing the race window where the check ran
    # before the other worker's commit became visible.
    original_query = db.query

    def fake_query(model):
        query = original_query(model)
        query.first = lambda: None
        return query

    monkeypatch.setattr(db, "query", fake_query)

    # Must not raise: the resulting IntegrityError on the duplicate `key`
    # values means another worker already seeded the data, which is fine.
    seed_diagnostic_questions(db)

    assert db.query(DiagnosticQuestion).count() == 9
