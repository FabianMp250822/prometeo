"use client";

import { useAuth } from '@/hooks/useAuth';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Briefcase } from 'lucide-react';

export default function WelcomeMessage() {
  const { userProfile } = useAuth();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  };

  const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="flex flex-row items-center space-x-4 pb-4">
        <Avatar className="h-16 w-16 border-2 border-primary">
          <AvatarImage src={userProfile?.uid ? `https://avatar.vercel.sh/${userProfile.uid}.png?size=128` : undefined} alt={userProfile?.displayName || 'Usuario'} data-ai-hint="user avatar"/>
          <AvatarFallback className="text-2xl bg-primary/20 text-primary font-semibold">
            {getInitials(userProfile?.displayName)}
          </AvatarFallback>
        </Avatar>
        <div>
          <CardTitle className="text-2xl font-headline text-primary">
            {getGreeting()}, {userProfile?.displayName || 'Usuario'}!
          </CardTitle>
          <CardDescription className="text-md text-muted-foreground">
            Bienvenido de nuevo a ConsorcioManager.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-2">
          <Briefcase className="h-5 w-5 text-accent" />
          <p className="text-sm text-foreground">Tu rol actual es:</p>
          <Badge variant="secondary" className="text-sm capitalize bg-accent text-accent-foreground">
            {userProfile?.role || 'No asignado'}
          </Badge>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Desde aquí puedes acceder a todas las herramientas y funcionalidades para gestionar el consorcio.
        </p>
      </CardContent>
    </Card>
  );
}
