
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, Auth } from 'firebase/auth';
import { getFirestore, initializeFirestore, connectFirestoreEmulator, Firestore } from 'firebase/firestore';
import { getStorage, connectStorageEmulator, FirebaseStorage } from 'firebase/storage';
import { initializeAppCheck, ReCaptchaV3Provider, AppCheck } from 'firebase/app-check';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;
let appCheck: AppCheck | undefined = undefined;

const DATABASE_ID = 'prometeo'; // Definir el ID de la base de datos

// Asegurar que la app esté inicializada
if (!getApps().length) {
  console.log("Firebase: Initializing new Firebase app.");
  app = initializeApp(firebaseConfig);
} else {
  console.log("Firebase: Getting existing Firebase app.");
  app = getApp();
}

// Inicializar servicios
auth = getAuth(app);
storage = getStorage(app);

// Inicializar o obtener explícitamente Firestore para 'prometeo'
try {
  console.log(`Firebase: Attempting to get Firestore instance for database ID: ${DATABASE_ID}`);
  db = getFirestore(app, DATABASE_ID);
  console.log(`Firebase: Successfully got Firestore instance for database ID: ${DATABASE_ID}. Path: ${db.toJSON()?.settings?.databaseId || 'N/A'}`);
} catch (e: any) {
  console.warn(`Firebase: getFirestore for ${DATABASE_ID} failed (error: ${e.message || String(e)}). Initializing new instance for ${DATABASE_ID}.`);
  db = initializeFirestore(app, { databaseId: DATABASE_ID });
  console.log(`Firebase: Successfully initialized new Firestore instance for database ID: ${DATABASE_ID}. Path: ${db.toJSON()?.settings?.databaseId || 'N/A'}`);
}


// Operaciones del lado del cliente (AppCheck, Emuladores)
if (typeof window !== 'undefined') {
  if (process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY) {
     try {
        console.log("Firebase: Initializing App Check.");
        appCheck = initializeAppCheck(app, {
          provider: new ReCaptchaV3Provider(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY),
          isTokenAutoRefreshEnabled: true,
        });
        console.log("Firebase: App Check initialized.");
      } catch (error) {
        console.error("Firebase: Error initializing App Check:", error);
      }
  } else {
    console.warn("Firebase: NEXT_PUBLIC_RECAPTCHA_SITE_KEY is not set. Firebase App Check will not be initialized.");
  }
  
  if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true') {
    console.log("Firebase: Connecting to emulators.");
    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
    console.log(`Firebase: Connecting Firestore instance (intended for ${DATABASE_ID}, actual instance databaseId: ${db.toJSON()?.settings?.databaseId || 'N/A'}) to emulator.`);
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectStorageEmulator(storage, 'localhost', 9199);
    console.log("Firebase: Connected to Firebase Emulators.");
  }
}

export { app, auth, db, storage, appCheck };
