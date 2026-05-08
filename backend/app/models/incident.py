"""
Incident model — MongoDB operations for the 'incidents' collection.

Incidents are user-reported safety concerns (harassment, poor lighting, etc.).
They use GeoJSON Point format so we can run geospatial queries.
"""

from datetime import datetime, timezone
from bson import ObjectId


def create_incident(db, reported_by, incident_type, description,
                    longitude, latitude, severity="medium"):
    """
    Store a new incident report.

    Args:
        db: PyMongo database reference
        reported_by: User ObjectId (string)
        incident_type: One of 'harassment', 'stalking', 'theft', 'poor_lighting', 'other'
        description: Free-text description
        longitude: Float — longitude coordinate
        latitude: Float — latitude coordinate
        severity: 'low', 'medium', or 'high'

    Returns:
        The inserted document's ObjectId
    """
    incident_doc = {
        "reported_by": ObjectId(reported_by),
        "type": incident_type,
        "description": description,
        "location": {
            "type": "Point",
            "coordinates": [longitude, latitude],  # GeoJSON order: [lng, lat]
        },
        "severity": severity,
        "status": "pending",  # pending → verified / dismissed
        "reported_at": datetime.now(timezone.utc),
    }

    result = db.incidents.insert_one(incident_doc)
    return result.inserted_id


def find_incidents_near(db, longitude, latitude, radius_meters=1000, limit=50):
    """
    Find incidents within a given radius of a point.

    Uses MongoDB's $nearSphere which requires a 2dsphere index.

    Args:
        longitude: Center point longitude
        latitude: Center point latitude
        radius_meters: Search radius in meters (default 1 km)
        limit: Maximum results to return

    Returns:
        List of incident documents
    """
    query = {
        "location": {
            "$nearSphere": {
                "$geometry": {
                    "type": "Point",
                    "coordinates": [longitude, latitude],
                },
                "$maxDistance": radius_meters,
            }
        }
    }
    return list(db.incidents.find(query).limit(limit))


def get_incidents_for_heatmap(db, limit=500):
    """
    Get incident locations for rendering a heatmap on the admin dashboard.
    Returns only coordinates and type (lightweight).
    """
    projection = {"location.coordinates": 1, "type": 1, "severity": 1, "_id": 0}
    return list(db.incidents.find({}, projection).limit(limit))
