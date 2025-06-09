
"use client";

import React, { createContext, useEffect, useState, ReactNode } from 'react';
import { User as FirebaseUser, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import type { UserRole } from '@/config/roles';
import { ROLES } from '@/config/roles';
import { useRouter } from 'next/navigation';

interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: UserRole;
  // Add other profile fields as needed
}

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let unsubscribeProfile: Unsubscribe | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        setLoading(true); // Set loading true while fetching/listening to profile
        const userDocRef = doc(db, "users", user.uid);

        // Unsubscribe from previous profile listener if it exists
        if (unsubscribeProfile) {
          unsubscribeProfile();
        }

        unsubscribeProfile = onSnapshot(userDocRef, async (docSnap) => {
          if (docSnap.exists()) {
            setUserProfile(docSnap.data() as UserProfile);
          } else {
            // If profile doesn't exist, create a basic one
            const defaultProfile: UserProfile = {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName || user.email?.split('@')[0] || 'Usuario',
              role: ROLES.PENSIONADO, // Default role
            };
            try {
              await setDoc(userDocRef, defaultProfile);
              // setUserProfile(defaultProfile); // The listener will pick this up
              console.warn(`User profile for ${user.uid} not found. Created a default one.`);
            } catch (error) {
              console.error("Error creating default user profile:", error);
            }
          }
          setLoading(false);
        }, (error) => {
          console.error("Error listening to user profile:", error);
          setUserProfile(null);
          setLoading(false);
        });

      } else {
        // User is logged out
        if (unsubscribeProfile) {
          unsubscribeProfile();
          unsubscribeProfile = undefined;
        }
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
  }, []);

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
      // State updates (currentUser, userProfile) will be handled by onAuthStateChanged
      router.push('/login');
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };
  
  const isAdmin = userProfile?.role === ROLES.ADMINISTRADOR;

  return (
    <AuthContext.Provider value={{ currentUser, userProfile, loading, isAdmin, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// This useAuth hook is defined within AuthContext.tsx but the app primarily uses the one from /hooks/useAuth.ts
// To avoid confusion, ensure that the intended hook is consistently used or refactor to have a single source.
// For now, the error is addressed by exporting AuthContext above.
// export const useAuth = (): AuthContextType => {
//   const context = useContext(AuthContext);
//   if (context === undefined) {
//     throw new Error('useAuth must be used within an AuthProvider');
//   }
//   return context;
// };

