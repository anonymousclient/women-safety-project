"""
Admin Dashboard Routes.

Serves the admin web dashboard using Flask + Jinja2 templates.
These are server-rendered HTML pages (NOT API endpoints).

Pages:
    GET /admin/              — Dashboard overview (stats + active SOS)
    GET /admin/sos           — SOS alerts management
    GET /admin/incidents     — Incident history table
    GET /admin/zones         — Unsafe zones map & list
    GET /admin/users         — Registered users list

API endpoints used by dashboard JavaScript:
    GET /admin/api/stats          — Dashboard statistics
    GET /admin/api/sos/active     — Active SOS alerts (JSON)
    GET /admin/api/incidents      — Incidents list (JSON)
    GET /admin/api/zones          — Unsafe zones list (JSON)
    GET /admin/api/users          — Users list (JSON)
    PUT /admin/api/sos/<id>/resolve — Resolve an SOS alert
"""

from datetime import datetime, timezone, timedelta
from flask import Blueprint, render_template, jsonify, request
from bson import ObjectId
from app import mongo
from app.models.sos_alert import get_active_alerts, resolve_alert
from app.services.firebase_service import (
    resolve_sos_in_realtime_db,
    clear_live_location,
)
from app.middleware.auth_middleware import token_required

admin_bp = Blueprint(
    "admin",
    __name__,
    template_folder="../templates",
    static_folder="../static",
)


# ────────────────────────────────────────────────
# HTML Pages (Server-rendered with Jinja2)
# ────────────────────────────────────────────────

@admin_bp.route("/")
def dashboard():
    """Main dashboard page — overview with stats and active SOS map."""
    return render_template("dashboard.html", page="dashboard")


@admin_bp.route("/sos")
def sos_page():
    """SOS alerts management page."""
    return render_template("sos.html", page="sos")


@admin_bp.route("/incidents-page")
def incidents_page():
    """Incident history table page."""
    return render_template("incidents.html", page="incidents")


@admin_bp.route("/zones-page")
def zones_page():
    """Unsafe zones map page."""
    return render_template("zones.html", page="zones")


@admin_bp.route("/users-page")
def users_page():
    """Registered users list."""
    return render_template("users.html", page="users")


# ────────────────────────────────────────────────
# API Endpoints (called by dashboard JavaScript)
# ────────────────────────────────────────────────

@admin_bp.route("/stats")
@token_required
def api_stats(current_user):
    """Dashboard statistics — counts and summaries."""
    total_users = mongo.users.count_documents({})
    active_sos = mongo.sos_alerts.count_documents({"status": "active"})
    resolved_sos = mongo.sos_alerts.count_documents({"status": "resolved"})
    cancelled_sos = mongo.sos_alerts.count_documents({"status": "cancelled"})
    total_sos = mongo.sos_alerts.count_documents({})
    total_incidents = mongo.incidents.count_documents({})
    unsafe_zones = mongo.unsafe_zones.count_documents({"is_active": True})

    # Incidents in the last 7 days
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    recent_incidents = mongo.incidents.count_documents(
        {"reported_at": {"$gte": week_ago}}
    )

    return jsonify({
        "total_users": total_users,
        "active_sos": active_sos,
        "resolved_sos": resolved_sos,
        "cancelled_sos": cancelled_sos,
        "total_sos": total_sos,
        "total_incidents": total_incidents,
        "recent_incidents": recent_incidents,
        "unsafe_zones": unsafe_zones,
    })


@admin_bp.route("/sos/active")
@token_required
def api_active_sos(current_user):
    """Get all active SOS alerts with user info and emergency contacts."""
    alerts = get_active_alerts(mongo)
    result = []
    for alert in alerts:
        result.append({
            "id": str(alert["_id"]),
            "user_name": alert["user_info"]["name"],
            "user_phone": alert["user_info"].get("phone", "N/A"),
            "user_email": alert["user_info"].get("email", ""),
            "user_address": alert["user_info"].get("address", "N/A"),
            "latitude": alert["trigger_location"]["coordinates"][1],
            "longitude": alert["trigger_location"]["coordinates"][0],
            "address": alert.get("trigger_address", "Unknown location"),
            "triggered_at": alert["triggered_at"].isoformat() if hasattr(alert["triggered_at"], "isoformat") else alert["triggered_at"],
            "emergency_contacts": alert.get("emergency_contacts", [])
        })
    return jsonify(result)


@admin_bp.route("/sos/<alert_id>/resolve", methods=["PUT", "OPTIONS"])
@token_required
def api_resolve_sos(current_user, alert_id):
    """Resolve an SOS alert from the admin dashboard."""
    if request.method == "OPTIONS":
        return "", 204

    data = request.get_json() or {}
    notes = data.get("notes", "Resolved by admin")

    alert = mongo.sos_alerts.find_one({"_id": ObjectId(alert_id)})
    if not alert:
        return jsonify({"error": "Alert not found"}), 404

    resolve_alert(mongo, alert_id, str(alert["user_id"]), notes)
    resolve_sos_in_realtime_db(alert_id)
    clear_live_location(str(alert["user_id"]))
    return jsonify({"message": "SOS resolved"})


@admin_bp.route("/incidents")
@token_required
def api_incidents(current_user):
    """Get all incidents for the history table."""
    pipeline = [
        {"$sort": {"reported_at": -1}},
        {"$limit": 100},
        {
            "$lookup": {
                "from": "users",
                "localField": "reported_by",
                "foreignField": "_id",
                "as": "reporter",
            }
        },
        {"$unwind": {"path": "$reporter", "preserveNullAndEmptyArrays": True}},
    ]
    incidents = list(mongo.incidents.aggregate(pipeline))

    result = []
    for inc in incidents:
        result.append({
            "id": str(inc["_id"]),
            "type": inc.get("type", "unknown"),
            "description": inc.get("description", ""),
            "severity": inc.get("severity", "medium"),
            "status": inc.get("status", "pending"),
            "latitude": inc["location"]["coordinates"][1],
            "longitude": inc["location"]["coordinates"][0],
            "reporter_name": inc.get("reporter", {}).get("name", "Anonymous"),
            "reported_at": inc["reported_at"].strftime("%Y-%m-%d %H:%M:%S"),
        })
    return jsonify(result)


@admin_bp.route("/zones-list")
@token_required
def api_zones(current_user):
    """Get all unsafe zones."""
    zones = list(mongo.unsafe_zones.find({"is_active": True}).sort("risk_level", -1))
    result = []
    for zone in zones:
        result.append({
            "id": str(zone["_id"]),
            "name": zone.get("name", "Unknown"),
            "latitude": zone["location"]["coordinates"][1],
            "longitude": zone["location"]["coordinates"][0],
            "radius_meters": zone.get("radius_meters", 500),
            "risk_level": zone.get("risk_level", 0),
            "risk_category": zone.get("risk_category", "unknown"),
            "incident_count": zone.get("incident_count", 0),
            "source": zone.get("source", "manual"),
        })
    return jsonify(result)


@admin_bp.route("/users-list")
@token_required
def api_users(current_user):
    """Get all registered users."""
    users = list(
        mongo.users.find(
            {},
            {
                "password_hash": 0,  # Never send passwords
                "fcm_token": 0,
            },
        ).sort("created_at", -1).limit(100)
    )
    result = []
    for user in users:
        result.append({
            "id": str(user["_id"]),
            "name": user.get("name", ""),
            "email": user.get("email", ""),
            "phone": user.get("phone", ""),
            "role": user.get("role", "user"),
            "is_active": user.get("is_active", True),
            "emergency_contacts": len(user.get("emergency_contacts", [])),
            "created_at": user.get("created_at", "").strftime("%Y-%m-%d")
            if user.get("created_at")
            else "N/A",
        })
    return jsonify(result)
