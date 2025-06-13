
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
import { Mail, UserCircle, Shield, Edit3, Save, Home, Phone, CalendarIcon, X, UploadCloud, Camera } from 'lucide-react';
import { useState, useEffect, useRef, ChangeEvent } from 'react';
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { format, parseISO, isValid } from 'date-fns';
import Image from 'next/image';

const USERS_COLLECTION = "prometeo_users";

export default function ProfilePage() {
  const { userProfile, currentUser, loading: authLoading } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState<Date | undefined>(undefined);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewURL, setPreviewURL] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (userProfile) {
      setDisplayName(userProfile.displayName || '');
      setAddress(userProfile.address || '');
      setPhone(userProfile.phone || '');
      setPreviewURL(userProfile.photoURL); // Initialize preview with existing photoURL
      if (userProfile.birthDate) {
        try {
          const dateString = typeof userProfile.birthDate === 'string' ? userProfile.birthDate : String(userProfile.birthDate);
          const parsedDate = parseISO(dateString);
          if (isValid(parsedDate)) {
            setBirthDate(parsedDate);
          } else {
            console.warn("Invalid birthDate from Firestore:", userProfile.birthDate);
            setBirthDate(undefined);
          }
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
    if (!name || name.trim() === '') return 'U';
    const trimmedName = name.trim();
    const names = trimmedName.split(' ').filter(n => n); 

    if (names.length > 1) { 
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    if (names.length === 1 && names[0].length > 0) { 
      return names[0].substring(0, Math.min(names[0].length, 2)).toUpperCase();
    }
    return 'U';
  };
  
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        toast({
          title: "Archivo muy grande",
          description: "La imagen no debe exceder los 2MB.",
          variant: "destructive",
        });
        return;
      }
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        toast({
          title: "Formato no válido",
          description: "Solo se permiten imágenes JPG, PNG o WEBP.",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
      setPreviewURL(URL.createObjectURL(file));
    }
  };

  const triggerFileSelect = () => {
    if (isEditing) {
      fileInputRef.current?.click();
    }
  };

  const handleSave = async () => {
    if (!currentUser) return;
    setIsLoading(true);
    let newPhotoURL = userProfile.photoURL; // Keep existing photoURL by default

    try {
      if (selectedFile) {
        const fileExtension = selectedFile.name.split('.').pop();
        const imagePath = `profile_images/${currentUser.uid}/profile_pic.${fileExtension}`;
        const imageRef = storageRef(storage, imagePath);
        await uploadBytes(imageRef, selectedFile);
        newPhotoURL = await getDownloadURL(imageRef);
        toast({ title: "Foto de perfil actualizada", description: "Tu nueva foto ha sido guardada." });
      }

      const updatedData: any = { 
        displayName: displayName.trim() || null,
        address: address.trim() || null,
        phone: phone.trim() || null,
        birthDate: birthDate ? format(birthDate, 'yyyy-MM-dd') : null,
        photoURL: newPhotoURL,
      };
      const userDocRef = doc(db, USERS_COLLECTION, currentUser.uid);
      await updateDoc(userDocRef, updatedData);
      
      toast({ title: "Perfil actualizado", description: "Tu información ha sido guardada." });
      setIsEditing(false);
      setSelectedFile(null); // Clear selected file after successful save
      // PreviewURL will be updated by the AuthContext listener picking up the new photoURL from Firestore.
      // Or, if no new file was uploaded, previewURL (which should be userProfile.photoURL) remains correct.
      // For immediate visual feedback if only photo changed: setPreviewURL(newPhotoURL);
      if(newPhotoURL !== userProfile.photoURL) setPreviewURL(newPhotoURL);


    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast({ title: "Error", description: error.message || "No se pudo actualizar el perfil.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const resetFormFieldsAndPhoto = () => {
    if (userProfile) {
      setDisplayName(userProfile.displayName || '');
      setAddress(userProfile.address || '');
      setPhone(userProfile.phone || '');
      setPreviewURL(userProfile.photoURL); // Reset preview to stored photoURL
      setSelectedFile(null); // Clear any selected file
      if (userProfile.birthDate) {
         try {
          const dateString = typeof userProfile.birthDate === 'string' ? userProfile.birthDate : String(userProfile.birthDate);
          const parsedDate = parseISO(dateString);
          if (isValid(parsedDate)) {
            setBirthDate(parsedDate);
          } else {
            setBirthDate(undefined);
          }
        } catch (e) { setBirthDate(undefined); }
      } else {
        setBirthDate(undefined);
      }
    }
  }

  const handleCancelEdit = () => {
    setIsEditing(false);
    resetFormFieldsAndPhoto();
  }
  
  const avatarSrc = previewURL || `https://avatar.vercel.sh/${currentUser.uid}.png?size=128`;


  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <Card className="shadow-lg">
        <CardHeader className="text-center relative">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/png, image/jpeg, image/webp"
            className="hidden"
            disabled={!isEditing || isLoading}
          />
          <div 
            className={`mx-auto relative group ${isEditing ? 'cursor-pointer' : ''}`}
            onClick={isEditing ? triggerFileSelect : undefined}
          >
            <Avatar className="h-24 w-24 mb-4 border-4 border-primary shadow-md">
              <AvatarImage 
                src={avatarSrc}  // Use previewURL if available, then userProfile.photoURL, then Vercel default
                alt={displayName || userProfile.displayName || 'Usuario'} 
              />
              <AvatarFallback className="text-3xl bg-primary/20 text-primary font-semibold">
                {getInitials(displayName || userProfile.displayName)}
              </AvatarFallback>
            </Avatar>
            {isEditing && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 rounded-full transition-opacity duration-200">
                <Camera className="h-8 w-8 text-white" />
              </div>
            )}
          </div>

          <CardTitle className="text-3xl font-headline text-primary">
            {isEditing ? (
              <Input 
                value={displayName} 
                onChange={(e) => setDisplayName(e.target.value)}
                className="text-3xl font-headline text-primary md:text-left w-full text-center"
                placeholder="Nombre Completo"
                disabled={isLoading}
              />
            ) : (
              displayName || userProfile.displayName || "Nombre no disponible"
            )}
          </CardTitle>
          <CardDescription className="text-lg text-muted-foreground">
            Gestiona la información de tu perfil y tu foto.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="grid md:grid-cols-2 md:gap-x-8 md:gap-y-6 space-y-6 md:space-y-0">
            {/* Email field */}
            <div className="flex items-start space-x-3 p-3 bg-muted/50 rounded-md md:col-span-1">
              <Mail className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
              <div>
                <Label htmlFor="email" className="text-xs text-muted-foreground">Email</Label>
                <p id="email" className="text-md font-medium break-words">{userProfile.email || "Email no disponible"}</p>
              </div>
            </div>
            
            {/* Role field */}
            <div className="flex items-start space-x-3 p-3 bg-muted/50 rounded-md md:col-span-1">
              <Shield className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
              <div>
                <Label htmlFor="role" className="text-xs text-muted-foreground">Rol</Label>
                <Badge id="role" variant="secondary" className="capitalize text-md bg-accent text-accent-foreground">{userProfile.role}</Badge>
              </div>
            </div>

            {/* Address field */}
            <div className="flex items-start space-x-3 p-3 bg-muted/50 rounded-md md:col-span-2">
              <Home className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
              <div className="w-full">
                <Label htmlFor="addressLabel" className="text-xs text-muted-foreground">Dirección</Label>
                {isEditing ? (
                  <Input 
                    id="addressEdit"
                    value={address} 
                    onChange={(e) => setAddress(e.target.value)} 
                    placeholder="Ej: Calle Falsa 123, Ciudad"
                    className="text-md font-medium"
                    disabled={isLoading}
                  />
                ) : (
                  <p id="addressLabel" className="text-md font-medium break-words">{address || userProfile.address || "No especificada"}</p>
                )}
              </div>
            </div>

            {/* Phone field */}
            <div className="flex items-start space-x-3 p-3 bg-muted/50 rounded-md md:col-span-1">
              <Phone className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
              <div className="w-full">
                <Label htmlFor="phoneLabel" className="text-xs text-muted-foreground">Teléfono</Label>
                {isEditing ? (
                  <Input 
                    id="phoneEdit"
                    type="tel"
                    value={phone} 
                    onChange={(e) => setPhone(e.target.value)} 
                    placeholder="Ej: +1 555 123456"
                    className="text-md font-medium"
                    disabled={isLoading}
                  />
                ) : (
                  <p id="phoneLabel" className="text-md font-medium break-words">{phone || userProfile.phone || "No especificado"}</p>
                )}
              </div>
            </div>

            {/* BirthDate field */}
            <div className="flex items-start space-x-3 p-3 bg-muted/50 rounded-md md:col-span-1">
              <CalendarIcon className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
              <div className="w-full">
                <Label htmlFor="birthDateLabel" className="text-xs text-muted-foreground">Fecha de Nacimiento</Label>
                {isEditing ? (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className="w-full justify-start text-left font-normal text-md"
                        disabled={isLoading}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {birthDate ? format(birthDate, "PPP", { useAdditionalWeekYearTokens: false, useAdditionalDayOfYearTokens: false }) : <span>Selecciona una fecha</span>}
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
                        disabled={isLoading}
                      />
                    </PopoverContent>
                  </Popover>
                ) : (
                  <p id="birthDateLabel" className="text-md font-medium">
                    {userProfile.birthDate && isValid(parseISO(typeof userProfile.birthDate === 'string' ? userProfile.birthDate : String(userProfile.birthDate))) 
                      ? format(parseISO(typeof userProfile.birthDate === 'string' ? userProfile.birthDate : String(userProfile.birthDate)), "PPP", { useAdditionalWeekYearTokens: false, useAdditionalDayOfYearTokens: false }) 
                      : "No especificada"}
                  </p>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={handleCancelEdit} disabled={isLoading}>
                  <X className="mr-2 h-4 w-4" />
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
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

