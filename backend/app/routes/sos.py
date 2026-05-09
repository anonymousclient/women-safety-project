"""
SOS Emergency Routes.

Handles:
    POST /api/sos/trigger         — Trigger an SOS emergency alert
    POST /api/sos/cancel          — Cancel a recently triggered SOS (by user)
    PUT  /api/sos/<id>/resolve    — Resolve an active SOS alert (by admin)
    GET  /api/sos/active          — Get all active SOS alerts (admin)
    GET  /api/sos/status          — Check current active SOS status for user
    GET  /api/sos/history         — Get current user's SOS history
"""

from flask import Blueprint, request, jsonify
from app import mongo
from app.middleware.auth_middleware import token_required
from app.models.sos_alert import (
    create_sos_alert,
    get_active_alerts,
    resolve_alert,
    cancel_alert,
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
from bson import ObjectId

sos_bp = Blueprint("sos", __name__)


@sos_bp.route("/trigger", methods=["POST"])
@token_required
def trigger_sos(current_user):
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

    # 1. Create the SOS alert in MongoDB
    alert_id = create_sos_alert(mongo, user_id, longitude, latitude, address)

    # 2. Notify emergency contacts via SMS
    contact_results = notify_emergency_contacts(
        mongo, user_id, user_name, latitude, longitude
    )

    # 3. Record which contacts were notified
    for contact in contact_results:
        add_notified_contact(
            mongo, alert_id,
            contact["name"], contact["phone"], contact["sms_sent"]
        )

    # 4. Push notifications (FCM)
    send_sos_notification(user_name, address)

    # 5. Write SOS alert to Firebase Realtime DB
    write_sos_to_realtime_db(
        alert_id, user_id, user_name, latitude, longitude, address
    )

    return jsonify({
        "message": "SOS alert triggered successfully",
        "alert_id": alert_id,
        "contacts_notified": len(contact_results)
    }), 201


@sos_bp.route("/cancel", methods=["POST"])
@token_required
def cancel_sos(current_user):
    """Allow user to cancel an accidental SOS trigger."""
    user_id = str(current_user["_id"])
    
    # Find the most recent active SOS for this user
    active_alert = mongo.sos_alerts.find_one({
        "user_id": ObjectId(user_id),
        "status": "active"
    }, sort=[("triggered_at", -1)])

    if not active_alert:
        return jsonify({"error": "No active SOS alert found to cancel"}), 404

    alert_id = str(active_alert["_id"])
    cancel_alert(mongo, alert_id)
    
    # Sync with Firebase
    resolve_sos_in_realtime_db(alert_id)
    clear_live_location(user_id)

    return jsonify({"message": "SOS alert cancelled by user"}), 200


@sos_bp.route("/<alert_id>/resolve", methods=["PUT", "OPTIONS"])
@token_required
def resolve_sos(current_user, alert_id):
    if request.method == "OPTIONS":
        return "", 204

    data = request.get_json() or {}
    notes = data.get("notes", "Resolved by admin")

    # Find the alert to get user_id for clearing live location
    alert = mongo.sos_alerts.find_one({"_id": ObjectId(alert_id)})
    if alert:
        resolve_alert(mongo, alert_id, str(current_user["_id"]), notes)
        resolve_sos_in_realtime_db(alert_id)
        clear_live_location(str(alert["user_id"]))
        return jsonify({"message": "SOS resolved"}), 200
    
    return jsonify({"error": "Alert not found"}), 404


@sos_bp.route("/status", methods=["GET"])
@token_required
def get_sos_status(current_user):
    """Check if the user has an active SOS."""
    user_id = str(current_user["_id"])
    active_alert = mongo.sos_alerts.find_one({
        "user_id": ObjectId(user_id),
        "status": "active"
    })
    
    if active_alert:
        return jsonify({
            "is_active": True,
            "alert_id": str(active_alert["_id"]),
            "triggered_at": active_alert["triggered_at"].isoformat()
        }), 200
    
    return jsonify({"is_active": False}), 200


@sos_bp.route("/active", methods=["GET"])
@token_required
def active_alerts(current_user):
    alerts = get_active_alerts(mongo)
    result = []
    for alert in alerts:
        result.append({
            "id": str(alert["_id"]),
            "user_name": alert["user_info"]["name"],
            "user_phone": alert["user_info"]["phone"],
            "user_email": alert["user_info"]["email"],
            "latitude": alert["trigger_location"]["coordinates"][1],
            "longitude": alert["trigger_location"]["coordinates"][0],
            "address": alert.get("trigger_address", ""),
            "triggered_at": alert["triggered_at"].isoformat(),
        })
    return jsonify(result), 200


@sos_bp.route("/history", methods=["GET"])
@token_required
def sos_history(current_user):
    alerts = get_user_sos_history(mongo, str(current_user["_id"]))
    result = []
    for alert in alerts:
        result.append({
            "id": str(alert["_id"]),
            "location": alert["trigger_location"]["coordinates"],
            "address": alert.get("trigger_address", ""),
            "status": alert["status"],
            "triggered_at": alert["triggered_at"].isoformat(),
            "resolved_at": alert["resolved_at"].isoformat() if alert.get("resolved_at") else None,
            "cancelled_at": alert["cancelled_at"].isoformat() if alert.get("cancelled_at") else None,
        })
    return jsonify({"sos_history": result}), 200
