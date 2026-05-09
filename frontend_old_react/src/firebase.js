import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Replace with your Firebase project's client configuration
// You can find this in Firebase Console -> Project Settings -> General -> Your Apps -> Web Apps
const firebaseConfig = {
  apiKey: "AIzaSyBNLozlSTDVPqWZsnnuKD18Q3ZATJQLuA8",
  authDomain: "woman-safety-e2386.firebaseapp.com",
  projectId: "woman-safety-e2386",
  storageBucket: "woman-safety-e2386.firebasestorage.app",
  messagingSenderId: "659760041751",
  appId: "1:659760041751:web:94df64d3137c130a98b152",
  measurementId: "G-NR92RFCFTE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;
