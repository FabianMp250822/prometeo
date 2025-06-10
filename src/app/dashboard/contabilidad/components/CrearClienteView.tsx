
"use client";

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, Save, UploadCloud } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

const predefinedGrupos = [
  { value: 'SUPRIMIDOS', label: 'SUPRIMIDOS' },
  { value: 'CORELCA', label: 'CORELCA' },
  { value: 'OCEANO_AZUL', label: 'OCEANO AZUL' },
  { value: 'NUEVA_OPCION', label: 'NUEVA OPCIÓN' },
];

const NUEVO_GRUPO_VALUE = "NUEVO_GRUPO_CUSTOM_VALUE";

const formSchema = z.object({
  aporteCostosOperativos: z.coerce.number({invalid_type_error: "Debe ser un número"}).positive({message: "Debe ser un valor positivo"}).default(1300000),
  grupo: z.string().min(1, "Seleccione un grupo"),
  nuevoGrupo: z.string().optional(),
  nombres: z.string().min(1, "Nombres son requeridos"),
  apellidos: z.string().min(1, "Apellidos son requeridos"),
  cedula: z.string().min(1, "Cédula es requerida"),
  direccion: z.string().min(1, "Dirección es requerida"),
  email: z.string().email({ message: "Correo electrónico inválido" }).optional().or(z.literal('')),
  telefonoFijo: z.string().regex(/^[0-9+ ]*$/, "Teléfono fijo inválido").optional().or(z.literal('')),
  celular: z.string().regex(/^[0-9+ ]*$/, "Número de celular inválido").min(7, "Celular debe tener al menos 7 dígitos"),
  multiplicadorSalarioMinimo: z.coerce.number({invalid_type_error: "Debe ser un número"}).min(0, "Debe ser un número positivo").default(2),
  salarioACancelar: z.coerce.number({invalid_type_error: "Debe ser un número"}).min(0, "Debe ser un valor positivo").default(2600000),
  plazoEnMeses: z.coerce.number({invalid_type_error: "Debe ser un número"}).int("Debe ser un número entero").min(0, "Debe ser un número entero positivo").default(0),
  convenioPago: z.instanceof(FileList).optional()
    .refine(files => !files || files.length === 0 || files[0].size <= 5 * 1024 * 1024, `El archivo no debe exceder 5MB.`)
    .refine(files => !files || files.length === 0 || ['application/pdf', 'image/jpeg', 'image/png'].includes(files[0].type), 'Solo se permiten archivos PDF, JPG, o PNG.')
}).refine(data => {
  if (data.grupo === NUEVO_GRUPO_VALUE) {
    return !!(data.nuevoGrupo && data.nuevoGrupo.trim() !== "");
  }
  return true;
}, {
  message: "Nombre del nuevo grupo es requerido cuando se selecciona '+ Nuevo Grupo'",
  path: ["nuevoGrupo"],
});

type FormValues = z.infer<typeof formSchema>;

export default function CrearClienteView() {
  const { toast } = useToast();
  const [showNuevoGrupoInput, setShowNuevoGrupoInput] = useState(false);
  const [currentGrupos, setCurrentGrupos] = useState([...predefinedGrupos]);
  const [fileName, setFileName] = useState<string | null>(null);

  const { register, handleSubmit, control, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { // Establecer valores por defecto aquí
      aporteCostosOperativos: 1300000,
      multiplicadorSalarioMinimo: 2,
      salarioACancelar: 2600000,
      plazoEnMeses: 0,
      grupo: '',
      nombres: '',
      apellidos: '',
      cedula: '',
      direccion: '',
      email: '',
      telefonoFijo: '',
      celular: '',
      nuevoGrupo: '',
    }
  });

  const selectedGrupo = watch("grupo");
  const nuevoGrupoWatched = watch("nuevoGrupo");

  useEffect(() => {
    if (selectedGrupo === NUEVO_GRUPO_VALUE) {
      setShowNuevoGrupoInput(true);
    } else {
      setShowNuevoGrupoInput(false);
      if (nuevoGrupoWatched) { // Solo resetear si había algo
          setValue("nuevoGrupo", "", { shouldValidate: false });
      }
    }
  }, [selectedGrupo, setValue, nuevoGrupoWatched]);

  const onSubmit = (data: FormValues) => {
    let grupoFinal = data.grupo;
    if (data.grupo === NUEVO_GRUPO_VALUE && data.nuevoGrupo) {
      const nuevoNombreGrupoUpper = data.nuevoGrupo.toUpperCase().trim();
      if (currentGrupos.some(g => g.value === nuevoNombreGrupoUpper)) {
        toast({
          title: "Error de Validación",
          description: `El grupo "${nuevoNombreGrupoUpper}" ya existe. Por favor, elija otro nombre o selecciónelo de la lista.`,
          variant: "destructive",
        });
        return;
      }
      // Simulación: No se añade a currentGrupos aquí para evitar re-renderizados complejos
      // En una app real, se enviaría al backend y la lista se actualizaría desde allí o un store global
      grupoFinal = nuevoNombreGrupoUpper;
      toast({
          title: "Nuevo Grupo Registrado (Simulación)",
          description: `El grupo "${nuevoNombreGrupoUpper}" ha sido registrado para este cliente.`,
      });
    }

    const dataToSubmit = {
      ...data,
      grupo: grupoFinal,
      convenioPago: data.convenioPago && data.convenioPago.length > 0 ? data.convenioPago[0] : null, // Enviar el objeto File
    };

    console.log('Cliente a crear:', dataToSubmit);
    toast({
      title: "Cliente Guardado (Simulación)",
      description: `El cliente ${data.nombres} ${data.apellidos} ha sido guardado (simulación). El archivo es: ${dataToSubmit.convenioPago?.name || 'Ninguno'}.`,
    });
  };
  
  const handleNuevoGrupoInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue("nuevoGrupo", e.target.value.toUpperCase(), { shouldValidate: true });
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setFileName(files[0].name);
      setValue("convenioPago", files, { shouldValidate: true });
    } else {
      setFileName(null);
      setValue("convenioPago", undefined, { shouldValidate: true });
    }
  };

  // Placeholder para Cuota Mensual
  const cuotaMensual = "$0.00"; // En una app real, esto se calcularía y actualizaría

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center text-xl font-headline text-primary">
          <UserPlus className="mr-3 h-6 w-6" />
          Inscripción de Cliente
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4 items-start">
            
            <div className="space-y-1 lg:col-span-2">
              <Label htmlFor="aporteCostosOperativos">Aporte Costos Operativos</Label>
              <Input id="aporteCostosOperativos" type="number" {...register("aporteCostosOperativos")} />
              {errors.aporteCostosOperativos && <p className="text-xs text-destructive mt-1">{errors.aporteCostosOperativos.message}</p>}
            </div>

            <div className="space-y-1 lg:col-span-2">
              <Label htmlFor="grupo">Grupo</Label>
              <Controller
                name="grupo"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value || ""} >
                    <SelectTrigger id="grupo-select-trigger">
                      <SelectValue placeholder="Seleccione un grupo" />
                    </SelectTrigger>
                    <SelectContent>
                      {currentGrupos.map((g) => (
                        <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                      ))}
                      <SelectItem value={NUEVO_GRUPO_VALUE}>+ Nuevo Grupo</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.grupo && <p className="text-xs text-destructive mt-1">{errors.grupo.message}</p>}
              {showNuevoGrupoInput && (
                <div className="mt-2 space-y-1">
                  <Label htmlFor="nuevoGrupo">Nombre del Nuevo Grupo</Label>
                  <Input 
                    id="nuevoGrupo" 
                    placeholder="ESCRIBA EL NUEVO GRUPO" 
                    value={nuevoGrupoWatched || ""} // Controlado
                    onChange={handleNuevoGrupoInputChange} // Para la conversión a mayúsculas
                    className="uppercase"
                  />
                  {errors.nuevoGrupo && <p className="text-xs text-destructive mt-1">{errors.nuevoGrupo.message}</p>}
                </div>
              )}
            </div>

            <div className="space-y-1 lg:col-span-2">
              <Label htmlFor="nombres">Nombres</Label>
              <Input id="nombres" {...register("nombres")} />
              {errors.nombres && <p className="text-xs text-destructive mt-1">{errors.nombres.message}</p>}
            </div>

            <div className="space-y-1 lg:col-span-2">
              <Label htmlFor="apellidos">Apellidos</Label>
              <Input id="apellidos" {...register("apellidos")} />
              {errors.apellidos && <p className="text-xs text-destructive mt-1">{errors.apellidos.message}</p>}
            </div>
            
            <div className="space-y-1 lg:col-span-1">
              <Label htmlFor="cedula">Cédula</Label>
              <Input id="cedula" {...register("cedula")} />
              {errors.cedula && <p className="text-xs text-destructive mt-1">{errors.cedula.message}</p>}
            </div>

            <div className="space-y-1 lg:col-span-3">
              <Label htmlFor="direccion">Dirección</Label>
              <Input id="direccion" placeholder="Ingrese la dirección del cliente" {...register("direccion")} />
              {errors.direccion && <p className="text-xs text-destructive mt-1">{errors.direccion.message}</p>}
            </div>

            <div className="space-y-1 lg:col-span-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input id="email" type="email" placeholder="ejemplo@correo.com" {...register("email")} />
              {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
            </div>

            <div className="space-y-1 lg:col-span-1">
              <Label htmlFor="telefonoFijo">Teléfono Fijo</Label>
              <Input id="telefonoFijo" type="tel" placeholder="Ej: 6012345678" {...register("telefonoFijo")} />
              {errors.telefonoFijo && <p className="text-xs text-destructive mt-1">{errors.telefonoFijo.message}</p>}
            </div>

            <div className="space-y-1 lg:col-span-1">
              <Label htmlFor="celular">Celular</Label>
              <Input id="celular" type="tel" placeholder="Ej: 3001234567" {...register("celular")} />
              {errors.celular && <p className="text-xs text-destructive mt-1">{errors.celular.message}</p>}
            </div>
            
            <div className="space-y-1">
              <Label htmlFor="multiplicadorSalarioMinimo">Multiplicador Salario Mínimo</Label>
              <Input id="multiplicadorSalarioMinimo" type="number" step="any" {...register("multiplicadorSalarioMinimo")} />
              {errors.multiplicadorSalarioMinimo && <p className="text-xs text-destructive mt-1">{errors.multiplicadorSalarioMinimo.message}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="salarioACancelar">Salario a Cancelar</Label>
              <Input id="salarioACancelar" type="number" step="any" {...register("salarioACancelar")} />
              {errors.salarioACancelar && <p className="text-xs text-destructive mt-1">{errors.salarioACancelar.message}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="plazoEnMeses">Plazo en Meses</Label>
              <Input id="plazoEnMeses" type="number" {...register("plazoEnMeses")} />
              {errors.plazoEnMeses && <p className="text-xs text-destructive mt-1">{errors.plazoEnMeses.message}</p>}
            </div>
            
            <div className="space-y-1">
              <Label htmlFor="cuotaMensual">Cuota Mensual</Label>
              <Input id="cuotaMensual" value={cuotaMensual} readOnly className="bg-muted/50 focus:ring-0" />
            </div>

            <div className="space-y-1 lg:col-span-4">
              <Label htmlFor="convenioPago-input-label">Carga Convenio de Pago</Label>
              <div className="flex items-center space-x-3">
                <Button type="button" variant="outline" onClick={() => document.getElementById('convenioPago-input')?.click()} className="shrink-0">
                    <UploadCloud className="mr-2 h-4 w-4" /> Elegir archivo
                </Button>
                <input 
                  id="convenioPago-input" 
                  type="file" 
                  className="hidden"
                  accept="application/pdf,image/jpeg,image/png"
                  onChange={handleFileChange}
                  {...register("convenioPago", { onChange: handleFileChange})} // Ensure RHF tracks it
                />
                {fileName && <span className="text-sm text-muted-foreground truncate max-w-xs" title={fileName}>{fileName}</span>}
                {!fileName && <span className="text-sm text-muted-foreground">No se eligió ningún archivo</span>}
              </div>
               {errors.convenioPago && <p className="text-xs text-destructive mt-1">{errors.convenioPago.message}</p>}
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button type="submit" className="w-full md:w-auto bg-primary hover:bg-primary/90 text-primary-foreground text-base px-8 py-3" disabled={isSubmitting}>
              <Save className="mr-2 h-5 w-5" />
              {isSubmitting ? 'Registrando...' : 'Registrar Cliente'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

