
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, 
  fetchSignInMethodsForEmail, sendPasswordResetEmail, deleteUser, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getDatabase } from "firebase/database";

// Validate required environment variables
const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
  'VITE_FIREBASE_DATABASE_URL'
];

console.log('Checking Firebase environment variables...');
const missingEnvVars = requiredEnvVars.filter(varName => !import.meta.env[varName]);
if (missingEnvVars.length > 0) {
  console.error(`Missing required Firebase environment variables: ${missingEnvVars.join(', ')}`);
  throw new Error('Firebase configuration is incomplete. Check the console for details.');
}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
};

let app;
try {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }
  const auth = getAuth(app);
  await auth.setPersistence(browserLocalPersistence);
  if (!auth.currentUser) {
    console.log('FIREBASE_INIT: No user found, signing in as admin...');
    await signInWithEmailAndPassword(auth, 'admin@groomery.in', 'admin123');
  }
  console.log('FIREBASE_INIT: Firebase initialized successfully');
} catch (error) {
  console.error('FIREBASE_INIT: Error initializing Firebase:', error);
  throw new Error(`Failed to initialize Firebase: ${error instanceof Error ? error.message : 'Unknown error'}`);
}

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const database = getDatabase(app);

export default app;
