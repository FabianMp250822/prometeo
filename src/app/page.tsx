"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from "@/components/ui/skeleton";

export default function HomePage() {
  const { currentUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Only redirect once the authentication state is determined (loading is false)
    if (!loading) {
      if (currentUser) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [currentUser, loading, router]);

  // Render the loading skeleton UI while authentication is in progress or before redirect happens
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <Skeleton className="h-12 w-12 rounded-full bg-primary/20 mb-4" />
      <Skeleton className="h-4 w-[250px] bg-primary/20 mb-2" />
      <Skeleton className="h-4 w-[200px] bg-primary/20" />
      <p className="mt-4 text-sm text-muted-foreground">Cargando Prometeo...</p>
    </div>
  );
}
