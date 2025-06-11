
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { PlusCircle, Save, UploadCloud, CalendarIcon, Loader2, Search, FileText, UserCircle, BadgeDollarSign, ListChecks } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { db, storage } from '@/lib/firebase';
import { doc, getDoc, updateDoc, collection, query, orderBy, getDocs, Timestamp, DocumentData } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";


interface Pensionado {
  id: string;
  empleado?: string;
  [key: string]: any;
}

interface PlanDePagoCuota {
  numeroCuota: number;
  montoCuota: number;
  fechaVencimientoEstimada: Timestamp;
  estadoCuota: 'Pendiente' | 'Pagada' | 'Vencida' | string; // Permitir más estados si es necesario
  comprobanteCuotaUrl?: string | null;
  fechaPagoReal?: Timestamp | null;
  notasCuota?: string | null;
}

interface Financiamiento {
  id: string; // ID del documento de financiamiento
  fechaCreacionAcuerdo?: Timestamp;
  planDePagos?: PlanDePagoCuota[];
  [key: string]: any;
}

const pagoFormSchema = z.object({
  fechaPago: z.date({ required_error: "Fecha de pago es requerida" }),
  comprobantePago: z.instanceof(FileList)
    .refine(files => files && files.length > 0, "Comprobante es requerido.")
    .refine(files => files && files[0] && files[0].size <= 2 * 1024 * 1024, `El archivo no debe exceder 2MB.`)
    .refine(files => files && files[0] && ['application/pdf', 'image/jpeg', 'image/png'].includes(files[0].type), 'Solo PDF, JPG, PNG.'),
  notasAdmin: z.string().optional(),
});

type PagoFormValues = z.infer<typeof pagoFormSchema>;

export default function AgregarPagoView() {
  const { toast } = useToast();
  
  const [cedulaBusqueda, setCedulaBusqueda] = useState('');
  const [isSearchingPensionado, setIsSearchingPensionado] = useState(false);
  const [pensionadoEncontrado, setPensionadoEncontrado] = useState<Pensionado | null>(null);
  
  const [financiamientos, setFinanciamientos] = useState<Financiamiento[]>([]);
  const [selectedFinanciamiento, setSelectedFinanciamiento] = useState<Financiamiento | null>(null);
  const [cuotasPendientes, setCuotasPendientes] = useState<PlanDePagoCuota[]>([]);
  const [selectedCuota, setSelectedCuota] = useState<PlanDePagoCuota | null>(null);
  
  const [isSubmittingPago, setIsSubmittingPago] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const { register, handleSubmit, control, setValue, reset: resetPagoForm, formState: { errors: pagoErrors } } = useForm<PagoFormValues>({
    resolver: zodResolver(pagoFormSchema),
    defaultValues: {
      fechaPago: new Date(),
    }
  });

  const formatCurrency = (amount?: number): string => {
    if (amount === undefined || amount === null || isNaN(amount)) return '$0,00';
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(amount);
  };

  const formatTimestampToDate = (timestamp?: Timestamp, dateFormat: string = 'PPP'): string => {
    if (!timestamp) return 'N/A';
    try {
      return format(timestamp.toDate(), dateFormat, { locale: es });
    } catch (e) {
      console.warn("Error formatting timestamp:", e);
      return 'Fecha inválida';
    }
  };
  
  const resetAllStates = () => {
    setCedulaBusqueda('');
    setIsSearchingPensionado(false);
    setPensionadoEncontrado(null);
    setFinanciamientos([]);
    setSelectedFinanciamiento(null);
    setCuotasPendientes([]);
    setSelectedCuota(null);
    resetPagoForm({ fechaPago: new Date(), notasAdmin: '', comprobantePago: undefined });
    setFileName(null);
    setIsSubmittingPago(false);
  };

  const handleBuscarPensionado = async () => {
    if (!cedulaBusqueda.trim()) {
      toast({ title: "Cédula Requerida", description: "Ingrese una cédula para buscar.", variant: "destructive" });
      return;
    }
    setIsSearchingPensionado(true);
    setPensionadoEncontrado(null);
    setFinanciamientos([]);
    setSelectedFinanciamiento(null);
    setCuotasPendientes([]);
    setSelectedCuota(null);

    try {
      const pensionadoDocRef = doc(db, "pensionados", cedulaBusqueda.trim());
      const docSnap = await getDoc(pensionadoDocRef);

      if (docSnap.exists()) {
        const pensionadoData = { id: docSnap.id, ...docSnap.data() } as Pensionado;
        setPensionadoEncontrado(pensionadoData);
        await fetchFinanciamientosYCuotasPendientes(pensionadoData.id);
        toast({ title: "Pensionado Encontrado", description: `Cargando financiamientos para ${pensionadoData.empleado || pensionadoData.id}.` });
      } else {
        toast({ title: "No Encontrado", description: "No se encontró un pensionado con esa cédula.", variant: "destructive" });
        setPensionadoEncontrado(null);
      }
    } catch (error) {
      console.error("Error buscando pensionado:", error);
      toast({ title: "Error", description: "Ocurrió un error al buscar el pensionado.", variant: "destructive" });
    } finally {
      setIsSearchingPensionado(false);
    }
  };

  const fetchFinanciamientosYCuotasPendientes = async (pensionadoId: string) => {
    setIsSearchingPensionado(true); // Re-use for loading financiamientos
    try {
      const financiamientosRef = collection(db, "pensionados", pensionadoId, "financiamientos");
      const q = query(financiamientosRef, orderBy("fechaCreacionAcuerdo", "desc"));
      const querySnapshot = await getDocs(q);

      const fetchedFinanciamientos: Financiamiento[] = [];
      querySnapshot.forEach(docSnap => {
        fetchedFinanciamientos.push({ id: docSnap.id, ...docSnap.data() } as Financiamiento);
      });
      setFinanciamientos(fetchedFinanciamientos);

      if (fetchedFinanciamientos.length > 0) {
        // Consider logic for active/multiple financiamientos if needed. For now, use the latest.
        const financiamientoActivo = fetchedFinanciamientos[0];
        setSelectedFinanciamiento(financiamientoActivo);
        const pendientes = financiamientoActivo.planDePagos?.filter(cuota => cuota.estadoCuota === "Pendiente") || [];
        setCuotasPendientes(pendientes);
        if (pendientes.length === 0) {
           toast({ title: "Sin Cuotas Pendientes", description: "Este pensionado no tiene cuotas pendientes en su financiamiento más reciente.", variant: "default" });
        }
      } else {
        toast({ title: "Sin Financiamientos", description: "Este pensionado no tiene acuerdos de financiamiento registrados.", variant: "default" });
      }
    } catch (error) {
      console.error("Error cargando financiamientos:", error);
      toast({ title: "Error", description: "No se pudieron cargar los financiamientos.", variant: "destructive" });
    } finally {
      setIsSearchingPensionado(false);
    }
  };
  
  const handleSeleccionarCuota = (cuota: PlanDePagoCuota) => {
    setSelectedCuota(cuota);
    setValue("fechaPago", new Date()); // Reset fechaPago to current date
    // Monto is implicitly set by selectedCuota.montoCuota in the UI
  };
  
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

  const onSubmitPago: SubmitHandler<PagoFormValues> = async (data) => {
    if (!pensionadoEncontrado || !selectedFinanciamiento || !selectedCuota) {
      toast({ title: "Error", description: "Falta información del pensionado, financiamiento o cuota.", variant: "destructive" });
      return;
    }
    setIsSubmittingPago(true);

    try {
      let comprobanteUrl: string | null = null;
      if (data.comprobantePago && data.comprobantePago.length > 0) {
        const file = data.comprobantePago[0];
        const filePath = `comprobantes_cuotas/${pensionadoEncontrado.id}/${selectedFinanciamiento.id}/${selectedCuota.numeroCuota}_${Date.now()}_${file.name}`;
        const fileRef = storageRef(storage, filePath);
        await uploadBytes(fileRef, file);
        comprobanteUrl = await getDownloadURL(fileRef);
      }

      const financiamientoDocRef = doc(db, "pensionados", pensionadoEncontrado.id, "financiamientos", selectedFinanciamiento.id);
      
      // Read the current financiamiento document to update planDePagos array
      const financiamientoSnap = await getDoc(financiamientoDocRef);
      if (!financiamientoSnap.exists()) {
        throw new Error("El documento de financiamiento no existe.");
      }
      const financiamientoData = financiamientoSnap.data() as Financiamiento;
      const planDePagosActualizado = financiamientoData.planDePagos?.map(c => {
        if (c.numeroCuota === selectedCuota.numeroCuota) {
          return {
            ...c,
            estadoCuota: "Pagado", // Or "En Validación" if that flow is added later
            fechaPagoReal: Timestamp.fromDate(data.fechaPago),
            comprobanteCuotaUrl: comprobanteUrl,
            notasCuota: data.notasAdmin || null,
          };
        }
        return c;
      }) || [];

      await updateDoc(financiamientoDocRef, {
        planDePagos: planDePagosActualizado
      });
      
      toast({
        title: "Pago Registrado",
        description: `Se registró el pago de la cuota #${selectedCuota.numeroCuota} para ${pensionadoEncontrado.empleado || pensionadoEncontrado.id}.`,
      });
      
      // Refresh cuotas pendientes and reset form
      await fetchFinanciamientosYCuotasPendientes(pensionadoEncontrado.id);
      setSelectedCuota(null); // Deselect cuota
      resetPagoForm({ fechaPago: new Date(), notasAdmin: '', comprobantePago: undefined });
      setFileName(null);

    } catch (error: any) {
      console.error("Error registrando pago:", error);
      toast({ title: "Error al Registrar Pago", description: error.message || "No se pudo completar el registro.", variant: "destructive" });
    } finally {
      setIsSubmittingPago(false);
    }
  };


  if (selectedCuota && pensionadoEncontrado && selectedFinanciamiento) {
    // Stage 3: Formulario de Pago para la cuota seleccionada
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-xl font-headline text-primary">
            <BadgeDollarSign className="mr-3 h-6 w-6" />
            Registrar Pago de Cuota
          </CardTitle>
          <CardDescription>
            Cliente: {pensionadoEncontrado.empleado || pensionadoEncontrado.id} (C.C. {pensionadoEncontrado.id}) <br/>
            Cuota #{selectedCuota.numeroCuota} - Vence: {formatTimestampToDate(selectedCuota.fechaVencimientoEstimada)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmitPago)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              <div className="space-y-1">
                <Label htmlFor="montoPagar">Monto a Pagar</Label>
                <Input id="montoPagar" value={formatCurrency(selectedCuota.montoCuota)} readOnly className="bg-muted/50"/>
              </div>
              
              <div className="space-y-1">
                <Label htmlFor="fechaPago">Fecha de Pago</Label>
                <Controller
                  name="fechaPago"
                  control={control}
                  render={({ field }) => (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant={"outline"} className="w-full justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccione fecha</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
                    </Popover>
                  )}
                />
                {pagoErrors.fechaPago && <p className="text-xs text-destructive mt-1">{pagoErrors.fechaPago.message}</p>}
              </div>

              <div className="md:col-span-2 space-y-1">
                <Label htmlFor="comprobantePago-input-pago">Cargar Comprobante</Label>
                <div className="flex items-center space-x-3">
                  <Button type="button" variant="outline" onClick={() => document.getElementById('comprobantePago-input-pago')?.click()} className="shrink-0">
                      <UploadCloud className="mr-2 h-4 w-4" /> Elegir archivo
                  </Button>
                  <input id="comprobantePago-input-pago" type="file" className="hidden" accept="application/pdf,image/jpeg,image/png" {...register("comprobantePago", { onChange: handleFileChange })} />
                  {fileName && <span className="text-sm text-muted-foreground truncate max-w-xs" title={fileName}>{fileName}</span>}
                  {!fileName && <span className="text-sm text-muted-foreground">No se eligió ningún archivo</span>}
                </div>
                {pagoErrors.comprobantePago && <p className="text-xs text-destructive mt-1">{(pagoErrors.comprobantePago as any).message || "Error con el archivo."}</p>}
              </div>

              <div className="md:col-span-2 space-y-1">
                <Label htmlFor="notasAdminPago">Notas Adicionales (Opcional)</Label>
                <Textarea id="notasAdminPago" {...register("notasAdmin")} placeholder="Ej: Pago realizado por tercero..." />
                {pagoErrors.notasAdmin && <p className="text-xs text-destructive mt-1">{pagoErrors.notasAdmin.message}</p>}
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setSelectedCuota(null)} disabled={isSubmittingPago}>
                Cancelar / Seleccionar otra cuota
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isSubmittingPago}>
                {isSubmittingPago ? <Loader2 className="mr-2 h-5 w-5 animate-spin"/> : <Save className="mr-2 h-5 w-5" />}
                {isSubmittingPago ? 'Registrando...' : 'Registrar Pago'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  if (pensionadoEncontrado) {
    // Stage 2: Listar cuotas pendientes del pensionado
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center text-xl font-headline text-primary">
                <ListChecks className="mr-3 h-6 w-6" />
                Cuotas Pendientes
              </CardTitle>
              <CardDescription>
                Cliente: {pensionadoEncontrado.empleado || pensionadoEncontrado.id} (C.C. {pensionadoEncontrado.id})
                {selectedFinanciamiento && <><br/>Mostrando cuotas del acuerdo creado el: {formatTimestampToDate(selectedFinanciamiento.fechaCreacionAcuerdo)}</>}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={resetAllStates}>Buscar Otro Pensionado</Button>
          </div>
        </CardHeader>
        <CardContent>
          {isSearchingPensionado && <div className="flex items-center justify-center py-4"><Loader2 className="mr-2 h-5 w-5 animate-spin"/>Cargando cuotas...</div>}
          {!isSearchingPensionado && cuotasPendientes.length === 0 && (
            <div className="text-center py-6 text-muted-foreground">
              <FileText className="mx-auto h-12 w-12 mb-3 text-primary/30"/>
              <p>No se encontraron cuotas pendientes para este financiamiento.</p>
              <p className="text-xs mt-1">Puede que todas las cuotas estén pagadas o no exista un plan de pagos activo.</p>
            </div>
          )}
          {!isSearchingPensionado && cuotasPendientes.length > 0 && (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead># Cuota</TableHead>
                    <TableHead>Vencimiento</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-center">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cuotasPendientes.map((cuota) => (
                    <TableRow key={cuota.numeroCuota}>
                      <TableCell>{cuota.numeroCuota}</TableCell>
                      <TableCell>{formatTimestampToDate(cuota.fechaVencimientoEstimada)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(cuota.montoCuota)}</TableCell>
                      <TableCell><Badge variant="outline" className="border-orange-500 text-orange-600">{cuota.estadoCuota}</Badge></TableCell>
                      <TableCell className="text-center">
                        <Button size="sm" onClick={() => handleSeleccionarCuota(cuota)}>Registrar Pago</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Stage 1: Búsqueda de Pensionado
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center text-xl font-headline text-primary">
          <UserCircle className="mr-3 h-6 w-6" />
          Buscar Pensionado para Registrar Pago
        </CardTitle>
        <CardDescription>
          Ingrese la cédula del pensionado para ver sus cuotas pendientes y registrar un pago.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-3 items-end max-w-lg">
          <div className="flex-grow space-y-1">
            <Label htmlFor="cedulaBusqueda">Cédula del Pensionado</Label>
            <Input 
              id="cedulaBusqueda" 
              value={cedulaBusqueda} 
              onChange={(e) => setCedulaBusqueda(e.target.value)} 
              placeholder="Ej: 12345678" 
              disabled={isSearchingPensionado}
            />
          </div>
          <Button onClick={handleBuscarPensionado} disabled={isSearchingPensionado || !cedulaBusqueda.trim()} className="w-full sm:w-auto">
            {isSearchingPensionado ? <Loader2 className="mr-2 h-5 w-5 animate-spin"/> : <Search className="mr-2 h-5 w-5" />}
            {isSearchingPensionado ? 'Buscando...' : 'Buscar'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

