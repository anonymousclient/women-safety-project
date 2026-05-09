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






# ────────────────────────────────────────────────
# API Endpoints (called by dashboard JavaScript)
# ────────────────────────────────────────────────

@admin_bp.route("/stats")
@token_required
def admin_api_stats(current_user):
    """Dashboard statistics — counts and summaries."""
    active_sos = mongo.sos_alerts.count_documents({"status": "active"})
    resolved_sos = mongo.sos_alerts.count_documents({"status": "resolved"})
    cancelled_sos = mongo.sos_alerts.count_documents({"status": "cancelled"})
    total_sos = mongo.sos_alerts.count_documents({})

    return jsonify({
        "active_sos": active_sos,
        "resolved_sos": resolved_sos,
        "cancelled_sos": cancelled_sos,
        "total_sos": total_sos,
    })


@admin_bp.route("/sos/active")
@token_required
def admin_api_active_sos(current_user):
    """Get all active SOS alerts with user info."""
    alerts = get_active_alerts(mongo)
    result = []
    for alert in alerts:
        result.append({
            "id": str(alert["_id"]),
            "user_name": alert["user_info"]["name"],
            "user_phone": alert["user_info"].get("phone", "N/A"),
            "user_email": alert["user_info"].get("email", ""),
            "latitude": alert["trigger_location"]["coordinates"][1],
            "longitude": alert["trigger_location"]["coordinates"][0],
            "address": alert.get("trigger_address", "Unknown location"),
            # isoformat so JS new Date() parses correctly
            "triggered_at": alert["triggered_at"].isoformat(),
        })
    return jsonify(result)


@admin_bp.route("/sos/<alert_id>/resolve", methods=["PUT", "OPTIONS"])
@token_required
def admin_api_resolve_sos(current_user, alert_id):
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




