
"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User as FirebaseUser, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
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
  // Add signIn function if LoginForm is managed by this context
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // Fetch user profile from Firestore
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          setUserProfile(userDocSnap.data() as UserProfile);
        } else {
          // If profile doesn't exist, create a basic one (e.g., for new users)
          // For now, assign a default role or handle as an error/incomplete setup
          // This part would be more robust with a proper user creation flow
          const defaultProfile: UserProfile = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || user.email?.split('@')[0] || 'Usuario',
            role: ROLES.PENSIONADO, // Default role, adjust as needed
          };
          await setDoc(userDocRef, defaultProfile);
          setUserProfile(defaultProfile);
          console.warn(`User profile for ${user.uid} not found in Firestore. Created a default one.`);
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
      setCurrentUser(null);
      setUserProfile(null);
      router.push('/login');
    } catch (error) {
      console.error("Error signing out: ", error);
      // Handle error (e.g., show toast)
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
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
