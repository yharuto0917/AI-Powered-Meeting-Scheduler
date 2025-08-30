import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || ''
};

// Initialize Firebase only if we have a valid API key and we're not in build mode
const hasValidConfig = firebaseConfig.apiKey && firebaseConfig.apiKey !== '';

console.log('Firebase initialization:', {
  hasValidConfig,
  apiKey: firebaseConfig.apiKey ? '***configured***' : 'missing',
  projectId: firebaseConfig.projectId,
  existingApps: getApps().length
});

const app = hasValidConfig && getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0] || null;

let db = null;
let auth = null;
let functions = null;

// Initialize Firebase services only if app is initialized
if (app) {
  db = getFirestore(app);
  auth = getAuth(app);  
  functions = getFunctions(app);
  console.log('Firebase services initialized successfully');
} else {
  console.warn('Firebase app not initialized - services will be null');
}

  // Connect to emulators in development
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    // Check if we should connect to emulators
    const useEmulator = process.env.FIREBASE_AUTH_EMULATOR_HOST || process.env.FIRESTORE_EMULATOR_HOST;
    
    if (useEmulator) {
      // Connect to Auth emulator
      if (process.env.FIREBASE_AUTH_EMULATOR_HOST) {
        try {
          connectAuthEmulator(auth, `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`, { disableWarnings: true });
          console.log('Connected to Auth emulator');
        } catch (error) {
          if (!error.message.includes('already')) {
            console.warn('Failed to connect to Auth emulator:', error.message);
          }
        }
      }
      
      // Connect to Firestore emulator
      if (process.env.FIRESTORE_EMULATOR_HOST) {
        try {
          connectFirestoreEmulator(db, 'localhost', 8180);
          console.log('Connected to Firestore emulator');
        } catch (error) {
          if (!error.message.includes('already')) {
            console.warn('Failed to connect to Firestore emulator:', error.message);
          }
        }
      }
      
      // Connect to Functions emulator
      if (process.env.FIREBASE_FUNCTIONS_EMULATOR_HOST) {
        try {
          connectFunctionsEmulator(functions, 'localhost', 5101);
          console.log('Connected to Functions emulator');
        } catch (error) {
          if (!error.message.includes('already')) {
            console.warn('Failed to connect to Functions emulator:', error.message);
          }
        }
      }
    }
  }

export { db, auth, functions };
export default app;