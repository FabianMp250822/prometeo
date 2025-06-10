
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, getDocs, query, orderBy, Timestamp } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, UserCircle, FileText, AlertCircle, CalendarDays, Receipt, Banknote } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from '@/components/ui/separator';
import { usePensionadoContext, Pensionado, Pago, PagoDetalle } from '@/contexts/PensionadoContext';
import { useRouter } from 'next/navigation';


// --- Constantes de Colección ---
const PENSIONADOS_COLLECTION = "pensionados";
const PARISS1_COLLECTION = "pariss1";
const PAGOS_SUBCOLLECTION = "pagos";

export default function PagosDetallePage() {
  const { toast } = useToast();
  const router = useRouter();
  const { 
    contextPensionado, 
    contextPagos, 
    setContextPensionadoData, 
    clearContextPensionadoData,
    isContextLoading,
    setContextIsLoading
  } = usePensionadoContext();

  const [documentoInput, setDocumentoInput] = useState<string>("");
  const [selectedPensionado, setSelectedPensionado] = useState<Pensionado | null>(null);
  const [allPagosList, setAllPagosList] = useState<Pago[]>([]);
  const [selectedPago, setSelectedPago] = useState<Pago | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [availableMonths, setAvailableMonths] = useState<string[]>([]); // Stores "MonthName (MonthNumber)"
  const [selectedYearFilter, setSelectedYearFilter] = useState<string | undefined>(undefined);
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string | undefined>(undefined); // Stores "MonthName (MonthNumber)"


  const parseCurrencyToNumber = (currencyString: string | undefined | null): number => {
    if (!currencyString) return 0;
    const cleanedString = String(currencyString).replace(/\./g, '').replace(',', '.');
    const number = parseFloat(cleanedString);
    return isNaN(number) ? 0 : number;
  };

  const formatFirebaseTimestamp = (timestamp: Timestamp | undefined | string | {seconds: number, nanoseconds: number}, options?: Intl.DateTimeFormatOptions): string => {
    if (!timestamp) return 'N/A';
    const defaultOptions: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    try {
      if (typeof timestamp === 'string') {
        let d = new Date(timestamp);
        if (isNaN(d.getTime())) {
            const parts = timestamp.match(/(\d{1,2}) ([a-zA-Z]+)\.? (\d{4})/);
            if (parts) {
                 d = new Date(`${parts[2]} ${parts[1]}, ${parts[3]}`);
            }
            if (isNaN(d.getTime())) return 'N/A';
        }
        return d.toLocaleDateString('es-CO', options || defaultOptions);
      }
      if (timestamp instanceof Timestamp) {
        return timestamp.toDate().toLocaleDateString('es-CO', options || defaultOptions);
      }
      if (typeof timestamp === 'object' && 'seconds' in timestamp && 'nanoseconds' in timestamp) {
        return new Date(timestamp.seconds * 1000).toLocaleDateString('es-CO', options || defaultOptions);
      }
      return 'N/A';
    } catch (e) {
      console.warn("Could not format timestamp:", timestamp, e);
      return 'N/A';
    }
  };

  const formatCurrency = (value: string | number | undefined | null, addSymbol: boolean = true): string => {
    if (value === undefined || value === null) return addSymbol ? '$0,00' : '0,00';
    let numValue = typeof value === 'string' ? parseCurrencyToNumber(value) : value;
    if (isNaN(numValue)) return addSymbol ? '$0,00' : '0,00';
    const prefix = addSymbol ? '$' : '';
    return `${prefix}${numValue.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  
  const getMonthNameFromTimestamp = useCallback((ts: Timestamp | {seconds: number, nanoseconds: number} | undefined): string => {
    if (!ts) return "MesDesconocido";
    let date: Date;
    if (ts instanceof Timestamp) {
        date = ts.toDate();
    } else if (typeof ts === 'object' && 'seconds' in ts) {
        date = new Date(ts.seconds * 1000);
    } else {
        return "MesDesconocido";
    }
    return date.toLocaleDateString('es-CO', { month: 'long' });
  }, []);
  
  const getMonthNumberFromTimestamp = useCallback((ts: Timestamp | {seconds: number, nanoseconds: number} | undefined): number => {
    if (!ts) return 0; 
    let date: Date;
    if (ts instanceof Timestamp) {
        date = ts.toDate();
    } else if (typeof ts === 'object' && 'seconds' in ts) {
        date = new Date(ts.seconds * 1000);
    } else {
        return 0;
    }
    return date.getMonth() + 1; // 1-12
  }, []);

  const updateFilterOptions = useCallback((pagos: Pago[], pagoToSelect?: Pago | null) => {
    console.log("PagosDetallePage: updateFilterOptions called. Pagos count:", pagos.length, "PagoToSelect ID:", pagoToSelect?.id);
    if (pagos.length > 0) {
      const years = new Set<string>();
      pagos.forEach(p => {
        if (p.fechaProcesado) {
          const date = (p.fechaProcesado instanceof Timestamp) ? p.fechaProcesado.toDate() : new Date((p.fechaProcesado as any).seconds * 1000);
          years.add(date.getFullYear().toString());
        } else if (p.año) {
          years.add(p.año);
        }
      });
      const sortedYears = Array.from(years).sort((a, b) => b.localeCompare(a));
      setAvailableYears(sortedYears);
      console.log("PagosDetallePage: Available years set:", sortedYears);

      const targetPagoForFilters = pagoToSelect || pagos[0];
      if (targetPagoForFilters) {
        let targetYear = "";
        if (targetPagoForFilters.fechaProcesado) {
            const targetDate = (targetPagoForFilters.fechaProcesado instanceof Timestamp) ? targetPagoForFilters.fechaProcesado.toDate() : new Date((targetPagoForFilters.fechaProcesado as any).seconds * 1000);
            targetYear = targetDate.getFullYear().toString();
        } else if (targetPagoForFilters.año) {
            targetYear = targetPagoForFilters.año;
        }
        
        if (sortedYears.includes(targetYear)) {
            setSelectedYearFilter(targetYear);
            console.log("PagosDetallePage: SelectedYearFilter set by updateFilterOptions:", targetYear);
        } else if (sortedYears.length > 0) {
            setSelectedYearFilter(sortedYears[0]);
            console.log("PagosDetallePage: SelectedYearFilter fallback by updateFilterOptions:", sortedYears[0]);
        } else {
            setSelectedYearFilter(undefined);
             console.log("PagosDetallePage: SelectedYearFilter cleared by updateFilterOptions (no years).");
        }
      } else {
        setSelectedYearFilter(undefined);
        console.log("PagosDetallePage: SelectedYearFilter cleared (no targetPago for filters).");
      }
    } else {
      setAvailableYears([]);
      setSelectedYearFilter(undefined);
      console.log("PagosDetallePage: Cleared all year filters (no pagos).");
    }
  }, [getMonthNameFromTimestamp, getMonthNumberFromTimestamp]);


  useEffect(() => {
    console.log("PagosDetallePage: Context check. isContextLoading:", isContextLoading, "ContextPensionado ID:", contextPensionado?.id);
    if (!isContextLoading && contextPensionado && contextPagos) {
      console.log("PagosDetallePage: Loading data from PensionadoContext. Pensionado ID:", contextPensionado.id, "Pagos count:", contextPagos.length);
      setIsLoading(true); 
      setSelectedPensionado(contextPensionado);
      setAllPagosList(contextPagos); 
      setDocumentoInput(contextPensionado.id);
      setError(null);

      if (contextPagos.length > 0) {
        setSelectedPago(contextPagos[0]); 
        updateFilterOptions(contextPagos, contextPagos[0]); 
      } else {
        setSelectedPago(null);
        updateFilterOptions([], null); 
        toast({ title: "Sin Pagos", description: "Este pensionado no tiene registros de pago en el contexto.", variant: "default" });
      }
      setIsLoading(false);
    } else if (!isContextLoading && !contextPensionado) {
      console.log("PagosDetallePage: No data in PensionadoContext or context is clean. Clearing local state.");
      setSelectedPensionado(null);
      setAllPagosList([]);
      setSelectedPago(null);
      setDocumentoInput("");
      updateFilterOptions([], null);
      setError(null);
      setIsLoading(false);
    }
  }, [contextPensionado, contextPagos, isContextLoading, toast, updateFilterOptions, setContextIsLoading]);
  

  const fetchPensionadoYPagos = async (pensionadoId: string) => {
    if (!pensionadoId.trim()) {
        toast({ title: "Documento Requerido", description: "Por favor, ingrese un número de documento.", variant: "destructive" });
        return;
    }
    setIsLoading(true);
    setContextIsLoading(true); 
    setError(null);
    setSelectedPensionado(null);
    setAllPagosList([]);
    setSelectedPago(null);
    updateFilterOptions([], null); 


    try {
      const pensionadoDocRef = doc(db, PENSIONADOS_COLLECTION, pensionadoId);
      const pensionadoDocSnap = await getDoc(pensionadoDocRef);

      if (!pensionadoDocSnap.exists()) {
        setError("No se encontró el pensionado con el documento ingresado.");
        toast({ title: "No Encontrado", description: "Verifique el número de documento.", variant: "destructive" });
        clearContextPensionadoData(); 
        return;
      }

      let pensionadoData = { id: pensionadoDocSnap.id, ...pensionadoDocSnap.data() } as Pensionado;

      const pariss1DocRef = doc(db, PARISS1_COLLECTION, pensionadoData.id);
      const pariss1DocSnap = await getDoc(pariss1DocRef);
      if (pariss1DocSnap.exists()) {
        pensionadoData = { ...pensionadoData, ...pariss1DocSnap.data() as any };
      }

      const pagosCollectionRef = collection(db, PENSIONADOS_COLLECTION, pensionadoData.id, PAGOS_SUBCOLLECTION);
      const pagosQuery = query(pagosCollectionRef, orderBy("fechaProcesado", "desc"));
      const pagosSnapshot = await getDocs(pagosQuery);

      const pagosTemp: Pago[] = [];
      pagosSnapshot.forEach(docSnap => {
        pagosTemp.push({ id: docSnap.id, ...docSnap.data() } as Pago);
      });
      
      setContextPensionadoData(pensionadoData, pagosTemp); 
      
      // Local state will be updated by the context useEffect, no need to set here directly
      // setSelectedPensionado(pensionadoData);
      // setAllPagosList(pagosTemp);
      // if (pagosTemp.length > 0) {
      //   setSelectedPago(pagosTemp[0]);
      //   updateFilterOptions(pagosTemp, pagosTemp[0]);
      // } else {
      //   setSelectedPago(null);
      //   updateFilterOptions([], null);
      // }

    } catch (err: any) {
      console.error("Error fetching pensioner details or payments:", err);
      setError("Ocurrió un error al cargar los datos: " + err.message);
      toast({ title: "Error", description: "No se pudo cargar la información.", variant: "destructive" });
      clearContextPensionadoData(); 
    } finally {
      setIsLoading(false); 
      setContextIsLoading(false); 
    }
  };
  
  // Effect to update available months when selectedYearFilter or allPagosList changes
  useEffect(() => {
    console.log("PagosDetallePage: Effect for availableMonths triggered. Year:", selectedYearFilter, "Pagos count:", allPagosList.length);
    if (selectedYearFilter && allPagosList.length > 0) {
        const monthsForYear = new Map<number, string>(); 
        allPagosList.forEach(p => {
            let paymentYear = "";
            let paymentMonthNum = 0;
            let paymentMonthName = "";

            if (p.fechaProcesado) {
                const date = (p.fechaProcesado instanceof Timestamp) ? p.fechaProcesado.toDate() : new Date((p.fechaProcesado as any).seconds * 1000);
                paymentYear = date.getFullYear().toString();
                if (paymentYear === selectedYearFilter) {
                    paymentMonthNum = getMonthNumberFromTimestamp(p.fechaProcesado);
                    paymentMonthName = getMonthNameFromTimestamp(p.fechaProcesado);
                    if (paymentMonthNum > 0 && !monthsForYear.has(paymentMonthNum)) {
                        monthsForYear.set(paymentMonthNum, `${paymentMonthName.charAt(0).toUpperCase() + paymentMonthName.slice(1)} (${paymentMonthNum})`);
                    }
                }
            }
        });
        
        const sortedMonthStrings = Array.from(monthsForYear.entries())
            .sort((a, b) => a[0] - b[0]) 
            .map(entry => entry[1]); 

        setAvailableMonths(currentAvailableMonths => {
            if (JSON.stringify(currentAvailableMonths) !== JSON.stringify(sortedMonthStrings)) {
                console.log("PagosDetallePage: Setting availableMonths:", sortedMonthStrings);
                return sortedMonthStrings;
            }
            return currentAvailableMonths; 
        });
    } else { 
        if(availableMonths.length > 0) { 
            console.log("PagosDetallePage: Clearing availableMonths.");
            setAvailableMonths([]);
        }
    }
  }, [selectedYearFilter, allPagosList, getMonthNameFromTimestamp, getMonthNumberFromTimestamp, availableMonths.length]);

  // Effect to auto-select/validate the month when availableMonths or selectedYearFilter changes
  useEffect(() => {
    console.log("PagosDetallePage: Effect for selectedMonthFilter validation. Year:", selectedYearFilter, "AvailableMonths:", availableMonths);
    if (selectedYearFilter) { 
        if (availableMonths.length > 0) {
            const currentMonthIsValidForNewYear = selectedMonthFilter && availableMonths.includes(selectedMonthFilter);
            if (!currentMonthIsValidForNewYear) {
                console.log("PagosDetallePage: Setting selectedMonthFilter to first available for year", selectedYearFilter, ":", availableMonths[0]);
                setSelectedMonthFilter(availableMonths[0]); 
            } else {
                console.log("PagosDetallePage: selectedMonthFilter", selectedMonthFilter, "is still valid for year", selectedYearFilter);
            }
        } else {
             if (selectedMonthFilter !== undefined) { // Only clear if not already undefined
                console.log("PagosDetallePage: Clearing selectedMonthFilter (no available months for year", selectedYearFilter, ")");
                setSelectedMonthFilter(undefined);
             }
        }
    } else {
        if (selectedMonthFilter !== undefined) { // Only clear if not already undefined
            console.log("PagosDetallePage: Clearing selectedMonthFilter (no year selected).");
            setSelectedMonthFilter(undefined);
        }
    }
  }, [selectedYearFilter, availableMonths]); // Removed selectedMonthFilter from deps


  // Effect to update the selectedPago when filters change
  useEffect(() => {
    console.log("PagosDetallePage: Effect to update selectedPago. YearF:", selectedYearFilter, "MonthF:", selectedMonthFilter, "Pagos:", allPagosList.length);
    if (selectedYearFilter && selectedMonthFilter && allPagosList.length > 0) {
        const monthNumberToFind = parseInt(selectedMonthFilter.match(/\((\d+)\)/)?.[1] || "0");
        if (monthNumberToFind === 0) {
            setSelectedPago(null);
            return;
        }

        const pagoEncontrado = allPagosList.find(p => {
            if (!p.fechaProcesado) return false;
            const date = (p.fechaProcesado instanceof Timestamp) 
                            ? p.fechaProcesado.toDate() 
                            : new Date((p.fechaProcesado as any).seconds * 1000);
            const pagoAnio = date.getFullYear().toString();
            const pagoMes = date.getMonth() + 1; 
            return pagoAnio === selectedYearFilter && pagoMes === monthNumberToFind;
        });
        
        console.log("PagosDetallePage: Pago encontrado para", selectedYearFilter, "/", monthNumberToFind, ":", pagoEncontrado?.id);
        setSelectedPago(pagoEncontrado || null);

        if (!pagoEncontrado && !isContextLoading && !isLoading) { 
            toast({ title: "Sin Pago", description: `No se encontró un pago para ${selectedMonthFilter.split(' (')[0]} de ${selectedYearFilter}.`, variant: "default" });
        }
    } else if (allPagosList.length === 0) { 
        setSelectedPago(null);
    }
  }, [selectedYearFilter, selectedMonthFilter, allPagosList, toast, isContextLoading, isLoading]);


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

  if ((isContextLoading && !contextPensionado) || (isLoading && !selectedPensionado)) {
     return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" />
        <p className="text-lg text-muted-foreground">Cargando datos del pensionado...</p>
      </div>
    );
  }


  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-headline text-primary flex items-center">
            <Receipt className="mr-3 h-7 w-7" /> Detalle de Pagos (Comprobantes)
          </CardTitle>
          <CardDescription>
            {selectedPensionado 
              ? `Mostrando comprobantes para ${selectedPensionado.empleado || selectedPensionado.id}. Use los filtros o busque otro pensionado.`
              : "Busque un pensionado por documento para ver el detalle de sus pagos."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6 items-end">
            <div className="flex-grow space-y-1">
              <Label htmlFor="documentoInputPago">Número de Documento</Label>
              <Input id="documentoInputPago" type="text" value={documentoInput} onChange={(e) => setDocumentoInput(e.target.value)} placeholder="Ingrese documento del pensionado" disabled={isLoading || isContextLoading} className="text-base"/>
            </div>
            <Button onClick={handleSearch} disabled={isLoading || isContextLoading} className="w-full sm:w-auto text-base">
              {(isLoading || isContextLoading) ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Search className="mr-2 h-5 w-5" />}
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

      {selectedPensionado && selectedPago && !isLoading && !isContextLoading && (
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
                <div className="flex gap-2 mt-2 sm:mt-0 items-center">
                    <Label className="text-sm hidden sm:inline">Filtrar por:</Label>
                    <Select value={selectedYearFilter} onValueChange={setSelectedYearFilter} disabled={availableYears.length === 0 || isLoading || isContextLoading}>
                        <SelectTrigger className="w-full sm:w-[120px] text-sm"><SelectValue placeholder="Año" /></SelectTrigger>
                        <SelectContent>
                            {availableYears.map(year => <SelectItem key={year} value={year}>{year}</SelectItem>)}
                        </SelectContent>
                    </Select>
                     <Select value={selectedMonthFilter} onValueChange={setSelectedMonthFilter} disabled={availableMonths.length === 0 || isLoading || isContextLoading}>
                        <SelectTrigger className="w-full sm:w-[180px] text-sm"><SelectValue placeholder="Mes" /></SelectTrigger>
                        <SelectContent>
                            {availableMonths.map(monthStr => <SelectItem key={monthStr} value={monthStr}>{monthStr.split(' (')[0]}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-4 sm:p-6 space-y-4 text-sm">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-2 border-b pb-4">
              <div><strong>Nombre:</strong> {selectedPensionado.empleado || 'N/A'}</div>
              <div><strong>Documento:</strong> {selectedPensionado.id}</div>
              <div><strong>Básico Pensionado:</strong> {formatCurrency(selectedPensionado.basico)}</div>
              <div><strong>Cargo:</strong> {selectedPensionado.cargo || 'N/A'}</div>
              
              <div><strong>Centro Costo:</strong> {selectedPensionado.pnlCentroCosto || 'N/A'}</div>
              <div><strong>Dependencia:</strong> {selectedPensionado.pnlDependencia?.replace(/^V\d+-/, '') || 'N/A'}</div>
              <div><strong>Esquema:</strong> {selectedPensionado.esquema || 'N/A'}</div>
              <div><strong>Grado:</strong> {selectedPago.grado || selectedPensionado.grado || 'N/A'}</div>
              
              <Separator className="col-span-full my-1" />
              
              <div className="font-semibold text-primary"><strong>Periodo del Pago:</strong> {selectedPago.periodoPago || 'N/A'}</div>
              <div className="font-semibold text-primary"><strong>Fecha Liquidación:</strong> {formatFirebaseTimestamp(selectedPago.fechaLiquidacion || selectedPago.fechaProcesado)}</div>
              <div className="font-semibold text-primary col-span-2"><strong>Fecha Procesado:</strong> {formatFirebaseTimestamp(selectedPago.fechaProcesado, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
            </div>

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

      {!selectedPensionado && !isLoading && !isContextLoading && !error && (
        <Card className="mt-6 shadow-sm border-dashed border-muted-foreground/50">
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground py-12">
              <Banknote className="mx-auto h-16 w-16 mb-4 text-primary/30" />
              <p className="text-lg font-semibold">Consulte un Pensionado</p>
              <p className="text-sm">Ingrese el número de documento para ver los detalles de sus pagos o navegue desde "Consulta de Pagos".</p>
            </div>
          </CardContent>
        </Card>
      )}
       {selectedPensionado && allPagosList.length === 0 && !isLoading && !isContextLoading && (
        <Card className="mt-6 shadow-sm border-dashed border-muted-foreground/50">
            <CardContent className="pt-6">
                <div className="text-center text-muted-foreground py-12">
                    <FileText className="mx-auto h-16 w-16 mb-4 text-primary/30" />
                    <p className="text-lg font-semibold">Sin Registros de Pago</p>
                    <p className="text-sm">El pensionado seleccionado ({selectedPensionado.empleado || selectedPensionado.id}) no tiene historial de pagos en el sistema.</p>
                </div>
            </CardContent>
        </Card>
      )}
       {selectedPensionado && allPagosList.length > 0 && !selectedPago && !isLoading && !isContextLoading && (
         <Card className="mt-6 shadow-sm border-dashed border-muted-foreground/50">
            <CardContent className="pt-6">
                <div className="text-center text-muted-foreground py-12">
                    <CalendarDays className="mx-auto h-16 w-16 mb-4 text-primary/30" />
                    <p className="text-lg font-semibold">Seleccione un Periodo</p>
                    <p className="text-sm">Use los filtros de año y mes para ver un comprobante de pago específico, o no se encontró un pago para el periodo actual.</p>
                </div>
            </CardContent>
        </Card>
       )}
    </div>
  );
}

