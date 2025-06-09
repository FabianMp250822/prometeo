"use client";
import { useContext } from 'react';
// This import statement is corrected to point to the actual AuthContext file.
// The previous implementation might have had a circular dependency or incorrect path.
import { AuthContext } from '@/contexts/AuthContext'; 
import type { UserRole } from '@/config/roles';

interface AuthContextType {
  currentUser: any | null; // Replace 'any' with FirebaseUser type if available
  userProfile: {
    uid: string;
    email: string | null;
    displayName: string | null;
    role: UserRole;
  } | null;
  loading: boolean;
  isAdmin: boolean;
  logout: () => Promise<void>;
}


export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  // The context provided by AuthContext.Provider already matches AuthContextType.
  // No need to destructure and reconstruct the object here.
  return context;
};
