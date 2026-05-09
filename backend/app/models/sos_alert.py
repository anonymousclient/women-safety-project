"""
SOS Alert model — MongoDB operations for the 'sos_alerts' collection.

An SOS alert is created when a user triggers the emergency button.
It tracks the trigger location, notified contacts, and resolution status.
"""

from datetime import datetime, timezone
from bson import ObjectId


def create_sos_alert(db, user_id, longitude, latitude, address=""):
    """
    Create a new active SOS alert.

    Args:
        db: PyMongo database reference
        user_id: The user who triggered the SOS
        longitude: Trigger location longitude
        latitude: Trigger location latitude
        address: Human-readable address (optional)

    Returns:
        The inserted document's ObjectId (string)
    """
    alert_doc = {
        "user_id": ObjectId(user_id),
        "trigger_location": {
            "type": "Point",
            "coordinates": [longitude, latitude],
        },
        "trigger_address": address,
        "status": "active",  # active → resolved / cancelled
        "contacts_notified": [],
        "resolved_by": None,
        "resolution_notes": "",
        "triggered_at": datetime.now(timezone.utc),
        "resolved_at": None,
        "cancelled_at": None,
    }

    result = db.sos_alerts.insert_one(alert_doc)
    return str(result.inserted_id)


def get_active_alerts(db):
    """Get all currently active SOS alerts with user info and emergency contacts."""
    pipeline = [
        {"$match": {"status": "active"}},
        {"$sort": {"triggered_at": -1}},
        {
            "$lookup": {
                "from": "users",
                "localField": "user_id",
                "foreignField": "_id",
                "as": "user_info",
            }
        },
        {"$unwind": "$user_info"},
        {
            "$lookup": {
                "from": "trusted_contacts",
                "localField": "user_id",
                "foreignField": "user_id",
                "as": "emergency_contacts"
            }
        },
        {
            "$project": {
                "trigger_location": 1,
                "trigger_address": 1,
                "triggered_at": 1,
                "status": 1,
                "user_info.name": 1,
                "user_info.phone": 1,
                "user_info.email": 1,
                "user_info.address": 1,
                "emergency_contacts": 1
            }
        },
    ]
    return list(db.sos_alerts.aggregate(pipeline))


def resolve_alert(db, alert_id, resolved_by, notes=""):
    """Mark an SOS alert as resolved."""
    db.sos_alerts.update_one(
        {"_id": ObjectId(alert_id)},
        {
            "$set": {
                "status": "resolved",
                "resolved_by": ObjectId(resolved_by),
                "resolution_notes": notes,
                "resolved_at": datetime.now(timezone.utc),
            }
        },
    )


def cancel_alert(db, alert_id):
    """Mark an SOS alert as cancelled by the user."""
    db.sos_alerts.update_one(
        {"_id": ObjectId(alert_id)},
        {
            "$set": {
                "status": "cancelled",
                "cancelled_at": datetime.now(timezone.utc),
            }
        },
    )


def add_notified_contact(db, alert_id, name, phone, sms_sent=True):
    """Record that an emergency contact was notified for this SOS."""
    contact_record = {
        "name": name,
        "phone": phone,
        "sms_sent": sms_sent,
        "notified_at": datetime.now(timezone.utc),
    }
    db.sos_alerts.update_one(
        {"_id": ObjectId(alert_id)},
        {"$push": {"contacts_notified": contact_record}},
    )


def get_user_sos_history(db, user_id, limit=20):
    """Get a user's past SOS alerts, most recent first."""
    return list(
        db.sos_alerts.find({"user_id": ObjectId(user_id)})
        .sort("triggered_at", -1)
        .limit(limit)
    )
