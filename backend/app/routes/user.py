"""
User Specific Routes.
"""

from flask import Blueprint, jsonify, request
from app import mongo
from app.middleware.auth_middleware import token_required
from bson import ObjectId

user_bp = Blueprint("user", __name__)

@user_bp.route("/dashboard-stats", methods=["GET"])
@token_required
def get_user_stats(current_user):
    """Get dashboard stats for the logged-in user."""
    user_id = current_user["_id"]
    
    # Count SOS alerts triggered by this user
    sos_count = mongo.sos_alerts.count_documents({"user_id": user_id})
    
    # Count incidents reported by this user
    incident_count = mongo.incidents.count_documents({"reported_by": user_id})
    
    return jsonify({
        "sos_count": sos_count,
        "incident_count": incident_count,
        "emergency_contacts_count": len(current_user.get("emergency_contacts", []))
    }), 200

@user_bp.route("/sos-history", methods=["GET"])
@token_required
def get_sos_history(current_user):
    """Get SOS alert history for the logged-in user."""
    user_id = current_user["_id"]
    alerts = list(mongo.sos_alerts.find({"user_id": user_id}).sort("triggered_at", -1).limit(20))
    
    result = []
    for alert in alerts:
        result.append({
            "id": str(alert["_id"]),
            "status": alert.get("status", "unknown"),
            "triggered_at": alert["triggered_at"].isoformat(),
            "address": alert.get("trigger_address", "Unknown location")
        })
    
    return jsonify(result), 200

@user_bp.route("/contacts", methods=["GET"])
@token_required
def get_contacts(current_user):
    """Get all emergency contacts for the user."""
    return jsonify(current_user.get("emergency_contacts", [])), 200

@user_bp.route("/contacts", methods=["POST"])
@token_required
def add_emergency_contact(current_user):
    """Add a new emergency contact."""
    data = request.get_json()
    if not data or not data.get("name") or not data.get("phone"):
        return jsonify({"error": "Name and phone are required"}), 400
        
    contact = {
        "id": str(ObjectId()),
        "name": data.get("name").strip(),
        "phone": data.get("phone").strip(),
        "address": data.get("address", "").strip(),
        "relation": data.get("relation", "").strip()
    }
    
    mongo.users.update_one(
        {"_id": current_user["_id"]},
        {"$push": {"emergency_contacts": contact}}
    )
    
    return jsonify({"message": "Contact added successfully", "contact": contact}), 201

@user_bp.route("/contacts/<contact_id>", methods=["DELETE"])
@token_required
def delete_emergency_contact(current_user, contact_id):
    """Delete an emergency contact."""
    mongo.users.update_one(
        {"_id": current_user["_id"]},
        {"$pull": {"emergency_contacts": {"id": contact_id}}}
    )
    return jsonify({"message": "Contact removed successfully"}), 200
