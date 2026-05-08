"""
Unsafe Zone model — MongoDB operations for the 'unsafe_zones' collection.

Unsafe zones are areas flagged as risky based on incident clustering
(AI-detected) or manual reports from authorities.
"""

from datetime import datetime, timezone
from bson import ObjectId


def create_unsafe_zone(db, name, longitude, latitude, radius_meters,
                       risk_level, source="manual"):
    """
    Create or update an unsafe zone.

    Args:
        name: Human-readable zone name (e.g., 'Sector 15 Underpass')
        longitude, latitude: Center of the zone
        radius_meters: Zone radius
        risk_level: Float 0.0 to 1.0
        source: 'ai_detected', 'manual', or 'authority_reported'

    Returns:
        Inserted document ObjectId
    """
    # Determine risk category from the numeric level
    if risk_level >= 0.8:
        category = "critical"
    elif risk_level >= 0.6:
        category = "high"
    elif risk_level >= 0.4:
        category = "moderate"
    else:
        category = "low"

    zone_doc = {
        "name": name,
        "location": {
            "type": "Point",
            "coordinates": [longitude, latitude],
        },
        "radius_meters": radius_meters,
        "risk_level": risk_level,
        "risk_category": category,
        "incident_count": 0,
        "source": source,
        "is_active": True,
        "last_calculated": datetime.now(timezone.utc),
        "created_at": datetime.now(timezone.utc),
    }

    result = db.unsafe_zones.insert_one(zone_doc)
    return result.inserted_id


def find_zones_near(db, longitude, latitude, radius_meters=5000):
    """
    Find all active unsafe zones near a given point.

    Args:
        longitude, latitude: Center point
        radius_meters: Search radius (default 5 km)

    Returns:
        List of unsafe zone documents
    """
    query = {
        "is_active": True,
        "location": {
            "$nearSphere": {
                "$geometry": {
                    "type": "Point",
                    "coordinates": [longitude, latitude],
                },
                "$maxDistance": radius_meters,
            }
        },
    }
    return list(db.unsafe_zones.find(query))


def get_all_active_zones(db):
    """Get all active unsafe zones (for admin dashboard map)."""
    return list(db.unsafe_zones.find({"is_active": True}))


def update_zone_risk(db, zone_id, new_risk_level, incident_count):
    """Update the risk level of an existing zone (called by AI module)."""
    if new_risk_level >= 0.8:
        category = "critical"
    elif new_risk_level >= 0.6:
        category = "high"
    elif new_risk_level >= 0.4:
        category = "moderate"
    else:
        category = "low"

    db.unsafe_zones.update_one(
        {"_id": ObjectId(zone_id)},
        {
            "$set": {
                "risk_level": new_risk_level,
                "risk_category": category,
                "incident_count": incident_count,
                "last_calculated": datetime.now(timezone.utc),
            }
        },
    )
