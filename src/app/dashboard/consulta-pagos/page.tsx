
"use client";

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, getDocs, query, orderBy, Timestamp } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, UserCircle, FileText, AlertCircle } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Define interfaces for data structures
interface Pensionado {
  id: string; // Documento
  ano_jubilacion?: string;
  basico?: string;
  cargo?: string;
  centroCosto?: string;
  centroCosto1?: string;
  dependencia?: string;
  dependencia1?: string;
  documento?: string; // Field from user data, id is the doc id
  dtgLiquidacion?: string;
  empleado?: string;
  empresa?: string;
  esquema?: string;
  fecha?: string; 
  fondoSalud?: string;
  grado?: string;
  hBasico?: string;
  hCargo?: string;
  hEsquema?: string;
  hGrado?: string;
  mensaje?: string;
  neto?: string;
  nitEmpresa?: string;
  nivContratacion?: string;
  nivContratacion2?: string;
  periodoPago?: string; 
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
  fechaLiquidacion?: string;
  fechaProcesado?: Timestamp; 
  grado?: string;
  periodoPago?: string;
  procesado?: boolean;
  valorLiquidado?: string;
  valorNeto?: string;
}

const PENSIONADOS_COLLECTION = "pensionados";
const PAGOS_SUBCOLLECTION = "pagos";

export default function ConsultaPagosPage() {
  const { toast } = useToast();
  const [documentoInput, setDocumentoInput] = useState<string>("");
  const [selectedPensionado, setSelectedPensionado] = useState<Pensionado | null>(null);
  const [pagosList, setPagosList] = useState<Pago[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [filterCentroCosto, setFilterCentroCosto] = useState<string | undefined>(undefined);
  const [filterDependencia, setFilterDependencia] = useState<string | undefined>(undefined);
  const [distinctCentroCostos, setDistinctCentroCostos] = useState<string[]>([]);
  const [distinctDependencias, setDistinctDependencias] = useState<string[]>([]);
  const [originalDependenciasMap, setOriginalDependenciasMap] = useState<Record<string, string>>({});


  useEffect(() => {
    const fetchFilterOptions = async () => {
      setIsLoading(true);
      try {
        const pensionadosSnapshot = await getDocs(collection(db, PENSIONADOS_COLLECTION));
        const centros = new Set<string>();
        const dependenciasDisplay = new Set<string>();
        const depMap: Record<string, string> = {};
        
        pensionadosSnapshot.forEach(docSnap => {
          const data = docSnap.data();
          if (data.pnlCentroCosto) {
            centros.add(data.pnlCentroCosto);
          }
          if (data.pnlDependencia) {
            const originalDep = data.pnlDependencia;
            const transformedDep = originalDep.replace(/^V\d+-/, '');
            dependenciasDisplay.add(transformedDep);
            if (!depMap[transformedDep]) { // Store the first original value encountered for a transformed one
                depMap[transformedDep] = originalDep;
            }
          }
        });
        setDistinctCentroCostos(Array.from(centros).sort());
        setDistinctDependencias(Array.from(dependenciasDisplay).sort());
        setOriginalDependenciasMap(depMap);

      } catch (err) {
        console.error("Error fetching filter options:", err);
        toast({ title: "Error", description: "No se pudieron cargar las opciones de filtro.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    fetchFilterOptions();
  }, [toast]);


  const handleSearch = async () => {
    if (!documentoInput.trim() && (!filterCentroCosto || filterCentroCosto === "ALL_CENTROS") && (!filterDependencia || filterDependencia === "ALL_DEPENDENCIAS")) {
      toast({ title: "Información requerida", description: "Por favor, ingrese un número de documento o seleccione filtros válidos.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    setError(null);
    setSelectedPensionado(null);
    setPagosList([]);

    try {
      if (!documentoInput.trim()){
         // This is a placeholder for a more complex multi-result filter search
         toast({ title: "Funcionalidad en desarrollo", description: "La búsqueda solo por filtros (sin documento) para listar múltiples pensionados se implementará pronto. Por favor, ingrese un número de documento para una búsqueda específica.", variant: "default" });
         setIsLoading(false);
         return;
      }

      const pensionadoDocRef = doc(db, PENSIONADOS_COLLECTION, documentoInput.trim());
      const pensionadoDocSnap = await getDoc(pensionadoDocRef);

      if (pensionadoDocSnap.exists()) {
        const pensionadoData = { id: pensionadoDocSnap.id, ...pensionadoDocSnap.data() } as Pensionado;
        
        if (filterCentroCosto && filterCentroCosto !== "ALL_CENTROS" && pensionadoData.pnlCentroCosto !== filterCentroCosto) {
            setError(`El pensionado con documento ${documentoInput.trim()} no pertenece al Centro de Costo '${filterCentroCosto}'.`);
            setIsLoading(false);
            return;
        }
        
        const originalDepToFilter = filterDependencia && filterDependencia !== "ALL_DEPENDENCIAS" ? originalDependenciasMap[filterDependencia] : null;
        if (originalDepToFilter && pensionadoData.pnlDependencia !== originalDepToFilter) {
            setError(`El pensionado con documento ${documentoInput.trim()} no pertenece a la Dependencia '${filterDependencia}'.`);
            setIsLoading(false);
            return;
        }

        setSelectedPensionado(pensionadoData);

        const pagosCollectionRef = collection(db, PENSIONADOS_COLLECTION, pensionadoData.id, PAGOS_SUBCOLLECTION);
        const pagosQuery = query(pagosCollectionRef, orderBy("fechaProcesado", "desc"));
        
        const pagosSnapshot = await getDocs(pagosQuery);
        const pagos = pagosSnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Pago));
        setPagosList(pagos);

        if (pagos.length === 0) {
          toast({ title: "Información", description: "Pensionado encontrado, pero no tiene pagos registrados.", variant: "default" });
        } else {
          toast({ title: "Búsqueda Exitosa", description: `Se encontró el pensionado y ${pagos.length} registro(s) de pago.`, variant: "default" });
        }
      } else {
        setError("No se encontró ningún pensionado con el documento proporcionado.");
        toast({ title: "No encontrado", description: "Verifique el número de documento.", variant: "destructive" });
      }
    } catch (err: any) {
      console.error("Error searching for pensioner or payments:", err);
      setError("Ocurrió un error al realizar la búsqueda: " + err.message);
      toast({ title: "Error de Búsqueda", description: "No se pudo completar la búsqueda.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };
  
  const formatFirebaseTimestamp = (timestamp: Timestamp | undefined): string => {
    if (!timestamp) return 'N/A';
    try {
        return timestamp.toDate().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (e) {
        return 'Fecha inválida';
    }
  };

  const formatCurrency = (value: string | number | undefined | null): string => {
    if (value === undefined || value === null) return '$0,00';
    let numValue = typeof value === 'string' ? parseFloat(value.replace(/\./g, '').replace(',', '.')) : value;
    if (isNaN(numValue)) return '$0,00';
    return `$${numValue.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  
  const formatNumberForDetails = (value: number | undefined | null): string => {
    if (value === undefined || value === null) return '0';
    return value.toLocaleString('es-CO');
  }


  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-headline text-primary flex items-center">
            <Search className="mr-3 h-7 w-7" />
            Consulta de Pagos de Pensionados
          </CardTitle>
          <CardDescription>
            Busque un pensionado por su número de documento. Opcionalmente, filtre por Centro de Costo y Dependencia para verificar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 items-end">
            <div className="space-y-1 md:col-span-2 lg:col-span-1">
              <Label htmlFor="documentoInput">Número de Documento</Label>
              <Input
                id="documentoInput"
                type="text"
                value={documentoInput}
                onChange={(e) => setDocumentoInput(e.target.value)}
                placeholder="Ingrese el documento"
                disabled={isLoading}
                className="text-base"
              />
            </div>
            <div className="space-y-1 lg:col-span-1">
                <Label htmlFor="filterCentroCosto">Centro de Costo (Opcional)</Label>
                <Select value={filterCentroCosto} onValueChange={(value) => setFilterCentroCosto(value === "ALL_CENTROS" ? undefined : value)} disabled={isLoading}>
                    <SelectTrigger id="filterCentroCosto" className="text-base">
                        <SelectValue placeholder="Todos los Centros" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL_CENTROS">Todos los Centros</SelectItem>
                        {distinctCentroCostos.map(cc => <SelectItem key={cc} value={cc}>{cc}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-1 lg:col-span-1">
                <Label htmlFor="filterDependencia">Dependencia (Opcional)</Label>
                <Select value={filterDependencia} onValueChange={(value) => setFilterDependencia(value === "ALL_DEPENDENCIAS" ? undefined : value)} disabled={isLoading}>
                    <SelectTrigger id="filterDependencia" className="text-base">
                        <SelectValue placeholder="Todas las Dependencias" />
                    </SelectTrigger>
                    <SelectContent>
                         <SelectItem value="ALL_DEPENDENCIAS">Todas las Dependencias</SelectItem>
                        {distinctDependencias.map(dep => <SelectItem key={dep} value={dep}>{dep}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
             <Button onClick={handleSearch} disabled={isLoading} className="w-full lg:w-auto lg:self-end h-10 text-base">
              {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Search className="mr-2 h-5 w-5" />}
              Buscar
            </Button>
          </div>
           

          {error && (
            <div className="mt-6 p-3 bg-destructive/10 border border-destructive/50 text-destructive rounded-md flex items-center text-sm">
              <AlertCircle className="mr-2 h-5 w-5 flex-shrink-0" /> {error}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedPensionado && (
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-xl font-headline text-primary flex items-center">
              <UserCircle className="mr-2 h-6 w-6" /> Información del Pensionado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1">
                <p><strong>Nombre:</strong> {selectedPensionado.empleado || 'N/A'}</p>
                <p><strong>Documento:</strong> {selectedPensionado.id}</p>
                <p><strong>Cargo:</strong> {selectedPensionado.cargo || 'N/A'}</p>
                <p><strong>Empresa:</strong> {selectedPensionado.empresa || 'N/A'}</p>
                <p><strong>C. Costo:</strong> {selectedPensionado.pnlCentroCosto || 'N/A'}</p>
                <p><strong>Dependencia:</strong> {selectedPensionado.pnlDependencia?.replace(/^V\d+-/, '') || 'N/A'}</p>
                <p><strong>Esquema:</strong> {selectedPensionado.esquema || 'N/A'}</p>
                <p><strong>Año Jubilación:</strong> {selectedPensionado.ano_jubilacion || 'N/A'}</p>
                <p><strong>Fondo Salud:</strong> {selectedPensionado.fondoSalud || 'N/A'}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedPensionado && pagosList.length > 0 && (
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-xl font-headline text-primary flex items-center">
              <FileText className="mr-2 h-6 w-6" /> Historial de Pagos ({pagosList.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {pagosList.map((pago) => (
                <AccordionItem value={pago.id} key={pago.id} className="border-b border-border hover:bg-muted/10 rounded-md mb-2">
                  <AccordionTrigger className="hover:bg-muted/30 px-3 py-3 rounded-t-md text-sm data-[state=open]:rounded-b-none data-[state=open]:border-b data-[state=open]:border-primary/20">
                    <div className="flex flex-col md:flex-row justify-between w-full items-start md:items-center gap-1 md:gap-4">
                        <span className="font-semibold">Periodo: {pago.periodoPago || 'N/A'}</span>
                        <span className="text-muted-foreground">Año: {pago.año || 'N/A'}</span>
                        <span className="text-primary font-medium">Neto: {formatCurrency(pago.valorNeto)}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="p-4 bg-background border border-t-0 border-primary/20 rounded-b-md">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-2 mb-4 text-sm">
                        <p><strong>Básico:</strong> {formatCurrency(pago.basico)}</p>
                        <p><strong>V. Liquidado:</strong> {formatCurrency(pago.valorLiquidado)}</p>
                        <p><strong>F. Liquidación:</strong> {pago.fechaLiquidacion || 'N/A'}</p>
                        <p><strong>F. Procesado:</strong> {formatFirebaseTimestamp(pago.fechaProcesado)}</p>
                        <p><strong>Grado:</strong> {pago.grado || 'N/A'}</p>
                        <p><strong>Procesado:</strong> {pago.procesado ? 'Sí' : 'No'}</p>
                    </div>
                    <h4 className="font-semibold text-md mb-2 text-foreground">Detalles del Pago:</h4>
                    {pago.detalles && pago.detalles.length > 0 ? (
                       <div className="overflow-x-auto rounded-md border">
                        <Table className="min-w-full text-xs sm:text-sm">
                            <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="w-[45%] font-medium">Concepto (Nombre)</TableHead>
                                <TableHead className="font-medium">Código</TableHead>
                                <TableHead className="text-right font-medium">Ingresos</TableHead>
                                <TableHead className="text-right font-medium">Egresos</TableHead>
                            </TableRow>
                            </TableHeader>
                            <TableBody>
                            {pago.detalles.map((detalle, index) => (
                                <TableRow key={index} className={detalle.nombre === "Totales:" ? "font-bold bg-muted/20" : "hover:bg-muted/10"}>
                                <TableCell>{detalle.nombre}</TableCell>
                                <TableCell>{detalle.codigo || 'N/A'}</TableCell>
                                <TableCell className="text-right">{formatNumberForDetails(detalle.ingresos)}</TableCell>
                                <TableCell className="text-right">{formatNumberForDetails(detalle.egresos)}</TableCell>
                                </TableRow>
                            ))}
                            </TableBody>
                        </Table>
                       </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No hay detalles disponibles para este pago.</p>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      )}
       {selectedPensionado && pagosList.length === 0 && !isLoading && !error && (
         <Card className="mt-6 shadow-sm border-dashed border-muted-foreground/50">
            <CardContent className="pt-6">
                <div className="text-center text-muted-foreground py-8">
                    <FileText className="mx-auto h-16 w-16 mb-3 text-primary/30" />
                    <p className="text-lg">No se encontraron registros de pago.</p>
                    <p className="text-sm">El pensionado seleccionado no tiene historial de pagos en el sistema.</p>
                </div>
            </CardContent>
         </Card>
       )}
        { !selectedPensionado && !isLoading && !error && (
            <Card className="mt-6 shadow-sm border-dashed border-muted-foreground/50">
                <CardContent className="pt-6">
                    <div className="text-center text-muted-foreground py-8">
                        <Search className="mx-auto h-16 w-16 mb-3 text-primary/30" />
                        <p className="text-lg">Realice una búsqueda</p>
                        <p className="text-sm">Ingrese un número de documento para consultar los pagos de un pensionado.</p>
                    </div>
                </CardContent>
            </Card>
        )}
    </div>
  );
}

