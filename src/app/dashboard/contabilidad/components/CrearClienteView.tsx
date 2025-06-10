
"use client";

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { UserPlus, Save } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

export default function CrearClienteView() {
  const [nombre, setNombre] = useState('');
  const [identificacion, setIdentificacion] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [selectedGrupo, setSelectedGrupo] = useState<string>('');
  const { toast } = useToast();

  const grupos = [
    { value: 'suprimidos', label: 'SUPRIMIDOS' },
    { value: 'corelca', label: 'CORELCA' },
    { value: 'oceano_azul', label: 'OCEANO AZUL' },
    { value: 'nueva_opcion', label: 'NUEVA OPCIÓN' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Lógica para guardar el nuevo cliente
    if (!selectedGrupo) {
      toast({
        title: "Campo requerido",
        description: "Por favor, seleccione un grupo.",
        variant: "destructive",
      });
      return;
    }
    console.log('Cliente a crear:', {
      nombre,
      identificacion,
      email,
      telefono,
      grupo: selectedGrupo,
    });
    toast({
      title: "Cliente Guardado (Simulación)",
      description: `El cliente ${nombre || 'Nuevo Cliente'} con grupo ${selectedGrupo} ha sido guardado (simulación).`,
    });
    // Aquí podrías resetear el formulario si lo deseas
    // setNombre('');
    // setIdentificacion('');
    // setEmail('');
    // setTelefono('');
    // setSelectedGrupo('');
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center text-xl font-headline text-primary">
          <UserPlus className="mr-3 h-6 w-6" />
          Crear Nuevo Cliente
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="nombre-cliente" className="font-medium">Nombre del Cliente</Label>
              <Input 
                id="nombre-cliente" 
                placeholder="Ingrese el nombre completo" 
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="identificacion-cliente" className="font-medium">Identificación (NIT/C.C.)</Label>
              <Input 
                id="identificacion-cliente" 
                placeholder="Ingrese el número de identificación" 
                value={identificacion}
                onChange={(e) => setIdentificacion(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="email-cliente" className="font-medium">Correo Electrónico</Label>
              <Input 
                id="email-cliente" 
                type="email"
                placeholder="ejemplo@correo.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefono-cliente" className="font-medium">Teléfono</Label>
              <Input 
                id="telefono-cliente" 
                type="tel"
                placeholder="Ingrese el número de teléfono" 
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="grupo-select" className="font-medium">Grupo:</Label>
            <Select value={selectedGrupo} onValueChange={setSelectedGrupo}>
              <SelectTrigger id="grupo-select" className="w-full md:w-[300px]">
                <SelectValue placeholder="Seleccione un grupo" />
              </SelectTrigger>
              <SelectContent>
                {/* The SelectItem with value="" was removed from here */}
                {grupos.map((grupo) => (
                  <SelectItem key={grupo.value} value={grupo.value}>
                    {grupo.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end pt-4">
            <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Save className="mr-2 h-4 w-4" />
              Guardar Cliente
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
