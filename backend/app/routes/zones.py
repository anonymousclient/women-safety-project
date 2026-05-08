"""
Zone Prediction Routes — ML-powered zone classification endpoints.

Handles:
    POST /api/zones/predict   — Classify a coordinate as safe/unsafe (ML)
    POST /api/zones/train     — Retrain the K-Means model (admin)
    GET  /api/zones/clusters  — Get all detected clusters (admin/map)
"""

from flask import Blueprint, request, jsonify
from app.middleware.auth_middleware import token_required
from app.ai.zone_classifier import (
    predict_zone,
    train_model,
    get_all_clusters,
    is_model_trained,
)

zones_bp = Blueprint("zones", __name__)


@zones_bp.route("/predict", methods=["POST"])
@token_required
def predict(current_user):
    """
    Predict whether a coordinate is in a safe or unsafe zone.

    Uses the trained K-Means clustering model.

    Expected JSON body:
    {
        "latitude": 28.6139,
        "longitude": 77.2090,
        "hour": 23  (optional, defaults to current hour)
    }

    Returns:
    {
        "zone_type": "unsafe",
        "risk_score": 0.82,
        "cluster_id": 2,
        "cluster_center": [28.614, 77.209],
        "cluster_info": { ... }
    }
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400

    latitude = data.get("latitude")
    longitude = data.get("longitude")

    if latitude is None or longitude is None:
        return jsonify({"error": "latitude and longitude are required"}), 400

    hour = data.get("hour")  # Optional

    result = predict_zone(latitude, longitude, hour=hour)

    return jsonify(result), 200


@zones_bp.route("/train", methods=["POST"])
@token_required
def retrain(current_user):
    """
    Retrain the K-Means model.
    Admin-only — call this after adding new crime data.

    Returns training summary with cluster analysis.
    """
    if current_user.get("role") != "admin":
        return jsonify({"error": "Admin access required"}), 403

    summary = train_model()

    # Convert cluster info for JSON serialization
    clusters_json = {}
    for cid, info in summary["clusters"].items():
        clusters_json[str(cid)] = info

    return jsonify({
        "message": "Model retrained successfully",
        "total_records": summary["total_records"],
        "n_clusters": summary["n_clusters"],
        "unsafe_zones": summary["unsafe_zones"],
        "safe_zones": summary["safe_zones"],
        "clusters": clusters_json,
    }), 200


@zones_bp.route("/clusters", methods=["GET"])
@token_required
def list_clusters(current_user):
    """
    Get all detected clusters with their risk info.
    Used by admin dashboard and Flutter app to show zone boundaries on map.
    """
    if not is_model_trained():
        return jsonify({
            "error": "Model not trained yet. POST /api/zones/train first."
        }), 404

    clusters = get_all_clusters()

    # Convert keys to strings for JSON
    clusters_json = {}
    for cid, info in clusters.items():
        clusters_json[str(cid)] = info

    return jsonify({
        "clusters": clusters_json,
        "total": len(clusters_json),
    }), 200
