"""
Flask Application Factory.

This is the central setup file. It:
1. Creates the Flask app
2. Connects to MongoDB
3. Initializes Firebase
4. Registers all route blueprints
"""

from flask import Flask
from flask_cors import CORS
from pymongo import MongoClient

from app.config import Config

# ── Global MongoDB reference (accessible via `from app import mongo`) ──
mongo = None  # Will hold the MongoClient database object


def create_app():
    """Create and configure the Flask application."""
    global mongo

    app = Flask(__name__)
    app.config.from_object(Config)

    # ── Enable CORS (so Flutter app can call our API) ──
    CORS(app)

    # ── Connect to MongoDB ──
    import certifi
    client = MongoClient(app.config["MONGO_URI"], tlsCAFile=certifi.where())
    # Extract database name from URI, fallback to 'women_safety'
    try:
        mongo = client.get_default_database()
    except Exception:
        mongo = client["women_safety"]

    # Create geospatial indexes (safe to call multiple times — MongoDB ignores duplicates)
    _ensure_indexes(mongo)

    # ── Initialize Firebase (if credentials are provided) ──
    _init_firebase(app)

    # ── Register Blueprints (route groups) ──
    from app.routes.auth import auth_bp
    from app.routes.sos import sos_bp
    from app.routes.navigation import nav_bp
    from app.routes.location import location_bp
    from app.routes.zones import zones_bp
    from app.routes.admin import admin_bp
    from app.routes.user import user_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(sos_bp, url_prefix="/api/sos")
    app.register_blueprint(nav_bp, url_prefix="/api")
    app.register_blueprint(location_bp, url_prefix="/api")
    app.register_blueprint(zones_bp, url_prefix="/api/zones")
    app.register_blueprint(admin_bp, url_prefix="/admin")
    app.register_blueprint(user_bp, url_prefix="/api/user")

    # ── Health check endpoint ──
    @app.route("/")
    def health():
        return {"status": "ok", "message": "Women Safety API is running"}, 200

    return app


def _ensure_indexes(db):
    """Create MongoDB indexes for geospatial queries and lookups."""
    # Users — unique email
    db.users.create_index("email", unique=True)

    # Incidents — geospatial + time
    db.incidents.create_index([("location", "2dsphere")])
    db.incidents.create_index([("reported_at", -1)])

    # Unsafe zones — geospatial
    db.unsafe_zones.create_index([("location", "2dsphere")])

    # SOS alerts — status + time
    db.sos_alerts.create_index([("status", 1), ("triggered_at", -1)])
    db.sos_alerts.create_index([("trigger_location", "2dsphere")])

    # Live locations — user lookup + TTL (auto-delete after 24 hours)
    db.live_locations.create_index([("user_id", 1), ("timestamp", -1)])
    db.live_locations.create_index("timestamp", expireAfterSeconds=86400)


def _init_firebase(app):
    """Initialize Firebase Admin SDK if credentials are configured."""
    cred_path = app.config.get("FIREBASE_CREDENTIALS")
    if not cred_path:
        app.logger.warning(
            "FIREBASE_CREDENTIALS not set — Firebase features disabled. "
            "Push notifications and realtime DB will be mocked."
        )
        return

    try:
        import firebase_admin
        from firebase_admin import credentials

        # Only initialize if not already done
        if not firebase_admin._apps:
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
            app.logger.info("Firebase initialized successfully.")
    except Exception as e:
        app.logger.error(f"Firebase initialization failed: {e}")
