
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

const USERS_COLLECTION = "prometeo_users";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let unsubscribeProfile: Unsubscribe | undefined;
    console.log(`AuthContext: Using Firestore instance with databaseId: ${db.toJSON()?.settings?.databaseId || '(default)'}. User collection: "${USERS_COLLECTION}"`);

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      console.log("AuthContext: onAuthStateChanged triggered. User:", user?.uid || 'No user');
      setCurrentUser(user);
      if (user) {
        setLoading(true); 
        const userDocRef = doc(db, USERS_COLLECTION, user.uid);
        console.log(`AuthContext: Setting up snapshot listener for user ${user.uid} at path ${userDocRef.path}`);

        if (unsubscribeProfile) {
          console.log("AuthContext: Unsubscribing from previous profile listener.");
          unsubscribeProfile();
        }

        unsubscribeProfile = onSnapshot(userDocRef, async (docSnap) => {
          console.log(`AuthContext: Snapshot received for user ${user.uid}. Document exists: ${docSnap.exists()} in collection "${USERS_COLLECTION}"`);
          if (docSnap.exists()) {
            const profileData = docSnap.data() as UserProfile;
            console.log(`AuthContext: Profile data from Firestore (collection "${USERS_COLLECTION}"):`, JSON.stringify(profileData));
            setUserProfile(profileData);
            setLoading(false);
          } else {
            console.warn(`AuthContext: User profile for ${user.uid} NOT FOUND in Firestore collection "${USERS_COLLECTION}". Will attempt to create a default 'Pensionado' profile.`);
            const defaultProfile: UserProfile = {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName || user.email?.split('@')[0] || 'Usuario',
              role: ROLES.PENSIONADO, // Default role
            };
            try {
              await setDoc(userDocRef, defaultProfile);
              console.log(`AuthContext: Default 'Pensionado' profile CREATED for ${user.uid} in collection "${USERS_COLLECTION}". The listener should pick this up.`);
              // setLoading(false); // Let the next snapshot (after setDoc) handle setLoading
            } catch (error) {
              console.error(`AuthContext: Error CREATING default user profile in collection "${USERS_COLLECTION}":`, error);
              setUserProfile(null); 
              setLoading(false); 
            }
          }
        }, (error) => {
          console.error(`AuthContext: Error listening to user profile for ${user.uid} in collection "${USERS_COLLECTION}":`, error);
          setUserProfile(null);
          setLoading(false);
        });

      } else {
        // User is logged out
        console.log("AuthContext: User is logged out.");
        if (unsubscribeProfile) {
          console.log("AuthContext: Unsubscribing from profile listener on logout.");
          unsubscribeProfile();
          unsubscribeProfile = undefined;
        }
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => {
      console.log("AuthContext: Cleaning up AuthProvider. Unsubscribing auth and profile listeners.");
      unsubscribeAuth();
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
  }, []);

  const logout = async () => {
    console.log("AuthContext: logout function called.");
    try {
      await firebaseSignOut(auth);
      // State updates (currentUser, userProfile) will be handled by onAuthStateChanged
      router.push('/login');
    } catch (error) {
      console.error("AuthContext: Error signing out: ", error);
    }
  };
  
  const isAdmin = userProfile?.role === ROLES.ADMINISTRADOR;
  if (userProfile) {
    console.log(`AuthContext: isAdmin check: userProfile.role is "${userProfile.role}", ROLES.ADMINISTRADOR is "${ROLES.ADMINISTRADOR}". isAdmin: ${isAdmin}`);
  }


  return (
    <AuthContext.Provider value={{ currentUser, userProfile, loading, isAdmin, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

