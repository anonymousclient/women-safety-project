"""
SOS Emergency Routes.

Handles:
    POST /api/sos/trigger         — Trigger an SOS emergency alert
    PUT  /api/sos/<id>/resolve    — Resolve an active SOS alert
    GET  /api/sos/active          — Get all active SOS alerts (admin)
    GET  /api/sos/history         — Get current user's SOS history
"""

from flask import Blueprint, request, jsonify
from app import mongo
from app.middleware.auth_middleware import token_required
from app.models.sos_alert import (
    create_sos_alert,
    get_active_alerts,
    resolve_alert,
    add_notified_contact,
    get_user_sos_history,
)
from app.services.firebase_service import (
    send_sos_notification,
    write_sos_to_realtime_db,
    resolve_sos_in_realtime_db,
    clear_live_location,
)
from app.services.sms_service import notify_emergency_contacts

sos_bp = Blueprint("sos", __name__)


@sos_bp.route("/trigger", methods=["POST"])
@token_required
def trigger_sos(current_user):
    """
    Trigger an SOS emergency alert.

    This is the most critical endpoint in the system. When called, it:
    1. Creates an SOS alert record in MongoDB
    2. Sends SMS to all emergency contacts
    3. Sends a push notification to all admins via Firebase

    Expected JSON body:
    {
        "latitude": 28.6139,
        "longitude": 77.2090,
        "address": "Connaught Place, New Delhi" (optional)
    }
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400

    latitude = data.get("latitude")
    longitude = data.get("longitude")

    if latitude is None or longitude is None:
        return jsonify({"error": "latitude and longitude are required"}), 400

    address = data.get("address", "Unknown location")
    user_id = str(current_user["_id"])
    user_name = current_user["name"]

    # ── Step 1: Create the SOS alert in MongoDB ──
    alert_id = create_sos_alert(mongo, user_id, longitude, latitude, address)

    # ── Step 2: Notify emergency contacts via SMS ──
    contact_results = notify_emergency_contacts(
        mongo, user_id, user_name, latitude, longitude
    )

    # ── Step 3: Record which contacts were notified ──
    for contact in contact_results:
        add_notified_contact(
            mongo, alert_id,
            contact["name"], contact["phone"], contact["sms_sent"]
        )

    # ── Step 4: Push notifications (FCM) ──
    send_sos_notification(user_name, address)

    # ── Step 5: Write SOS alert to Firebase Realtime DB (instant dashboard update) ──
    write_sos_to_realtime_db(
        alert_id, user_id, user_name, latitude, longitude, address
    )

    return jsonify({
        "message": "SOS alert triggered successfully",
        "alert_id": alert_id,
        "contacts_notified": len(contact_results),
        "details": contact_results,
    }), 201


@sos_bp.route("/<alert_id>/resolve", methods=["PUT"])
@token_required
def resolve_sos(current_user, alert_id):
    """
    Resolve an active SOS alert.
    Typically called by an admin after verifying the user is safe.

    Expected JSON body:
    {
        "notes": "User confirmed safe via phone call" (optional)
    }
    """
    data = request.get_json() or {}
    notes = data.get("notes", "")

    resolve_alert(mongo, alert_id, str(current_user["_id"]), notes)

    # Also resolve in Firebase Realtime DB + clear live location
    resolve_sos_in_realtime_db(alert_id)
    # Clear any live location tracking for this user
    clear_live_location(str(current_user["_id"]))

    return jsonify({"message": "SOS alert resolved"}), 200


@sos_bp.route("/active", methods=["GET"])
@token_required
def active_alerts(current_user):
    """
    Get all currently active SOS alerts.
    Intended for admin dashboard use.
    """
    alerts = get_active_alerts(mongo)

    # Convert ObjectId and datetime fields to strings for JSON serialization
    result = []
    for alert in alerts:
        result.append({
            "id": str(alert["_id"]),
            "user_name": alert["user_info"]["name"],
            "user_phone": alert["user_info"]["phone"],
            "user_email": alert["user_info"]["email"],
            "location": alert["trigger_location"]["coordinates"],
            "address": alert.get("trigger_address", ""),
            "triggered_at": alert["triggered_at"].isoformat(),
        })

    return jsonify({"active_alerts": result, "count": len(result)}), 200


@sos_bp.route("/history", methods=["GET"])
@token_required
def sos_history(current_user):
    """Get the current user's past SOS alerts."""
    alerts = get_user_sos_history(mongo, str(current_user["_id"]))

    result = []
    for alert in alerts:
        result.append({
            "id": str(alert["_id"]),
            "location": alert["trigger_location"]["coordinates"],
            "address": alert.get("trigger_address", ""),
            "status": alert["status"],
            "triggered_at": alert["triggered_at"].isoformat(),
            "resolved_at": (
                alert["resolved_at"].isoformat()
                if alert.get("resolved_at") else None
            ),
        })

    return jsonify({"sos_history": result}), 200
