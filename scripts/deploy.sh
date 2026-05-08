#!/bin/bash
# Deployment script for Render/Heroku

echo "Starting deployment process..."

# Navigate to backend
cd backend

# Install dependencies
pip install -r requirements.txt

# Start gunicorn server
gunicorn app:app --bind 0.0.0.0:$PORT
