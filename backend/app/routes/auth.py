"""
Authentication Routes.

Handles:
    POST /api/auth/register — Create a new user account
    POST /api/auth/login    — Login and receive JWT token
    GET  /api/auth/profile  — Get current user's profile (protected)
"""

from flask import Blueprint, request, jsonify
from app import mongo
from app.services.auth_service import register_user, login_user
from app.middleware.auth_middleware import token_required

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/register", methods=["POST"])
def register():
    """
    Register a new user.

    Expected JSON body:
    {
        "name": "Priya Sharma",
        "email": "priya@example.com",
        "password": "securepass123",
        "phone": "+919876543210"
    }
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400

    name = data.get("name", "").strip()
    email = data.get("email", "").strip()
    password = data.get("password", "")
    phone = data.get("phone", "").strip()

    success, message, user_id = register_user(
        mongo, name, email, password, phone
    )

    if success:
        return jsonify({
            "message": message,
            "user_id": user_id,
        }), 201
    else:
        return jsonify({"error": message}), 400


@auth_bp.route("/login", methods=["POST"])
def login():
    """Login and receive a JWT token (generic)."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400

    email = data.get("email", "").strip()
    password = data.get("password", "")

    success, message, token, user_data = login_user(mongo, email, password)

    if success:
        return jsonify({
            "message": message,
            "token": token,
            "user": user_data,
        }), 200
    else:
        return jsonify({"error": message}), 401


@auth_bp.route("/login/user", methods=["POST"])
def login_user_route():
    """Login specifically for standard users."""
    data = request.get_json()
    email = data.get("email", "").strip()
    password = data.get("password", "")

    success, message, token, user_data = login_user(mongo, email, password)
    
    if success:
        if user_data["role"] != "user":
            return jsonify({"error": "Unauthorized. Please use the admin login."}), 403
        return jsonify({"token": token, "user": user_data}), 200
    return jsonify({"error": message}), 401


@auth_bp.route("/login/admin", methods=["POST"])
def login_admin_route():
    """Login specifically for admins."""
    data = request.get_json()
    email = data.get("email", "").strip()
    password = data.get("password", "")

    success, message, token, user_data = login_user(mongo, email, password)
    
    if success:
        if user_data["role"] != "admin":
            return jsonify({"error": "Unauthorized. Access restricted to administrators."}), 403
        return jsonify({"token": token, "user": user_data}), 200
    return jsonify({"error": message}), 401


@auth_bp.route("/profile", methods=["GET"])
@token_required
def get_profile(current_user):
    """
    Get the current user's profile (requires JWT).

    The current_user is injected by the @token_required decorator.
    """
    return jsonify({
        "id": str(current_user["_id"]),
        "name": current_user["name"],
        "email": current_user["email"],
        "phone": current_user.get("phone", ""),
        "role": current_user.get("role", "user"),
        "emergency_contacts": current_user.get("emergency_contacts", []),
        "created_at": current_user["created_at"].isoformat(),
    }), 200
