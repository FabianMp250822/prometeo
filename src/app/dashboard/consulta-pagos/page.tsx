
"use client";

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, getDocs, query, orderBy, Timestamp, where, QueryConstraint, limit, startAfter, DocumentData } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, UserCircle, FileText, AlertCircle, ChevronLeft, ChevronRight, ListChecks } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Define interfaces for data structures
interface Pensionado {
  id: string; 
  ano_jubilacion?: string;
  basico?: string;
  cargo?: string;
  centroCosto?: string;
  centroCosto1?: string;
  dependencia?: string;
  dependencia1?: string;
  documento?: string;
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
const ITEMS_PER_PAGE = 10;

export default function ConsultaPagosPage() {
  const { toast } = useToast();
  const [documentoInput, setDocumentoInput] = useState<string>("");
  const [selectedPensionado, setSelectedPensionado] = useState<Pensionado | null>(null);
  const [pagosList, setPagosList] = useState<Pago[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isListLoading, setIsListLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [filterCentroCosto, setFilterCentroCosto] = useState<string | undefined>(undefined);
  const [filterDependencia, setFilterDependencia] = useState<string | undefined>(undefined);
  const [distinctCentroCostos, setDistinctCentroCostos] = useState<string[]>([]);
  const [distinctDependencias, setDistinctDependencias] = useState<string[]>([]);
  const [originalDependenciasMap, setOriginalDependenciasMap] = useState<Record<string, string>>({});

  const [searchResults, setSearchResults] = useState<Pensionado[]>([]);
  const [viewMode, setViewMode] = useState<'initial' | 'list' | 'details'>('initial');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [lastVisibleDoc, setLastVisibleDoc] = useState<DocumentData | null>(null);
  const [firstVisibleDoc, setFirstVisibleDoc] = useState<DocumentData | null>(null);


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
          if (data.pnlCentroCosto) centros.add(data.pnlCentroCosto);
          if (data.pnlDependencia) {
            const originalDep = data.pnlDependencia;
            const transformedDep = originalDep.replace(/^V\d+-/, '');
            dependenciasDisplay.add(transformedDep);
            if (!depMap[transformedDep]) depMap[transformedDep] = originalDep;
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

  const fetchPensionadosByFilters = async (page: number = 1, startAfterDoc: DocumentData | null = null) => {
    if (!filterCentroCosto && !filterDependencia) {
      toast({ title: "Filtros requeridos", description: "Seleccione al menos un Centro de Costo o Dependencia para buscar.", variant: "destructive" });
      return;
    }
    setIsListLoading(true);
    setError(null);
    setSearchResults([]);

    try {
      const queryConstraints: QueryConstraint[] = [];
      if (filterCentroCosto && filterCentroCosto !== "ALL_CENTROS") {
        queryConstraints.push(where("pnlCentroCosto", "==", filterCentroCosto));
      }
      const originalDepToFilter = filterDependencia && filterDependencia !== "ALL_DEPENDENCIAS" ? originalDependenciasMap[filterDependencia] : null;
      if (originalDepToFilter) {
        queryConstraints.push(where("pnlDependencia", "==", originalDepToFilter));
      }
      
      queryConstraints.push(orderBy("empleado")); // Order by name for consistent pagination

      // Count total results for pagination (can be expensive for large datasets)
      // For simplicity, we're not implementing full server-side count here.
      // A more robust solution might involve a separate count query or Cloud Function.
      // This is a simplified approach, fetching a bit more to see if there's a next page.
      
      let pensionadosQuery = query(collection(db, PENSIONADOS_COLLECTION), ...queryConstraints, limit(ITEMS_PER_PAGE + 1));
      if (page > 1 && startAfterDoc) {
        pensionadosQuery = query(collection(db, PENSIONADOS_COLLECTION), ...queryConstraints, startAfter(startAfterDoc), limit(ITEMS_PER_PAGE + 1));
      } else if (page === 1) {
         setLastVisibleDoc(null); // Reset for first page
      }


      const pensionadosSnapshot = await getDocs(pensionadosQuery);
      const pensionadosData = pensionadosSnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Pensionado));

      setFirstVisibleDoc(pensionadosSnapshot.docs[0] || null);
      setLastVisibleDoc(pensionadosSnapshot.docs[pensionadosSnapshot.docs.length - (pensionadosData.length > ITEMS_PER_PAGE ? 2 : 1)] || null);


      setSearchResults(pensionadosData.slice(0, ITEMS_PER_PAGE));
      setTotalResults(pensionadosData.length); // This is approximate, indicates if more pages exist

      if (pensionadosData.length === 0) {
        toast({ title: "Sin Resultados", description: "No se encontraron pensionados con los filtros seleccionados.", variant: "default" });
      } else {
        setViewMode('list');
        setCurrentPage(page);
      }
    } catch (err: any) {
      console.error("Error searching pensioners by filters:", err);
      setError("Ocurrió un error al buscar por filtros: " + err.message);
      toast({ title: "Error de Búsqueda", description: err.message.includes("indexes") ? "La consulta requiere un índice. Revisa la consola para crearlo." : "No se pudo completar la búsqueda.", variant: "destructive" });
    } finally {
      setIsListLoading(false);
    }
  };

  const fetchPensionadoDetails = async (pensionadoId: string) => {
    setIsLoading(true);
    setError(null);
    setSelectedPensionado(null);
    setPagosList([]);

    try {
      const pensionadoDocRef = doc(db, PENSIONADOS_COLLECTION, pensionadoId);
      const pensionadoDocSnap = await getDoc(pensionadoDocRef);

      if (pensionadoDocSnap.exists()) {
        const pensionadoData = { id: pensionadoDocSnap.id, ...pensionadoDocSnap.data() } as Pensionado;
        setSelectedPensionado(pensionadoData);
        setViewMode('details');

        const pagosCollectionRef = collection(db, PENSIONADOS_COLLECTION, pensionadoData.id, PAGOS_SUBCOLLECTION);
        const pagosQuery = query(pagosCollectionRef, orderBy("fechaProcesado", "desc"));
        
        const pagosSnapshot = await getDocs(pagosQuery);
        const pagos = pagosSnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Pago));
        setPagosList(pagos);

        if (pagos.length === 0) {
          toast({ title: "Información", description: "Pensionado encontrado, pero no tiene pagos registrados.", variant: "default" });
        }
      } else {
        setError("No se encontró el pensionado para ver detalles.");
        toast({ title: "No encontrado", description: "Error al cargar detalles del pensionado.", variant: "destructive" });
        setViewMode('list'); // Go back to list if details fail
      }
    } catch (err: any) {
      console.error("Error fetching pensioner details:", err);
      setError("Ocurrió un error al cargar detalles: " + err.message);
      toast({ title: "Error", description: "No se pudo cargar la información.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    setSelectedPensionado(null);
    setPagosList([]);
    setViewMode('initial'); 
    setError(null);
    setCurrentPage(1);
    setLastVisibleDoc(null);


    if (documentoInput.trim()) {
      fetchPensionadoDetails(documentoInput.trim());
    } else if (filterCentroCosto || filterDependencia) {
      fetchPensionadosByFilters(1);
    } else {
      toast({ title: "Información requerida", description: "Ingrese un número de documento o seleccione filtros.", variant: "destructive" });
    }
  };
  
  const handleNextPage = () => {
    if (totalResults > ITEMS_PER_PAGE) { // Check if there might be a next page
      fetchPensionadosByFilters(currentPage + 1, lastVisibleDoc);
    }
  };

  const handlePrevPage = () => {
    // Prev page logic is more complex with startAfter/endBefore. 
    // For simplicity, this basic pagination will just refetch page 1 if going back from page 2.
    // A more robust solution would store an array of firstVisibleDocs for each page.
    if (currentPage > 1) {
        fetchPensionadosByFilters(currentPage - 1, null); // Simplified: re-querying from start.
                                                        // A true prev page needs to query with endBefore the current firstVisibleDoc.
                                                        // For now, it will go to the effective previous page number but re-query from the start of that page.
    }
  };
  
  const formatFirebaseTimestamp = (timestamp: Timestamp | undefined): string => {
    if (!timestamp) return 'N/A';
    try { return timestamp.toDate().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }); } 
    catch (e) { return 'Fecha inválida'; }
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

  const handleClearFiltersAndSearch = () => {
    setDocumentoInput("");
    setFilterCentroCosto(undefined);
    setFilterDependencia(undefined);
    setSelectedPensionado(null);
    setPagosList([]);
    setSearchResults([]);
    setError(null);
    setViewMode('initial');
    setCurrentPage(1);
    setLastVisibleDoc(null);
    toast({ title: "Filtros limpiados", description: "Realice una nueva búsqueda."});
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-headline text-primary flex items-center">
            <Search className="mr-3 h-7 w-7" /> Consulta de Pagos de Pensionados
          </CardTitle>
          <CardDescription>
            Busque por documento o filtre por Centro de Costo / Dependencia para listar pensionados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 items-end">
            <div className="space-y-1 md:col-span-2 lg:col-span-1">
              <Label htmlFor="documentoInput">Número de Documento</Label>
              <Input id="documentoInput" type="text" value={documentoInput} onChange={(e) => setDocumentoInput(e.target.value)} placeholder="Buscar por documento" disabled={isLoading || isListLoading} className="text-base"/>
            </div>
            <div className="space-y-1 lg:col-span-1">
                <Label htmlFor="filterCentroCosto">Centro de Costo</Label>
                <Select value={filterCentroCosto} onValueChange={(value) => setFilterCentroCosto(value === "ALL_CENTROS" ? undefined : value)} disabled={isLoading || isListLoading}>
                    <SelectTrigger id="filterCentroCosto" className="text-base"><SelectValue placeholder="Todos" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL_CENTROS">Todos los Centros</SelectItem>
                        {distinctCentroCostos.map(cc => <SelectItem key={cc} value={cc}>{cc}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-1 lg:col-span-1">
                <Label htmlFor="filterDependencia">Dependencia</Label>
                <Select value={filterDependencia} onValueChange={(value) => setFilterDependencia(value === "ALL_DEPENDENCIAS" ? undefined : value)} disabled={isLoading || isListLoading}>
                    <SelectTrigger id="filterDependencia" className="text-base"><SelectValue placeholder="Todas" /></SelectTrigger>
                    <SelectContent>
                         <SelectItem value="ALL_DEPENDENCIAS">Todas las Dependencias</SelectItem>
                        {distinctDependencias.map(dep => <SelectItem key={dep} value={dep}>{dep}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 lg:col-span-1">
                <Button onClick={handleSearch} disabled={isLoading || isListLoading} className="w-full text-base">
                    {(isLoading || isListLoading) ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Search className="mr-2 h-5 w-5" />}
                    Buscar
                </Button>
                 <Button onClick={handleClearFiltersAndSearch} variant="outline" disabled={isLoading || isListLoading} className="w-full text-base">
                    Limpiar
                </Button>
            </div>
          </div>
          {error && (
            <div className="mt-6 p-3 bg-destructive/10 border border-destructive/50 text-destructive rounded-md flex items-center text-sm">
              <AlertCircle className="mr-2 h-5 w-5 flex-shrink-0" /> {error}
            </div>
          )}
        </CardContent>
      </Card>

      {viewMode === 'list' && searchResults.length > 0 && (
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-xl font-headline text-primary flex items-center">
              <ListChecks className="mr-2 h-6 w-6" /> Resultados de Búsqueda ({searchResults.length}{totalResults > ITEMS_PER_PAGE ? '+' : ''})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Documento</TableHead>
                    <TableHead>Centro de Costo</TableHead>
                    <TableHead>Dependencia</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {searchResults.map(p => (
                    <TableRow key={p.id}>
                      <TableCell>{p.empleado || 'N/A'}</TableCell>
                      <TableCell>{p.id}</TableCell>
                      <TableCell>{p.pnlCentroCosto || 'N/A'}</TableCell>
                      <TableCell>{p.pnlDependencia?.replace(/^V\d+-/, '') || 'N/A'}</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" onClick={() => fetchPensionadoDetails(p.id)} disabled={isLoading}>
                          Ver Detalles
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex justify-between items-center mt-4">
              <Button onClick={handlePrevPage} disabled={currentPage === 1 || isListLoading} variant="outline">
                <ChevronLeft className="mr-2 h-4 w-4" /> Anterior
              </Button>
              <span className="text-sm text-muted-foreground">Página {currentPage}</span>
              <Button onClick={handleNextPage} disabled={searchResults.length < ITEMS_PER_PAGE || totalResults <= ITEMS_PER_PAGE || isListLoading} variant="outline">
                Siguiente <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
       {viewMode === 'list' && searchResults.length === 0 && !isListLoading && (
         <Card className="mt-6 shadow-sm border-dashed border-muted-foreground/50">
            <CardContent className="pt-6">
                <div className="text-center text-muted-foreground py-8">
                    <Search className="mx-auto h-16 w-16 mb-3 text-primary/30" />
                    <p className="text-lg">No se encontraron pensionados.</p>
                    <p className="text-sm">Pruebe con diferentes filtros o un número de documento.</p>
                </div>
            </CardContent>
         </Card>
       )}


      {viewMode === 'details' && selectedPensionado && (
        <>
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

          {pagosList.length > 0 && (
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
                          <div className="overflow-x-auto rounded-md border"><Table className="min-w-full text-xs sm:text-sm">
                              <TableHeader className="bg-muted/50"><TableRow>
                                  <TableHead className="w-[45%] font-medium">Concepto (Nombre)</TableHead>
                                  <TableHead className="font-medium">Código</TableHead>
                                  <TableHead className="text-right font-medium">Ingresos</TableHead>
                                  <TableHead className="text-right font-medium">Egresos</TableHead>
                              </TableRow></TableHeader>
                              <TableBody>{pago.detalles.map((detalle, index) => (
                                  <TableRow key={index} className={detalle.nombre === "Totales:" ? "font-bold bg-muted/20" : "hover:bg-muted/10"}>
                                  <TableCell>{detalle.nombre}</TableCell>
                                  <TableCell>{detalle.codigo || 'N/A'}</TableCell>
                                  <TableCell className="text-right">{formatNumberForDetails(detalle.ingresos)}</TableCell>
                                  <TableCell className="text-right">{formatNumberForDetails(detalle.egresos)}</TableCell>
                                  </TableRow>))}
                              </TableBody></Table></div>
                        ) : (<p className="text-sm text-muted-foreground">No hay detalles disponibles para este pago.</p>)}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          )}
          {viewMode === 'details' && selectedPensionado && pagosList.length === 0 && !isLoading && (
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
        </>
      )}
       
      {viewMode === 'initial' && !isLoading && !isListLoading && !error && (
          <Card className="mt-6 shadow-sm border-dashed border-muted-foreground/50">
              <CardContent className="pt-6">
                  <div className="text-center text-muted-foreground py-8">
                      <Search className="mx-auto h-16 w-16 mb-3 text-primary/30" />
                      <p className="text-lg">Realice una búsqueda</p>
                      <p className="text-sm">Ingrese un número de documento o use los filtros para encontrar pensionados.</p>
                  </div>
              </CardContent>
          </Card>
      )}
    </div>
  );
}


    