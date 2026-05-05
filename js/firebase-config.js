// LaTAFU - Firebase Configuration
// Keys are loaded from Vercel environment variables via a serverless function
// For local dev, create a .env file and use a local proxy

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// ⚠️ Replace these with your actual Firebase config values
// These are PUBLIC keys — safe to expose in frontend
// Secret keys (AI APIs, Stripe) stay in /api/ serverless functions only
const firebaseConfig = {
  apiKey: "AIzaSyBH8WBm0lxtAfNoNwPaUXZMseZmdB0bToc",
  authDomain: "lafuto-b3c40.firebaseapp.com",
  projectId: "lafuto-b3c40",
  storageBucket: "lafuto-b3c40.firebasestorage.app",
  messagingSenderId: "679744644615",
  appId: "1:679744644615:web:75a19bdc4b6560f5c9eca2",
  databaseURL: "https://lafuto-b3c40-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);
export const storage = getStorage(app);
export default app;
