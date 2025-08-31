import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

// Track if emulators have been connected to prevent multiple connections
let emulatorsConnected = false;

// Force emulator connection in development
const FORCE_EMULATOR = process.env.NODE_ENV === 'development';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'demo-api-key',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'demo-project.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'demo-ai-meeting-scheduler',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'demo-project.appspot.com',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '123456789',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:123456789:web:demo'
};

// Initialize Firebase only if we have a valid API key and we're not in build mode
const hasValidConfig = firebaseConfig.apiKey && firebaseConfig.apiKey !== '';

console.log('Firebase initialization:', {
  hasValidConfig,
  apiKey: firebaseConfig.apiKey ? '***configured***' : 'missing',
  projectId: firebaseConfig.projectId,
  existingApps: getApps().length
});

// Initialize Firebase app
let app = null;
if (hasValidConfig) {
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }
}

// Initialize Firebase services
let db = null;
let auth = null;
let functions = null;

if (app) {
  db = getFirestore(app);
  auth = getAuth(app);
  functions = getFunctions(app);
  
  // Connect to emulators immediately after service initialization in development
  if (FORCE_EMULATOR && !emulatorsConnected) {
    emulatorsConnected = true;
    
    // Connect to Firestore emulator
    if (db) {
      try {
        connectFirestoreEmulator(db, '127.0.0.1', 8180);
        console.log('✅ Connected to Firestore emulator');
      } catch (error) {
        if (!error.message.includes('already') && !error.message.includes('Cannot call')) {
          console.warn('Failed to connect to Firestore emulator:', error.message);
        }
      }
    }
    
    // Connect to Auth emulator
    if (auth) {
      try {
        connectAuthEmulator(auth, 'http://localhost:9199', { disableWarnings: true });
        console.log('✅ Connected to Auth emulator');
      } catch (error) {
        if (!error.message.includes('already') && !error.message.includes('Cannot call')) {
          console.warn('Failed to connect to Auth emulator:', error.message);
        }
      }
    }
    
    // Connect to Functions emulator
    if (functions) {
      try {
        connectFunctionsEmulator(functions, 'localhost', 5101);
        console.log('✅ Connected to Functions emulator');
      } catch (error) {
        if (!error.message.includes('already') && !error.message.includes('Cannot call')) {
          console.warn('Failed to connect to Functions emulator:', error.message);
        }
      }
    }
  }
  
  console.log('Firebase services initialized successfully');
} else {
  console.warn('Firebase app not initialized - services will be null');
}

// Function to connect to emulators - for additional calls if needed
function connectToEmulators() {
  // Already connected during initialization in development
  return;
}

export { db, auth, functions, connectToEmulators };
export default app;