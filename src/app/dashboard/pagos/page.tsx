
"use client";

import { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, getDocs, query, orderBy, Timestamp, where, QueryConstraint, limit, startAfter, DocumentData } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, UserCircle, FileText, AlertCircle, CalendarDays, Receipt, Banknote } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from '@/components/ui/separator';

// --- Interfaces (Replicadas o importadas de consulta-pagos o un archivo común) ---
interface Pariss1Data {
  Comparte?: Timestamp;
  afilia?: string;
  cedula?: string;
  ciudad_iss?: string;
  dir_iss?: string;
  fe_adquiere?: Timestamp;
  fe_causa?: Timestamp;
  fe_ingreso?: Timestamp;
  fe_nacido?: Timestamp;
  fe_vinculado?: Timestamp;
  identifica?: number;
  mesada?: number;
  pension_ini?: number;
  regimen?: number;
  res_ano?: number;
  res_nro?: string;
  riesgo?: string;
  seguro?: number;
  semanas?: number;
  sexo?: number;
  telefono_iss?: number;
  tranci?: boolean;
}

interface Pensionado extends Pariss1Data {
  id: string;
  ano_jubilacion?: string;
  basico?: string;
  cargo?: string;
  documento?: string;
  dtgLiquidacion?: string;
  empleado?: string;
  empresa?: string;
  esquema?: string;
  fecha?: string;
  fondoSalud?: string;
  grado?: string;
  mensaje?: string;
  neto?: string;
  nitEmpresa?: string;
  pnlCentroCosto?: string;
  pnlDependencia?: string;
  pnlMensaje?: string;
  pnlNivContratacion?: string;
}

interface PagoDetalle {
  codigo: string | null;
  egresos: number;
  ingresos: number;
  nombre: string;
}

interface Pago {
  id: string;
  año?: string;
  basico?: string;
  detalles?: PagoDetalle[];
  fechaLiquidacion?: string; // Podría ser string o Timestamp
  fechaProcesado?: Timestamp;
  grado?: string;
  periodoPago?: string;
  procesado?: boolean;
  valorLiquidado?: string;
  valorNeto?: string;
}

// --- Constantes de Colección ---
const PENSIONADOS_COLLECTION = "pensionados";
const PARISS1_COLLECTION = "pariss1";
const PAGOS_SUBCOLLECTION = "pagos";

export default function PagosDetallePage() {
  const { toast } = useToast();
  const [documentoInput, setDocumentoInput] = useState<string>("");
  const [selectedPensionado, setSelectedPensionado] = useState<Pensionado | null>(null);
  const [allPagosList, setAllPagosList] = useState<Pago[]>([]);
  const [selectedPago, setSelectedPago] = useState<Pago | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [selectedYearFilter, setSelectedYearFilter] = useState<string | undefined>(undefined);
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string | undefined>(undefined);

  // --- Funciones de Formato (Replicadas o importadas) ---
  const parseCurrencyToNumber = (currencyString: string | undefined | null): number => {
    if (!currencyString) return 0;
    const cleanedString = String(currencyString).replace(/\./g, '').replace(',', '.');
    const number = parseFloat(cleanedString);
    return isNaN(number) ? 0 : number;
  };

  const formatFirebaseTimestamp = (timestamp: Timestamp | undefined | string, options?: Intl.DateTimeFormatOptions): string => {
    if (!timestamp) return 'N/A';
    const defaultOptions: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    try {
      if (typeof timestamp === 'string') {
        const d = new Date(timestamp);
        if (isNaN(d.getTime())) return 'N/A';
        return d.toLocaleDateString('es-CO', options || defaultOptions);
      }
      return timestamp.toDate().toLocaleDateString('es-CO', options || defaultOptions);
    } catch (e) {
      console.warn("Could not format timestamp:", timestamp, e);
      return 'N/A';
    }
  };
  
  const formatMonthYearFromTimestamp = (timestamp: Timestamp | undefined | string): string => {
     if (!timestamp) return 'N/A';
     return formatFirebaseTimestamp(timestamp, { month: 'long', year: 'numeric'});
  }

  const formatCurrency = (value: string | number | undefined | null, addSymbol: boolean = true): string => {
    if (value === undefined || value === null) return addSymbol ? '$0,00' : '0,00';
    let numValue = typeof value === 'string' ? parseCurrencyToNumber(value) : value;
    if (isNaN(numValue)) return addSymbol ? '$0,00' : '0,00';
    const prefix = addSymbol ? '$' : '';
    return `${prefix}${numValue.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };


  // --- Lógica de Carga y Búsqueda ---
  const fetchPensionadoYPagos = async (pensionadoId: string) => {
    if (!pensionadoId.trim()) {
        toast({ title: "Documento Requerido", description: "Por favor, ingrese un número de documento.", variant: "destructive" });
        return;
    }
    setIsLoading(true);
    setError(null);
    setSelectedPensionado(null);
    setAllPagosList([]);
    setSelectedPago(null);
    setAvailableYears([]);
    setAvailableMonths([]);
    setSelectedYearFilter(undefined);
    setSelectedMonthFilter(undefined);

    try {
      const pensionadoDocRef = doc(db, PENSIONADOS_COLLECTION, pensionadoId);
      const pensionadoDocSnap = await getDoc(pensionadoDocRef);

      if (!pensionadoDocSnap.exists()) {
        setError("No se encontró el pensionado con el documento ingresado.");
        toast({ title: "No Encontrado", description: "Verifique el número de documento.", variant: "destructive" });
        setIsLoading(false);
        return;
      }

      let pensionadoData = { id: pensionadoDocSnap.id, ...pensionadoDocSnap.data() } as Pensionado;

      const pariss1DocRef = doc(db, PARISS1_COLLECTION, pensionadoData.id);
      const pariss1DocSnap = await getDoc(pariss1DocRef);
      if (pariss1DocSnap.exists()) {
        pensionadoData = { ...pensionadoData, ...pariss1DocSnap.data() as Pariss1Data };
      }
      setSelectedPensionado(pensionadoData);

      const pagosCollectionRef = collection(db, PENSIONADOS_COLLECTION, pensionadoData.id, PAGOS_SUBCOLLECTION);
      const pagosQuery = query(pagosCollectionRef, orderBy("fechaProcesado", "desc")); // Más reciente primero
      const pagosSnapshot = await getDocs(pagosQuery);

      const pagosTemp: Pago[] = [];
      pagosSnapshot.forEach(docSnap => {
        pagosTemp.push({ id: docSnap.id, ...docSnap.data() } as Pago);
      });
      setAllPagosList(pagosTemp);

      if (pagosTemp.length > 0) {
        setSelectedPago(pagosTemp[0]); // Mostrar el último pago por defecto
        
        // Poblar filtros de año/mes
        const years = new Set<string>();
        pagosTemp.forEach(p => {
            if (p.fechaProcesado) {
                 const year = p.fechaProcesado.toDate().getFullYear().toString();
                 years.add(year);
            } else if (p.año) { // Fallback al campo 'año' si fechaProcesado no existe
                 years.add(p.año);
            }
        });
        const sortedYears = Array.from(years).sort((a, b) => b.localeCompare(a));
        setAvailableYears(sortedYears);
        if (sortedYears.length > 0) {
            const latestYear = sortedYears[0];
            setSelectedYearFilter(latestYear);
            updateMonthFilter(latestYear, pagosTemp);
        }

      } else {
        toast({ title: "Sin Pagos", description: "Este pensionado no tiene registros de pago.", variant: "default" });
      }

    } catch (err: any) {
      console.error("Error fetching pensioner details or payments:", err);
      setError("Ocurrió un error al cargar los datos: " + err.message);
      toast({ title: "Error", description: "No se pudo cargar la información.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };
  
  const updateMonthFilter = (year: string, pagos: Pago[]) => {
      const months = new Set<string>();
      pagos.forEach(p => {
          let paymentYear = "";
          if (p.fechaProcesado) {
              paymentYear = p.fechaProcesado.toDate().getFullYear().toString();
          } else if (p.año) {
              paymentYear = p.año;
          }

          if (paymentYear === year && p.fechaProcesado) {
              const monthNum = p.fechaProcesado.toDate().getMonth(); // 0-11
              // Formatear mes con nombre completo para el Select (ej. "Enero", "Febrero")
              const monthName = p.fechaProcesado.toDate().toLocaleDateString('es-CO', { month: 'long' });
              months.add(monthName.charAt(0).toUpperCase() + monthName.slice(1) + ` (${monthNum + 1})`);
          }
      });
      const sortedMonths = Array.from(months).sort((a,b) => parseInt(a.match(/\((\d+)\)/)?.[1] || "0") - parseInt(b.match(/\((\d+)\)/)?.[1] || "0")  );
      setAvailableMonths(sortedMonths);
      if (sortedMonths.length > 0 && selectedPago && selectedPago.fechaProcesado && selectedPago.fechaProcesado.toDate().getFullYear().toString() === year) {
          const currentMonthName = selectedPago.fechaProcesado.toDate().toLocaleDateString('es-CO', { month: 'long' });
          const currentMonthNum = selectedPago.fechaProcesado.toDate().getMonth() + 1;
          setSelectedMonthFilter(currentMonthName.charAt(0).toUpperCase() + currentMonthName.slice(1) + ` (${currentMonthNum})`);
      } else if (sortedMonths.length > 0) {
          setSelectedMonthFilter(sortedMonths[0]);
      } else {
          setSelectedMonthFilter(undefined);
      }
  };

  useEffect(() => {
    if (selectedYearFilter && allPagosList.length > 0) {
        updateMonthFilter(selectedYearFilter, allPagosList);
    }
  }, [selectedYearFilter, allPagosList]);


  useEffect(() => {
    if (selectedYearFilter && selectedMonthFilter && allPagosList.length > 0) {
        const monthNumberToFind = parseInt(selectedMonthFilter.match(/\((\d+)\)/)?.[1] || "0");
        if (monthNumberToFind === 0) return;

        const pagoEncontrado = allPagosList.find(p => {
            if (!p.fechaProcesado) return false;
            const pagoAnio = p.fechaProcesado.toDate().getFullYear().toString();
            const pagoMes = p.fechaProcesado.toDate().getMonth() + 1; // 1-12
            return pagoAnio === selectedYearFilter && pagoMes === monthNumberToFind;
        });
        setSelectedPago(pagoEncontrado || null);
    } else if (allPagosList.length > 0 && !selectedYearFilter && !selectedMonthFilter) {
        // Si se limpian los filtros, volver al más reciente
        setSelectedPago(allPagosList[0]);
         if (availableYears.length > 0) setSelectedYearFilter(availableYears[0]);
    }

  }, [selectedYearFilter, selectedMonthFilter, allPagosList, availableYears]);


  const handleSearch = () => {
    fetchPensionadoYPagos(documentoInput);
  };

  const totalIngresos = useMemo(() => {
    if (!selectedPago || !selectedPago.detalles) return 0;
    return selectedPago.detalles.reduce((sum, item) => sum + (item.ingresos || 0), 0);
  }, [selectedPago]);

  const totalEgresos = useMemo(() => {
    if (!selectedPago || !selectedPago.detalles) return 0;
    return selectedPago.detalles.reduce((sum, item) => sum + (item.egresos || 0), 0);
  }, [selectedPago]);


  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-headline text-primary flex items-center">
            <Receipt className="mr-3 h-7 w-7" /> Detalle de Pagos
          </CardTitle>
          <CardDescription>
            Busque un pensionado por documento para ver el detalle de sus pagos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6 items-end">
            <div className="flex-grow space-y-1">
              <Label htmlFor="documentoInputPago">Número de Documento</Label>
              <Input id="documentoInputPago" type="text" value={documentoInput} onChange={(e) => setDocumentoInput(e.target.value)} placeholder="Ingrese documento del pensionado" disabled={isLoading} className="text-base"/>
            </div>
            <Button onClick={handleSearch} disabled={isLoading} className="w-full sm:w-auto text-base">
              {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Search className="mr-2 h-5 w-5" />}
              Buscar Pensionado
            </Button>
          </div>
          {error && (
            <div className="mt-4 p-3 bg-destructive/10 border border-destructive/50 text-destructive rounded-md flex items-center text-sm">
              <AlertCircle className="mr-2 h-5 w-5 flex-shrink-0" /> {error}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedPensionado && selectedPago && (
        <Card className="shadow-xl overflow-hidden">
          <CardHeader className="bg-muted/30 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                    <CardTitle className="text-xl sm:text-2xl font-headline text-primary">
                        Comprobante de Pago
                    </CardTitle>
                    <CardDescription className="text-sm sm:text-base">
                        {selectedPensionado.empleado || 'N/A'} (C.C. {selectedPensionado.id})
                    </CardDescription>
                </div>
                <div className="flex gap-2 mt-2 sm:mt-0">
                    <Select value={selectedYearFilter} onValueChange={setSelectedYearFilter} disabled={availableYears.length === 0}>
                        <SelectTrigger className="w-[120px] text-sm"><SelectValue placeholder="Año" /></SelectTrigger>
                        <SelectContent>
                            {availableYears.map(year => <SelectItem key={year} value={year}>{year}</SelectItem>)}
                        </SelectContent>
                    </Select>
                     <Select value={selectedMonthFilter} onValueChange={setSelectedMonthFilter} disabled={availableMonths.length === 0}>
                        <SelectTrigger className="w-[150px] text-sm"><SelectValue placeholder="Mes" /></SelectTrigger>
                        <SelectContent>
                            {availableMonths.map(month => <SelectItem key={month} value={month}>{month}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-4 sm:p-6 space-y-4 text-sm">
            {/* Encabezado de la Nómina */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-2 border-b pb-4">
              <div><strong>Nombre:</strong> {selectedPensionado.empleado || 'N/A'}</div>
              <div><strong>Documento:</strong> {selectedPensionado.id}</div>
              <div><strong>Básico Pensionado:</strong> {formatCurrency(selectedPensionado.basico)}</div>
              <div><strong>Cargo:</strong> {selectedPensionado.cargo || 'N/A'}</div>
              
              <div><strong>Centro Costo:</strong> {selectedPensionado.pnlCentroCosto || 'N/A'}</div>
              <div><strong>Dependencia:</strong> {selectedPensionado.pnlDependencia?.replace(/^V\d+-/, '') || 'N/A'}</div>
              <div><strong>Esquema:</strong> {selectedPensionado.esquema || 'N/A'}</div>
              <div><strong>Grado:</strong> {selectedPensionado.grado || 'N/A'}</div>
              
              <Separator className="col-span-full my-1" />
              
              <div className="font-semibold text-primary"><strong>Periodo del Pago:</strong> {selectedPago.periodoPago || 'N/A'}</div>
              <div className="font-semibold text-primary"><strong>Fecha Liquidación:</strong> {formatFirebaseTimestamp(selectedPago.fechaLiquidacion || selectedPago.fechaProcesado)}</div>
              <div className="font-semibold text-primary col-span-2"><strong>Fecha Procesado:</strong> {formatFirebaseTimestamp(selectedPago.fechaProcesado, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
            </div>

            {/* Tabla de Detalles del Pago */}
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-[120px]">Código</TableHead>
                    <TableHead>Concepto</TableHead>
                    <TableHead className="text-right">Ingresos</TableHead>
                    <TableHead className="text-right">Egresos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedPago.detalles?.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.codigo || 'N/A'}</TableCell>
                      <TableCell>{item.nombre}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.ingresos, false)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.egresos, false)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {/* Totales y Neto */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t">
                <div className="sm:col-start-2">
                    <Label className="text-xs text-muted-foreground">Total Ingresos</Label>
                    <p className="font-semibold text-lg">{formatCurrency(totalIngresos)}</p>
                </div>
                <div>
                    <Label className="text-xs text-muted-foreground">Total Egresos</Label>
                    <p className="font-semibold text-lg">{formatCurrency(totalEgresos)}</p>
                </div>
                 <div className="bg-primary/10 p-3 rounded-md sm:col-span-1 flex flex-col justify-center items-end">
                    <Label className="text-sm font-medium text-primary">Neto a Pagar</Label>
                    <p className="font-bold text-xl text-primary">{formatCurrency(selectedPago.valorNeto)}</p>
                </div>
            </div>
            {selectedPensionado.pnlMensaje && selectedPensionado.pnlMensaje !== "MIGRA" && (
                <div className="mt-4 p-3 bg-accent/10 border border-accent/50 text-accent-foreground rounded-md text-sm">
                    <strong>Mensaje Adicional:</strong> {selectedPensionado.pnlMensaje}
                </div>
            )}
          </CardContent>
           <CardFooter className="p-4 sm:p-6 border-t bg-muted/20">
                <p className="text-xs text-muted-foreground text-center w-full">
                    Este es un comprobante de pago generado por el sistema ConsorcioManager.
                    ID del Pago: {selectedPago.id}
                </p>
            </CardFooter>
        </Card>
      )}

      {!selectedPensionado && !isLoading && !error && (
        <Card className="mt-6 shadow-sm border-dashed border-muted-foreground/50">
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground py-12">
              <Banknote className="mx-auto h-16 w-16 mb-4 text-primary/30" />
              <p className="text-lg font-semibold">Consulte un Pensionado</p>
              <p className="text-sm">Ingrese el número de documento para ver los detalles de sus pagos.</p>
            </div>
          </CardContent>
        </Card>
      )}
       {selectedPensionado && allPagosList.length === 0 && !isLoading && (
        <Card className="mt-6 shadow-sm border-dashed border-muted-foreground/50">
            <CardContent className="pt-6">
                <div className="text-center text-muted-foreground py-12">
                    <FileText className="mx-auto h-16 w-16 mb-4 text-primary/30" />
                    <p className="text-lg font-semibold">Sin Registros de Pago</p>
                    <p className="text-sm">El pensionado seleccionado no tiene historial de pagos en el sistema.</p>
                </div>
            </CardContent>
        </Card>
      )}
    </div>
  );
}

