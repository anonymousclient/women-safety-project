"""
Firebase Service — Backend (Python/Flask side).

Handles:
1. Sending push notifications via Firebase Cloud Messaging (FCM)
2. Writing live location data to Firebase Realtime Database
3. Writing SOS alerts to Firebase Realtime Database
4. Cleaning up resolved alerts from Realtime Database

If Firebase is not configured, all operations gracefully fall back to
console logging (mock mode) — the app still works without Firebase.

Firebase Realtime DB structure:
    /live_locations/{user_id}/
        latitude: 28.6139
        longitude: 77.2090
        speed: 1.5
        timestamp: "2026-05-08T..."

    /sos_alerts/{alert_id}/
        user_id: "abc123"
        user_name: "Priya Sharma"
        latitude: 28.6139
        longitude: 77.2090
        address: "Connaught Place"
        status: "active"
        timestamp: 1715180000
"""

import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


# ────────────────────────────────────────────────
# 1. PUSH NOTIFICATIONS (FCM)
# ────────────────────────────────────────────────

def send_push_notification(title, body, topic="admin"):
    """
    Send a push notification to a FCM topic (e.g., all admins).

    Args:
        title: Notification title
        body: Notification body text
        topic: FCM topic name (default: 'admin')
    """
    try:
        from firebase_admin import messaging

        message = messaging.Message(
            notification=messaging.Notification(title=title, body=body),
            topic=topic,
        )
        response = messaging.send(message)
        logger.info(f"FCM notification sent: {response}")
        return True
    except ImportError:
        logger.warning("[MOCK] FCM not available — would send: %s - %s", title, body)
        return False
    except Exception as e:
        logger.error(f"FCM notification failed: {e}")
        return False


def send_push_to_device(token, title, body):
    """
    Send a push notification to a specific device using its FCM token.

    Args:
        token: The device's FCM registration token
        title: Notification title
        body: Notification body text
    """
    try:
        from firebase_admin import messaging

        message = messaging.Message(
            notification=messaging.Notification(title=title, body=body),
            token=token,
        )
        response = messaging.send(message)
        logger.info(f"FCM device notification sent: {response}")
        return True
    except ImportError:
        logger.warning("[MOCK] FCM not available — would send to device: %s", title)
        return False
    except Exception as e:
        logger.error(f"FCM device notification failed: {e}")
        return False


def send_sos_notification(user_name, address):
    """
    Convenience function: Send SOS alert notification to all topics.

    Notifies both the admin dashboard and users subscribed to sos_alerts.
    """
    title = "🚨 SOS Alert!"
    body = f"{user_name} has triggered an emergency alert at {address}"

    # Notify admin dashboard
    send_push_notification(title, body, topic="admin")

    # Notify anyone subscribed to sos_alerts topic
    send_push_notification(title, body, topic="sos_alerts")


# ────────────────────────────────────────────────
# 2. REALTIME DATABASE — Live Locations
# ────────────────────────────────────────────────

def update_realtime_location(user_id, longitude, latitude):
    """
    Write the user's live location to Firebase Realtime Database.
    This is used during active SOS for real-time tracking.

    Firebase path: /live_locations/{user_id}

    Args:
        user_id: The user's ID (string)
        longitude: Current longitude
        latitude: Current latitude
    """
    try:
        from firebase_admin import db as firebase_db

        ref = firebase_db.reference(f"/live_locations/{user_id}")
        ref.set({
            "latitude": latitude,
            "longitude": longitude,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
        logger.info(f"Firebase Realtime DB updated for user {user_id}")
        return True
    except ImportError:
        logger.warning(
            "[MOCK] Firebase Realtime DB not available — "
            "location update for user %s: [%s, %s]",
            user_id, longitude, latitude
        )
        return False
    except Exception as e:
        logger.error(f"Firebase Realtime DB update failed: {e}")
        return False


def clear_live_location(user_id):
    """
    Remove a user's live location from Firebase (when SOS is resolved).

    Args:
        user_id: The user's ID (string)
    """
    try:
        from firebase_admin import db as firebase_db

        ref = firebase_db.reference(f"/live_locations/{user_id}")
        ref.delete()
        logger.info(f"Live location cleared for user {user_id}")
        return True
    except ImportError:
        logger.warning("[MOCK] Would clear live location for user %s", user_id)
        return False
    except Exception as e:
        logger.error(f"Failed to clear live location: {e}")
        return False


# ────────────────────────────────────────────────
# 3. REALTIME DATABASE — SOS Alerts
# ────────────────────────────────────────────────

def write_sos_to_realtime_db(alert_id, user_id, user_name,
                              latitude, longitude, address):
    """
    Write an SOS alert to Firebase Realtime Database.

    This makes the alert instantly visible to the admin dashboard
    without requiring the dashboard to poll the Flask API.

    Firebase path: /sos_alerts/{alert_id}

    Args:
        alert_id: The MongoDB alert ID
        user_id: User who triggered the SOS
        user_name: User's display name
        latitude, longitude: Trigger location
        address: Human-readable address
    """
    try:
        from firebase_admin import db as firebase_db

        ref = firebase_db.reference(f"/sos_alerts/{alert_id}")
        ref.set({
            "user_id": user_id,
            "user_name": user_name,
            "latitude": latitude,
            "longitude": longitude,
            "address": address,
            "status": "active",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
        logger.info(f"SOS alert {alert_id} written to Firebase Realtime DB")
        return True
    except ImportError:
        logger.warning(
            "[MOCK] Would write SOS alert to Firebase: %s by %s",
            alert_id, user_name
        )
        print(f"\n{'='*50}")
        print(f"🔥 MOCK FIREBASE: SOS Alert {alert_id}")
        print(f"   User: {user_name}")
        print(f"   Location: ({latitude}, {longitude})")
        print(f"   Address: {address}")
        print(f"{'='*50}\n")
        return False
    except Exception as e:
        logger.error(f"Failed to write SOS to Firebase: {e}")
        return False


def resolve_sos_in_realtime_db(alert_id):
    """
    Update an SOS alert's status to 'resolved' in Firebase.

    Args:
        alert_id: The alert ID to resolve
    """
    try:
        from firebase_admin import db as firebase_db

        ref = firebase_db.reference(f"/sos_alerts/{alert_id}")
        ref.update({
            "status": "resolved",
            "resolved_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info(f"SOS alert {alert_id} resolved in Firebase")
        return True
    except ImportError:
        logger.warning("[MOCK] Would resolve SOS alert %s in Firebase", alert_id)
        return False
    except Exception as e:
        logger.error(f"Failed to resolve SOS in Firebase: {e}")
        return False
