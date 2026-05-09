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

@user_bp.route("/recent-travels", methods=["GET"])
@token_required
def get_recent_travels(current_user):
    """Get recently traveled routes for the user."""
    user_id = current_user["_id"]
    travels = list(mongo.recent_routes.find({"user_id": user_id}).sort("traveled_at", -1).limit(5))
    
    if not travels:
        # Generate realistic Bhopal-based mock data for demo
        mock_data = [
            {
                "destination": "MP Nagar ? Bhopal Railway Station",
                "date": "Today, 10:30 AM",
                "safety_score": 82,
                "distance": "4.2 km"
            },
            {
                "destination": "New Market ? AIIMS Bhopal",
                "date": "Yesterday, 08:15 PM",
                "safety_score": 65,
                "distance": "12.8 km"
            },
            {
                "destination": "Indrapuri ? Ashoka Garden",
                "date": "2 days ago",
                "safety_score": 91,
                "distance": "3.5 km"
            }
        ]
        return jsonify(mock_data), 200
        
    result = []
    for t in travels:
        result.append({
            "destination": t.get("destination"),
            "date": t["traveled_at"].strftime("%b %d, %I:%M %p"),
            "safety_score": t.get("safety_score", 0),
            "distance": t.get("distance", "0 km")
        })
    return jsonify(result), 200

@user_bp.route("/activities", methods=["GET"])
@token_required
def get_recent_activities(current_user):
    """Get a feed of recent activities for the user."""
    # Combine data from multiple sources: SOS history, Route history, Login logs
    user_id = current_user["_id"]
    
    activities = []
    
    # 1. Recent SOS triggers
    sos_alerts = list(mongo.sos_alerts.find({"user_id": user_id}).sort("triggered_at", -1).limit(3))
    for alert in sos_alerts:
        activities.append({
            "type": "sos",
            "message": f"SOS Alert triggered at {alert.get('trigger_address', 'Unknown location')}",
            "time": alert["triggered_at"].isoformat(),
            "icon": "fas fa-exclamation-triangle",
            "color": "var(--emergency)"
        })
        
    # 2. Recent Safe Routes
    routes = list(mongo.recent_routes.find({"user_id": user_id}).sort("traveled_at", -1).limit(3))
    for r in routes:
        activities.append({
            "type": "route",
            "message": f"Safe route generated for {r.get('destination')}",
            "time": r["traveled_at"].isoformat(),
            "icon": "fas fa-directions",
            "color": "var(--primary)"
        })

    if not activities:
        # Realistic mock activities for demo
        activities = [
            {"type": "info", "message": "Live location shared successfully", "time": "2024-05-09T10:00:00", "icon": "fas fa-broadcast-tower", "color": "#22c55e"},
            {"type": "route", "message": "Safe route generated for MP Nagar", "time": "2024-05-08T18:30:00", "icon": "fas fa-directions", "color": "var(--primary)"},
            {"type": "alert", "message": "Nearby emergency alert detected", "time": "2024-05-08T12:00:00", "icon": "fas fa-bell", "color": "var(--emergency)"},
            {"type": "info", "message": "Safety scan completed", "time": "2024-05-07T09:00:00", "icon": "fas fa-shield-alt", "color": "#4fc3f7"}
        ]
        
    return jsonify(activities), 200

@user_bp.route("/contacts/<contact_id>", methods=["DELETE"])
@token_required
def delete_emergency_contact(current_user, contact_id):
    """Delete an emergency contact."""
    mongo.users.update_one(
        {"_id": current_user["_id"]},
        {"$pull": {"emergency_contacts": {"id": contact_id}}}
    )
    return jsonify({"message": "Contact removed successfully"}), 200
