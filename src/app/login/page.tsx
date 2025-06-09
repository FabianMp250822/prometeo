"use client";

import LoginForm from '@/components/auth/LoginForm';
import AuthLayout from '@/components/auth/AuthLayout';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function LoginPage() {
  const { currentUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && currentUser) {
      router.replace('/dashboard');
    }
  }, [currentUser, loading, router]);

  if (loading || (!loading && currentUser) ) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        <p className="ml-4 text-primary">Cargando...</p>
      </div>
    );
  }
  
  return (
    <AuthLayout title="Iniciar Sesión">
      <LoginForm />
    </AuthLayout>
  );
}
