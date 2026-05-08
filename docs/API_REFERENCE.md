# API Reference

## Authentication (`/api/auth`)
- `POST /register`: Register a new user
- `POST /login`: Log in to get a JWT token
- `GET /me`: Get current user details

## Navigation & Zones (`/api/navigation`, `/api/zones`)
- `POST /get-safe-route`: Returns AI-scored routes prioritizing safety
- `GET /nearby-safe-places`: Find hospitals, police stations, and safe zones
- `GET /zones`: List known unsafe zones

## SOS & Emergency (`/api/sos`)
- `POST /trigger`: Trigger a high-priority SOS alert
- `POST /resolve`: Mark an alert as resolved
