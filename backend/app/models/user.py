"""
User model — MongoDB operations for the 'users' collection.

Each function here talks directly to MongoDB using PyMongo.
There is no ORM — just clean dictionary-based documents.
"""

from datetime import datetime, timezone
from bson import ObjectId
import bcrypt


def create_user(db, name, email, password, phone):
    """
    Register a new user.

    Args:
        db: PyMongo database reference
        name: Full name
        email: Email address (must be unique)
        password: Plain-text password (will be hashed)
        phone: Phone number string

    Returns:
        The inserted document's ObjectId
    """
    # Hash the password with bcrypt
    password_hash = bcrypt.hashpw(
        password.encode("utf-8"), bcrypt.gensalt()
    ).decode("utf-8")

    user_doc = {
        "name": name,
        "email": email.lower().strip(),
        "password_hash": password_hash,
        "phone": phone,
        "role": "user",  # 'user' or 'admin'
        "emergency_contacts": [],
        "fcm_token": None,
        "is_active": True,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }

    result = db.users.insert_one(user_doc)
    return result.inserted_id


def find_user_by_email(db, email):
    """Find a single user by email address."""
    return db.users.find_one({"email": email.lower().strip()})


def find_user_by_id(db, user_id):
    """Find a single user by their ObjectId."""
    return db.users.find_one({"_id": ObjectId(user_id)})


def verify_password(stored_hash, provided_password):
    """
    Check if a provided password matches the stored bcrypt hash.

    Args:
        stored_hash: The bcrypt hash string from the database
        provided_password: The plain-text password to check

    Returns:
        True if the password matches, False otherwise
    """
    return bcrypt.checkpw(
        provided_password.encode("utf-8"),
        stored_hash.encode("utf-8"),
    )


def update_fcm_token(db, user_id, fcm_token):
    """Update the user's Firebase Cloud Messaging token (for push notifications)."""
    db.users.update_one(
        {"_id": ObjectId(user_id)},
        {
            "$set": {
                "fcm_token": fcm_token,
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )


def add_emergency_contact(db, user_id, name, phone, relation):
    """Add an emergency contact to the user's list."""
    contact = {"name": name, "phone": phone, "relation": relation}
    db.users.update_one(
        {"_id": ObjectId(user_id)},
        {
            "$push": {"emergency_contacts": contact},
            "$set": {"updated_at": datetime.now(timezone.utc)},
        },
    )


def get_emergency_contacts(db, user_id):
    """Get all emergency contacts for a user."""
    user = db.users.find_one(
        {"_id": ObjectId(user_id)}, {"emergency_contacts": 1}
    )
    return user.get("emergency_contacts", []) if user else []
