// src/lib/firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyA1qKq9t4bF-KYHsBvpSNiDjADBuRV5s3E",
  authDomain: "blockpal-001.firebaseapp.com",
  projectId: "blockpal-001",
  storageBucket: "blockpal-001.firebasestorage.app",
  messagingSenderId: "619975309868",
  appId: "1:619975309868:web:239ad72ecbd106ab2aef89",
  measurementId: "G-MQR15RHVWH",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Initialize Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope("email");
googleProvider.addScope("profile");

export default app;
