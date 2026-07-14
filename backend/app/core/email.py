import html
import logging

import httpx

from ..config import settings
from ..models.prospect import Prospect
from ..models.diagnostic_submission import DiagnosticSubmission
from .diagnostic_catalog import SERVICE_CATALOG

logger = logging.getLogger(__name__)

RESEND_API_URL = "https://api.resend.com/emails"
EMAIL_BG = "#f4f4f4"
EMAIL_CARD = "#ffffff"
EMAIL_INK = "#00020E"
EMAIL_MUTED = "#5f6280"
EMAIL_PURPLE = "#5f66ae"
EMAIL_LINE = "#e6e8f2"
EMAIL_PANEL = "#f8f9ff"


def _send_email(payload: dict) -> None:
    if not settings.RESEND_API_KEY:
        raise RuntimeError("RESEND_API_KEY not configured")

    headers = {"Authorization": f"Bearer {settings.RESEND_API_KEY}"}
    response = httpx.post(RESEND_API_URL, json=payload, headers=headers, timeout=10.0)
    response.raise_for_status()


def _build_email_button(label: str, href: str) -> str:
    return (
        f'<a href="{href}" '
        f'style="display:inline-block;background:{EMAIL_PURPLE};color:#ffffff;'
        'padding:14px 22px;border-radius:16px;text-decoration:none;'
        'font-weight:700;font-size:14px;letter-spacing:0.01em;">'
        f"{html.escape(label)}</a>"
    )


def _build_email_shell(
    *,
    eyebrow: str,
    title: str,
    intro: str,
    content_html: str,
    cta_html: str = "",
) -> str:
    return (
        f'<div style="margin:0;padding:32px 16px;background:{EMAIL_BG};">'
        '<div style="max-width:640px;margin:0 auto;">'
        f'<div style="margin-bottom:14px;color:{EMAIL_PURPLE};font-size:12px;'
        'font-weight:700;letter-spacing:0.18em;text-transform:uppercase;">'
        f"{html.escape(eyebrow)}</div>"
        f'<div style="background:{EMAIL_CARD};border:1px solid {EMAIL_LINE};'
        'border-radius:28px;overflow:hidden;box-shadow:0 18px 50px rgba(0,2,14,0.08);">'
        f'<div style="padding:28px 28px 20px;background:linear-gradient(135deg, {EMAIL_INK} 0%, {EMAIL_PURPLE} 100%);">'
        '<div style="display:inline-block;padding:7px 12px;border-radius:999px;'
        'background:rgba(255,255,255,0.14);color:#ffffff;font-size:11px;'
        'font-weight:700;letter-spacing:0.14em;text-transform:uppercase;">Lyratech</div>'
        f'<h1 style="margin:18px 0 10px;color:#ffffff;font-size:32px;line-height:1.1;'
        f'font-weight:800;">{html.escape(title)}</h1>'
        f'<p style="margin:0;color:rgba(255,255,255,0.82);font-size:15px;line-height:1.7;">'
        f"{html.escape(intro)}</p>"
        "</div>"
        f'<div style="padding:28px;background:{EMAIL_CARD};">'
        f"{content_html}"
        f"{cta_html}"
        f'<div style="margin-top:28px;padding-top:18px;border-top:1px solid {EMAIL_LINE};'
        f'color:{EMAIL_MUTED};font-size:12px;line-height:1.7;">'
        "Lyratech automatiza la captura y seguimiento de oportunidades para que tu equipo responda con mas claridad y velocidad."
        "</div>"
        "</div>"
        "</div>"
        "</div>"
        "</div>"
    )


def build_prospect_notification_html(prospect: Prospect) -> str:
    rows = [
        ("Nombre", prospect.name),
        ("Correo", prospect.email),
        ("Telefono", prospect.phone or "-"),
        ("Empresa", prospect.company or "-"),
        ("Servicio", prospect.service or "-"),
        ("Mensaje", prospect.message or "-"),
    ]
    rows_html = "".join(
        f'<div style="padding:16px 0;border-bottom:1px solid {EMAIL_LINE};">'
        f'<div style="margin-bottom:6px;color:{EMAIL_MUTED};font-size:11px;'
        'font-weight:700;letter-spacing:0.12em;text-transform:uppercase;">'
        f"{html.escape(label)}</div>"
        f'<div style="color:{EMAIL_INK};font-size:16px;line-height:1.65;word-break:break-word;">'
        f"{html.escape(str(value))}</div>"
        "</div>"
        for label, value in rows
    )
    content_html = (
        f'<div style="margin-bottom:22px;padding:18px 20px;border-radius:20px;'
        f'background:{EMAIL_PANEL};border:1px solid {EMAIL_LINE};">'
        f'<div style="color:{EMAIL_INK};font-size:14px;line-height:1.7;">'
        "Se registro un nuevo prospecto desde el formulario de contacto. Aqui tienes los datos capturados para dar seguimiento."
        "</div>"
        "</div>"
        f"{rows_html}"
    )
    cta_html = ""
    if settings.FRONTEND_URL:
        cta_html = (
            '<div style="margin-top:24px;">'
            f'{_build_email_button("Ver en el dashboard", f"{settings.FRONTEND_URL}/dashboard/prospects")}'
            "</div>"
        )

    return _build_email_shell(
        eyebrow="Nuevo contacto",
        title="Nuevo prospecto recibido",
        intro="Un nuevo lead llego a la plataforma y ya esta listo para seguimiento.",
        content_html=content_html,
        cta_html=cta_html,
    )


def build_test_notification_html() -> str:
    content_html = (
        f'<div style="margin-bottom:22px;padding:18px 20px;border-radius:20px;'
        f'background:{EMAIL_PANEL};border:1px solid {EMAIL_LINE};">'
        f'<div style="color:{EMAIL_INK};font-size:14px;line-height:1.7;">'
        "Este es un correo de prueba enviado desde la plataforma de Lyratech para confirmar que la configuracion de notificaciones funciona correctamente."
        "</div>"
        "</div>"
        f'<div style="padding:16px 0;border-bottom:1px solid {EMAIL_LINE};">'
        f'<div style="margin-bottom:6px;color:{EMAIL_MUTED};font-size:11px;'
        'font-weight:700;letter-spacing:0.12em;text-transform:uppercase;">Estado</div>'
        f'<div style="color:{EMAIL_INK};font-size:16px;line-height:1.65;">'
        "Canal operativo y listo para recibir avisos."
        "</div>"
        "</div>"
        f'<div style="padding:16px 0 0;">'
        f'<div style="margin-bottom:6px;color:{EMAIL_MUTED};font-size:11px;'
        'font-weight:700;letter-spacing:0.12em;text-transform:uppercase;">Origen</div>'
        f'<div style="color:{EMAIL_INK};font-size:16px;line-height:1.65;">'
        "Dashboard de Lyratech"
        "</div>"
        "</div>"
    )
    cta_html = ""
    if settings.FRONTEND_URL:
        cta_html = (
            '<div style="margin-top:24px;">'
            f'{_build_email_button("Abrir notificaciones", f"{settings.FRONTEND_URL}/dashboard/notifications")}'
            "</div>"
        )

    return _build_email_shell(
        eyebrow="Prueba de sistema",
        title="Correo de prueba de Lyratech",
        intro="Usa este envio para validar que la cuenta destino recibe correctamente las notificaciones del dashboard.",
        content_html=content_html,
        cta_html=cta_html,
    )


def send_test_notification_email(recipient_email: str) -> None:
    payload = {
        "from": f"{settings.NOTIFICATION_FROM_NAME} <{settings.NOTIFICATION_FROM_EMAIL}>",
        "to": [recipient_email],
        "subject": "Prueba de notificaciones de Lyratech",
        "html": build_test_notification_html(),
    }
    _send_email(payload)


def send_prospect_notification_email(
    prospect: Prospect, recipient_emails: list[str]
) -> None:
    if not recipient_emails:
        logger.info(
            "No notification recipients configured; skipping email for prospect %s",
            prospect.id,
        )
        return
    if not settings.RESEND_API_KEY:
        logger.warning(
            "RESEND_API_KEY not configured; skipping email for prospect %s", prospect.id
        )
        return

    # Broad except is deliberate: this runs as a fire-and-forget FastAPI
    # BackgroundTask after the HTTP response has already been sent, so there is
    # no caller left to handle an exception. Any failure here (payload/HTML
    # construction or the network call) must be logged and swallowed, never
    # allowed to propagate as an unhandled ASGI-level error.
    try:
        payload = {
            "from": f"{settings.NOTIFICATION_FROM_NAME} <{settings.NOTIFICATION_FROM_EMAIL}>",
            "to": recipient_emails,
            "reply_to": prospect.email,
            "subject": f"Nuevo prospecto: {prospect.name}",
            "html": build_prospect_notification_html(prospect),
        }
        _send_email(payload)
    except Exception:
        logger.exception(
            "Failed to send prospect notification email for prospect %s", prospect.id
        )


_DIAGNOSTIC_EMAIL_LABELS = {
    "es": {"why": "Por qué se recomienda", "opportunities": "Oportunidades", "next_steps": "Plan de acción sugerido", "cta": "Agendar con un experto"},
    "en": {"why": "Why it fits", "opportunities": "Opportunities", "next_steps": "Suggested next steps", "cta": "Book a call with an expert"},
    "fr": {"why": "Pourquoi c'est adapté", "opportunities": "Opportunités", "next_steps": "Prochaines étapes suggérées", "cta": "Réserver un appel avec un expert"},
    "de": {"why": "Warum es passt", "opportunities": "Chancen", "next_steps": "Empfohlene nächste Schritte", "cta": "Gespräch mit einem Experten buchen"},
}


def build_diagnostic_result_email_html(*, locale: str, llm_result: dict, submission_name: str) -> str:
    labels = _DIAGNOSTIC_EMAIL_LABELS.get(locale, _DIAGNOSTIC_EMAIL_LABELS["en"])

    def _list_html(items: list) -> str:
        return "".join(f'<li style="margin-bottom:8px;">{html.escape(str(item))}</li>' for item in items)

    content_html = (
        f'<div style="margin-bottom:22px;color:{EMAIL_INK};font-size:15px;line-height:1.7;">'
        f"{html.escape(llm_result.get('summary', ''))}"
        "</div>"
        f'<div style="margin-bottom:18px;padding:18px 20px;border-radius:20px;background:{EMAIL_PANEL};border:1px solid {EMAIL_LINE};">'
        f'<div style="color:{EMAIL_MUTED};font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:8px;">{html.escape(labels["why"])}</div>'
        f'<div style="color:{EMAIL_INK};font-size:14px;line-height:1.7;">{html.escape(llm_result.get("why_it_fits", ""))}</div>'
        "</div>"
        '<div style="margin-bottom:18px;">'
        f'<div style="color:{EMAIL_MUTED};font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:8px;">{html.escape(labels["opportunities"])}</div>'
        f'<ul style="margin:0;padding-left:18px;color:{EMAIL_INK};font-size:14px;">{_list_html(llm_result.get("key_opportunities", []))}</ul>'
        "</div>"
        "<div>"
        f'<div style="color:{EMAIL_MUTED};font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:8px;">{html.escape(labels["next_steps"])}</div>'
        f'<ul style="margin:0;padding-left:18px;color:{EMAIL_INK};font-size:14px;">{_list_html(llm_result.get("suggested_next_steps", []))}</ul>'
        "</div>"
    )
    cta_html = ""
    if settings.FRONTEND_URL:
        cta_html = (
            '<div style="margin-top:24px;">'
            f'{_build_email_button(labels["cta"], f"{settings.FRONTEND_URL}/contact")}'
            "</div>"
        )
    return _build_email_shell(
        eyebrow="Diagnóstico GO",
        title=llm_result.get("headline", f"Tu diagnóstico, {submission_name}"),
        intro=llm_result.get("email_preview", ""),
        content_html=content_html,
        cta_html=cta_html,
    )


def send_diagnostic_result_email(
    *, to_email: str, locale: str, llm_result: dict, submission_name: str
) -> None:
    """Sends the user-facing diagnostic email. Raises on failure so the
    caller can persist a real `email_delivery_status` on the submission."""
    if not settings.RESEND_API_KEY:
        raise RuntimeError("RESEND_API_KEY not configured")

    payload = {
        "from": f"{settings.NOTIFICATION_FROM_NAME} <{settings.NOTIFICATION_FROM_EMAIL}>",
        "to": [to_email],
        "subject": llm_result.get("email_subject") or f"Tu diagnóstico, {submission_name}",
        "html": build_diagnostic_result_email_html(
            locale=locale, llm_result=llm_result, submission_name=submission_name
        ),
    }
    _send_email(payload)


def build_diagnostic_notification_html(submission: DiagnosticSubmission) -> str:
    primary_name = SERVICE_CATALOG.get(submission.recommended_primary_service, {}).get(
        "name", {}
    ).get("en", submission.recommended_primary_service)
    secondary_name = None
    if submission.recommended_secondary_service:
        secondary_name = SERVICE_CATALOG.get(submission.recommended_secondary_service, {}).get(
            "name", {}
        ).get("en", submission.recommended_secondary_service)

    rows = [
        ("Nombre", submission.name),
        ("Correo", submission.email),
        ("Telefono", submission.phone or "-"),
        ("Empresa", submission.company or "-"),
        ("Idioma", submission.locale),
        ("Servicio recomendado", primary_name),
        ("Servicio secundario", secondary_name or "-"),
    ]
    rows_html = "".join(
        f'<div style="padding:16px 0;border-bottom:1px solid {EMAIL_LINE};">'
        f'<div style="margin-bottom:6px;color:{EMAIL_MUTED};font-size:11px;'
        'font-weight:700;letter-spacing:0.12em;text-transform:uppercase;">'
        f"{html.escape(label)}</div>"
        f'<div style="color:{EMAIL_INK};font-size:16px;line-height:1.65;word-break:break-word;">'
        f"{html.escape(str(value))}</div>"
        "</div>"
        for label, value in rows
    )
    content_html = (
        f'<div style="margin-bottom:22px;padding:18px 20px;border-radius:20px;'
        f'background:{EMAIL_PANEL};border:1px solid {EMAIL_LINE};">'
        f'<div style="color:{EMAIL_INK};font-size:14px;line-height:1.7;">'
        "Se completó un nuevo Diagnóstico GO desde el sitio web. Aquí tienes los datos capturados para dar seguimiento."
        "</div>"
        "</div>"
        f"{rows_html}"
    )
    cta_html = ""
    if settings.FRONTEND_URL:
        cta_html = (
            '<div style="margin-top:24px;">'
            f'{_build_email_button("Ver en el dashboard", f"{settings.FRONTEND_URL}/dashboard/diagnostics")}'
            "</div>"
        )
    return _build_email_shell(
        eyebrow="Nuevo diagnóstico",
        title="Nuevo Diagnóstico GO recibido",
        intro="Un usuario completó el diagnóstico y ya tiene una recomendación calculada.",
        content_html=content_html,
        cta_html=cta_html,
    )


def send_diagnostic_notification_email(
    submission: DiagnosticSubmission, recipient_emails: list[str]
) -> None:
    """Fire-and-forget internal notification — mirrors
    `send_prospect_notification_email` exactly, reusing the same
    dashboard-configured recipient list."""
    if not recipient_emails:
        logger.info(
            "No notification recipients configured; skipping diagnostic email for submission %s",
            submission.id,
        )
        return
    if not settings.RESEND_API_KEY:
        logger.warning(
            "RESEND_API_KEY not configured; skipping diagnostic notification email for submission %s",
            submission.id,
        )
        return

    # Broad except is deliberate: this runs as a fire-and-forget FastAPI
    # BackgroundTask after the HTTP response has already been sent, so there is
    # no caller left to handle an exception. Any failure here (payload/HTML
    # construction or the network call) must be logged and swallowed, never
    # allowed to propagate as an unhandled ASGI-level error.
    try:
        payload = {
            "from": f"{settings.NOTIFICATION_FROM_NAME} <{settings.NOTIFICATION_FROM_EMAIL}>",
            "to": recipient_emails,
            "reply_to": submission.email,
            "subject": f"Nuevo diagnóstico: {submission.name}",
            "html": build_diagnostic_notification_html(submission),
        }
        _send_email(payload)
    except Exception:
        logger.exception(
            "Failed to send diagnostic notification email for submission %s", submission.id
        )
