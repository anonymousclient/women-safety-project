"""
Authentication Service.

Handles JWT token generation and user authentication logic.
Separated from routes to keep business logic reusable and testable.
"""

from datetime import datetime, timedelta, timezone
import jwt
from flask import current_app

from app.models.user import create_user, find_user_by_email, verify_password


import re

def register_user(db, name, email, password, phone):
    """
    Register a new user.

    Returns:
        (success: bool, message: str, user_id: str or None)
    """
    # Basic presence validation
    if not name or not email or not password or not phone:
        return False, "Name, email, phone, and password are required", None

    # Full Name: Cannot be empty, Min 3 chars, Only alphabets + spaces
    if not re.match(r"^[A-Za-z\s]{3,}$", name.strip()):
        return False, "Name must be at least 3 characters and contain only letters and spaces", None

    # Email: Must be valid format
    if not re.match(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$", email.strip()):
        return False, "Invalid email format", None

    # Phone: Exactly 10 digits
    if not re.match(r"^\d{10}$", phone.strip()):
        return False, "Phone number must be exactly 10 digits", None

    # Password: Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
    if len(password) < 8:
        return False, "Password must be at least 8 characters", None
    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter", None
    if not re.search(r"[a-z]", password):
        return False, "Password must contain at least one lowercase letter", None
    if not re.search(r"\d", password):
        return False, "Password must contain at least one number", None
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
        return False, "Password must contain at least one special character", None

    # Check if email already exists
    existing = find_user_by_email(db, email)
    if existing:
        return False, "Email already registered", None

    # Check if phone already exists
    existing_phone = db.users.find_one({"phone": phone.strip()})
    if existing_phone:
        return False, "Phone number already registered", None

    try:
        user_id = create_user(db, name.strip(), email.strip(), password, phone.strip())
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
        "email_verified": user.get("email_verified", False),
    }

    return True, "Login successful", token, user_data
