// Debug utilities for Firebase connection
export function logFirebaseConfig() {
  console.log('=== Firebase Configuration Debug ===');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('FIRESTORE_EMULATOR_HOST:', process.env.FIRESTORE_EMULATOR_HOST);
  console.log('FIREBASE_AUTH_EMULATOR_HOST:', process.env.FIREBASE_AUTH_EMULATOR_HOST);
  console.log('PROJECT_ID:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
  console.log('=====================================');
}

export function checkEmulatorConnection(db) {
  if (!db) {
    console.error('❌ Firestore instance is null or undefined');
    return false;
  }
  
  console.log('🔍 Checking Firestore connection...');
  console.log('Database instance:', db);
  console.log('Database type:', typeof db);
  console.log('Database constructor:', db.constructor?.name);
  
  try {
    // Check if we're using emulator
    const settings = db._delegate?._settings || db._settings;
    console.log('Firestore settings:', settings);
    
    if (settings?.host?.includes('localhost') || settings?.host?.includes('127.0.0.1')) {
      console.log('✅ Connected to Firestore emulator');
      return true;
    } else {
      console.warn('⚠️ NOT connected to emulator - using production');
      console.warn('Host:', settings?.host);
      return false;
    }
  } catch (error) {
    console.error('❌ Error checking emulator connection:', error);
    return false;
  }
}