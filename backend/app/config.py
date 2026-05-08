"""
Application configuration.
Loads settings from environment variables (.env file).
"""

import os
from dotenv import load_dotenv

# Load .env file from the backend directory
load_dotenv()


class Config:
    """Base configuration class — all settings used across the app."""

    # Flask
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production")

    # MongoDB
    MONGO_URI = os.getenv(
        "MONGO_URI", "mongodb://localhost:27017/women_safety"
    )

    # Firebase credentials JSON file path
    FIREBASE_CREDENTIALS = os.getenv("FIREBASE_CREDENTIALS", "")

    # Google Maps
    GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY", "")

    # Twilio SMS (optional)
    TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
    TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
    TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER", "")

    # JWT token expiry (in hours)
    JWT_EXPIRY_HOURS = 24
