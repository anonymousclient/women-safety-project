"""
Unsafe Zone Predictor — AI Module.

Analyzes incident reports and automatically detects clusters
of incidents to flag as unsafe zones.

Algorithm: Simple density-based clustering.
For a college project, we use a straightforward approach:
1. Divide the area into grid cells
2. Count incidents per cell
3. Flag cells exceeding a threshold as unsafe zones

Note: For production, you'd use DBSCAN from scikit-learn,
but this approach is easier to explain in a viva and has
zero extra dependencies.
"""

import math
from datetime import datetime, timezone
from app.models.unsafe_zone import create_unsafe_zone


# ── Configuration ──
GRID_SIZE_METERS = 500  # Size of each grid cell
MIN_INCIDENTS_FOR_ZONE = 3  # Minimum incidents to flag a zone as unsafe


def analyze_and_create_zones(db):
    """
    Scan all incidents, cluster them geographically, and create/update
    unsafe zones in the database.

    This function is meant to be called periodically (e.g., daily)
    or after a new batch of incident reports.

    Returns:
        Number of new zones created
    """
    # Fetch all incidents
    incidents = list(db.incidents.find({}, {"location": 1, "severity": 1}))
    if not incidents:
        return 0

    # ── Step 1: Group incidents into grid cells ──
    grid = {}  # key: (grid_x, grid_y), value: list of incidents
    for incident in incidents:
        coords = incident["location"]["coordinates"]
        lng, lat = coords[0], coords[1]
        grid_key = _to_grid_key(lng, lat)

        if grid_key not in grid:
            grid[grid_key] = []
        grid[grid_key].append(incident)

    # ── Step 2: Identify cells that exceed the incident threshold ──
    zones_created = 0
    for grid_key, cell_incidents in grid.items():
        if len(cell_incidents) >= MIN_INCIDENTS_FOR_ZONE:
            # Calculate the center of the cluster
            avg_lng = sum(
                i["location"]["coordinates"][0] for i in cell_incidents
            ) / len(cell_incidents)
            avg_lat = sum(
                i["location"]["coordinates"][1] for i in cell_incidents
            ) / len(cell_incidents)

            # Calculate risk level based on count and severity
            risk_level = _calculate_cluster_risk(cell_incidents)

            # Check if a zone already exists nearby
            existing = list(db.unsafe_zones.find({
                "location": {
                    "$nearSphere": {
                        "$geometry": {
                            "type": "Point",
                            "coordinates": [avg_lng, avg_lat],
                        },
                        "$maxDistance": GRID_SIZE_METERS,
                    }
                }
            }))

            if not existing:
                # Create a new unsafe zone
                create_unsafe_zone(
                    db,
                    name=f"Auto-detected Zone ({avg_lat:.4f}, {avg_lng:.4f})",
                    longitude=avg_lng,
                    latitude=avg_lat,
                    radius_meters=GRID_SIZE_METERS,
                    risk_level=risk_level,
                    source="ai_detected",
                )
                zones_created += 1

    return zones_created


def recalculate_zone_risk(db, longitude, latitude):
    """
    Recalculate risk for zones near a newly reported incident.
    Called automatically when a new incident is reported.

    Args:
        db: MongoDB database reference
        longitude, latitude: Location of the new incident
    """
    # Find zones within 1 km of the new incident
    nearby_zones = list(db.unsafe_zones.find({
        "is_active": True,
        "location": {
            "$nearSphere": {
                "$geometry": {
                    "type": "Point",
                    "coordinates": [longitude, latitude],
                },
                "$maxDistance": 1000,
            }
        },
    }))

    for zone in nearby_zones:
        zone_coords = zone["location"]["coordinates"]
        radius = zone.get("radius_meters", 500)

        # Count incidents within this zone's radius
        incident_count = db.incidents.count_documents({
            "location": {
                "$nearSphere": {
                    "$geometry": {
                        "type": "Point",
                        "coordinates": zone_coords,
                    },
                    "$maxDistance": radius,
                }
            }
        })

        # Recalculate risk level
        new_risk = min(1.0, incident_count / 15)  # saturates at 15 incidents
        from app.models.unsafe_zone import update_zone_risk
        update_zone_risk(db, str(zone["_id"]), new_risk, incident_count)


# ────────────────────────────────────────────────────────────
# Private helper functions
# ────────────────────────────────────────────────────────────

def _to_grid_key(longitude, latitude):
    """
    Convert a GPS coordinate to a grid cell key.

    Approximation: 1 degree latitude ≈ 111,000 meters
    We divide the earth into cells of GRID_SIZE_METERS.
    """
    lat_cell = int(latitude * 111000 / GRID_SIZE_METERS)
    # Longitude degrees vary by latitude, so we adjust
    lng_meters_per_degree = 111000 * math.cos(math.radians(latitude))
    lng_cell = int(longitude * lng_meters_per_degree / GRID_SIZE_METERS)
    return (lng_cell, lat_cell)


def _calculate_cluster_risk(incidents):
    """
    Calculate a risk level (0.0 to 1.0) for a cluster of incidents.

    Uses count and severity weighting:
    - high severity = 1.0
    - medium severity = 0.6
    - low severity = 0.3
    """
    severity_weights = {"high": 1.0, "medium": 0.6, "low": 0.3}
    total_weight = sum(
        severity_weights.get(i.get("severity", "medium"), 0.6)
        for i in incidents
    )
    # Normalize: max risk at 10+ weighted incidents
    return min(1.0, total_weight / 10)
