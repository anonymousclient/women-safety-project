# 🛡️ SafeHer: Women's Safety Ecosystem

**SafeHer** is a comprehensive safety solution designed to empower women through technology. It integrates a Flask-based intelligent backend with a high-performance Flutter mobile application to provide real-time protection, community-driven safety insights, and immediate emergency response.

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

### Backend
- **Framework**: Flask (Python)
- **Database**: MongoDB Atlas (NoSQL)
- **Realtime**: Firebase Admin SDK
- **AI/ML**: Scikit-learn (Incident risk prediction)
- **Deployment**: Ready for Render/Gunicorn

### Mobile
- **Framework**: Flutter (Dart)
- **State Management**: Provider / BLoC
- **Maps**: Google Maps SDK
- **Backend Sync**: REST API + Firebase Realtime DB

---

## 📂 Project Structure

```text
├── backend/            # Flask API server & Admin Dashboard
│   ├── app/            # Application logic, routes, and models
│   ├── templates/      # Admin dashboard UI (Jinja2)
│   └── run.py          # Entry point
├── mobile/             # Flutter mobile application
├── scripts/            # Database seeding and utility scripts
└── docs/               # Technical documentation
```

---

## ⚙️ Setup & Installation

### 🐍 Backend Setup
1. **Navigate to backend**:
   ```bash
   cd backend
   ```
2. **Environment Setup**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```
3. **Configuration**:
   - Create a `.env` file based on `.env.example`.
   - Add your `MONGO_URI`, `FIREBASE_CREDENTIALS`, and `OPENROUTER_API_KEY`.
4. **Seed Database**:
   ```bash
   python -m app.seed_data
   ```
5. **Run Server**:
   ```bash
   python run.py
   ```

### 📱 Mobile Setup
1. **Navigate to mobile**:
   ```bash
   cd mobile
   ```
2. **Install dependencies**:
   ```bash
   flutter pub get
   ```
3. **Configure Firebase**:
   - Add `google-services.json` (Android) and `GoogleService-Info.plist` (iOS).
4. **Run App**:
   ```bash
   flutter run
   ```

---

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
