"use client";

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, getDocs, query, orderBy, Timestamp, where, QueryConstraint, limit, startAfter, DocumentData } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, UserCircle, FileText, AlertCircle, ChevronLeft, ChevronRight, ListChecks, CalendarDays, TrendingUp, TrendingDown, DollarSign, Hash, ChevronsRight } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePensionadoContext, Pensionado, Pago } from '@/contexts/PensionadoContext'; // Importar contexto y tipos
import Link from 'next/link';

// Interfaces locales específicas si son diferentes o más detalladas que las del contexto
interface Pariss1DataLocal { // Renombrado para evitar conflicto si las del contexto son más genéricas
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

interface PensionadoLocal extends Pariss1DataLocal, Pensionado {} // Usa Pensionado del contexto y extiende
interface PagoLocal extends Pago {} // Usa Pago del contexto

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
  const { setContextPensionadoData, clearContextPensionadoData, setContextIsLoading } = usePensionadoContext();

  const [documentoInput, setDocumentoInput] = useState<string>("");
  const [selectedPensionado, setSelectedPensionado] = useState<PensionadoLocal | null>(null);
  const [pagosList, setPagosList] = useState<PagoLocal[]>([]);
  const [pagosAnualesStats, setPagosAnualesStats] = useState<PagosAnualesStats>({});

  // Nuevos estados para autocompletado
  const [suggestions, setSuggestions] = useState<PensionadoLocal[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isListLoading, setIsListLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [filterCentroCosto, setFilterCentroCosto] = useState<string | undefined>(undefined);
  const [filterDependencia, setFilterDependencia] = useState<string | undefined>(undefined);
  const [distinctCentroCostos, setDistinctCentroCostos] = useState<string[]>([]);
  const [distinctDependencias, setDistinctDependencias] = useState<string[]>([]);
  const [originalDependenciasMap, setOriginalDependenciasMap] = useState<Record<string, string>>({});

  const [searchResults, setSearchResults] = useState<PensionadoLocal[]>([]);
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
      const pensionadosData = pensionadosSnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as PensionadoLocal));

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
    setContextIsLoading(true);
    setError(null);
    
    // Limpiar completamente el estado antes de la nueva consulta
    setSelectedPensionado(null);
    setPagosList([]);
    setPagosAnualesStats({});
    clearContextPensionadoData(); // Agregar esta línea crucial

    try {
      const pensionadoDocRef = doc(db, PENSIONADOS_COLLECTION, pensionadoId);
      const pensionadoDocSnap = await getDoc(pensionadoDocRef);

      if (pensionadoDocSnap.exists()) {
        let pensionadoData = { id: pensionadoDocSnap.id, ...pensionadoDocSnap.data() } as PensionadoLocal;
        console.log(`Consulta Pagos: Pensionado ID: ${pensionadoData.id}. Datos iniciales:`, JSON.stringify(pensionadoData));

        // Obtener datos adicionales de Pariss1
        const pariss1DocRef = doc(db, PARISS1_COLLECTION, pensionadoData.id);
        const pariss1DocSnap = await getDoc(pariss1DocRef);
        if (pariss1DocSnap.exists()) {
          pensionadoData = { ...pensionadoData, ...pariss1DocSnap.data() as Pariss1DataLocal };
          toast({ title: "Información Adicional", description: "Detalles de Pariss1 cargados.", variant: "default" });
          console.log(`Consulta Pagos: Datos de Pariss1 para ${pensionadoData.id} cargados y fusionados.`);
        } else {
          console.warn(`Consulta Pagos: No se encontró documento en Pariss1 para ${pensionadoData.id}`);
        }
        
        // Establecer pensionado antes de buscar pagos
        setSelectedPensionado(pensionadoData);
        setViewMode('details');

        // Consultar pagos con logging detallado
        const pagosCollectionRef = collection(db, PENSIONADOS_COLLECTION, pensionadoData.id, PAGOS_SUBCOLLECTION);
        console.log(`Consulta Pagos: Referencia a pagos: ${pagosCollectionRef.path}`);
        
        const pagosQuery = query(pagosCollectionRef, orderBy("año", "desc"), orderBy("fechaProcesado", "desc"));
        console.log("Consulta Pagos: Ejecutando query de pagos...");
        
        const pagosSnapshot = await getDocs(pagosQuery);
        console.log(`Consulta Pagos: Snapshot recibido. Vacío: ${pagosSnapshot.empty}, Docs: ${pagosSnapshot.docs.length}`);

        if (pagosSnapshot.empty) {
          console.warn(`Consulta Pagos: No se encontraron pagos para ${pensionadoData.id}`);
          setPagosList([]);
          setPagosAnualesStats({});
          setContextPensionadoData(pensionadoData as Pensionado, []);
          toast({ 
            title: "Sin Pagos", 
            description: "No se encontraron registros de pagos para este pensionado.", 
            variant: "default" 
          });
          return;
        }

        const pagosTemp: PagoLocal[] = [];
        pagosSnapshot.forEach(docSnap => {
          const data = docSnap.data();
          console.log(`Consulta Pagos: Pago ID: ${docSnap.id}, Datos:`, JSON.stringify(data));
          pagosTemp.push({ id: docSnap.id, ...data } as PagoLocal);
        });
        
        console.log(`Consulta Pagos: ${pagosTemp.length} pagos procesados`);
        setPagosList(pagosTemp);

        // Calcular estadísticas
        if (pagosTemp.length > 0) {
          const stats: PagosAnualesStats = {};
          const groupedByYear = pagosTemp.reduce<Record<string, PagoLocal[]>>((acc, pago) => {
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
          console.log(`Consulta Pagos: Estadísticas calculadas:`, JSON.stringify(stats));
        }
        
        // Actualizar contexto al final
        setContextPensionadoData(pensionadoData as Pensionado, pagosTemp as Pago[]);
        console.log(`Consulta Pagos: Contexto actualizado con ${pagosTemp.length} pagos`);

      } else {
        setError("No se encontró el pensionado para ver detalles.");
        toast({ title: "No encontrado", description: "Error al cargar detalles del pensionado.", variant: "destructive" });
        setViewMode('list');
        console.error(`Consulta Pagos: No se encontró documento de pensionado con ID: ${pensionadoId}`);
      }
    } catch (err: any) {
      console.error("Error fetching pensioner details or payments:", err);
      setError("Ocurrió un error al cargar detalles: " + err.message);
      
      let toastMessage = "No se pudo cargar la información del pensionado o sus pagos.";
      if (err.message && err.message.includes("indexes")) {
        if (err.message.includes("año") || err.message.includes("fechaProcesado")) {
          toastMessage = `La consulta de pagos requiere un índice compuesto en Firestore. Campos: año (DESC), fechaProcesado (DESC). Ruta: ${PENSIONADOS_COLLECTION}/{pensionadoId}/${PAGOS_SUBCOLLECTION}`;
        } else {
          toastMessage = "La consulta requiere un índice compuesto en Firestore. Revisa la consola para crear el índice necesario.";
        }
      }
      
      toast({ title: "Error", description: toastMessage, variant: "destructive" });
      clearContextPensionadoData();
    } finally {
      setIsLoading(false);
      setContextIsLoading(false);
    }
  };

  // Nueva función para búsqueda de sugerencias
  const searchSuggestions = async (searchTerm: string) => {
    if (searchTerm.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsSearching(true);
    
    try {
      // Primero verificar si es un documento exacto
      const pensionadoDocRef = doc(db, PENSIONADOS_COLLECTION, searchTerm);
      const pensionadoDocSnap = await getDoc(pensionadoDocRef);

      if (pensionadoDocSnap.exists()) {
        // Si es un documento exacto, mostrarlo como única sugerencia
        const exactMatch = { id: pensionadoDocSnap.id, ...pensionadoDocSnap.data() } as PensionadoLocal;
        setSuggestions([exactMatch]);
        setShowSuggestions(true);
        setIsSearching(false);
        return;
      }

      // Si no es documento exacto, buscar por nombre
      const searchTermUpper = searchTerm.toUpperCase().trim();
      const pensionadosQuery = query(
        collection(db, PENSIONADOS_COLLECTION),
        limit(10) // Limitar a 10 sugerencias
      );
      const pensionadosSnapshot = await getDocs(pensionadosQuery);
      
      const matchingPensionados: PensionadoLocal[] = [];
      
      pensionadosSnapshot.forEach(docSnap => {
        const data = docSnap.data();
        const empleado = data.empleado || "";
        
        // Buscar coincidencias en el nombre
        if (empleado.toUpperCase().includes(searchTermUpper)) {
          matchingPensionados.push({ id: docSnap.id, ...data } as PensionadoLocal);
        }
      });

      // Ordenar por relevancia (coincidencias que empiecen con el término primero)
      const sortedMatches = matchingPensionados.sort((a, b) => {
        const aEmpleado = (a.empleado || "").toUpperCase();
        const bEmpleado = (b.empleado || "").toUpperCase();
        
        const aStartsWith = aEmpleado.startsWith(searchTermUpper);
        const bStartsWith = bEmpleado.startsWith(searchTermUpper);
        
        if (aStartsWith && !bStartsWith) return -1;
        if (!aStartsWith && bStartsWith) return 1;
        
        return aEmpleado.localeCompare(bEmpleado);
      });

      setSuggestions(sortedMatches.slice(0, 8)); // Mostrar máximo 8 sugerencias
      setShowSuggestions(sortedMatches.length > 0);

    } catch (err: any) {
      console.error("Error searching suggestions:", err);
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsSearching(false);
    }
  };

  // Debounce para la búsqueda de sugerencias
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (documentoInput.trim()) {
        searchSuggestions(documentoInput.trim());
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300); // Esperar 300ms después de que el usuario deje de escribir

    return () => clearTimeout(timeoutId);
  }, [documentoInput]);

  // Función para manejar la selección de una sugerencia
  const handleSuggestionSelect = (pensionado: PensionadoLocal) => {
    setDocumentoInput(pensionado.id);
    setSuggestions([]);
    setShowSuggestions(false);
    
    // Ejecutar búsqueda directa
    toast({ 
      title: "Pensionado seleccionado", 
      description: `Cargando detalles de ${pensionado.empleado}...`,
      variant: "default" 
    });
    
    executeDocumentSearch(pensionado.id);
  };

  // Función para ocultar sugerencias cuando se hace clic fuera
  const handleInputBlur = () => {
    // Usar setTimeout para permitir que el click en una sugerencia se registre primero
    setTimeout(() => {
      setShowSuggestions(false);
    }, 200);
  };

  // Función para mostrar sugerencias cuando se enfoca el input
  const handleInputFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  // Función auxiliar para búsqueda por documento
  const executeDocumentSearch = (documentId: string) => {
    clearContextPensionadoData();
    setContextIsLoading(true);
    setSelectedPensionado(null);
    setPagosList([]);
    setPagosAnualesStats({});
    setSearchResults([]);
    setError(null);
    setCurrentPage(1);
    setLastVisibleDoc(null);
    setFirstVisibleDoc(null);
    
    fetchPensionadoDetails(documentId);
  };

  // Función para buscar por documento o nombre
  const searchByDocumentOrName = async (searchTerm: string) => {
    setIsLoading(true);
    setError(null);
    setSearchResults([]);
    setSelectedPensionado(null);
    setPagosList([]);
    setPagosAnualesStats({});
    clearContextPensionadoData();

    try {
      // Primero intentar búsqueda directa por documento (ID)
      const pensionadoDocRef = doc(db, PENSIONADOS_COLLECTION, searchTerm);
      const pensionadoDocSnap = await getDoc(pensionadoDocRef);

      if (pensionadoDocSnap.exists()) {
        // Si encontró por documento, cargar los detalles completos
        console.log("Encontrado por documento directo:", searchTerm);
        executeDocumentSearch(searchTerm);
        return;
      }

      // Si no se encuentra por documento, buscar por nombre en el campo empleado
      console.log("No encontrado por documento, buscando por nombre:", searchTerm);
      
      const searchTermUpper = searchTerm.toUpperCase().trim();
      const pensionadosQuery = query(collection(db, PENSIONADOS_COLLECTION));
      const pensionadosSnapshot = await getDocs(pensionadosQuery);
      
      const matchingPensionados: PensionadoLocal[] = [];
      
      pensionadosSnapshot.forEach(docSnap => {
        const data = docSnap.data();
        const empleado = data.empleado || "";
        
        // Buscar en el campo empleado (nombre completo con documento)
        if (empleado.toUpperCase().includes(searchTermUpper)) {
          matchingPensionados.push({ id: docSnap.id, ...data } as PensionadoLocal);
        }
      });

      if (matchingPensionados.length === 0) {
        toast({ 
          title: "Sin Resultados", 
          description: `No se encontraron pensionados con el término: "${searchTerm}"`, 
          variant: "default" 
        });
        setViewMode('initial');
        return;
      }

      if (matchingPensionados.length === 1) {
        // Si solo hay una coincidencia, cargar detalles directamente
        const pensionado = matchingPensionados[0];
        toast({ 
          title: "Pensionado encontrado", 
          description: `Cargando detalles de ${pensionado.empleado}...`,
          variant: "default" 
        });
        executeDocumentSearch(pensionado.id);
      } else {
        // Si hay múltiples coincidencias, mostrar lista
        setSearchResults(matchingPensionados);
        setViewMode('list');
        setTotalResults(matchingPensionados.length);
        toast({ 
          title: "Múltiples resultados", 
          description: `Se encontraron ${matchingPensionados.length} pensionados que coinciden con "${searchTerm}"`,
          variant: "default" 
        });
      }

    } catch (err: any) {
      console.error("Error en búsqueda por documento o nombre:", err);
      setError("Ocurrió un error al buscar: " + err.message);
      toast({ 
        title: "Error de Búsqueda", 
        description: "No se pudo completar la búsqueda.", 
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Modificar handleSearch para usar la nueva función
  const handleSearch = () => {
    if (documentoInput.trim()) {
      searchByDocumentOrName(documentoInput.trim());
    } else if (filterCentroCosto || filterDependencia) {
      clearContextPensionadoData();
      setContextIsLoading(true);
      setSelectedPensionado(null);
      setPagosList([]);
      setPagosAnualesStats({});
      setSearchResults([]);
      setError(null);
      setCurrentPage(1);
      setLastVisibleDoc(null);
      setFirstVisibleDoc(null);
      
      fetchPensionadosByFilters(1);
    } else {
      toast({ title: "Información requerida", description: "Ingrese un número de documento/nombre o seleccione filtros.", variant: "destructive" });
      setViewMode('initial');
      setContextIsLoading(false);
    }
  };

  // Simplificar handleVerDetalles para ejecutar búsqueda directa por documento
  const handleVerDetalles = (pensionadoId: string, pensionadoNombre?: string) => {
    // Poblar el campo de documento
    setDocumentoInput(pensionadoId);
    
    // Limpiar filtros para evitar conflictos
    setFilterCentroCosto(undefined);
    setFilterDependencia(undefined);
    
    // Limpiar estado de lista
    setSearchResults([]);
    setViewMode('initial');
    
    // Mostrar toast informativo
    toast({ 
      title: "Cargando detalles", 
      description: `Consultando información de ${pensionadoNombre || pensionadoId}...`,
      variant: "default" 
    });
    
    // Ejecutar la búsqueda directa por documento (que ya funciona perfectamente)
    executeDocumentSearch(pensionadoId);
  };

  // Agregar esta función que faltaba
  const handleClearFiltersAndSearch = () => {
    clearContextPensionadoData();
    setContextIsLoading(false);
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
    setIsLoading(false);
    setIsListLoading(false);
    toast({ title: "Filtros limpiados", description: "Realice una nueva búsqueda.", variant: "default" });
  };

  // Agregar también las funciones de paginación que faltan
  const handlePrevPage = () => {
    if (currentPage > 1) {
      fetchPensionadosByFilters(currentPage - 1, firstVisibleDoc);
    }
  };

  const handleNextPage = () => {
    if (searchResults.length === ITEMS_PER_PAGE && totalResults > ITEMS_PER_PAGE) {
      fetchPensionadosByFilters(currentPage + 1, lastVisibleDoc);
    }
  };

  // Agregar las funciones de formateo que faltan
  const formatFirebaseTimestamp = (timestamp: Timestamp | undefined | string | {seconds: number, nanoseconds: number}, options?: Intl.DateTimeFormatOptions): string => {
    if (!timestamp) return 'N/A';
    const defaultOptions: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    
    try {
      if (typeof timestamp === 'string') {
        const date = new Date(timestamp);
        return date.toLocaleDateString('es-ES', options || defaultOptions);
      }
      
      if (timestamp instanceof Timestamp) {
        return timestamp.toDate().toLocaleDateString('es-ES', options || defaultOptions);
      }
      
      if (timestamp && typeof timestamp === 'object' && 'seconds' in timestamp) {
        const date = new Date(timestamp.seconds * 1000);
        return date.toLocaleDateString('es-ES', options || defaultOptions);
      }
      
      return 'N/A';
    } catch (e) {
      console.error('Error formatting timestamp:', e);
      return 'N/A';
    }
  };

  const formatCurrency = (value: string | number | undefined | null, addSymbol: boolean = true): string => {
    if (value === undefined || value === null) return 'N/A';
    
    let numValue = typeof value === 'string' ? parseCurrencyToNumber(value) : value;
    if (isNaN(numValue)) return 'N/A';
    
    const prefix = addSymbol ? '$' : '';
    return `${prefix}${numValue.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatSexo = (sexo: number | undefined): string => {
    if (sexo === undefined) return 'N/A';
    return sexo === 1 ? 'Masculino' : sexo === 2 ? 'Femenino' : 'No especificado';
  };

  const formatRegimen = (regimen: number | undefined): string => {
    if (regimen === undefined) return 'N/A';
    switch (regimen) {
      case 1: return 'Régimen Contributivo';
      case 2: return 'Régimen Subsidiado';
      default: return `Régimen ${regimen}`;
    }
  };

  const formatRiesgo = (riesgo: string | undefined): string => {
    if (!riesgo) return 'N/A';
    return riesgo.charAt(0).toUpperCase() + riesgo.slice(1).toLowerCase();
  };

  const formatTranci = (tranci: boolean | undefined): string => {
    if (tranci === undefined) return 'N/A';
    return tranci ? 'Sí' : 'No';
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
            Busque por documento/nombre o filtre para listar pensionados y ver un resumen anual de sus pagos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 items-end">
            <div className="space-y-1 md:col-span-2 lg:col-span-1 relative">
              <Label htmlFor="documentoInput">Documento o Nombre</Label>
              <Input 
                id="documentoInput" 
                type="text" 
                value={documentoInput} 
                onChange={(e) => setDocumentoInput(e.target.value)} 
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                placeholder="Escriba documento o nombre..." 
                disabled={isLoading || isListLoading} 
                className="text-base"
              />
              
              {/* Dropdown de sugerencias */}
              {showSuggestions && (
                <div className="absolute top-full left-0 right-0 z-50 bg-background border border-border rounded-md shadow-lg max-h-64 overflow-y-auto">
                  {isSearching ? (
                    <div className="p-3 text-center text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                      Buscando...
                    </div>
                  ) : suggestions.length > 0 ? (
                    suggestions.map((pensionado) => (
                      <div
                        key={pensionado.id}
                        className="p-3 hover:bg-muted cursor-pointer border-b border-border last:border-b-0 transition-colors"
                        onClick={() => handleSuggestionSelect(pensionado)}
                      >
                        <div className="font-medium text-sm text-foreground">
                          {pensionado.empleado || 'Sin nombre'}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Doc: {pensionado.id} | {pensionado.pnlDependencia?.replace(/^V\d+-/, '') || 'Sin dependencia'}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 text-center text-muted-foreground text-sm">
                      No se encontraron coincidencias
                    </div>
                  )}
                </div>
              )}
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
              <ListChecks className="mr-2 h-6 w-6" /> Resultados de Búsqueda de Pensionados ({searchResults.length}{totalResults > ITEMS_PER_PAGE ? '+' : ''})
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
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleVerDetalles(p.id, p.empleado)} 
                          disabled={isLoading}
                        >
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
 <p className="text-lg">No se encontraron pensionados con los filtros aplicados.</p>
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
 <UserCircle className="mr-2 h-6 w-6" /> Información del Pensionado y Datos de Nómina/Pensión
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

                  {/* Pariss1 Data - Conditionally Rendered */}
                  {selectedPensionado.cedula && <div><strong>Cédula (Pariss1):</strong> {selectedPensionado.cedula}</div>}
                  {selectedPensionado.fe_nacido && formatFirebaseTimestamp(selectedPensionado.fe_nacido) !== 'N/A' && <div><strong>Fecha Nacimiento:</strong> {formatFirebaseTimestamp(selectedPensionado.fe_nacido)}</div>}
                  {selectedPensionado.sexo !== undefined && formatSexo(selectedPensionado.sexo) !== 'N/A' && <div><strong>Sexo:</strong> {formatSexo(selectedPensionado.sexo)}</div>}
                  {selectedPensionado.ciudad_iss && <div><strong>Ciudad ISS:</strong> {selectedPensionado.ciudad_iss}</div>}
                  {selectedPensionado.dir_iss && selectedPensionado.dir_iss !== "0" && <div><strong>Dirección ISS:</strong> {selectedPensionado.dir_iss}</div>}
                  {selectedPensionado.telefono_iss !== undefined && selectedPensionado.telefono_iss !== 0 && <div><strong>Teléfono ISS:</strong> {selectedPensionado.telefono_iss}</div>}
                  {selectedPensionado.afilia && selectedPensionado.afilia.trim() && <div><strong>Afilia:</strong> {selectedPensionado.afilia.trim()}</div>}
                  {selectedPensionado.semanas !== undefined && <div><strong>Semanas Cotizadas:</strong> {selectedPensionado.semanas}</div>}
                  {selectedPensionado.regimen !== undefined && formatRegimen(selectedPensionado.regimen) !== 'N/A' && <div><strong>Régimen:</strong> {formatRegimen(selectedPensionado.regimen)}</div>}
                  {selectedPensionado.riesgo && formatRiesgo(selectedPensionado.riesgo) !== 'N/A' && <div><strong>Tipo Riesgo:</strong> {formatRiesgo(selectedPensionado.riesgo)}</div>}
                  {selectedPensionado.tranci !== undefined && formatTranci(selectedPensionado.tranci) !== 'N/A' && <div><strong>Transición:</strong> {formatTranci(selectedPensionado.tranci)}</div>}
                  {selectedPensionado.fe_adquiere && formatFirebaseTimestamp(selectedPensionado.fe_adquiere) !== 'N/A' && <div><strong>Fecha Adquiere Derecho:</strong> {formatFirebaseTimestamp(selectedPensionado.fe_adquiere)}</div>}
                  {selectedPensionado.fe_causa && formatFirebaseTimestamp(selectedPensionado.fe_causa) !== 'N/A' && <div><strong>Fecha Causación:</strong> {formatFirebaseTimestamp(selectedPensionado.fe_causa)}</div>}
                  {selectedPensionado.fe_ingreso && formatFirebaseTimestamp(selectedPensionado.fe_ingreso) !== 'N/A' && <div><strong>Fecha Ingreso ISS:</strong> {formatFirebaseTimestamp(selectedPensionado.fe_ingreso)}</div>}
                  {selectedPensionado.fe_vinculado && formatFirebaseTimestamp(selectedPensionado.fe_vinculado) !== 'N/A' && <div><strong>Fecha Vinculación ISS:</strong> {formatFirebaseTimestamp(selectedPensionado.fe_vinculado)}</div>}
                  {selectedPensionado.Comparte && formatFirebaseTimestamp(selectedPensionado.Comparte) !== 'N/A' && <div><strong>Fecha Comparte:</strong> {formatFirebaseTimestamp(selectedPensionado.Comparte)}</div>}
                  {selectedPensionado.res_ano !== undefined && <div><strong>Resolución Año:</strong> {selectedPensionado.res_ano}</div>}
                  {selectedPensionado.res_nro && <div><strong>Resolución Número:</strong> {selectedPensionado.res_nro}</div>}
                  {selectedPensionado.identifica !== undefined && selectedPensionado.identifica !== 0 && <div><strong>Identificador Pariss1:</strong> {selectedPensionado.identifica}</div>}
                  {selectedPensionado.mesada !== undefined && selectedPensionado.mesada !== null && selectedPensionado.mesada !== 0 && <div><strong>Mesada (Pariss1):</strong> {formatCurrency(selectedPensionado.mesada)}</div>}
                  {selectedPensionado.pension_ini !== undefined && selectedPensionado.pension_ini !== null && selectedPensionado.pension_ini !== 0 && <div><strong>Pensión Inicial (Pariss1):</strong> {formatCurrency(selectedPensionado.pension_ini)}</div>}
                  {selectedPensionado.seguro !== undefined && <div><strong>Seguro:</strong> {selectedPensionado.seguro}</div>}
              </div>
            </CardContent>
          </Card>

          {pagosList.length > 0 && Object.keys(pagosAnualesStats).length > 0 && (
            <Card className="shadow-md mt-6">
              <CardHeader>
                <CardTitle className="text-xl font-headline text-primary flex items-center">
 <CalendarDays className="mr-2 h-6 w-6" /> Resumen Anual de Pagos de Nómina/Pensión ({pagosList.length} pagos totales)
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
              <CardFooter className="pt-4 flex justify-end">
                <Button asChild variant="default">
                  <Link href="/dashboard/pagos">
 Ver Comprobantes de Pagos de Nómina/Pensión <ChevronsRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          )}

          {viewMode === 'details' && selectedPensionado && pagosList.length === 0 && !isLoading && (
            <Card className="mt-6 shadow-sm border-dashed border-muted-foreground/50">
                <CardContent className="pt-6">
                    <div className="text-center text-muted-foreground py-8">
                        <FileText className="mx-auto h-16 w-16 mb-3 text-primary/30" />
 <p className="text-lg">No se encontraron registros de pagos de nómina/pensión.</p>
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
