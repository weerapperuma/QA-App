import { initializeApp, getApps, getApp, deleteApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, limit, query } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const STORAGE_KEY = 'devbridge_firebase_config_v1';

/**
 * Retrieves the current Firebase configuration.
 * Checks localStorage first (runtime configuration via UI),
 * then falls back to Vite environment variables (.env).
 */
export function getFirebaseConfig() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.projectId && parsed.apiKey) {
        return { ...parsed, source: 'localStorage' };
      }
    }
  } catch (err) {
    console.warn('Failed to parse saved Firebase config from localStorage:', err);
  }

  // Fallback to Vite environment variables
  const envConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
    source: 'env'
  };

  return envConfig;
}

/**
 * Checks if the current configuration contains the minimum required fields.
 */
export function isFirebaseConfigured(config = getFirebaseConfig()) {
  return Boolean(config?.apiKey?.trim() && config?.projectId?.trim());
}

/**
 * Saves Firebase configuration to localStorage and re-initializes.
 */
export function saveFirebaseConfig(config) {
  const cleanConfig = {
    apiKey: config.apiKey?.trim() || '',
    authDomain: config.authDomain?.trim() || '',
    projectId: config.projectId?.trim() || '',
    storageBucket: config.storageBucket?.trim() || '',
    messagingSenderId: config.messagingSenderId?.trim() || '',
    appId: config.appId?.trim() || ''
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanConfig));
  return reinitFirebase(cleanConfig);
}

/**
 * Clears saved Firebase configuration.
 */
export function clearFirebaseConfig() {
  localStorage.removeItem(STORAGE_KEY);
  return reinitFirebase(getFirebaseConfig());
}

let firebaseApp = null;
let firestoreDb = null;
let firebaseAuth = null;

/**
 * Re-initializes Firebase with fresh configuration.
 */
async function reinitFirebase(config) {
  try {
    const apps = getApps();
    for (const app of apps) {
      await deleteApp(app);
    }
  } catch (err) {
    console.warn('Error deleting existing Firebase apps:', err);
  }

  firebaseApp = null;
  firestoreDb = null;
  firebaseAuth = null;

  return initFirebase(config);
}

/**
 * Initializes Firebase App, Firestore, and Auth.
 */
export function initFirebase(config = getFirebaseConfig()) {
  if (!isFirebaseConfigured(config)) {
    return {
      app: null,
      db: null,
      auth: null,
      configured: false,
      status: 'not_configured'
    };
  }

  try {
    const apps = getApps();
    firebaseApp = apps.length > 0 ? getApp() : initializeApp(config);
    firestoreDb = getFirestore(firebaseApp);
    firebaseAuth = getAuth(firebaseApp);

    return {
      app: firebaseApp,
      db: firestoreDb,
      auth: firebaseAuth,
      configured: true,
      status: 'connected'
    };
  } catch (err) {
    console.error('Firebase initialization error:', err);
    return {
      app: null,
      db: null,
      auth: null,
      configured: false,
      status: 'error',
      error: err.message
    };
  }
}

/**
 * Validates connection to Firestore with provided configuration.
 */
export async function testFirebaseConnection(config) {
  if (!isFirebaseConfigured(config)) {
    return { success: false, error: 'API Key and Project ID are required.' };
  }

  const testAppName = `test-app-${Date.now()}`;
  let testApp = null;

  try {
    testApp = initializeApp(config, testAppName);
    const testDb = getFirestore(testApp);

    // Attempt a light query (reading up to 1 doc from a meta ping or users collection)
    const q = query(collection(testDb, 'users'), limit(1));
    await getDocs(q);

    await deleteApp(testApp);
    return { success: true };
  } catch (err) {
    if (testApp) {
      try {
        await deleteApp(testApp);
      } catch (cleanupErr) {
        // ignore cleanup error
      }
    }

    // Distinguish between common Firebase errors
    let message = err.message || 'Unknown Firebase error';
    if (message.includes('permission-denied') || err.code === 'permission-denied') {
      return {
        success: true,
        warning: 'Connected to Firebase, but Firestore rules denied read access. Please ensure Cloud Firestore Security Rules are set to test mode (allow read, write: if true).'
      };
    }
    if (message.includes('invalid-api-key') || err.code === 'auth/invalid-api-key') {
      message = 'Invalid Firebase API Key. Please check the API key from your Firebase console.';
    }

    return { success: false, error: message };
  }
}

export { firebaseApp, firestoreDb, firebaseAuth };
