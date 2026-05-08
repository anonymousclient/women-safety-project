# Project Architecture

## Mobile App (Flutter)
- Handles the UI, location tracking, and SOS button interactions.
- Communicates with the backend via REST API.
- Receives push notifications from Firebase.

## Backend (Flask)
- Manages business logic, AI risk scoring, and database interactions.
- Connects to MongoDB Atlas for persistent storage.
- Integrates with Google Maps API for route planning.
- Uses Firebase Admin SDK for Realtime DB updates and Push Notifications.

## Database (MongoDB Atlas)
- Collections: `users`, `incidents`, `sos_alerts`, `unsafe_zones`

## AI Module
- Uses Scikit-learn K-Means clustering to predict safe/unsafe zones based on historical incident data.
