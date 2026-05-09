"""
One-time script to create an admin account in MongoDB.
Run from the backend folder:
    python create_admin.py
"""

import sys
import os

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app, mongo
from app.services.auth_service import register_user
from bson import ObjectId

app = create_app()

with app.app_context():
    # ─── Admin credentials ─────────────────────────────────────────────────
    ADMIN_NAME     = "SafeHer Admin"
    ADMIN_EMAIL    = "admin@safeher.com"
    ADMIN_PASSWORD = "Admin@1234"
    ADMIN_PHONE    = "+911234567890"
    # ───────────────────────────────────────────────────────────────────────

    # Check if already exists
    existing = mongo.users.find_one({"email": ADMIN_EMAIL})
    if existing:
        # Just ensure role is admin
        mongo.users.update_one(
            {"email": ADMIN_EMAIL},
            {"$set": {"role": "admin", "email_verified": True}}
        )
        print(f"✅ Admin already exists — role updated to 'admin'.")
        print(f"   Email   : {ADMIN_EMAIL}")
        print(f"   Password: {ADMIN_PASSWORD}")
    else:
        success, message, user_id = register_user(
            mongo, ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_PHONE
        )
        if success:
            # Promote to admin and skip OTP verification
            mongo.users.update_one(
                {"_id": ObjectId(user_id)},
                {"$set": {"role": "admin", "email_verified": True}}
            )
            print("✅ Admin account created successfully!")
            print(f"   Email   : {ADMIN_EMAIL}")
            print(f"   Password: {ADMIN_PASSWORD}")
        else:
            print(f"❌ Failed to create admin: {message}")
