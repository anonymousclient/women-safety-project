"""
Migration script to move emergency contacts from 'users' collection 
to the new 'trusted_contacts' collection.
"""

import os
from pymongo import MongoClient
from bson import ObjectId
from datetime import datetime, timezone
from dotenv import load_dotenv

# Load environment variables
dotenv_path = os.path.join(os.path.dirname(__file__), '..', 'backend', '.env')
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path)
else:
    load_dotenv() # Fallback to current dir

MONGO_URI = os.getenv("MONGO_URI")
if not MONGO_URI:
    print("Error: MONGO_URI not found in .env")
    exit(1)

def migrate():
    client = MongoClient(MONGO_URI)
    # Extract database name from URI
    try:
        db = client.get_default_database()
    except Exception:
        db = client["women_safety"]
        
    print(f"Connecting to database: {db.name}")
    
    users_with_contacts = db.users.find({"emergency_contacts": {"$exists": True, "$not": {"$size": 0}}})
    
    total_migrated = 0
    
    for user in users_with_contacts:
        user_id = user["_id"]
        contacts = user.get("emergency_contacts", [])
        
        print(f"Found {len(contacts)} contacts for user: {user.get('email')}")
        
        for c in contacts:
            # Check if already migrated
            existing = db.trusted_contacts.find_one({
                "user_id": user_id,
                "phone": c.get("phone")
            })
            
            if not existing:
                trusted_contact = {
                    "user_id": user_id,
                    "name": c.get("name"),
                    "phone": c.get("phone"),
                    "address": c.get("address", ""),
                    "relation": c.get("relation", "Contact"),
                    "created_at": datetime.now(timezone.utc)
                }
                db.trusted_contacts.insert_one(trusted_contact)
                total_migrated += 1
            else:
                print(f"  Contact {c.get('phone')} already exists in trusted_contacts")
                
    print(f"Migration complete. Total contacts migrated: {total_migrated}")

if __name__ == "__main__":
    migrate()
