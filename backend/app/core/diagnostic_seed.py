from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .diagnostic_catalog import DEFAULT_QUESTIONS_SEED
from ..models.diagnostic_question import DiagnosticQuestion


def seed_diagnostic_questions(db: Session) -> None:
    """Insert the default question set only if the table is empty. Idempotent.

    Safe under concurrent startup (e.g. multiple uvicorn/gunicorn workers
    pointed at the same database): the emptiness check and the insert are
    not atomic, so two workers can both see an empty table and both try to
    seed. If another worker wins that race, our insert will violate the
    unique constraint on `key`; we treat that IntegrityError as success,
    since the data is already seeded, which is the outcome we want.
    """
    if db.query(DiagnosticQuestion).first() is not None:
        return

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
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
