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
        "email_verified": current_user.get("email_verified", False),
        "phone_verified": current_user.get("phone_verified", False),
        "emergency_contacts": current_user.get("emergency_contacts", []),
        "created_at": current_user["created_at"].isoformat(),
    }), 200

@auth_bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    """Trigger OTP for password reset."""
    from app.services.otp_service import generate_otp, store_otp, send_email_otp_smtp
    from app.models.user import find_user_by_email

    data = request.get_json()
    email = data.get("email", "").strip().lower()

    user = find_user_by_email(mongo, email)
    if not user:
        # Prevent email enumeration by returning a generic success message
        return jsonify({"message": "If that email is registered, you will receive an OTP."}), 200

    otp_code = generate_otp()
    store_otp(mongo, str(user["_id"]), email, otp_code, otp_type="reset")
    
    send_email_otp_smtp(email, otp_code)
    
    return jsonify({"message": "If that email is registered, you will receive an OTP."}), 200

@auth_bp.route("/reset-password", methods=["POST"])
def reset_password():
    """Verify reset OTP and update password."""
    from app.services.otp_service import verify_otp_code
    from app.models.user import find_user_by_email, update_user_password
    import re

    data = request.get_json()
    email = data.get("email", "").strip().lower()
    otp = str(data.get("otp", "")).strip()
    new_password = data.get("new_password", "")

    user = find_user_by_email(mongo, email)
    if not user:
        return jsonify({"error": "Invalid request."}), 400

    # Validate new password
    if len(new_password) < 8 or not re.search(r"[A-Z]", new_password) or not re.search(r"[a-z]", new_password) or not re.search(r"\d", new_password) or not re.search(r"[!@#$%^&*(),.?\":{}|<>]", new_password):
        return jsonify({"error": "Password must be at least 8 characters and contain uppercase, lowercase, number, and special character."}), 400

    success, message = verify_otp_code(mongo, str(user["_id"]), otp, otp_type="reset")
    if not success:
        return jsonify({"error": message}), 400

    # Update password
    update_user_password(mongo, str(user["_id"]), new_password)

    return jsonify({"message": "Password reset successfully. You can now login."}), 200
