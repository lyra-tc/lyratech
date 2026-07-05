from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from ..config import settings
from ..core.deps import get_current_user, get_db
from ..core.diagnostic_scoring import (
    compute_service_scores,
    determine_automation_approach,
    recommend_services,
)
from ..core.email import send_diagnostic_notification_email, send_diagnostic_result_email
from ..core.limiter import limiter
from ..core.openrouter import OpenRouterError, build_fallback_result, generate_diagnostic
from ..core.turnstile import verify_turnstile_token
from ..database import SessionLocal
from ..models.diagnostic_question import DiagnosticQuestion
from ..models.diagnostic_submission import DiagnosticSubmission
from ..models.notification_recipient import NotificationRecipient
from ..models.user import User
from ..schemas.diagnostic import (
    DiagnosticActiveOption,
    DiagnosticActiveQuestion,
    DiagnosticQuestionCreate,
    DiagnosticQuestionReorder,
    DiagnosticQuestionResponse,
    DiagnosticQuestionUpdate,
    DiagnosticSubmissionListItem,
    DiagnosticSubmissionResponse,
    DiagnosticSubmitRequest,
    DiagnosticSubmitResult,
)

router = APIRouter(prefix="/diagnostics", tags=["diagnostics"])


def _question_to_dict(question: DiagnosticQuestion) -> dict:
    return {"key": question.key, "type": question.type, "config_json": question.config_json}


@router.get("/questions/active", response_model=List[DiagnosticActiveQuestion])
def list_active_questions(locale: str = "es", db: Session = Depends(get_db)):
    questions = (
        db.query(DiagnosticQuestion)
        .filter(DiagnosticQuestion.is_active.is_(True))
        .order_by(DiagnosticQuestion.sort_order)
        .all()
    )
    result: List[DiagnosticActiveQuestion] = []
    for q in questions:
        config = q.config_json or {}
        labels = config.get("labels", {})
        placeholders = config.get("placeholder", {})
        help_texts = config.get("help_text", {})
        options = [
            DiagnosticActiveOption(
                value=opt["value"],
                label=opt.get("labels", {}).get(locale, opt.get("labels", {}).get("en", opt["value"])),
            )
            for opt in config.get("options", [])
        ]
        result.append(
            DiagnosticActiveQuestion(
                key=q.key,
                type=q.type,
                sort_order=q.sort_order,
                is_required=q.is_required,
                label=labels.get(locale, labels.get("en", q.key)),
                placeholder=placeholders.get(locale, ""),
                help_text=help_texts.get(locale, ""),
                options=options,
            )
        )
    return result


def _dispatch_diagnostic_emails(
    submission_id: int, llm_result: dict, recipient_emails: List[str]
) -> None:
    # Runs as a FastAPI BackgroundTask after the response has already been
    # sent, so it opens its own DB session instead of reusing the request's,
    # and any failure here must be recorded/logged, never raised into ASGI.
    db = SessionLocal()
    try:
        submission = (
            db.query(DiagnosticSubmission)
            .filter(DiagnosticSubmission.id == submission_id)
            .first()
        )
        if not submission:
            return
        try:
            send_diagnostic_result_email(
                to_email=submission.email,
                locale=submission.locale,
                llm_result=llm_result,
                submission_name=submission.name,
            )
            submission.email_delivery_status = "sent"
            submission.email_delivery_error = None
        except Exception as exc:
            submission.email_delivery_status = "failed"
            submission.email_delivery_error = str(exc)
        db.commit()

        send_diagnostic_notification_email(submission, recipient_emails)
    finally:
        db.close()


@router.post("/submit", response_model=DiagnosticSubmitResult, status_code=201)
@limiter.limit("5/hour")
def submit_diagnostic(
    request: Request,
    body: DiagnosticSubmitRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    remote_ip = request.client.host if request.client else None
    if not verify_turnstile_token(body.turnstile_token, remote_ip):
        raise HTTPException(
            status_code=400,
            detail="No se pudo verificar que eres humano, intenta de nuevo",
        )

    active_questions = (
        db.query(DiagnosticQuestion)
        .filter(DiagnosticQuestion.is_active.is_(True))
        .order_by(DiagnosticQuestion.sort_order)
        .all()
    )
    for question in active_questions:
        if question.is_required and not body.answers.get(question.key):
            raise HTTPException(
                status_code=422, detail=f"Falta respuesta requerida: {question.key}"
            )

    questions_as_dicts = [_question_to_dict(q) for q in active_questions]
    scores = compute_service_scores(body.answers, questions_as_dicts)
    primary, secondary = recommend_services(scores)
    automation_approach = (
        determine_automation_approach(body.answers)
        if primary == "process_automation"
        else None
    )

    try:
        llm_result = generate_diagnostic(
            locale=body.locale,
            normalized_answers=body.answers,
            service_scores=scores,
            recommended_primary=primary,
            recommended_secondary=secondary,
            automation_approach=automation_approach,
        )
        llm_status = "ok"
        llm_provider: Optional[str] = "openrouter"
        llm_model: Optional[str] = settings.OPENROUTER_MODEL
    except OpenRouterError:
        llm_result = build_fallback_result(locale=body.locale, recommended_primary=primary)
        llm_status = "error" if settings.OPENROUTER_API_KEY else "skipped"
        llm_provider = None
        llm_model = None

    normalized_answers = dict(body.answers)
    open_answer_en = llm_result.get("open_answer_en")
    if open_answer_en and "open_challenge" in normalized_answers:
        normalized_answers["open_challenge"] = [open_answer_en]

    submission = DiagnosticSubmission(
        name=body.name,
        email=body.email,
        phone=body.phone,
        company=body.company,
        locale=body.locale,
        raw_answers_json=body.answers,
        normalized_answers_en_json=normalized_answers,
        service_scores_json=scores,
        recommended_primary_service=primary,
        recommended_secondary_service=secondary,
        automation_approach=automation_approach,
        llm_provider=llm_provider,
        llm_model=llm_model,
        llm_input_json={"normalized_answers_en": normalized_answers, "service_scores": scores},
        llm_response_json=llm_result,
        llm_status=llm_status,
        email_delivery_status="pending",
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)

    recipient_emails = [r.email for r in db.query(NotificationRecipient).all()]
    background_tasks.add_task(
        _dispatch_diagnostic_emails, submission.id, llm_result, recipient_emails
    )

    return DiagnosticSubmitResult(
        submission_id=submission.id,
        headline=llm_result.get("headline", ""),
        summary=llm_result.get("summary", ""),
        recommended_service=primary,
        secondary_service=secondary,
        why_it_fits=llm_result.get("why_it_fits", ""),
        key_opportunities=llm_result.get("key_opportunities", []),
        suggested_next_steps=llm_result.get("suggested_next_steps", []),
        confidence_note=llm_result.get("confidence_note", ""),
        service_scores=scores,
    )


@router.get("/submissions", response_model=List[DiagnosticSubmissionListItem])
def list_submissions(
    search: str = "",
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = db.query(DiagnosticSubmission)
    if search:
        like = f"%{search}%"
        query = query.filter(
            (DiagnosticSubmission.name.ilike(like))
            | (DiagnosticSubmission.email.ilike(like))
            | (DiagnosticSubmission.company.ilike(like))
        )
    return query.order_by(DiagnosticSubmission.created_at.desc()).all()


@router.get("/submissions/{submission_id}", response_model=DiagnosticSubmissionResponse)
def get_submission(
    submission_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    submission = (
        db.query(DiagnosticSubmission).filter(DiagnosticSubmission.id == submission_id).first()
    )
    if not submission:
        raise HTTPException(status_code=404, detail="Diagnóstico no encontrado")
    return submission


@router.delete("/submissions/{submission_id}", status_code=204)
def delete_submission(
    submission_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    submission = (
        db.query(DiagnosticSubmission).filter(DiagnosticSubmission.id == submission_id).first()
    )
    if not submission:
        raise HTTPException(status_code=404, detail="Diagnóstico no encontrado")
    db.delete(submission)
    db.commit()


@router.get("/questions", response_model=List[DiagnosticQuestionResponse])
def list_questions(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return db.query(DiagnosticQuestion).order_by(DiagnosticQuestion.sort_order).all()


@router.post("/questions", response_model=DiagnosticQuestionResponse, status_code=201)
def create_question(
    body: DiagnosticQuestionCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    existing = db.query(DiagnosticQuestion).filter(DiagnosticQuestion.key == body.key).first()
    if existing:
        raise HTTPException(status_code=409, detail="Ya existe una pregunta con esta clave")

    question = DiagnosticQuestion(
        key=body.key,
        type=body.type,
        sort_order=body.sort_order,
        is_active=body.is_active,
        is_required=body.is_required,
        config_json=body.config_json.model_dump(),
    )
    db.add(question)
    db.commit()
    db.refresh(question)
    return question


@router.put("/questions/{question_id}", response_model=DiagnosticQuestionResponse)
def update_question(
    question_id: int,
    body: DiagnosticQuestionUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    question = db.query(DiagnosticQuestion).filter(DiagnosticQuestion.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Pregunta no encontrada")

    updates = body.model_dump(exclude_unset=True)
    if updates.get("config_json") is not None:
        updates["config_json"] = body.config_json.model_dump()
    for field, value in updates.items():
        setattr(question, field, value)

    db.commit()
    db.refresh(question)
    return question


@router.patch("/questions/reorder", status_code=204)
def reorder_questions(
    body: DiagnosticQuestionReorder,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    questions = {
        q.id: q
        for q in db.query(DiagnosticQuestion)
        .filter(DiagnosticQuestion.id.in_(body.ordered_ids))
        .all()
    }
    for index, question_id in enumerate(body.ordered_ids):
        question = questions.get(question_id)
        if question:
            question.sort_order = index
    db.commit()
