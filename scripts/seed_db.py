"""
Seed Database Script.
Run this to populate MongoDB with initial demo data.
"""
import sys
import os
from datetime import datetime, timezone

# ── IMPORTANT: Change working directory to 'backend' ──
# This ensures that relative paths for .env and firebase-credentials.json work correctly.
backend_dir = os.path.join(os.path.dirname(__file__), "..", "backend")
os.chdir(backend_dir)
sys.path.append(".")

from app import create_app, mongo

def seed():
    app = create_app()
    with app.app_context():
        # Re-import mongo to ensure it is the initialized one from create_app()
        from app import mongo
        
        print("Seeding database...")
        
        # Add a demo admin user
        admin_email = "admin@safeher.com"
        admin_exists = mongo.users.find_one({"email": admin_email})
        
        if not admin_exists:
            mongo.users.insert_one({
                "name": "Admin User",
                "email": admin_email,
                "phone": "+1234567890",
                "role": "admin",
                "created_at": datetime.now(timezone.utc)
            })
            print(f"Admin user ({admin_email}) created.")
        else:
            print(f"Admin user ({admin_email}) already exists.")

        # Add some mock incidents for the AI to analyze
        if mongo.incidents.count_documents({}) == 0:
            mock_incidents = [
                {"type": "Harassment", "severity": "medium", "location": {"type": "Point", "coordinates": [77.2090, 28.6139]}, "reported_at": datetime.now(timezone.utc)},
                {"type": "Theft", "severity": "low", "location": {"type": "Point", "coordinates": [77.2373, 28.6562]}, "reported_at": datetime.now(timezone.utc)},
                {"type": "Assault", "severity": "high", "location": {"type": "Point", "coordinates": [77.0369, 28.5707]}, "reported_at": datetime.now(timezone.utc)},
            ]
            mongo.incidents.insert_many(mock_incidents)
            print(f"Inserted {len(mock_incidents)} mock incidents.")

        print("Seeding complete!")

if __name__ == "__main__":
    seed()
