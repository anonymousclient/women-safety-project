"""
JWT Authentication Middleware.

Provides a decorator `@token_required` that protects routes.
Any route decorated with it will:
1. Check the Authorization header for a Bearer token
2. Decode and validate the JWT
3. Attach the current user to the request context
"""

from functools import wraps
from flask import request, jsonify, current_app
import jwt
from bson import ObjectId
from app import mongo


def token_required(f):
    """
    Decorator to protect API routes with JWT authentication.

    Usage:
        @app.route('/protected')
        @token_required
        def protected_route(current_user):
            # current_user is the full MongoDB user document
            return jsonify({"msg": f"Hello {current_user['name']}"})
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        # ── Allow CORS preflight (OPTIONS) requests ──
        if request.method == "OPTIONS":
            return "", 204

        token = None

        # ── Extract token from "Authorization: Bearer <token>" header ──
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]

        if not token:
            return jsonify({"error": "Authentication token is missing"}), 401

        try:
            # ── Decode the JWT ──
            payload = jwt.decode(
                token,
                current_app.config["SECRET_KEY"],
                algorithms=["HS256"],
            )
            user_id = payload.get("user_id")

            # ── Fetch the user from MongoDB ──
            current_user = mongo.users.find_one({"_id": ObjectId(user_id)})
            if not current_user:
                return jsonify({"error": "User not found"}), 401

            if not current_user.get("is_active", True):
                return jsonify({"error": "Account has been deactivated"}), 403

        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token has expired, please login again"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401

        # ── Pass the current_user into the route function ──
        return f(current_user, *args, **kwargs)

    return decorated
