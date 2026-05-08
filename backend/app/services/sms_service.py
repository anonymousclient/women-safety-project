"""
SMS Service.

Sends emergency SMS to contacts via Twilio.
Falls back to mock (console log) if Twilio is not configured.

This is intentionally simple — for a college project, you can demo
with mock SMS and show the Twilio integration as a "production-ready" feature.
"""

import logging
from flask import current_app

logger = logging.getLogger(__name__)


def send_emergency_sms(phone_number, user_name, latitude, longitude):
    """
    Send an emergency SMS to a contact.

    The SMS includes:
    - The user's name
    - A Google Maps link to the user's location

    Args:
        phone_number: Recipient's phone number
        user_name: Name of the person in danger
        latitude: Current latitude
        longitude: Current longitude

    Returns:
        True if SMS was sent (or mocked), False on failure
    """
    # Build the message body
    maps_link = f"https://maps.google.com/?q={latitude},{longitude}"
    message_body = (
        f"🚨 EMERGENCY ALERT!\n"
        f"{user_name} has triggered an SOS alert.\n"
        f"📍 Location: {maps_link}\n"
        f"Please check on them immediately or contact local authorities."
    )

    # ── Try Twilio first ──
    account_sid = current_app.config.get("TWILIO_ACCOUNT_SID", "")
    auth_token = current_app.config.get("TWILIO_AUTH_TOKEN", "")
    from_number = current_app.config.get("TWILIO_PHONE_NUMBER", "")

    if account_sid and auth_token and from_number:
        try:
            from twilio.rest import Client

            client = Client(account_sid, auth_token)
            sms = client.messages.create(
                body=message_body,
                from_=from_number,
                to=phone_number,
            )
            logger.info(f"SMS sent to {phone_number}: SID={sms.sid}")
            return True
        except ImportError:
            logger.warning("Twilio package not installed. Falling back to mock.")
        except Exception as e:
            logger.error(f"Twilio SMS failed for {phone_number}: {e}")
            return False

    # ── Mock SMS (fallback for development / demo) ──
    logger.info(
        "[MOCK SMS] To: %s\n%s",
        phone_number,
        message_body,
    )
    print(f"\n{'='*50}")
    print(f"📱 MOCK SMS to {phone_number}")
    print(f"{'='*50}")
    print(message_body)
    print(f"{'='*50}\n")
    return True


def notify_emergency_contacts(db, user_id, user_name, latitude, longitude):
    """
    Send emergency SMS to all of a user's registered contacts.

    Args:
        db: MongoDB database reference
        user_id: The user triggering the SOS
        user_name: The user's name
        latitude, longitude: Current location

    Returns:
        List of dicts with contact name, phone, and whether SMS was sent
    """
    from app.models.user import get_emergency_contacts

    contacts = get_emergency_contacts(db, user_id)
    results = []

    for contact in contacts:
        sent = send_emergency_sms(
            contact["phone"], user_name, latitude, longitude
        )
        results.append({
            "name": contact["name"],
            "phone": contact["phone"],
            "sms_sent": sent,
        })

    return results
