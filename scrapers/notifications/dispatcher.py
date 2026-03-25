"""Dispatch notifications via email, SMS, and WhatsApp.

Each function logs the send result to the notification_log table.
"""

import json
import os

import psycopg2
from loguru import logger

from notifications.templates import (
    build_email_html,
    build_sms_text,
    build_whatsapp_text,
)


def _log_notification(conn, user_id: str, search_id: str, listing_id: str,
                      channel: str, status: str = "sent", error_msg: str | None = None):
    """Log notification attempt to database."""
    cur = conn.cursor()
    cur.execute(
        """INSERT INTO notification_log (user_id, saved_search_id, listing_id, channel, status, error_message)
           VALUES (%s, %s, %s, %s, %s, %s)""",
        (user_id, search_id, listing_id, channel, status, error_msg),
    )
    conn.commit()
    cur.close()


def send_email(conn, user: dict, listing: dict, search: dict):
    """Send email notification via Resend."""
    api_key = os.environ.get("RESEND_API_KEY")
    if not api_key:
        logger.warning("[dispatcher] RESEND_API_KEY not set, skipping email")
        return

    try:
        import resend
        resend.api_key = api_key

        html = build_email_html(listing, search)
        app_url = os.environ.get("NEXT_PUBLIC_APP_URL", "https://rentdanang.app")

        resend.Emails.send({
            "from": "RentDaNang <alerts@rentdanang.app>",
            "to": [user["email"]],
            "subject": f"New listing in {listing.get('area_name', 'Da Nang')} - {listing.get('title', 'New rental')}",
            "html": html,
        })

        _log_notification(conn, user["user_id"], search["id"], listing["listing_id"], "email")
        logger.info(f"[dispatcher] Email sent to {user['email']}")

    except Exception as e:
        _log_notification(conn, user["user_id"], search["id"], listing["listing_id"], "email", "failed", str(e))
        logger.error(f"[dispatcher] Email failed for {user['email']}: {e}")


def send_sms(conn, user: dict, listing: dict, search: dict):
    """Send SMS notification via Twilio."""
    account_sid = os.environ.get("TWILIO_ACCOUNT_SID")
    auth_token = os.environ.get("TWILIO_AUTH_TOKEN")
    from_number = os.environ.get("TWILIO_PHONE_NUMBER")
    to_number = user.get("phone")

    if not all([account_sid, auth_token, from_number, to_number]):
        logger.warning("[dispatcher] Twilio SMS not configured or user has no phone")
        return

    try:
        from twilio.rest import Client
        client = Client(account_sid, auth_token)

        body = build_sms_text(listing, search)
        client.messages.create(body=body, from_=from_number, to=to_number)

        _log_notification(conn, user["user_id"], search["id"], listing["listing_id"], "sms")
        logger.info(f"[dispatcher] SMS sent to {to_number}")

    except Exception as e:
        _log_notification(conn, user["user_id"], search["id"], listing["listing_id"], "sms", "failed", str(e))
        logger.error(f"[dispatcher] SMS failed for {to_number}: {e}")


def send_whatsapp(conn, user: dict, listing: dict, search: dict):
    """Send WhatsApp notification via Twilio."""
    account_sid = os.environ.get("TWILIO_ACCOUNT_SID")
    auth_token = os.environ.get("TWILIO_AUTH_TOKEN")
    wa_number = os.environ.get("TWILIO_WHATSAPP_NUMBER")
    to_number = user.get("phone")

    if not all([account_sid, auth_token, wa_number, to_number]) or not user.get("whatsapp_enabled"):
        logger.warning("[dispatcher] WhatsApp not configured or not enabled for user")
        return

    try:
        from twilio.rest import Client
        client = Client(account_sid, auth_token)

        body = build_whatsapp_text(listing, search)
        client.messages.create(
            body=body,
            from_=f"whatsapp:{wa_number}",
            to=f"whatsapp:{to_number}",
        )

        _log_notification(conn, user["user_id"], search["id"], listing["listing_id"], "whatsapp")
        logger.info(f"[dispatcher] WhatsApp sent to {to_number}")

    except Exception as e:
        _log_notification(conn, user["user_id"], search["id"], listing["listing_id"], "whatsapp", "failed", str(e))
        logger.error(f"[dispatcher] WhatsApp failed for {to_number}: {e}")


def dispatch_notification(conn, search: dict, listing: dict):
    """Dispatch notification to all enabled channels for a matching search."""
    user = {
        "user_id": search["user_id"],
        "email": search["email"],
        "user_name": search.get("user_name"),
        "phone": search.get("phone"),
        "whatsapp_enabled": search.get("whatsapp_enabled", False),
    }

    if search.get("notify_email") and user["email"]:
        send_email(conn, user, listing, search)

    if search.get("notify_sms") and user.get("phone"):
        send_sms(conn, user, listing, search)

    if search.get("notify_whatsapp") and user.get("phone") and user.get("whatsapp_enabled"):
        send_whatsapp(conn, user, listing, search)
