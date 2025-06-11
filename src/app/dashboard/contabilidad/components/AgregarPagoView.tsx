
"use client";

import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea'; // Assuming you have this
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { PlusCircle, Save, UploadCloud, CalendarIcon, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
// import { db, storage } from '@/lib/firebase'; // Uncomment when connecting to Firebase
// import { doc, setDoc, collection, addDoc, Timestamp } from 'firebase/firestore';
// import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

const formSchema = z.object({
  cedulaCliente: z.string().min(5, "Cédula es requerida"),
  financiamientoId: z.string().optional(), // Puede ser opcional si el pago no es a una cuota específica
  numeroCuota: z.coerce.number().int().positive().optional(),
  monto: z.coerce.number({invalid_type_error: "Debe ser un número"}).positive({message: "Debe ser un valor positivo"}),
  fechaPago: z.date({required_error: "Fecha de pago es requerida"}),
  metodoPago: z.string().min(1, "Método de pago es requerido"),
  comprobantePago: z.instanceof(FileList).optional()
    .refine(files => !files || files.length === 0 || (files[0] && files[0].size <= 2 * 1024 * 1024), `El archivo no debe exceder 2MB.`)
    .refine(files => !files || files.length === 0 || (files[0] && ['application/pdf', 'image/jpeg', 'image/png'].includes(files[0].type)), 'Solo PDF, JPG, PNG.'),
  notasAdmin: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const metodosPago = [
  { value: 'transferencia_bancaria', label: 'Transferencia Bancaria' },
  { value: 'efectivo_oficina', label: 'Efectivo en Oficina' },
  { value: 'consignacion_nacional', label: 'Consignación Nacional' },
  { value: 'otro', label: 'Otro (especificar en notas)' },
];


export default function AgregarPagoView() {
  const { toast } = useToast();
  const [fileName, setFileName] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, control, setValue, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      cedulaCliente: '',
      monto: 0,
      metodoPago: '',
    }
  });
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setFileName(files[0].name);
      setValue("comprobantePago", files, { shouldValidate: true });
    } else {
      setFileName(null);
      setValue("comprobantePago", undefined, { shouldValidate: true });
    }
  };

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    console.log("Datos del formulario de pago:", data);

    // Lógica para subir archivo a Storage y guardar en Firestore (simulada por ahora)
    // let comprobanteUrl = null;
    // if (data.comprobantePago && data.comprobantePago.length > 0) {
    //   const file = data.comprobantePago[0];
    //   // const fileRef = storageRef(storage, `comprobantes_pagos_admin/${data.cedulaCliente}/${Date.now()}_${file.name}`);
    //   // await uploadBytes(fileRef, file);
    //   // comprobanteUrl = await getDownloadURL(fileRef);
    //   console.log("Archivo seleccionado para subir:", file.name);
    //   comprobanteUrl = `https://simulated-url.com/${file.name}`; // Simulación
    // }

    // const paymentRecordData = {
    //   clienteId: data.cedulaCliente,
    //   // ...otros campos del PaymentRecord
    //   monto: data.monto,
    //   fechaPago: Timestamp.fromDate(data.fechaPago),
    //   fechaRegistro: Timestamp.now(),
    //   origen: 'admin_directo',
    //   estado: 'Registrado Admin',
    //   comprobanteUrl,
    //   metodoPagoAdmin: data.metodoPago,
    //   notasAdmin: data.notasAdmin,
    //   // ...
    // };

    // try {
    //   // await addDoc(collection(db, "transacciones_pago"), paymentRecordData);
    //   // Lógica adicional para actualizar el estado de cuenta del cliente si aplica
    // } catch (error) {
    //    // ...
    // }

    setTimeout(() => { // Simular guardado
      toast({
        title: "Pago Registrado (Simulación)",
        description: `Pago de ${data.monto} para cliente ${data.cedulaCliente} registrado.`,
      });
      reset();
      setFileName(null);
      setIsSubmitting(false);
    }, 1500);
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center text-xl font-headline text-primary">
          <PlusCircle className="mr-3 h-6 w-6" />
          Agregar Pago (Admin)
        </CardTitle>
        <CardDescription>
          Registre un pago recibido directamente por un cliente.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <div className="space-y-1">
              <Label htmlFor="cedulaCliente">Cédula del Cliente</Label>
              <Input id="cedulaCliente" {...register("cedulaCliente")} placeholder="Ej: 12345678" />
              {errors.cedulaCliente && <p className="text-xs text-destructive mt-1">{errors.cedulaCliente.message}</p>}
            </div>
            
            <div className="space-y-1">
              <Label htmlFor="financiamientoId">ID del Financiamiento (Opcional)</Label>
              <Input id="financiamientoId" {...register("financiamientoId")} placeholder="Ej: fin_abc123" />
              {errors.financiamientoId && <p className="text-xs text-destructive mt-1">{errors.financiamientoId.message}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="numeroCuota">Número de Cuota (Si aplica)</Label>
              <Input id="numeroCuota" type="number" {...register("numeroCuota")} placeholder="Ej: 1" />
              {errors.numeroCuota && <p className="text-xs text-destructive mt-1">{errors.numeroCuota.message}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="monto">Monto Pagado</Label>
              <Input id="monto" type="number" step="any" {...register("monto")} placeholder="Ej: 150000.00" />
              {errors.monto && <p className="text-xs text-destructive mt-1">{errors.monto.message}</p>}
            </div>
            
            <div className="space-y-1">
              <Label htmlFor="fechaPago">Fecha de Pago</Label>
              <Controller
                name="fechaPago"
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
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                )}
              />
              {errors.fechaPago && <p className="text-xs text-destructive mt-1">{errors.fechaPago.message}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="metodoPago">Método de Pago</Label>
               <Controller
                name="metodoPago"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <SelectTrigger id="metodoPago-select">
                      <SelectValue placeholder="Seleccione un método" />
                    </SelectTrigger>
                    <SelectContent>
                      {metodosPago.map((metodo) => (
                        <SelectItem key={metodo.value} value={metodo.value}>{metodo.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.metodoPago && <p className="text-xs text-destructive mt-1">{errors.metodoPago.message}</p>}
            </div>

            <div className="md:col-span-2 space-y-1">
              <Label htmlFor="comprobantePago-input-label">Cargar Comprobante (Opcional)</Label>
              <div className="flex items-center space-x-3">
                <Button type="button" variant="outline" onClick={() => document.getElementById('comprobantePago-input-admin')?.click()} className="shrink-0">
                    <UploadCloud className="mr-2 h-4 w-4" /> Elegir archivo
                </Button>
                <input 
                  id="comprobantePago-input-admin" 
                  type="file" 
                  className="hidden"
                  accept="application/pdf,image/jpeg,image/png"
                  {...register("comprobantePago", { onChange: handleFileChange })}
                />
                {fileName && <span className="text-sm text-muted-foreground truncate max-w-xs" title={fileName}>{fileName}</span>}
                {!fileName && <span className="text-sm text-muted-foreground">No se eligió ningún archivo</span>}
              </div>
               {errors.comprobantePago && <p className="text-xs text-destructive mt-1">{(errors.comprobantePago as any).message || "Error con el archivo."}</p>}
            </div>

            <div className="md:col-span-2 space-y-1">
              <Label htmlFor="notasAdmin">Notas Adicionales (Admin)</Label>
              <Textarea id="notasAdmin" {...register("notasAdmin")} placeholder="Ej: Pago corresponde a abono extraordinario..." />
              {errors.notasAdmin && <p className="text-xs text-destructive mt-1">{errors.notasAdmin.message}</p>}
            </div>
          </div>
          
          <div className="flex justify-end pt-4">
            <Button type="submit" className="w-full md:w-auto bg-primary hover:bg-primary/90 text-primary-foreground text-base px-8 py-3" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin"/> : <Save className="mr-2 h-5 w-5" />}
              {isSubmitting ? 'Registrando...' : 'Registrar Pago'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
