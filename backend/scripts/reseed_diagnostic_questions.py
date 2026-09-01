# backend/scripts/reseed_diagnostic_questions.py
"""One-off maintenance script: replaces all rows in `diagnostic_questions`
with the current `DEFAULT_QUESTIONS_SEED`.

`seed_diagnostic_questions()` only seeds an empty table and never updates
existing rows, so editing `diagnostic_catalog.DEFAULT_QUESTIONS_SEED` alone
does not change what's already in a database that has been seeded before.
Run this once per environment, right after deploying a new question
catalog.

Usage (from `backend/`, with the venv active and `.env` pointed at the
target environment):

    python -m scripts.reseed_diagnostic_questions
    python -m scripts.reseed_diagnostic_questions --yes   # skip the prompt
"""

import sys

from app.config import settings
from app.core.diagnostic_seed import seed_diagnostic_questions
from app.database import SessionLocal
from app.models.diagnostic_question import DiagnosticQuestion


def main() -> None:
    skip_confirm = "--yes" in sys.argv

    db = SessionLocal()
    try:
        existing_count = db.query(DiagnosticQuestion).count()
        print(f"Found {existing_count} existing diagnostic_questions rows.")
        print(f"Target: {settings.DATABASE_HOST}/{settings.DATABASE_NAME}")

        if not skip_confirm:
            answer = input(
                "This will DELETE all existing rows and reseed from "
                "DEFAULT_QUESTIONS_SEED. Continue? [y/N] "
            )
            if answer.strip().lower() != "y":
                print("Aborted.")
                return

        db.query(DiagnosticQuestion).delete()

        seed_diagnostic_questions(db)

        new_count = db.query(DiagnosticQuestion).count()
        print(f"Done. diagnostic_questions now has {new_count} rows.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
