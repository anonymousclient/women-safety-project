"""
Authentication Service.

Handles JWT token generation and user authentication logic.
Separated from routes to keep business logic reusable and testable.
"""

from datetime import datetime, timedelta, timezone
import jwt
from flask import current_app

from app.models.user import create_user, find_user_by_email, verify_password


def register_user(db, name, email, password, phone):
    """
    Register a new user.

    Returns:
        (success: bool, message: str, user_id: str or None)
    """
    # Check if email already exists
    existing = find_user_by_email(db, email)
    if existing:
        return False, "Email already registered", None

    # Basic validation
    if not name or not email or not password:
        return False, "Name, email, and password are required", None

    if len(password) < 6:
        return False, "Password must be at least 6 characters", None

    try:
        user_id = create_user(db, name, email, password, phone)
        return True, "Registration successful", str(user_id)
    except Exception as e:
        return False, f"Registration failed: {str(e)}", None


def login_user(db, email, password):
    """
    Authenticate a user and generate a JWT token.

    Returns:
        (success: bool, message: str, token: str or None, user_data: dict or None)
    """
    user = find_user_by_email(db, email)
    if not user:
        return False, "Invalid email or password", None, None

    if not user.get("is_active", True):
        return False, "Account has been deactivated", None, None

    if not verify_password(user["password_hash"], password):
        return False, "Invalid email or password", None, None

    # ── Generate JWT token ──
    expiry_hours = current_app.config.get("JWT_EXPIRY_HOURS", 24)
    payload = {
        "user_id": str(user["_id"]),
        "email": user["email"],
        "role": user.get("role", "user"),
        "exp": datetime.now(timezone.utc) + timedelta(hours=expiry_hours),
        "iat": datetime.now(timezone.utc),
    }
    token = jwt.encode(
        payload, current_app.config["SECRET_KEY"], algorithm="HS256"
    )

    # User data to return (exclude sensitive fields)
    user_data = {
        "id": str(user["_id"]),
        "name": user["name"],
        "email": user["email"],
        "phone": user.get("phone", ""),
        "role": user.get("role", "user"),
    }

    return True, "Login successful", token, user_data
