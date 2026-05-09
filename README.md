# 🛡️ SafeHer: Women's Safety Ecosystem

**SafeHer** is a comprehensive safety solution designed to empower women through technology. It integrates a Flask-based intelligent backend with a professional web portal and a high-performance Flutter mobile application to provide real-time protection and immediate emergency response.

---

## 🚀 Key Features

- 🚨 **One-Tap SOS**: Instantly alert emergency contacts and local authorities with your real-time location.
- 📍 **Live Location Tracking**: Shared with trusted contacts during active SOS sessions via Firebase Realtime Database.
- 🗺️ **Safe Navigation**: AI-driven route suggestions that avoid high-risk or poorly lit areas.
- ⚠️ **Incident Reporting**: Anonymously report harassment, theft, or safety hazards to warn the community.
- 📊 **Heatmap of Unsafe Zones**: Visual representation of risk areas based on community-sourced data.
- 🔔 **Real-time Notifications**: Instant alerts for nearby incidents using Firebase Cloud Messaging (FCM).

---

## 🛠️ Tech Stack

### Backend & Web Portal
- **Framework**: Flask (Python 3.11+)
- **WSGI Server**: Gunicorn (for production)
- **Database**: MongoDB Atlas (NoSQL)
- **Realtime**: Firebase Admin SDK
- **AI/ML**: Scikit-learn (Incident risk prediction)
- **Deployment**: Render / Docker Ready

### Mobile
- **Framework**: Flutter (Dart)
- **Maps**: Google Maps SDK
- **Backend Sync**: REST API + Firebase Realtime DB

---

## 📂 Project Structure

```text
├── backend/            # Flask API server & Logic
│   ├── app/            # Application logic, routes, and models
│   └── run.py          # Entry point
├── frontend/           # Web Portal (Served by Flask in production)
├── scripts/            # Database seeding and utility scripts
├── requirements.txt    # Production dependencies
├── Procfile            # Render deployment config
└── runtime.txt         # Python version config
```

---

## ⚙️ Deployment to Render

### 1. Environment Variables
Add the following variables in the Render Dashboard:

| Key | Value |
| :--- | :--- |
| `SECRET_KEY` | Your random secret string |
| `MONGO_URI` | Your MongoDB Atlas connection string |
| `MAIL_USERNAME` | Your email address |
| `MAIL_PASSWORD` | Your email app password |
| `FIREBASE_CREDENTIALS` | `firebase-credentials.json` |
| `GOOGLE_MAPS_API_KEY` | Your Google Maps API key |

### 2. Build & Start Commands
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `gunicorn --chdir backend run:app`

---

## ⚙️ Local Setup

### 🐍 Backend Setup
1. **Navigate to backend**:
   ```bash
   cd backend
   ```
2. **Environment Setup**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   pip install -r ../requirements.txt
   ```
3. **Configuration**:
   - Create a `.env` file based on `.env.example`.
4. **Run Server**:
   ```bash
   python run.py
   ```

---

## 📄 License
This project is licensed under the MIT License.
