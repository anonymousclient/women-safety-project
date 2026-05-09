"""
Seed Data Script.

Populates MongoDB with realistic mock data for demo/testing:
- Sample unsafe zones (based on Delhi/NCR coordinates)
- Sample incidents
- One admin user

Run this script once before your first demo:
    python -m app.seed_data
"""

from datetime import datetime, timezone, timedelta
from pymongo import MongoClient
from app.config import Config
from app.models.user import create_user
from app.models.unsafe_zone import create_unsafe_zone
from app.models.incident import create_incident


def seed_database():
    """Insert mock data into MongoDB."""
    client = MongoClient(Config.MONGO_URI)
    # Extract database name from URI or use fallback
    db_name = Config.MONGO_URI.split("/")[-1].split("?")[0] or "women_safety"
    db = client[db_name]

    print("Seeding database...")

    # ── 1. Create admin user ──
    try:
        admin_id = create_user(
            db,
            name="Admin",
            email="admin@womensafety.com",
            password="admin123",
            phone="+911234567890",
        )
        db.users.update_one(
            {"_id": admin_id}, {"$set": {"role": "admin"}}
        )
        print(f"  Admin user created: admin@womensafety.com / admin123")
    except Exception:
        print("  Admin user already exists, skipping.")

    # ── 2. Create a test user ──
    try:
        test_user_id = create_user(
            db,
            name="Priya Sharma",
            email="priya@test.com",
            password="test123",
            phone="+919876543210",
        )
        # Add emergency contacts
        db.users.update_one(
            {"_id": test_user_id},
            {"$set": {"emergency_contacts": [
                {"name": "Mom", "phone": "+919111111111", "relation": "Mother"},
                {"name": "Rahul", "phone": "+919222222222", "relation": "Brother"},
            ]}},
        )
        print(f"  Test user created: priya@test.com / test123")
    except Exception:
        print("  Test user already exists, skipping.")
        test_user_id = db.users.find_one({"email": "priya@test.com"})
        test_user_id = test_user_id["_id"] if test_user_id else None

    # ── 3. Create unsafe zones (Delhi/NCR area) ──
    zones = [
        ("Isolated Underpass - Sector 15", 77.0369, 28.5707, 300, 0.85),
        ("Dark Alley - Old Delhi", 77.2373, 28.6562, 200, 0.75),
        ("Deserted Road - Noida Sec 62", 77.3640, 28.6271, 400, 0.70),
        ("Lonely Stretch - Dwarka", 77.0421, 28.5921, 350, 0.65),
        ("Unlit Park - Saket", 77.2167, 28.5245, 250, 0.60),
    ]

    for name, lng, lat, radius, risk in zones:
        create_unsafe_zone(db, name, lng, lat, radius, risk, source="manual")
    print(f"  {len(zones)} unsafe zones created.")

    # ── 4. Create sample incidents ──
    if test_user_id:
        incidents = [
            ("harassment", "Verbal harassment near metro station",
             77.2090, 28.6139, "high"),
            ("stalking", "Followed by unknown person for 2 blocks",
             77.2373, 28.6562, "high"),
            ("poor_lighting", "Very dark street, no streetlights",
             77.0369, 28.5707, "medium"),
            ("theft", "Phone snatching attempt near bus stop",
             77.3640, 28.6271, "high"),
            ("harassment", "Cat-calling near market area",
             77.2167, 28.5245, "medium"),
            ("poor_lighting", "Broken streetlights on main road",
             77.0421, 28.5921, "low"),
            ("other", "Suspicious person loitering near school",
             77.2090, 28.6300, "medium"),
        ]

        for inc_type, desc, lng, lat, severity in incidents:
            create_incident(db, str(test_user_id), inc_type, desc,
                            lng, lat, severity)
        print(f"  {len(incidents)} incidents created.")

    print("\nSeed data complete!")
    print("You can now start the server: python run.py")


if __name__ == "__main__":
    seed_database()
