
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

const FIREBASE_DATABASE_ID = "prometeo";

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;
let appCheck: AppCheck | undefined = undefined;

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

// Inicializar Firestore para la instancia "prometeo"
console.log(`Firebase: Initializing Firestore for "${FIREBASE_DATABASE_ID}" database.`);
db = getFirestore(app, FIREBASE_DATABASE_ID);
console.log(`Firebase: Firestore initialized for "${FIREBASE_DATABASE_ID}" database. Project ID: ${db.app.options.projectId}`);


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
    console.log(`Firebase: Connecting Firestore "${FIREBASE_DATABASE_ID}" instance to emulator on localhost:8080.`);
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectStorageEmulator(storage, 'localhost', 9199);
    console.log("Firebase: Connected to Firebase Emulators.");
  }
}

export { app, auth, db, storage, appCheck };
