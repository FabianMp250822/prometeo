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


if (typeof window !== 'undefined' && !getApps().length) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  // Initialize Firestore with the specific database ID "prometeo"
  db = initializeFirestore(app, { databaseId: 'prometeo' });
  storage = getStorage(app);

  if (process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY) {
     try {
        // Attempt to get AppCheck instance if it's already initialized.
        // This is a bit of a workaround as Firebase SDK doesn't have a direct `getAppCheckInstanceIfExists`.
        // If it throws, it means it's not initialized.
        // This check is mainly to prevent re-initialization errors during HMR in development.
        // const existingAppCheck = (app as any)._components.get('app-check')?.instance;
        // if (!existingAppCheck) {
           appCheck = initializeAppCheck(app, {
            provider: new ReCaptchaV3Provider(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY),
            isTokenAutoRefreshEnabled: true,
          });
        // } else {
        //    appCheck = existingAppCheck;
        // }
      } catch (error) {
        console.error("Error initializing App Check:", error);
      }
  } else {
    console.warn("NEXT_PUBLIC_RECAPTCHA_SITE_KEY is not set. Firebase App Check will not be initialized.");
  }
  

  // Optional: Connect to emulators in development
  if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true') {
    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectStorageEmulator(storage, 'localhost', 9199);
    console.log("Connected to Firebase Emulators");
  }
} else if (getApps().length > 0) {
  app = getApp();
  auth = getAuth(app);
  try {
    db = getFirestore(app, 'prometeo');
  } catch(e) {
    db = initializeFirestore(app, { databaseId: 'prometeo' });
  }
  storage = getStorage(app);
  // App Check should already be initialized if window was previously defined
} else {
  // Fallback for server-side rendering or environments where window is not defined initially
  // This setup might be partial as AppCheck with ReCaptchaV3 is client-side.
  app = initializeApp(firebaseConfig); // Initialize for server contexts if needed
  auth = getAuth(app);
  db = initializeFirestore(app, { databaseId: 'prometeo' });
  storage = getStorage(app);
}


export { app, auth, db, storage, appCheck };
