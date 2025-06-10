
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, Save, UploadCloud, Search, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { db, storage } from '@/lib/firebase'; // Asegúrate que la ruta sea correcta
import { doc, getDoc, setDoc, collection, addDoc, Timestamp } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

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
  cedula: z.string().min(5, "Cédula es requerida y debe tener al menos 5 caracteres"),
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
  const [isVerifyingCedula, setIsVerifyingCedula] = useState<boolean>(false);
  const [calculatedCuotaMensual, setCalculatedCuotaMensual] = useState<string>('$0.00');
  // const [pensionadoDataFromDB, setPensionadoDataFromDB] = useState<any>(null); // Podría usarse para lógica más compleja

  const { register, handleSubmit, control, watch, setValue, getValues, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
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
  const salarioACancelarWatched = watch("salarioACancelar");
  const plazoEnMesesWatched = watch("plazoEnMeses");

  useEffect(() => {
    if (selectedGrupo === NUEVO_GRUPO_VALUE) {
      setShowNuevoGrupoInput(true);
    } else {
      setShowNuevoGrupoInput(false);
      if (nuevoGrupoWatched) {
          setValue("nuevoGrupo", "", { shouldValidate: false });
      }
    }
  }, [selectedGrupo, setValue, nuevoGrupoWatched]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  };

  useEffect(() => {
    const salario = Number(salarioACancelarWatched);
    const plazo = Number(plazoEnMesesWatched);

    if (!isNaN(salario) && !isNaN(plazo)) {
      if (plazo > 0) {
        setCalculatedCuotaMensual(formatCurrency(salario / plazo));
      } else {
        setCalculatedCuotaMensual(formatCurrency(salario)); // Si plazo es 0, cuota es el total
      }
    } else {
      setCalculatedCuotaMensual(formatCurrency(0));
    }
  }, [salarioACancelarWatched, plazoEnMesesWatched]);


  const handleVerificarCedula = async () => {
    const cedula = getValues("cedula");
    if (!cedula || cedula.trim().length < 5) {
      toast({ title: "Error", description: "Por favor, ingrese una cédula válida.", variant: "destructive" });
      return;
    }
    setIsVerifyingCedula(true);
    try {
      const pensionadoDocRef = doc(db, "pensionados", cedula.trim());
      const docSnap = await getDoc(pensionadoDocRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        // Autocompletar campos
        setValue("nombres", data.nombres || "");
        setValue("apellidos", data.apellidos || "");
        setValue("direccion", data.direccion || "");
        setValue("email", data.email || "");
        setValue("telefonoFijo", data.telefonoFijo || "");
        setValue("celular", data.celular || "");
        // Campos relacionados con el proceso de pago no se autocompletan desde aquí, se ingresan nuevos
        // setValue("aporteCostosOperativos", data.aporteCostosOperativos || 1300000);
        // setValue("multiplicadorSalarioMinimo", data.multiplicadorSalarioMinimo || 2);
        // setValue("salarioACancelar", data.salarioACancelar || 2600000);
        // setValue("plazoEnMeses", data.plazoEnMeses || 0);
        // setValue("grupo", data.grupo || ""); 
        // No autocompletar grupo para permitir crear un nuevo proceso de pago con grupo diferente.
        
        toast({ title: "Pensionado Encontrado", description: "Datos del pensionado cargados en el formulario.", variant: "default" });
      } else {
        toast({ title: "Pensionado No Encontrado", description: "Puede continuar para registrar un nuevo cliente.", variant: "default" });
        // Opcional: limpiar campos si se desea que no queden datos de una búsqueda anterior
        // setValue("nombres", "");
        // setValue("apellidos", "");
      }
    } catch (error) {
      console.error("Error verificando cédula:", error);
      toast({ title: "Error de Verificación", description: "No se pudo verificar la cédula.", variant: "destructive" });
    } finally {
      setIsVerifyingCedula(false);
    }
  };

  const onSubmit = async (data: FormValues) => {
    let grupoFinal = data.grupo;
    if (data.grupo === NUEVO_GRUPO_VALUE && data.nuevoGrupo) {
      const nuevoNombreGrupoUpper = data.nuevoGrupo.toUpperCase().trim();
      if (currentGrupos.some(g => g.value === nuevoNombreGrupoUpper)) {
        toast({
          title: "Error de Validación",
          description: `El grupo "${nuevoNombreGrupoUpper}" ya existe. Por favor, elija otro nombre o selecciónelo de la lista.`,
          variant: "destructive",
        });
        return; // Detener el envío
      }
      grupoFinal = nuevoNombreGrupoUpper;
      // Opcional: añadir a currentGrupos para la sesión actual, o manejarlo globalmente si es necesario
      // setCurrentGrupos(prev => [...prev, { value: nuevoNombreGrupoUpper, label: nuevoNombreGrupoUpper}]);
      toast({
          title: "Nuevo Grupo Registrado",
          description: `El grupo "${nuevoNombreGrupoUpper}" se usará para este cliente.`,
      });
    }

    let convenioPagoUrl: string | null = null;
    if (data.convenioPago && data.convenioPago.length > 0) {
      const file = data.convenioPago[0];
      const fileStorageRef = storageRef(storage, `convenios_pago/${data.cedula}/${file.name}`);
      try {
        await uploadBytes(fileStorageRef, file);
        convenioPagoUrl = await getDownloadURL(fileStorageRef);
        toast({ title: "Archivo Subido", description: "Convenio de pago cargado exitosamente." });
      } catch (error) {
        console.error("Error subiendo archivo:", error);
        toast({ title: "Error de Archivo", description: "No se pudo subir el convenio de pago.", variant: "destructive" });
        return; // Detener si la subida del archivo falla
      }
    }

    const pensionadoDataToSave = {
      nombres: data.nombres,
      apellidos: data.apellidos,
      cedula: data.cedula, // Usado como ID, también se guarda como campo
      direccion: data.direccion,
      email: data.email || null,
      telefonoFijo: data.telefonoFijo || null,
      celular: data.celular,
      // Los siguientes campos son específicos del proceso y también se podrían guardar en el pensionado
      // o manejar solo en la subcolección pagos_procesos si se prefiere no duplicar.
      // Por ahora, los guardaremos también a nivel de pensionado para consistencia con autocompletado básico.
      // Podría decidirse que algunos de estos solo van a la subcolección.
      ultimoAporteCostosOperativos: data.aporteCostosOperativos,
      ultimoGrupoCliente: grupoFinal,
      ultimoMultiplicadorSalarioMinimo: data.multiplicadorSalarioMinimo,
      ultimoSalarioACancelar: data.salarioACancelar,
      ultimoPlazoEnMeses: data.plazoEnMeses,
      convenioPagoUrl: convenioPagoUrl, // URL del último convenio
      fechaUltimaActualizacion: Timestamp.now(),
    };

    const procesoPagoData = {
      aporteCostosOperativos: data.aporteCostosOperativos,
      grupoCliente: grupoFinal,
      multiplicadorSalarioMinimo: data.multiplicadorSalarioMinimo,
      salarioACancelar: data.salarioACancelar,
      plazoEnMeses: data.plazoEnMeses,
      cuotaMensualCalculada: parseFloat(calculatedCuotaMensual.replace(/[$.]/g, '').replace(',', '.')) || 0,
      convenioPagoUrl: convenioPagoUrl,
      fechaCreacionProceso: Timestamp.now(),
      estadoProceso: 'Pendiente', // Estado inicial del proceso
    };

    try {
      // Guardar/Actualizar en la colección 'pensionados'
      const pensionadoDocRef = doc(db, "pensionados", data.cedula.trim());
      await setDoc(pensionadoDocRef, pensionadoDataToSave, { merge: true });

      // Guardar en la subcolección 'pagos_procesos'
      const pagosProcesosColRef = collection(db, "pensionados", data.cedula.trim(), "pagos_procesos");
      await addDoc(pagosProcesosColRef, procesoPagoData);

      toast({
        title: "Cliente Registrado Exitosamente",
        description: `El cliente ${data.nombres} ${data.apellidos} ha sido guardado y el proceso de pago iniciado.`,
      });
      reset(); // Limpiar el formulario
      setFileName(null);
      setCalculatedCuotaMensual('$0.00');

    } catch (error) {
      console.error('Error registrando cliente:', error);
      toast({
        title: "Error al Registrar",
        description: "No se pudo guardar la información del cliente.",
        variant: "destructive",
      });
    }
  };
  
  const handleNuevoGrupoInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue("nuevoGrupo", e.target.value.toUpperCase(), { shouldValidate: true });
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setFileName(files[0].name);
      // RHF ya maneja el archivo a través de register
    } else {
      setFileName(null);
    }
     // Forzar validación de RHF para el campo de archivo
    setValue("convenioPago", files, { shouldValidate: true });
  };


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
                    value={nuevoGrupoWatched || ""}
                    onChange={handleNuevoGrupoInputChange}
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
            
            <div className="space-y-1 lg:col-span-2">
              <Label htmlFor="cedula">Cédula</Label>
              <div className="flex items-center gap-2">
                <Input id="cedula" {...register("cedula")} className="flex-grow"/>
                <Button type="button" variant="outline" onClick={handleVerificarCedula} disabled={isVerifyingCedula || isSubmitting}>
                  {isVerifyingCedula ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  Verificar
                </Button>
              </div>
              {errors.cedula && <p className="text-xs text-destructive mt-1">{errors.cedula.message}</p>}
            </div>


            <div className="space-y-1 lg:col-span-2">
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
              <Input id="cuotaMensual" value={calculatedCuotaMensual} readOnly className="bg-muted/50 focus:ring-0" />
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
                  {...register("convenioPago", { onChange: handleFileChange })}
                />
                {fileName && <span className="text-sm text-muted-foreground truncate max-w-xs" title={fileName}>{fileName}</span>}
                {!fileName && <span className="text-sm text-muted-foreground">No se eligió ningún archivo</span>}
              </div>
               {errors.convenioPago && <p className="text-xs text-destructive mt-1">{(errors.convenioPago as any).message}</p>}
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button type="submit" className="w-full md:w-auto bg-primary hover:bg-primary/90 text-primary-foreground text-base px-8 py-3" disabled={isSubmitting || isVerifyingCedula}>
              {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin"/> : <Save className="mr-2 h-5 w-5" />}
              {isSubmitting ? 'Registrando...' : 'Registrar Cliente'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

    