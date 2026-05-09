from pymongo import MongoClient
import os
from dotenv import load_dotenv
from bson import ObjectId
from datetime import datetime

# Load environment variables
load_dotenv(dotenv_path="../backend/.env")

MONGO_URI = os.getenv("MONGO_URI")
client = MongoClient(MONGO_URI)
db = client.get_default_database()

def seed_demo_user():
    # User data to set
    user_email = "anonymoustyper2000@gmail.com"
    demo_user = {
        "name": "Dishan Sheikh",
        "email": user_email,
        "phone": "9797687823",
        "address": "Indore",
        "role": "user",
        "is_active": True,
        "email_verified": True,
        "created_at": datetime.utcnow(),
        "sos_status": "Inactive",
        "last_active": "Just now",
        "emergency_contacts": [
            {
                "id": str(ObjectId()),
                "name": "Divyansh Verma",
                "phone": "9897896456",
                "relation": "Friend",
                "address": "Bhopal"
            }
        ]
    }

    # Check if user exists
    existing_user = db.users.find_one({"email": user_email})
    if existing_user:
        print(f"Updating existing user: {user_email}")
        db.users.update_one({"email": user_email}, {"$set": demo_user})
    else:
        print(f"Creating new demo user: {user_email}")
        # Note: In a real scenario, you'd need a password_hash here for login
        # For demo purposes, we assume the user already exists or we just seed the profile
        db.users.insert_one(demo_user)

    print("Demo user seeded successfully!")

if __name__ == "__main__":
    seed_demo_user()
