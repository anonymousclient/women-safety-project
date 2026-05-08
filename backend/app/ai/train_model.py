"""
Model Training Script — Run this once to train the K-Means zone classifier.

Usage:
    cd backend
    python -m app.ai.train_model

What it does:
    1. Loads the crime dataset from app/ai/dataset/crime_data.csv
    2. Trains a K-Means clustering model (K=5 clusters)
    3. Labels each cluster as safe or unsafe
    4. Saves the trained model to app/ai/models/
    5. Prints a visual summary of all clusters

After training, the model is automatically loaded by the Flask app
on the first API request that needs it.
"""

import sys
import os

# Add the backend directory to Python path so imports work
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from app.ai.zone_classifier import train_model, predict_zone


def main():
    print("=" * 60)
    print("   [AI] Women Safety AI - Zone Classifier Training")
    print("=" * 60)
    print()

    # ── Train the model ──
    print("[STATS] Loading crime dataset...")
    summary = train_model()
    print(f"   Loaded {summary['total_records']} crime records")
    print(f"   Using K={summary['n_clusters']} clusters")
    print()

    # ── Display cluster results ──
    print("[LOC] Cluster Analysis Results:")
    print("-" * 60)
    print(f"{'ID':<4} {'Type':<8} {'Risk':<8} {'Crimes':<8} {'Center (lat, lng)'}")
    print("-" * 60)

    for cid, info in summary["clusters"].items():
        icon = "[X]" if info["zone_type"] == "unsafe" else "[OK]"
        center = info["center"]
        print(
            f"{icon} {cid:<3} {info['zone_type']:<8} "
            f"{info['risk_score']:<8.3f} {info['incident_count']:<8} "
            f"({center[0]:.4f}, {center[1]:.4f})"
        )

    print("-" * 60)
    print(f"   [X] Unsafe zones: {summary['unsafe_zones']}")
    print(f"   [OK] Safe zones:   {summary['safe_zones']}")
    print()

    # ── Test predictions ──
    print("[TEST] Testing Predictions:")
    print("-" * 60)

    test_points = [
        (28.6139, 77.2090, "Connaught Place (known unsafe, night)"),
        (28.6562, 77.2373, "Old Delhi (known unsafe)"),
        (28.7000, 77.1500, "North Delhi (known safe)"),
        (28.6800, 77.2200, "Central Delhi (known safe)"),
        (28.5707, 77.0369, "Sector 15 Underpass (known unsafe)"),
    ]

    for lat, lng, name in test_points:
        result = predict_zone(lat, lng, hour=23)
        icon = "[X]" if result["zone_type"] == "unsafe" else "[OK]"
        print(
            f"   {icon} {name:<42} -> "
            f"{result['zone_type']:<7} (risk: {result['risk_score']:.3f}, "
            f"cluster: {result['cluster_id']})"
        )

    print()
    print("DONE: Model saved to: app/ai/models/")
    print("   The Flask app will load it automatically on startup.")
    print()


if __name__ == "__main__":
    main()
