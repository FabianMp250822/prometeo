
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UserCog, Search, Edit, Save, X, CalendarIcon, Users } from 'lucide-react';
import type { UserRole } from '@/config/roles';
import { ROLES, ALL_ROLES } from '@/config/roles';
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';

const USERS_COLLECTION = "prometeo_users";

interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: UserRole;
  address: string | null;
  phone: string | null;
  birthDate: string | null; // Stored as ISO string "YYYY-MM-DD" or null
}

const editUserSchema = z.object({
  displayName: z.string().min(1, "Nombre es requerido."),
  role: z.enum(ALL_ROLES, { required_error: "Rol es requerido." }),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  birthDate: z.date().optional().nullable(),
});

type EditUserFormValues = z.infer<typeof editUserSchema>;

export default function EditarUsuarioContableView() {
  const { toast } = useToast();
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const { control, register, handleSubmit, reset, setValue, formState: { errors } } = useForm<EditUserFormValues>({
    resolver: zodResolver(editUserSchema),
  });

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const usersSnapshot = await getDocs(collection(db, USERS_COLLECTION));
      const fetchedUsers = usersSnapshot.docs.map(docSnap => ({ uid: docSnap.id, ...docSnap.data() } as UserProfile));
      setUsersList(fetchedUsers);
      setFilteredUsers(fetchedUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({ title: "Error", description: "No se pudieron cargar los usuarios.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [toast]);

  useEffect(() => {
    const lowercasedFilter = searchTerm.toLowerCase();
    const filteredData = usersList.filter(user =>
      (user.displayName?.toLowerCase() || '').includes(lowercasedFilter) ||
      (user.email?.toLowerCase() || '').includes(lowercasedFilter) ||
      (user.uid?.toLowerCase() || '').includes(lowercasedFilter)
    );
    setFilteredUsers(filteredData);
  }, [searchTerm, usersList]);

  const handleEditUser = (user: UserProfile) => {
    setSelectedUser(user);
    reset({
      displayName: user.displayName || '',
      role: user.role || ROLES.PENSIONADO, // Default to Pensionado if role is missing
      address: user.address || '',
      phone: user.phone || '',
      birthDate: user.birthDate && isValid(parseISO(user.birthDate)) ? parseISO(user.birthDate) : undefined,
    });
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setSelectedUser(null);
    setIsEditing(false);
    reset();
  };

  const onSubmit: SubmitHandler<EditUserFormValues> = async (data) => {
    if (!selectedUser) return;
    setIsSaving(true);
    try {
      const userDocRef = doc(db, USERS_COLLECTION, selectedUser.uid);
      const updatedData: Partial<UserProfile> = {
        displayName: data.displayName,
        role: data.role,
        address: data.address || null,
        phone: data.phone || null,
        birthDate: data.birthDate ? format(data.birthDate, 'yyyy-MM-dd') : null,
      };
      await updateDoc(userDocRef, updatedData);
      toast({ title: "Usuario Actualizado", description: "La información del usuario ha sido guardada." });
      setIsEditing(false);
      setSelectedUser(null);
      fetchUsers(); // Re-fetch users to reflect changes
    } catch (error) {
      console.error("Error updating user:", error);
      toast({ title: "Error", description: "No se pudo actualizar el usuario.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading && !isEditing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-xl font-headline text-primary"><UserCog className="mr-3 h-6 w-6" />Cargando Usuarios...</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center py-10">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (isEditing && selectedUser) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-xl font-headline text-primary">
            <Edit className="mr-3 h-6 w-6" />
            Editar Usuario: {selectedUser.displayName || selectedUser.email}
          </CardTitle>
          <CardDescription>Modifique los detalles del usuario y guarde los cambios.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              <div className="space-y-1">
                <Label htmlFor="uid">UID (No editable)</Label>
                <Input id="uid" value={selectedUser.uid} readOnly className="bg-muted/50" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="email">Email (No editable)</Label>
                <Input id="email" value={selectedUser.email || 'N/A'} readOnly className="bg-muted/50" />
              </div>

              <div className="space-y-1">
                <Label htmlFor="displayNameEdit">Nombre Completo</Label>
                <Input id="displayNameEdit" {...register("displayName")} />
                {errors.displayName && <p className="text-xs text-destructive mt-1">{errors.displayName.message}</p>}
              </div>

              <div className="space-y-1">
                <Label htmlFor="roleEdit">Rol</Label>
                <Controller
                  name="role"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger id="roleEdit">
                        <SelectValue placeholder="Seleccione un rol" />
                      </SelectTrigger>
                      <SelectContent>
                        {ALL_ROLES.map((roleName) => (
                          <SelectItem key={roleName} value={roleName}>{roleName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.role && <p className="text-xs text-destructive mt-1">{errors.role.message}</p>}
              </div>
              
              <div className="md:col-span-2 space-y-1">
                <Label htmlFor="addressEdit">Dirección</Label>
                <Input id="addressEdit" {...register("address")} placeholder="Ej: Calle 123, Ciudad" />
                {errors.address && <p className="text-xs text-destructive mt-1">{errors.address.message}</p>}
              </div>

              <div className="space-y-1">
                <Label htmlFor="phoneEdit">Teléfono</Label>
                <Input id="phoneEdit" type="tel" {...register("phone")} placeholder="Ej: 3001234567" />
                {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone.message}</p>}
              </div>

              <div className="space-y-1">
                <Label htmlFor="birthDateEdit">Fecha de Nacimiento</Label>
                <Controller
                  name="birthDate"
                  control={control}
                  render={({ field }) => (
                     <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccione fecha</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={field.value || undefined}
                          onSelect={field.onChange}
                          initialFocus
                          captionLayout="dropdown-buttons"
                          fromYear={1900}
                          toYear={new Date().getFullYear()}
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                />
                {errors.birthDate && <p className="text-xs text-destructive mt-1">{errors.birthDate.message}</p>}
              </div>
            </div>
            <CardFooter className="px-0 pt-6 flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={handleCancelEdit} disabled={isSaving}>
                <X className="mr-2 h-4 w-4" /> Cancelar
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Guardar Cambios
              </Button>
            </CardFooter>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center text-xl font-headline text-primary">
          <UserCog className="mr-3 h-6 w-6" />
          Editar Usuarios
        </CardTitle>
        <CardDescription>Busque y seleccione un usuario para modificar sus detalles.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <Label htmlFor="searchUser" className="sr-only">Buscar Usuario</Label>
          <div className="relative">
             <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="searchUser"
              type="search"
              placeholder="Buscar por nombre, email o UID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-full md:max-w-md"
            />
          </div>
        </div>

        {filteredUsers.length === 0 && !isLoading ? (
          <div className="text-center py-10 text-muted-foreground">
            <Users className="mx-auto h-12 w-12 mb-3 text-primary/30"/>
            <p>No se encontraron usuarios que coincidan con su búsqueda o no hay usuarios registrados.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.uid}>
                    <TableCell>{user.displayName || 'N/A'}</TableCell>
                    <TableCell>{user.email || 'N/A'}</TableCell>
                    <TableCell><span className="capitalize">{user.role || 'N/A'}</span></TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => handleEditUser(user)}>
                        <Edit className="mr-1.5 h-3.5 w-3.5" /> Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {/* TODO: Add pagination if many users */}
      </CardContent>
    </Card>
  );
}
