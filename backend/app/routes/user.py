"""
User Specific Routes.
"""

from datetime import datetime, timezone
from flask import Blueprint, jsonify, request
from app import mongo
from app.middleware.auth_middleware import token_required
from bson import ObjectId

user_bp = Blueprint("user", __name__)

@user_bp.route("/profile", methods=["GET"])
@token_required
def get_profile(current_user):
    """Get full profile of the logged-in user."""
    # Ensure we have the latest data from DB
    user = mongo.users.find_one({"_id": current_user["_id"]})
    if not user:
        return jsonify({"error": "User not found"}), 404
        
    return jsonify({
        "id": str(user["_id"]),
        "name": user.get("name", ""),
        "email": user.get("email", ""),
        "phone": user.get("phone", ""),
        "address": user.get("address", ""),
        "role": user.get("role", "user"),
        "emergency_status": user.get("emergency_status", "safe")
    }), 200

@user_bp.route("/profile", methods=["PUT"])
@token_required
def update_profile(current_user):
    """Update user profile details."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400
        
    allowed_fields = ["name", "phone", "address"]
    update_data = {}
    for field in allowed_fields:
        if field in data:
            update_data[field] = data[field].strip()
            
    if not update_data:
        return jsonify({"error": "No valid fields to update"}), 400
        
    mongo.users.update_one(
        {"_id": current_user["_id"]},
        {"$set": update_data}
    )
    
    return jsonify({"message": "Profile updated successfully"}), 200

@user_bp.route("/dashboard-stats", methods=["GET"])
@token_required
def get_user_stats(current_user):
    """Get dashboard stats for the logged-in user."""
    user_id = current_user["_id"]
    
    # Count SOS alerts triggered by this user
    sos_count = mongo.sos_alerts.count_documents({"user_id": user_id})
    
    # Count incidents reported by this user
    incident_count = mongo.incidents.count_documents({"reported_by": user_id})
    
    # Count contacts from trusted_contacts collection
    contacts_count = mongo.trusted_contacts.count_documents({"user_id": user_id})
    
    return jsonify({
        "sos_count": sos_count,
        "incident_count": incident_count,
        "emergency_contacts_count": contacts_count
    }), 200

@user_bp.route("/contacts", methods=["GET"])
@token_required
def get_contacts(current_user):
    """Get all emergency contacts for the user from trusted_contacts collection."""
    user_id = current_user["_id"]
    contacts = list(mongo.trusted_contacts.find({"user_id": user_id}))
    
    result = []
    for c in contacts:
        result.append({
            "id": str(c["_id"]),
            "name": c.get("name", ""),
            "phone": c.get("phone", ""),
            "address": c.get("address", ""),
            "relation": c.get("relation", "")
        })
        
    return jsonify(result), 200

@user_bp.route("/contacts", methods=["POST"])
@token_required
def add_emergency_contact(current_user):
    """Add a new emergency contact to trusted_contacts collection."""
    user_id = current_user["_id"]
    
    # Check limit (max 6)
    count = mongo.trusted_contacts.count_documents({"user_id": user_id})
    if count >= 6:
        return jsonify({"error": "You can only have a maximum of 6 emergency contacts"}), 400
        
    data = request.get_json()
    if not data or not data.get("name") or not data.get("phone"):
        return jsonify({"error": "Name and phone are required"}), 400
        
    phone = data.get("phone").strip()
    
    # Check for duplicate phone
    duplicate = mongo.trusted_contacts.find_one({"user_id": user_id, "phone": phone})
    if duplicate:
        return jsonify({"error": "A contact with this phone number already exists"}), 400
        
    contact = {
        "user_id": user_id,
        "name": data.get("name").strip(),
        "phone": phone,
        "address": data.get("address", "").strip(),
        "relation": data.get("relation", "").strip(),
        "created_at": datetime.now(timezone.utc)
    }
    
    result = mongo.trusted_contacts.insert_one(contact)
    contact["id"] = str(result.inserted_id)
    del contact["_id"]
    del contact["user_id"]
    
    return jsonify({"message": "Contact added successfully", "contact": contact}), 201

@user_bp.route("/contacts/<contact_id>", methods=["PUT"])
@token_required
def edit_emergency_contact(current_user, contact_id):
    """Edit an existing emergency contact."""
    user_id = current_user["_id"]
    data = request.get_json()
    
    update_data = {}
    if "name" in data: update_data["name"] = data["name"].strip()
    if "phone" in data: update_data["phone"] = data["phone"].strip()
    if "address" in data: update_data["address"] = data["address"].strip()
    if "relation" in data: update_data["relation"] = data["relation"].strip()
    
    if not update_data:
        return jsonify({"error": "No data to update"}), 400
        
    result = mongo.trusted_contacts.update_one(
        {"_id": ObjectId(contact_id), "user_id": user_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        return jsonify({"error": "Contact not found"}), 404
        
    return jsonify({"message": "Contact updated successfully"}), 200

@user_bp.route("/contacts/<contact_id>", methods=["DELETE"])
@token_required
def delete_emergency_contact(current_user, contact_id):
    """Delete an emergency contact from trusted_contacts collection."""
    user_id = current_user["_id"]
    result = mongo.trusted_contacts.delete_one({"_id": ObjectId(contact_id), "user_id": user_id})
    
    if result.deleted_count == 0:
        return jsonify({"error": "Contact not found"}), 404
        
    return jsonify({"message": "Contact removed successfully"}), 200

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
            "triggered_at": alert["triggered_at"].isoformat() if hasattr(alert["triggered_at"], "isoformat") else alert["triggered_at"],
            "address": alert.get("trigger_address", "Unknown location")
        })
    
    return jsonify(result), 200

@user_bp.route("/activities", methods=["GET"])
@token_required
def get_recent_activities(current_user):
    """Get a feed of recent activities for the user."""
    user_id = current_user["_id"]
    activities = []
    
    # Recent SOS triggers
    sos_alerts = list(mongo.sos_alerts.find({"user_id": user_id}).sort("triggered_at", -1).limit(3))
    for alert in sos_alerts:
        activities.append({
            "type": "sos",
            "message": f"SOS Alert triggered at {alert.get('trigger_address', 'Unknown location')}",
            "time": alert["triggered_at"].isoformat() if hasattr(alert["triggered_at"], "isoformat") else str(alert["triggered_at"]),
            "icon": "fas fa-exclamation-triangle",
            "color": "var(--emergency)"
        })
        
    if not activities:
        activities = [
            {"type": "info", "message": "Welcome to SafeHer!", "time": datetime.now(timezone.utc).isoformat(), "icon": "fas fa-shield-alt", "color": "var(--primary)"}
        ]
        
    return jsonify(activities), 200
