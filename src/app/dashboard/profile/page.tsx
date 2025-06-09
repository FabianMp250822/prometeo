"use client";

import { useAuth } from '@/hooks/useAuth';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mail, UserCircle, Shield, Edit3, Save } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase'; // Assuming db is exported from your firebase config

export default function ProfilePage() {
  const { userProfile, currentUser, loading: authLoading } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(userProfile?.displayName || '');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  if (authLoading) {
    return <div className="text-center p-10">Cargando perfil...</div>;
  }

  if (!userProfile || !currentUser) {
    return <div className="text-center p-10">No se pudo cargar la información del perfil.</div>;
  }

  const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };
  
  const handleSave = async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const userDocRef = doc(db, "users", currentUser.uid);
      await updateDoc(userDocRef, { displayName });
      // Note: AuthContext might need a refresh mechanism for userProfile
      // For now, we manually update local state for immediate feedback
      // This is a simplified update; ideally, AuthContext would refetch or update its state.
      toast({ title: "Perfil actualizado", description: "Tu nombre ha sido guardado." });
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({ title: "Error", description: "No se pudo actualizar el perfil.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <Card className="shadow-lg">
        <CardHeader className="text-center">
          <Avatar className="mx-auto h-24 w-24 mb-4 border-4 border-primary shadow-md">
            <AvatarImage src={currentUser.uid ? `https://avatar.vercel.sh/${currentUser.uid}.png?size=128` : undefined} alt={userProfile.displayName || 'Usuario'} data-ai-hint="user portrait" />
            <AvatarFallback className="text-3xl bg-primary/20 text-primary font-semibold">
              {getInitials(userProfile.displayName)}
            </AvatarFallback>
          </Avatar>
          <CardTitle className="text-3xl font-headline text-primary">
            {isEditing ? (
              <Input 
                value={displayName} 
                onChange={(e) => setDisplayName(e.target.value)}
                className="text-3xl font-headline text-primary text-center"
              />
            ) : (
              userProfile.displayName
            )}
          </CardTitle>
          <CardDescription className="text-lg">
            Gestiona la información de tu perfil.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-md">
            <Mail className="h-5 w-5 text-primary" />
            <div>
              <Label htmlFor="email" className="text-xs text-muted-foreground">Email</Label>
              <p id="email" className="text-md font-medium">{userProfile.email}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-md">
            <UserCircle className="h-5 w-5 text-primary" />
            <div>
              <Label htmlFor="displayNameLabel" className="text-xs text-muted-foreground">Nombre para Mostrar</Label>
              {isEditing ? (
                <Input 
                  id="displayNameEdit"
                  value={displayName} 
                  onChange={(e) => setDisplayName(e.target.value)} 
                  className="text-md font-medium"
                />
              ) : (
                <p id="displayNameLabel" className="text-md font-medium">{displayName || userProfile.displayName}</p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-md">
            <Shield className="h-5 w-5 text-primary" />
            <div>
              <Label htmlFor="role" className="text-xs text-muted-foreground">Rol</Label>
              <Badge id="role" variant="secondary" className="capitalize text-md bg-accent text-accent-foreground">{userProfile.role}</Badge>
            </div>
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={() => { setIsEditing(false); setDisplayName(userProfile.displayName || ''); }}>Cancelar</Button>
                <Button onClick={handleSave} disabled={isLoading}>
                  {isLoading ? <Save className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Guardar
                </Button>
              </>
            ) : (
              <Button onClick={() => setIsEditing(true)}>
                <Edit3 className="mr-2 h-4 w-4" /> Editar Perfil
              </Button>
            )}
          </div>

        </CardContent>
      </Card>
    </div>
  );
}
