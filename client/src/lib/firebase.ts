
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getDatabase } from "firebase/database";

console.log('Checking Firebase environment variables...');

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Set persistence and sign in
auth.setPersistence(browserLocalPersistence)
  .then(() => {
    if (!auth.currentUser) {
      return signInWithEmailAndPassword(auth, 'admin@groomery.in', 'admin123');
    }
  })
  .then(() => {
    console.log('FIREBASE_INIT: Firebase initialized successfully');
  })
  .catch(error => {
    console.error('FIREBASE_INIT: Error:', error);
  });

export { auth };
export const db = getFirestore(app);
export const storage = getStorage(app);
export const database = getDatabase(app);

export default app;
