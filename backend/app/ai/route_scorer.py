"""
Route Risk Scorer — AI Module (Enhanced with ML).

Scores routes using a HYBRID approach (two layers):

Layer 1 — Heuristic scoring (original):
    risk = w1 * incident_density + w2 * time_factor + w3 * zone_risk

Layer 2 — ML scoring (new):
    K-Means zone classifier predicts safe/unsafe for each route point

Final score = 0.6 * heuristic + 0.4 * ml_score

Why hybrid?
- Heuristic layer uses live MongoDB data (incidents, zones) — always fresh
- ML layer uses trained model on historical patterns — catches trends
- Together they're more robust than either alone
- Easy to explain in viva: "We combine real-time data with ML predictions"

The scoring formula:
    heuristic = w1 * incident_density + w2 * time_factor + w3 * zone_risk
    ml_score  = average K-Means risk score across sampled route points
    final     = 0.6 * heuristic + 0.4 * ml_score

Weights:
    w1=0.5 (incident density), w2=0.3 (time of day), w3=0.2 (zone risk)
"""

from datetime import datetime, timezone
import math
import logging

logger = logging.getLogger(__name__)

# ── Tunable weights for heuristic scoring (must sum to 1.0) ──
W_INCIDENT = 0.5
W_TIME = 0.3
W_ZONE = 0.2

# ── Blend weights between heuristic and ML ──
W_HEURISTIC = 0.6
W_ML = 0.4

# Maximum incidents before the density score saturates at 1.0
MAX_INCIDENT_COUNT = 20

# Buffer distance (meters) to search for incidents near a route point
BUFFER_METERS = 500


def score_route(db, route_points, timestamp=None):
    """
    Score a single route for safety risk using hybrid approach.

    Args:
        db: MongoDB database reference
        route_points: List of [longitude, latitude] coordinate pairs
            representing the route polyline
        timestamp: datetime object for time-aware scoring
            (defaults to current UTC time)

    Returns:
        dict with:
            - risk_score: float 0.0 (safest) to 1.0 (most dangerous)
            - risk_label: 'Safe', 'Moderate', or 'Risky'
            - breakdown: individual factor scores for transparency
    """
    if timestamp is None:
        timestamp = datetime.now(timezone.utc)

    # ── Layer 1: Heuristic scoring (live data from MongoDB) ──
    incident_score = _calculate_incident_density(db, route_points)
    time_score = _calculate_time_factor(timestamp)
    zone_score = _calculate_zone_risk(db, route_points)

    heuristic_score = (
        W_INCIDENT * incident_score
        + W_TIME * time_score
        + W_ZONE * zone_score
    )

    # ── Layer 2: ML scoring (K-Means zone classifier) ──
    ml_score = _calculate_ml_risk(route_points, timestamp)

    # ── Combine both layers ──
    risk_score = W_HEURISTIC * heuristic_score + W_ML * ml_score
    risk_score = max(0.0, min(1.0, risk_score))

    # Assign a human-readable label
    if risk_score < 0.35:
        risk_label = "Safe"
    elif risk_score < 0.65:
        risk_label = "Moderate"
    else:
        risk_label = "Risky"

    return {
        "risk_score": round(risk_score, 3),
        "risk_label": risk_label,
        "breakdown": {
            "incident_density": round(incident_score, 3),
            "time_factor": round(time_score, 3),
            "zone_risk": round(zone_score, 3),
            "heuristic_total": round(heuristic_score, 3),
            "ml_zone_score": round(ml_score, 3),
        },
    }


def score_multiple_routes(db, routes_with_points, timestamp=None):
    """
    Score multiple routes and return them sorted safest-first.

    Args:
        routes_with_points: List of dicts, each with a 'points' key
            containing [[lng, lat], ...] coordinates
        timestamp: Optional datetime for time-aware scoring

    Returns:
        The same list of route dicts, each enriched with risk_score,
        risk_label, and breakdown, sorted by risk_score ascending
    """
    for route in routes_with_points:
        scoring = score_route(db, route["points"], timestamp)
        route.update(scoring)

    # Sort by risk score (safest first)
    routes_with_points.sort(key=lambda r: r["risk_score"])
    return routes_with_points


# ────────────────────────────────────────────────────────────
# ML-based scoring (NEW — K-Means zone classifier)
# ────────────────────────────────────────────────────────────

def _calculate_ml_risk(route_points, timestamp):
    """
    Use the trained K-Means model to predict risk along the route.

    Samples points along the route, classifies each through the
    ML model, and returns the average risk score.
    """
    if not route_points:
        return 0.0

    try:
        from app.ai.zone_classifier import get_risk_score

        hour = timestamp.hour if timestamp else None
        risk_scores = []

        # Sample every 3rd point for ML prediction
        sample_points = route_points[::3] or [route_points[0]]

        for point in sample_points:
            lng, lat = point[0], point[1]
            score = get_risk_score(lat, lng, hour=hour)
            risk_scores.append(score)

        if not risk_scores:
            return 0.0

        return sum(risk_scores) / len(risk_scores)

    except Exception as e:
        logger.warning(f"ML scoring unavailable, using 0.3 fallback: {e}")
        return 0.3


# ────────────────────────────────────────────────────────────
# Heuristic scoring (original — live MongoDB data)
# ────────────────────────────────────────────────────────────

def _calculate_incident_density(db, route_points):
    """
    Count incidents near the route and normalize to 0.0-1.0.

    We sample every 5th point on the route to avoid querying
    for every single coordinate (performance optimization).
    """
    if not route_points:
        return 0.0

    total_incidents = 0
    # Sample points along the route (every 5th point)
    sample_points = route_points[::5] or [route_points[0]]

    for point in sample_points:
        lng, lat = point[0], point[1]
        count = db.incidents.count_documents({
            "location": {
                "$nearSphere": {
                    "$geometry": {
                        "type": "Point",
                        "coordinates": [lng, lat],
                    },
                    "$maxDistance": BUFFER_METERS,
                }
            }
        })
        total_incidents += count

    # Average per sample point, then normalize
    avg_incidents = total_incidents / len(sample_points)
    return min(1.0, avg_incidents / MAX_INCIDENT_COUNT)


def _calculate_time_factor(timestamp):
    """
    Return a risk factor based on time of day.

    Night hours (8 PM to 6 AM) are considered riskier.
    Returns 0.2 for daytime, 0.8 for nighttime,
    with a smooth transition during dusk (6-8 PM) and dawn (5-6 AM).
    """
    hour = timestamp.hour

    if 8 <= hour < 18:
        # Broad daylight — low risk
        return 0.2
    elif 20 <= hour or hour < 5:
        # Deep night — high risk
        return 0.8
    elif 18 <= hour < 20:
        # Dusk transition (6 PM - 8 PM) — linearly increasing
        return 0.2 + 0.6 * ((hour - 18) / 2)
    else:
        # Dawn transition (5 AM - 8 AM) — linearly decreasing
        return 0.8 - 0.6 * ((hour - 5) / 3)


def _calculate_zone_risk(db, route_points):
    """
    Check if the route passes through any known unsafe zones.
    Returns the average risk level of intersecting zones.
    """
    if not route_points:
        return 0.0

    zone_risks = []
    # Sample fewer points for zone checks
    sample_points = route_points[::10] or [route_points[0]]

    for point in sample_points:
        lng, lat = point[0], point[1]
        zones = list(db.unsafe_zones.find({
            "is_active": True,
            "location": {
                "$nearSphere": {
                    "$geometry": {
                        "type": "Point",
                        "coordinates": [lng, lat],
                    },
                    "$maxDistance": 1000,  # 1 km check radius
                }
            },
        }))

        for zone in zones:
            # Check if the point is actually within the zone's radius
            zone_coords = zone["location"]["coordinates"]
            distance = _haversine(lng, lat, zone_coords[0], zone_coords[1])
            if distance <= zone.get("radius_meters", 500):
                zone_risks.append(zone.get("risk_level", 0.5))

    if not zone_risks:
        return 0.0

    return sum(zone_risks) / len(zone_risks)


def _haversine(lon1, lat1, lon2, lat2):
    """
    Calculate the distance in meters between two GPS coordinates
    using the Haversine formula.
    """
    R = 6371000  # Earth's radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c
