import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Replace with your Firebase project's client configuration
// You can find this in Firebase Console -> Project Settings -> General -> Your Apps -> Web Apps
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "woman-safety-e2386", // From your credentials file
  storageBucket: "woman-safety-e2386.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;
