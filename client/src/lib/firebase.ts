
import { initializeApp } from "firebase/app";
import { getAuth, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Validate required environment variables
const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID'
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
  experimentalForceLongPolling: true,
  experimentalAutoDetectLongPolling: true
};

let app;
try {
  console.log('FIREBASE_INIT: Initializing Firebase with config:', {
    ...firebaseConfig,
    apiKey: '***'
  });
  app = initializeApp(firebaseConfig);
  console.log('FIREBASE_INIT: Firebase initialized successfully');
} catch (error) {
  console.error('FIREBASE_INIT: Error initializing Firebase:', error);
  throw new Error(`Failed to initialize Firebase: ${error instanceof Error ? error.message : 'Unknown error'}`);
}

export const auth = getAuth(app);
export const storage = getStorage(app);
export const db = getFirestore(app, {
  cacheSizeBytes: 40 * 1024 * 1024,
  experimentalForceLongPolling: true,
  ignoreUndefinedProperties: true
});

// Set auth persistence to local
auth.setPersistence(browserLocalPersistence)
  .catch((error) => {
    console.error('Auth persistence error:', error);
  });

// Export the app instance for use in other parts of the application
export default app;
