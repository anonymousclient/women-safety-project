"""
Zone Classifier — ML-Powered Unsafe Zone Detection using K-Means.

This module:
1. Loads crime data (CSV or MongoDB)
2. Trains a K-Means clustering model to group crime hotspots
3. Labels each cluster as safe/unsafe based on average crime rate
4. Provides a predict function to classify any GPS coordinate
5. Saves/loads the trained model for reuse

Algorithm: K-Means Clustering (scikit-learn)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Groups geographic points into K clusters
- Each cluster gets a risk score = average crime_rate of its members
- Clusters with risk > 0.5 → "unsafe", else → "safe"

Why K-Means for viva:
- Easy to explain: "We group nearby crime locations and check
  which groups have the most crime"
- Visual: clusters can be plotted on a map
- Standard ML algorithm that any examiner will recognise
"""

import os
import math
import logging
import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
import joblib

logger = logging.getLogger(__name__)

# ── Paths ──
_BASE_DIR = os.path.dirname(os.path.abspath(__file__))
_DATASET_PATH = os.path.join(_BASE_DIR, "dataset", "crime_data.csv")
_MODEL_PATH = os.path.join(_BASE_DIR, "models", "kmeans_model.pkl")
_SCALER_PATH = os.path.join(_BASE_DIR, "models", "scaler.pkl")
_CLUSTER_INFO_PATH = os.path.join(_BASE_DIR, "models", "cluster_info.pkl")

# ── Configuration ──
N_CLUSTERS = 5       # Number of zones to detect (tune for your data)
UNSAFE_THRESHOLD = 0.5  # Clusters with avg crime_rate > this = unsafe

# ── Cached model (loaded once, reused across requests) ──
_model = None
_scaler = None
_cluster_info = None


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# PUBLIC API
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


def train_model(csv_path=None, n_clusters=N_CLUSTERS):
    """
    Train the K-Means zone classifier on crime data.

    Steps:
        1. Load CSV dataset
        2. Extract features: [latitude, longitude, crime_rate, hour_of_day]
        3. Standardize features (important for K-Means — it uses distances)
        4. Fit K-Means with K clusters
        5. Calculate per-cluster risk stats
        6. Save model + scaler + cluster info to disk

    Args:
        csv_path: Path to the CSV file (default: bundled dataset)
        n_clusters: Number of clusters (default: 5)

    Returns:
        dict with training summary
    """
    global _model, _scaler, _cluster_info

    # ── Step 1: Load data ──
    csv_path = csv_path or _DATASET_PATH
    df = pd.read_csv(csv_path)
    logger.info(f"Loaded {len(df)} records from {csv_path}")

    # ── Step 2: Prepare features ──
    # We use lat/lng for spatial clustering + crime_rate and hour for context
    features = df[["latitude", "longitude", "crime_rate", "hour_of_day"]].values

    # ── Step 3: Standardize ──
    # K-Means is distance-based, so features must be on the same scale.
    # Without this, lat/lng (28.xx, 77.xx) would dominate over
    # crime_rate (0.0-1.0) and hour (0-23).
    scaler = StandardScaler()
    features_scaled = scaler.fit_transform(features)

    # ── Step 4: Fit K-Means ──
    kmeans = KMeans(
        n_clusters=n_clusters,
        random_state=42,       # Reproducible results
        n_init=10,             # Run 10 times, pick best
        max_iter=300,
    )
    df["cluster"] = kmeans.fit_predict(features_scaled)

    # ── Step 5: Calculate cluster statistics ──
    cluster_info = {}
    for cluster_id in range(n_clusters):
        cluster_data = df[df["cluster"] == cluster_id]

        avg_crime_rate = cluster_data["crime_rate"].mean()
        max_crime_rate = cluster_data["crime_rate"].max()
        center_lat = cluster_data["latitude"].mean()
        center_lng = cluster_data["longitude"].mean()
        count = len(cluster_data)

        # Risk score: weighted combination of average and max crime rate
        risk_score = 0.7 * avg_crime_rate + 0.3 * max_crime_rate
        risk_score = min(1.0, risk_score)

        # Classify as safe or unsafe
        zone_type = "unsafe" if risk_score > UNSAFE_THRESHOLD else "safe"

        cluster_info[cluster_id] = {
            "risk_score": round(risk_score, 4),
            "zone_type": zone_type,
            "avg_crime_rate": round(avg_crime_rate, 4),
            "max_crime_rate": round(max_crime_rate, 4),
            "center": [center_lat, center_lng],
            "incident_count": count,
        }

    # ── Step 6: Save everything ──
    os.makedirs(os.path.dirname(_MODEL_PATH), exist_ok=True)
    joblib.dump(kmeans, _MODEL_PATH)
    joblib.dump(scaler, _SCALER_PATH)
    joblib.dump(cluster_info, _CLUSTER_INFO_PATH)

    # Update cached references
    _model = kmeans
    _scaler = scaler
    _cluster_info = cluster_info

    summary = {
        "total_records": len(df),
        "n_clusters": n_clusters,
        "clusters": cluster_info,
        "unsafe_zones": sum(
            1 for c in cluster_info.values() if c["zone_type"] == "unsafe"
        ),
        "safe_zones": sum(
            1 for c in cluster_info.values() if c["zone_type"] == "safe"
        ),
    }

    logger.info(
        f"Model trained: {summary['unsafe_zones']} unsafe zones, "
        f"{summary['safe_zones']} safe zones"
    )
    return summary


def predict_zone(latitude, longitude, crime_rate=None, hour=None):
    """
    Predict whether a GPS coordinate is in a safe or unsafe zone.

    Args:
        latitude: GPS latitude
        longitude: GPS longitude
        crime_rate: Known crime rate at this point (0.0-1.0).
                    If None, estimated from nearest cluster.
        hour: Hour of the day (0-23). If None, uses current hour.

    Returns:
        dict with:
            - zone_type: 'safe' or 'unsafe'
            - risk_score: float 0.0 to 1.0
            - cluster_id: which cluster this point belongs to
            - cluster_info: full cluster statistics
    """
    _ensure_model_loaded()

    from datetime import datetime
    if hour is None:
        hour = datetime.now().hour
    if crime_rate is None:
        crime_rate = 0.3  # Default assumption if unknown

    # Prepare the feature vector (same format as training)
    point = np.array([[latitude, longitude, crime_rate, hour]])
    point_scaled = _scaler.transform(point)

    # Predict which cluster this point belongs to
    cluster_id = int(_model.predict(point_scaled)[0])
    info = _cluster_info[cluster_id]

    return {
        "zone_type": info["zone_type"],
        "risk_score": info["risk_score"],
        "cluster_id": cluster_id,
        "cluster_center": info["center"],
        "cluster_info": info,
    }


def get_risk_score(latitude, longitude, hour=None):
    """
    Simplified risk scoring function — returns just the risk score.

    This is the function called by route_scorer.py to get the
    ML-based risk score for a coordinate along a route.

    Args:
        latitude: GPS latitude
        longitude: GPS longitude
        hour: Hour of the day (0-23)

    Returns:
        float: Risk score between 0.0 (safest) and 1.0 (most dangerous)
    """
    try:
        result = predict_zone(latitude, longitude, hour=hour)
        return result["risk_score"]
    except Exception as e:
        logger.warning(f"ML risk scoring failed, using fallback: {e}")
        return 0.3  # Safe-ish default


def get_all_clusters():
    """
    Get information about all detected clusters/zones.
    Used by the admin dashboard to display zones on a map.

    Returns:
        dict: cluster_id → cluster info (center, risk, type)
    """
    _ensure_model_loaded()
    return _cluster_info.copy()


def is_model_trained():
    """Check if a trained model exists on disk."""
    return os.path.exists(_MODEL_PATH)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# PRIVATE HELPERS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


def _ensure_model_loaded():
    """Load the saved model from disk if not already in memory."""
    global _model, _scaler, _cluster_info

    if _model is not None:
        return  # Already loaded

    if not os.path.exists(_MODEL_PATH):
        logger.info("No trained model found — training now with default dataset...")
        train_model()
        return

    _model = joblib.load(_MODEL_PATH)
    _scaler = joblib.load(_SCALER_PATH)
    _cluster_info = joblib.load(_CLUSTER_INFO_PATH)
    logger.info("ML model loaded from disk.")
