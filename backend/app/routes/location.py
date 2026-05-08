"""
Location Routes.

Handles:
    POST /api/update-location — Update user's live location (during SOS)
"""

from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from bson import ObjectId

from app import mongo
from app.middleware.auth_middleware import token_required
from app.services.firebase_service import update_realtime_location

location_bp = Blueprint("location", __name__)


@location_bp.route("/update-location", methods=["POST"])
@token_required
def update_location(current_user):
    """
    Update the user's live location.

    Called by the Flutter app every few seconds during an active SOS.
    Writes to both MongoDB (audit trail) and Firebase Realtime DB (live tracking).

    Expected JSON body:
    {
        "latitude": 28.6139,
        "longitude": 77.2090,
        "sos_alert_id": "665abc123def" (optional)
    }
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400

    latitude = data.get("latitude")
    longitude = data.get("longitude")

    if latitude is None or longitude is None:
        return jsonify({"error": "latitude and longitude are required"}), 400

    user_id = str(current_user["_id"])
    sos_alert_id = data.get("sos_alert_id")

    # Store in MongoDB (auto-expires via TTL index after 24h)
    location_doc = {
        "user_id": ObjectId(user_id),
        "location": {
            "type": "Point",
            "coordinates": [longitude, latitude],
        },
        "speed": data.get("speed"),
        "battery_level": data.get("battery_level"),
        "timestamp": datetime.now(timezone.utc),
    }

    if sos_alert_id:
        location_doc["sos_alert_id"] = ObjectId(sos_alert_id)

    mongo.live_locations.insert_one(location_doc)

    # Mirror to Firebase Realtime DB for live dashboard tracking
    update_realtime_location(user_id, longitude, latitude)

    return jsonify({"message": "Location updated"}), 200
