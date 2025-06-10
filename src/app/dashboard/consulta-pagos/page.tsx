
"use client";

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, getDocs, query, orderBy, Timestamp, where, QueryConstraint, limit, startAfter, DocumentData } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, UserCircle, FileText, AlertCircle, ChevronLeft, ChevronRight, ListChecks, CalendarDays, TrendingUp, TrendingDown, DollarSign, Hash } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Define interfaces for data structures
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
  fechaLiquidacion?: string;
  fechaProcesado?: Timestamp; 
  grado?: string;
  periodoPago?: string;
  procesado?: boolean;
  valorLiquidado?: string;
  valorNeto?: string;
}

interface PagosYearSummary {
  count: number;
  avgNeto: number;
  maxNeto: number;
  minNeto: number;
}

interface PagosAnualesStats {
  [year: string]: PagosYearSummary;
}


const PENSIONADOS_COLLECTION = "pensionados";
const PARISS1_COLLECTION = "pariss1"; 
const PAGOS_SUBCOLLECTION = "pagos";
const ITEMS_PER_PAGE = 10;

export default function ConsultaPagosPage() {
  const { toast } = useToast();
  const [documentoInput, setDocumentoInput] = useState<string>("");
  const [selectedPensionado, setSelectedPensionado] = useState<Pensionado | null>(null);
  const [pagosList, setPagosList] = useState<Pago[]>([]);
  const [pagosAnualesStats, setPagosAnualesStats] = useState<PagosAnualesStats>({});
  
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
      
      queryConstraints.push(orderBy("empleado")); 

      let pensionadosQuery = query(collection(db, PENSIONADOS_COLLECTION), ...queryConstraints, limit(ITEMS_PER_PAGE + 1));
      if (page > 1 && startAfterDoc) {
        pensionadosQuery = query(collection(db, PENSIONADOS_COLLECTION), ...queryConstraints, startAfter(startAfterDoc), limit(ITEMS_PER_PAGE + 1));
      } else if (page === 1) {
         setLastVisibleDoc(null); 
      }


      const pensionadosSnapshot = await getDocs(pensionadosQuery);
      const pensionadosData = pensionadosSnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Pensionado));

      setFirstVisibleDoc(pensionadosSnapshot.docs[0] || null); 
      setLastVisibleDoc(pensionadosSnapshot.docs[pensionadosSnapshot.docs.length - (pensionadosData.length > ITEMS_PER_PAGE ? 2 : 1)] || null);


      setSearchResults(pensionadosData.slice(0, ITEMS_PER_PAGE));
      setTotalResults(pensionadosData.length); 

      if (pensionadosData.length === 0) {
        toast({ title: "Sin Resultados", description: "No se encontraron pensionados con los filtros seleccionados.", variant: "default" });
      } else {
        setViewMode('list');
        setCurrentPage(page);
      }
    } catch (err: any) {
      console.error("Error searching pensioners by filters:", err);
      setError("Ocurrió un error al buscar por filtros: " + err.message);
      let toastMessage = "No se pudo completar la búsqueda.";
      if (err.message && err.message.includes("indexes")) {
          toastMessage = "La consulta requiere un índice compuesto en Firestore. Revisa la consola del navegador para ver el enlace y crearlo.";
      }
      toast({ title: "Error de Búsqueda", description: toastMessage, variant: "destructive" });
    } finally {
      setIsListLoading(false);
    }
  };
  
  const parseCurrencyToNumber = (currencyString: string | undefined | null): number => {
    if (!currencyString) return 0;
    const cleanedString = String(currencyString).replace(/\./g, '').replace(',', '.');
    const number = parseFloat(cleanedString);
    return isNaN(number) ? 0 : number;
  };

  const fetchPensionadoDetails = async (pensionadoId: string) => {
    setIsLoading(true);
    setError(null);
    setSelectedPensionado(null);
    setPagosList([]);
    setPagosAnualesStats({});

    try {
      const pensionadoDocRef = doc(db, PENSIONADOS_COLLECTION, pensionadoId);
      const pensionadoDocSnap = await getDoc(pensionadoDocRef);

      if (pensionadoDocSnap.exists()) {
        let pensionadoData = { id: pensionadoDocSnap.id, ...pensionadoDocSnap.data() } as Pensionado;

        console.log(`Consulta Pagos: Pensionado ID: ${pensionadoData.id}. Datos iniciales:`, JSON.stringify(pensionadoData));

        const pariss1DocRef = doc(db, PARISS1_COLLECTION, pensionadoData.id); 
        const pariss1DocSnap = await getDoc(pariss1DocRef);
        if (pariss1DocSnap.exists()) {
          pensionadoData = { ...pensionadoData, ...pariss1DocSnap.data() as Pariss1Data };
          toast({ title: "Información Adicional", description: "Detalles de Pariss1 cargados.", variant: "default" });
          console.log(`Consulta Pagos: Datos de Pariss1 para ${pensionadoData.id} cargados y fusionados.`);
        } else {
          toast({ title: "Advertencia", description: "No se encontraron detalles adicionales en Pariss1 para este pensionado.", variant: "default" });
          console.warn(`Consulta Pagos: No se encontró documento en Pariss1 para ${pensionadoData.id} en la ruta ${pariss1DocRef.path}`);
        }
        setSelectedPensionado(pensionadoData);
        setViewMode('details');
        
        const pagosCollectionRef = collection(db, PENSIONADOS_COLLECTION, pensionadoData.id, PAGOS_SUBCOLLECTION);
        console.log(`Consulta Pagos: Construida referencia a la subcolección de pagos: ${pagosCollectionRef.path}`);
        
        const pagosQuery = query(pagosCollectionRef, orderBy("año", "desc"), orderBy("fechaProcesado", "desc"));
        console.log("Consulta Pagos: Objeto Query de Pagos (configuración):", pagosQuery);

        const pagosSnapshot = await getDocs(pagosQuery);
        console.log(`Consulta Pagos: Snapshot de pagos recibido. Vacío: ${pagosSnapshot.empty}. Número de documentos: ${pagosSnapshot.docs.length}`);
        
        const pagosTemp: Pago[] = [];
        pagosSnapshot.forEach(docSnap => {
            const data = docSnap.data();
            console.log(`Consulta Pagos: Documento de pago ID: ${docSnap.id}, Datos Brutos:`, JSON.stringify(data));
            pagosTemp.push({ id: docSnap.id, ...data } as Pago);
        });
        setPagosList(pagosTemp);
        console.log(`Consulta Pagos: pagosList actualizado con ${pagosTemp.length} pagos.`);


        if (pagosTemp.length > 0) {
          const stats: PagosAnualesStats = {};
          const groupedByYear = pagosTemp.reduce<Record<string, Pago[]>>((acc, pago) => {
            const yearKey = pago.año || "Sin Año";
            if (!acc[yearKey]) acc[yearKey] = [];
            acc[yearKey].push(pago);
            return acc;
          }, {});

          for (const year in groupedByYear) {
            const yearPagos = groupedByYear[year];
            const netos = yearPagos.map(p => parseCurrencyToNumber(p.valorNeto)).filter(n => n !== 0); 
            if (netos.length > 0) {
              stats[year] = {
                count: yearPagos.length,
                avgNeto: netos.reduce((sum, val) => sum + val, 0) / netos.length,
                maxNeto: Math.max(...netos),
                minNeto: Math.min(...netos),
              };
            } else {
               stats[year] = { count: yearPagos.length, avgNeto: 0, maxNeto: 0, minNeto: 0 };
            }
          }
          setPagosAnualesStats(stats);
          console.log(`Consulta Pagos: Estadísticas anuales calculadas:`, JSON.stringify(stats));
        } else {
          console.warn(`Consulta Pagos: No se encontraron pagos efectivos para ${pensionadoData.id}, 'pagosList' está vacío.`);
          setPagosAnualesStats({}); 
        }

      } else {
        setError("No se encontró el pensionado para ver detalles.");
        toast({ title: "No encontrado", description: "Error al cargar detalles del pensionado.", variant: "destructive" });
        setViewMode('list'); 
        console.error(`Consulta Pagos: No se encontró documento de pensionado con ID: ${pensionadoId} en la ruta ${pensionadoDocRef.path}`);
      }
    } catch (err: any) {
      console.error("Error fetching pensioner details or payments:", err);
      setError("Ocurrió un error al cargar detalles: " + err.message);
      let toastMessage = "No se pudo cargar la información del pensionado o sus pagos.";
      if (err.message && err.message.includes("indexes") && (err.message.includes("año") || err.message.includes("fechaProcesado"))) {
        toastMessage = `La consulta de pagos (ruta: ${PENSIONADOS_COLLECTION}/${pensionadoId}/${PAGOS_SUBCOLLECTION}) requiere un índice compuesto en Firestore. Campos del índice: año (DESC), fechaProcesado (DESC). Revisa la consola del navegador para ver el enlace y crearlo.`;
      } else if (err.message && err.message.includes("indexes")) {
         toastMessage = "La consulta de pensionados por filtro requiere un índice compuesto en Firestore. Revisa la consola del navegador para crearlo.";
      }
      toast({ title: "Error", description: toastMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    setSelectedPensionado(null);
    setPagosList([]);
    setPagosAnualesStats({});
    setSearchResults([]); 
    setError(null);
    setCurrentPage(1);
    setLastVisibleDoc(null);
    setFirstVisibleDoc(null);

    if (documentoInput.trim()) {
      fetchPensionadoDetails(documentoInput.trim());
    } else if (filterCentroCosto || filterDependencia) {
      fetchPensionadosByFilters(1); 
    } else {
      toast({ title: "Información requerida", description: "Ingrese un número de documento o seleccione filtros.", variant: "destructive" });
      setViewMode('initial');
    }
  };
  
  const handleNextPage = () => {
    if (totalResults > ITEMS_PER_PAGE) { 
      fetchPensionadosByFilters(currentPage + 1, lastVisibleDoc);
    }
  };

  const handlePrevPage = async () => {
    if (currentPage > 1) {
        fetchPensionadosByFilters(currentPage - 1, null); 
    }
  };
  
  const formatFirebaseTimestamp = (timestamp: Timestamp | undefined | string): string => {
    if (!timestamp) return 'N/A';
    try {
      if (typeof timestamp === 'string') { 
        const d = new Date(timestamp);
        if (isNaN(d.getTime())) return timestamp; 
        return d.toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
      }
      return timestamp.toDate().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch (e) {
      console.warn("Could not format timestamp:", timestamp, e);
      return 'Fecha inválida';
    }
  };

  const formatCurrency = (value: string | number | undefined | null, addSymbol: boolean = true): string => {
    if (value === undefined || value === null) return addSymbol ? '$0,00' : '0,00';
    let numValue = typeof value === 'string' ? parseCurrencyToNumber(value) : value;
    if (isNaN(numValue)) return addSymbol ? '$0,00' : '0,00';
    const prefix = addSymbol ? '$' : '';
    return `${prefix}${numValue.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatSexo = (sexoCode?: number): string => {
    if (sexoCode === undefined) return 'N/A';
    if (sexoCode === 1) return 'Masculino'; 
    if (sexoCode === 2) return 'Femenino';  
    return 'Otro';
  };
  
  const formatRegimen = (regimenCode?: number): string => {
    if (regimenCode === undefined) return 'N/A';
    if (regimenCode === 1) return 'Régimen A';
    if (regimenCode === 2) return 'Régimen B (Transición)';
    return `Código ${regimenCode}`;
  };

  const formatRiesgo = (riesgoCode?: string): string => {
    if (!riesgoCode) return 'N/A';
    if (riesgoCode === 'V') return 'Vejez';
    if (riesgoCode === 'I') return 'Invalidez';
    if (riesgoCode === 'S') return 'Sobrevivencia';
    return riesgoCode;
  };

  const formatTranci = (tranciValue?: boolean): string => {
    if (tranciValue === undefined) return 'N/A';
    return tranciValue ? 'Sí' : 'No';
  };


  const handleClearFiltersAndSearch = () => {
    setDocumentoInput("");
    setFilterCentroCosto(undefined);
    setFilterDependencia(undefined);
    setSelectedPensionado(null);
    setPagosList([]);
    setPagosAnualesStats({});
    setSearchResults([]);
    setError(null);
    setViewMode('initial');
    setCurrentPage(1);
    setLastVisibleDoc(null);
    setFirstVisibleDoc(null);
    toast({ title: "Filtros limpiados", description: "Realice una nueva búsqueda."});
  };
  
  const sortedYearsForStats = Object.keys(pagosAnualesStats).sort((a, b) => {
    if (a === "Sin Año") return 1;
    if (b === "Sin Año") return -1;
    return b.localeCompare(a); 
  });


  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-headline text-primary flex items-center">
            <Search className="mr-3 h-7 w-7" /> Consulta y Resumen de Pagos
          </CardTitle>
          <CardDescription>
            Busque por documento o filtre para listar pensionados y ver un resumen anual de sus pagos.
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
            <CardContent className="space-y-2 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3">
                  <div><strong>Nombre:</strong> {selectedPensionado.empleado || 'N/A'}</div>
                  <div><strong>Documento:</strong> {selectedPensionado.id}</div>
                  <div><strong>Cargo:</strong> {selectedPensionado.cargo || 'N/A'}</div>
                  <div><strong>Empresa:</strong> {selectedPensionado.empresa || 'N/A'}</div>
                  <div><strong>C. Costo:</strong> {selectedPensionado.pnlCentroCosto || 'N/A'}</div>
                  <div><strong>Dependencia:</strong> {selectedPensionado.pnlDependencia?.replace(/^V\d+-/, '') || 'N/A'}</div>
                  <div><strong>Esquema:</strong> {selectedPensionado.esquema || 'N/A'}</div>
                  <div><strong>Año Jubilación:</strong> {selectedPensionado.ano_jubilacion || 'N/A'}</div>
                  <div><strong>Fondo Salud:</strong> {selectedPensionado.fondoSalud || 'N/A'}</div>
                  
                  {/* Pariss1 Data */}
                  <div><strong>Cédula (Pariss1):</strong> {selectedPensionado.cedula || 'N/A'}</div>
                  <div><strong>Fecha Nacimiento:</strong> {formatFirebaseTimestamp(selectedPensionado.fe_nacido)}</div>
                  <div><strong>Sexo:</strong> {formatSexo(selectedPensionado.sexo)}</div>
                  <div><strong>Ciudad ISS:</strong> {selectedPensionado.ciudad_iss || 'N/A'}</div>
                  <div><strong>Dirección ISS:</strong> {selectedPensionado.dir_iss || 'N/A'}</div>
                  <div><strong>Teléfono ISS:</strong> {selectedPensionado.telefono_iss !== undefined ? selectedPensionado.telefono_iss : 'N/A'}</div>
                  <div><strong>Afilia:</strong> {selectedPensionado.afilia || 'N/A'}</div>
                  <div><strong>Semanas Cotizadas:</strong> {selectedPensionado.semanas !== undefined ? selectedPensionado.semanas : 'N/A'}</div>
                  <div><strong>Régimen:</strong> {formatRegimen(selectedPensionado.regimen)}</div>
                  <div><strong>Tipo Riesgo:</strong> {formatRiesgo(selectedPensionado.riesgo)}</div>
                  <div><strong>Transición:</strong> {formatTranci(selectedPensionado.tranci)}</div>
                  <div><strong>Fecha Adquiere Derecho:</strong> {formatFirebaseTimestamp(selectedPensionado.fe_adquiere)}</div>
                  <div><strong>Fecha Causación:</strong> {formatFirebaseTimestamp(selectedPensionado.fe_causa)}</div>
                  <div><strong>Fecha Ingreso ISS:</strong> {formatFirebaseTimestamp(selectedPensionado.fe_ingreso)}</div>
                  <div><strong>Fecha Vinculación ISS:</strong> {formatFirebaseTimestamp(selectedPensionado.fe_vinculado)}</div>
                  <div><strong>Fecha Comparte:</strong> {formatFirebaseTimestamp(selectedPensionado.Comparte)}</div>
                  <div><strong>Resolución Año:</strong> {selectedPensionado.res_ano !== undefined ? selectedPensionado.res_ano : 'N/A'}</div>
                  <div><strong>Resolución Número:</strong> {selectedPensionado.res_nro || 'N/A'}</div>
                  <div><strong>Identificador Pariss1:</strong> {selectedPensionado.identifica !== undefined ? selectedPensionado.identifica : 'N/A'}</div>
                  <div><strong>Mesada (Pariss1):</strong> {formatCurrency(selectedPensionado.mesada)}</div>
                  <div><strong>Pensión Inicial (Pariss1):</strong> {formatCurrency(selectedPensionado.pension_ini)}</div>
                  <div><strong>Seguro:</strong> {selectedPensionado.seguro !== undefined ? selectedPensionado.seguro : 'N/A'}</div>
              </div>
            </CardContent>
          </Card>

          {pagosList.length > 0 && Object.keys(pagosAnualesStats).length > 0 && (
            <Card className="shadow-md mt-6">
              <CardHeader>
                <CardTitle className="text-xl font-headline text-primary flex items-center">
                  <CalendarDays className="mr-2 h-6 w-6" /> Resumen Anual de Pagos ({pagosList.length} pagos totales)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {sortedYearsForStats.map(year => {
                  const stats = pagosAnualesStats[year];
                  if (!stats) return null;
                  return (
                    <div key={year} className="p-4 border rounded-lg shadow-sm bg-muted/20 hover:shadow-md transition-shadow">
                      <h3 className="text-lg font-semibold text-foreground mb-3">Año: {year}</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div className="flex items-center space-x-2 p-2 bg-background rounded-md">
                            <Hash className="h-5 w-5 text-primary/70"/>
                            <div><strong>Pagos:</strong> {stats.count}</div>
                        </div>
                        <div className="flex items-center space-x-2 p-2 bg-background rounded-md">
                            <DollarSign className="h-5 w-5 text-green-600"/>
                            <div><strong>Promedio Neto:</strong> {formatCurrency(stats.avgNeto)}</div>
                        </div>
                        <div className="flex items-center space-x-2 p-2 bg-background rounded-md">
                            <TrendingUp className="h-5 w-5 text-blue-600"/>
                            <div><strong>Neto Máximo:</strong> {formatCurrency(stats.maxNeto)}</div>
                        </div>
                        <div className="flex items-center space-x-2 p-2 bg-background rounded-md">
                            <TrendingDown className="h-5 w-5 text-red-600"/>
                            <div><strong>Neto Mínimo:</strong> {formatCurrency(stats.minNeto)}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {viewMode === 'details' && selectedPensionado && pagosList.length === 0 && !isLoading && (
            <Card className="mt-6 shadow-sm border-dashed border-muted-foreground/50">
                <CardContent className="pt-6">
                    <div className="text-center text-muted-foreground py-8">
                        <FileText className="mx-auto h-16 w-16 mb-3 text-primary/30" />
                        <p className="text-lg">No se encontraron registros de pago.</p>
                        <p className="text-sm">El pensionado seleccionado no tiene historial de pagos en el sistema. Verifica los índices de Firestore si crees que esto es un error.</p>
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

    