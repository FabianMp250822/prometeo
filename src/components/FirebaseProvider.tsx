"use client";

import { useEffect, useState } from 'react';
import { app, auth, db, storage, appCheck } from '@/lib/firebase'; // This will trigger initialization

export default function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    // The mere import of '@/lib/firebase' should handle initialization.
    // This effect ensures the provider has mounted and firebase attempted init.
    if (app && auth && db && storage) {
        // appCheck might be undefined if key is missing, which is handled in firebase.ts
        setInitialized(true);
    }
  }, []);

  // Optionally, show a loading state until Firebase is initialized
  // if (!initialized) {
  //   return <div>Loading Firebase...</div>;
  // }

  return <>{children}</>;
}
