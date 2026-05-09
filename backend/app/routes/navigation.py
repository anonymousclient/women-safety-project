"""
Navigation Routes.

Handles:
    POST /api/get-safe-route        — Get risk-scored safe routes
    GET  /api/nearby-safe-places    — Find nearby police, hospitals, shelters
"""

from flask import Blueprint, request, jsonify, current_app
from app import mongo
from app.middleware.auth_middleware import token_required
from app.ai.route_scorer import score_route
from app.models.incident import find_incidents_near

import requests

nav_bp = Blueprint("navigation", __name__)


@nav_bp.route("/get-safe-route", methods=["POST"])
@token_required
def get_safe_route(current_user):
    """
    Get safety-scored routes between two points.

    This endpoint:
    1. Fetches alternate routes from Google Maps Directions API
    2. Scores each route using the AI risk scorer
    3. Returns routes sorted safest-first with risk labels

    Expected JSON body:
    {
        "origin_lat": 28.6139,
        "origin_lng": 77.2090,
        "dest_lat": 28.5355,
        "dest_lng": 77.2100
    }

    If Google Maps API key is not configured, returns mock routes
    with risk scoring applied.
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400

    origin_lat = data.get("origin_lat")
    origin_lng = data.get("origin_lng")
    dest_lat = data.get("dest_lat")
    dest_lng = data.get("dest_lng")

    if not all([origin_lat, origin_lng, dest_lat, dest_lng]):
        return jsonify({
            "error": "origin_lat, origin_lng, dest_lat, dest_lng are required"
        }), 400

    api_key = current_app.config.get("GOOGLE_MAPS_API_KEY", "")

    # ── Handle points provided by frontend (e.g. from OSRM) ──
    input_points = data.get("points")
    if input_points:
        routes = [{
            "summary": "AI Safe Route",
            "distance": data.get("distance", "Unknown"),
            "duration": data.get("duration", "Unknown"),
            "points": input_points
        }]
    elif api_key:
        # ── Fetch real routes from Google Maps ──
        routes = _fetch_google_routes(
            origin_lat, origin_lng, dest_lat, dest_lng, api_key
        )
    else:
        # ── Use mock routes for demo ──
        routes = _generate_mock_routes(
            origin_lat, origin_lng, dest_lat, dest_lng
        )

    # ── Score each route with the AI module ──
    scored_routes = []
    for i, route in enumerate(routes):
        scoring = score_route(mongo, route["points"])
        scored_routes.append({
            "route_index": i,
            "summary": route.get("summary", f"Route {i + 1}"),
            "distance": route.get("distance", "N/A"),
            "duration": route.get("duration", "N/A"),
            "risk_score": scoring["risk_score"],
            "risk_label": scoring["risk_label"],
            "risk_breakdown": scoring["breakdown"],
            "points": route["points"],  # Polyline coordinates
        })

    # Sort safest first
    scored_routes.sort(key=lambda r: r["risk_score"])

    return jsonify({
        "routes": scored_routes,
        "total_routes": len(scored_routes),
    }), 200


@nav_bp.route("/nearby-safe-places", methods=["GET"])
@token_required
def nearby_safe_places(current_user):
    """
    Find nearby safe places (police stations, hospitals, shelters).

    Query parameters:
        lat: latitude (required)
        lng: longitude (required)
        radius: search radius in meters (default 2000)
        type: place type - 'police', 'hospital', 'all' (default 'all')

    If Google Maps API key is not configured, returns mock data.
    """
    lat = request.args.get("lat", type=float)
    lng = request.args.get("lng", type=float)
    radius = request.args.get("radius", default=2000, type=int)
    place_type = request.args.get("type", default="all")

    if lat is None or lng is None:
        return jsonify({"error": "lat and lng query parameters are required"}), 400

    api_key = current_app.config.get("GOOGLE_MAPS_API_KEY", "")

    if api_key:
        places = _fetch_google_places(lat, lng, radius, place_type, api_key)
    else:
        places = _generate_mock_places(lat, lng)

    return jsonify({
        "places": places,
        "count": len(places),
        "search_center": {"lat": lat, "lng": lng},
        "search_radius_meters": radius,
    }), 200


@nav_bp.route("/safety-rating", methods=["GET"])
@token_required
def get_safety_rating(current_user):
    """
    Calculate dynamic safety rating for current location.
    
    Query params: lat, lng
    """
    lat = request.args.get("lat", type=float)
    lng = request.args.get("lng", type=float)
    
    if lat is None or lng is None:
        return jsonify({"error": "lat and lng are required"}), 400

    # 1. Check for unsafe zones within 1km
    unsafe_zones = list(mongo.unsafe_zones.find({
        "location": {
            "$near": {
                "$geometry": {"type": "Point", "coordinates": [lng, lat]},
                "$maxDistance": 1000
            }
        }
    }))
    
    # 2. Check for active SOS alerts within 2km
    active_sos = list(mongo.sos_alerts.find({
        "status": "active",
        "trigger_location": {
            "$near": {
                "$geometry": {"type": "Point", "coordinates": [lng, lat]},
                "$maxDistance": 2000
            }
        }
    }))
    
    # Simple heuristic for demo
    base_score = 95
    reduction = (len(unsafe_zones) * 10) + (len(active_sos) * 20)
    final_score = max(5, base_score - reduction)
    
    status = "Safe"
    if final_score < 40:
        status = "High Alert Zone"
    elif final_score < 75:
        status = "Moderate Risk Area"
        
    return jsonify({
        "score": final_score,
        "status": status,
        "unsafe_zones_count": len(unsafe_zones),
        "active_sos_count": len(active_sos)
    }), 200


# ────────────────────────────────────────────────────────────
# Google Maps Integration
# ────────────────────────────────────────────────────────────

def _fetch_google_routes(origin_lat, origin_lng, dest_lat, dest_lng, api_key):
    """Fetch routes from Google Maps Directions API."""
    url = "https://maps.googleapis.com/maps/api/directions/json"
    params = {
        "origin": f"{origin_lat},{origin_lng}",
        "destination": f"{dest_lat},{dest_lng}",
        "alternatives": "true",  # Request multiple routes
        "mode": "walking",
        "key": api_key,
    }

    try:
        response = requests.get(url, params=params, timeout=10)
        data = response.json()

        if data.get("status") != "OK":
            current_app.logger.warning(
                f"Google Directions API error: {data.get('status')}"
            )
            return _generate_mock_routes(
                origin_lat, origin_lng, dest_lat, dest_lng
            )

        routes = []
        for route in data.get("routes", []):
            leg = route["legs"][0]
            # Extract route points from the encoded polyline
            points = _decode_polyline(
                route["overview_polyline"]["points"]
            )
            routes.append({
                "summary": route.get("summary", ""),
                "distance": leg["distance"]["text"],
                "duration": leg["duration"]["text"],
                "points": points,
            })

        return routes

    except Exception as e:
        current_app.logger.error(f"Google Maps API error: {e}")
        return _generate_mock_routes(
            origin_lat, origin_lng, dest_lat, dest_lng
        )


def _fetch_google_places(lat, lng, radius, place_type, api_key):
    """Fetch nearby places from Google Maps Places API."""
    url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"

    # Map our types to Google's place types
    type_mapping = {
        "police": "police",
        "hospital": "hospital",
        "all": "police|hospital",
    }
    google_type = type_mapping.get(place_type, "police|hospital")

    params = {
        "location": f"{lat},{lng}",
        "radius": radius,
        "type": google_type,
        "key": api_key,
    }

    try:
        response = requests.get(url, params=params, timeout=10)
        data = response.json()

        places = []
        for result in data.get("results", []):
            loc = result["geometry"]["location"]
            places.append({
                "name": result["name"],
                "address": result.get("vicinity", ""),
                "type": _classify_place_type(result.get("types", [])),
                "latitude": loc["lat"],
                "longitude": loc["lng"],
                "rating": result.get("rating", 0),
                "is_open": result.get("opening_hours", {}).get(
                    "open_now", None
                ),
            })

        return places

    except Exception as e:
        current_app.logger.error(f"Google Places API error: {e}")
        return _generate_mock_places(lat, lng)


def _classify_place_type(types):
    """Classify a Google place type into our categories."""
    if "police" in types:
        return "police_station"
    elif "hospital" in types:
        return "hospital"
    else:
        return "safe_place"


def _decode_polyline(encoded):
    """
    Decode a Google Maps encoded polyline string into a list
    of [longitude, latitude] coordinates.

    Reference: https://developers.google.com/maps/documentation/utilities/polylinealgorithm
    """
    points = []
    index, lat, lng = 0, 0, 0

    while index < len(encoded):
        # Decode latitude
        shift, result = 0, 0
        while True:
            b = ord(encoded[index]) - 63
            index += 1
            result |= (b & 0x1F) << shift
            shift += 5
            if b < 0x20:
                break
        lat += (~(result >> 1) if result & 1 else (result >> 1))

        # Decode longitude
        shift, result = 0, 0
        while True:
            b = ord(encoded[index]) - 63
            index += 1
            result |= (b & 0x1F) << shift
            shift += 5
            if b < 0x20:
                break
        lng += (~(result >> 1) if result & 1 else (result >> 1))

        # GeoJSON order: [longitude, latitude]
        points.append([lng / 1e5, lat / 1e5])

    return points


# ────────────────────────────────────────────────────────────
# Mock Data (used when Google Maps API key is not configured)
# ────────────────────────────────────────────────────────────

def _generate_mock_routes(origin_lat, origin_lng, dest_lat, dest_lng):
    """
    Generate 3 mock routes between two points.
    These are simple interpolated paths with slight offsets
    to simulate alternate routes.
    """
    steps = 10
    routes = []

    # Offsets to create 3 visually different routes
    offsets = [
        (0, 0),          # Direct route
        (0.005, 0.003),  # Slight north-east detour
        (-0.003, 0.005), # Slight south-east detour
    ]

    for idx, (lat_off, lng_off) in enumerate(offsets):
        points = []
        for i in range(steps + 1):
            t = i / steps
            # Linear interpolation with a midpoint offset
            mid_factor = 4 * t * (1 - t)  # Peaks at 0.5
            lat = origin_lat + t * (dest_lat - origin_lat) + mid_factor * lat_off
            lng = origin_lng + t * (dest_lng - origin_lng) + mid_factor * lng_off
            points.append([lng, lat])  # GeoJSON order: [lng, lat]

        routes.append({
            "summary": f"Mock Route {idx + 1}",
            "distance": f"{1.5 + idx * 0.3:.1f} km",
            "duration": f"{15 + idx * 5} mins",
            "points": points,
        })

    return routes


def _generate_mock_places(lat, lng):
    """
    Generate mock safe places near the given coordinates.
    Used for demo when Google Places API is not available.
    """
    return [
        {
            "name": "City Police Station",
            "address": "Main Road, Near Market",
            "type": "police_station",
            "latitude": lat + 0.005,
            "longitude": lng + 0.003,
            "rating": 4.2,
            "is_open": True,
        },
        {
            "name": "District Hospital",
            "address": "Hospital Road, Sector 12",
            "type": "hospital",
            "latitude": lat - 0.003,
            "longitude": lng + 0.006,
            "rating": 3.8,
            "is_open": True,
        },
        {
            "name": "Women's Help Center",
            "address": "NGO Complex, Civil Lines",
            "type": "safe_place",
            "latitude": lat + 0.008,
            "longitude": lng - 0.004,
            "rating": 4.5,
            "is_open": True,
        },
        {
            "name": "Railway Police Post",
            "address": "Railway Station, Platform 1",
            "type": "police_station",
            "latitude": lat - 0.006,
            "longitude": lng - 0.002,
            "rating": 3.5,
            "is_open": True,
        },
    ]
