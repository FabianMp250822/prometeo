
"use client";

import { useAuth } from '@/hooks/useAuth';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Mail, UserCircle, Shield, Edit3, Save, Home, Phone, CalendarIcon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format, parseISO } from 'date-fns';

const USERS_COLLECTION = "prometeo_users";

export default function ProfilePage() {
  const { userProfile, currentUser, loading: authLoading } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState<Date | undefined>(undefined);
  
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (userProfile) {
      setDisplayName(userProfile.displayName || '');
      setAddress(userProfile.address || '');
      setPhone(userProfile.phone || '');
      if (userProfile.birthDate) {
        try {
          setBirthDate(parseISO(userProfile.birthDate));
        } catch (e) {
          console.error("Error parsing birthDate:", e);
          setBirthDate(undefined);
        }
      } else {
        setBirthDate(undefined);
      }
    }
  }, [userProfile]);

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
      const userDocRef = doc(db, USERS_COLLECTION, currentUser.uid);
      const updatedData: any = { 
        displayName,
        address,
        phone,
        birthDate: birthDate ? format(birthDate, 'yyyy-MM-dd') : null,
      };
      await updateDoc(userDocRef, updatedData);
      toast({ title: "Perfil actualizado", description: "Tu información ha sido guardada." });
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({ title: "Error", description: "No se pudo actualizar el perfil.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    if (userProfile) {
      setDisplayName(userProfile.displayName || '');
      setAddress(userProfile.address || '');
      setPhone(userProfile.phone || '');
      if (userProfile.birthDate) {
         try {
          setBirthDate(parseISO(userProfile.birthDate));
        } catch (e) { setBirthDate(undefined); }
      } else {
        setBirthDate(undefined);
      }
    }
  }

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
            <Home className="h-5 w-5 text-primary" />
            <div>
              <Label htmlFor="addressLabel" className="text-xs text-muted-foreground">Dirección</Label>
              {isEditing ? (
                <Input 
                  id="addressEdit"
                  value={address} 
                  onChange={(e) => setAddress(e.target.value)} 
                  placeholder="Ej: Calle Falsa 123, Ciudad"
                  className="text-md font-medium"
                />
              ) : (
                <p id="addressLabel" className="text-md font-medium">{address || "No especificada"}</p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-md">
            <Phone className="h-5 w-5 text-primary" />
            <div>
              <Label htmlFor="phoneLabel" className="text-xs text-muted-foreground">Teléfono</Label>
              {isEditing ? (
                <Input 
                  id="phoneEdit"
                  type="tel"
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value)} 
                  placeholder="Ej: +1 555 123456"
                  className="text-md font-medium"
                />
              ) : (
                <p id="phoneLabel" className="text-md font-medium">{phone || "No especificado"}</p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-md">
            <CalendarIcon className="h-5 w-5 text-primary" />
            <div>
              <Label htmlFor="birthDateLabel" className="text-xs text-muted-foreground">Fecha de Nacimiento</Label>
              {isEditing ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className="w-full justify-start text-left font-normal text-md"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {birthDate ? format(birthDate, "PPP") : <span>Selecciona una fecha</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={birthDate}
                      onSelect={setBirthDate}
                      initialFocus
                      captionLayout="dropdown-buttons"
                      fromYear={1900}
                      toYear={new Date().getFullYear()}
                    />
                  </PopoverContent>
                </Popover>
              ) : (
                <p id="birthDateLabel" className="text-md font-medium">{birthDate ? format(birthDate, "PPP") : "No especificada"}</p>
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
                <Button variant="outline" onClick={handleCancelEdit}>Cancelar</Button>
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
