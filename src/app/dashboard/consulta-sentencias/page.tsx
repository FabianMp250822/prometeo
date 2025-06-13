"use client";

import { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy, doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, Scale, AlertCircle, FileText, Calendar, DollarSign, CheckCircle2, XCircle, Eye, X } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

// Conceptos de sentencias que buscamos
const SENTENCIA_CONCEPTS = [
  "470-Costas Procesales",
  "785-Retro Mesada Adicional M1", 
  "475-Procesos Y Sentencia Judiciales"
];

// Interfaces
interface SentenciaDetalle {
  concepto: string;
  valor: number;
  fechaPago: Timestamp;
  pagoId: string;
  periodoPago: string;
}

interface UsuarioSentencia {
  id: string;
  nombre: string;
  dependencia: string;
  centroCosto: string;
  sentenciasDetalles: SentenciaDetalle[];
  totalCostasProc: number;
  totalRetroMesada: number;
  totalProcesos: number;
  totalGeneral: number;
  ultimaFechaPago: Timestamp | null;
  isAnalyzed: boolean;
  fechaAnalisis?: Timestamp;
}

interface SentenciaIndex {
  id: string;
  pensionadoId: string;
  concepto: string;
  valor: number;
  fechaPago: Timestamp;
  pagoId: string;
  periodoPago: string;
  isProcessed: boolean;
  fechaCreacion: Timestamp;
}

// Constantes
const PENSIONADOS_COLLECTION = "pensionados";
const PAGOS_SUBCOLLECTION = "pagos";
const SENTENCIAS_INDEX_COLLECTION = "sentenciasIndex";
const USUARIOS_SENTENCIAS_COLLECTION = "usuariosSentencias";

export default function ConsultaSentenciasPage() {
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [usuarios, setUsuarios] = useState<UsuarioSentencia[]>([]);
  const [filteredUsuarios, setFilteredUsuarios] = useState<UsuarioSentencia[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Modal de detalles
  const [selectedUsuario, setSelectedUsuario] = useState<UsuarioSentencia | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadingPagosDetails, setLoadingPagosDetails] = useState(false);
  const [pagosDetails, setPagosDetails] = useState<any[]>([]);

  // Filtros
  const [filterNombre, setFilterNombre] = useState("");
  const [filterDependencia, setFilterDependencia] = useState<string | undefined>(undefined);
  const [filterConcepto, setFilterConcepto] = useState<string | undefined>(undefined);
  const [filterAnalyzed, setFilterAnalyzed] = useState<string | undefined>(undefined);
  const [filterYear, setFilterYear] = useState<string | undefined>(undefined);
  const [sortBy, setSortBy] = useState<'nombre' | 'total' | 'fecha' | 'year'>('year');

  // Estadísticas
  const [stats, setStats] = useState({
    totalUsuarios: 0,
    totalAnalizados: 0,
    totalPendientes: 0,
    montoTotalCostas: 0,
    montoTotalRetro: 0,
    montoTotalProcesos: 0
  });

  // Cargar datos desde el índice
  const loadSentenciasData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Cargar usuarios con sentencias desde la colección especializada
      const usuariosQuery = query(
        collection(db, USUARIOS_SENTENCIAS_COLLECTION),
        orderBy("totalGeneral", "desc")
      );
      const usuariosSnapshot = await getDocs(usuariosQuery);

      const usuariosData: UsuarioSentencia[] = [];
      usuariosSnapshot.forEach(doc => {
        usuariosData.push({ id: doc.id, ...doc.data() } as UsuarioSentencia);
      });

      setUsuarios(usuariosData);
      calculateStats(usuariosData);

      toast({
        title: "Datos Cargados",
        description: `Se encontraron ${usuariosData.length} usuarios con sentencias.`,
        variant: "default"
      });

    } catch (err: any) {
      console.error("Error loading sentencias data:", err);
      setError("Error al cargar los datos: " + err.message);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos de sentencias.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Función para obtener el año de la fecha más reciente de un usuario
  const getLatestYear = (sentenciasDetalles: SentenciaDetalle[]): number => {
    if (!sentenciasDetalles || sentenciasDetalles.length === 0) return 0;
    
    // Ordenar por fecha más reciente y obtener el año del período de pago
    const sortedSentencias = sentenciasDetalles.sort((a, b) => 
      b.fechaPago.toMillis() - a.fechaPago.toMillis()
    );
    
    // Extraer el año del período de pago (formato: "1 abr. 2025 a 15 abr. 2025")
    const periodoPago = sortedSentencias[0]?.periodoPago;
    if (periodoPago && periodoPago !== "N/A") {
      // Buscar el año en el período de pago usando expresión regular
      const yearMatch = periodoPago.match(/\b(20\d{2})\b/);
      if (yearMatch) {
        return parseInt(yearMatch[1]);
      }
    }
    
    // Si no se puede extraer del período, usar la fecha de pago como fallback
    return sortedSentencias[0]?.fechaPago.toDate().getFullYear() || 0;
  };

  // Función para obtener el período más reciente
  const getLatestPeriod = (sentenciasDetalles: SentenciaDetalle[]): string => {
    if (!sentenciasDetalles || sentenciasDetalles.length === 0) return "N/A";
    
    // Ordenar por fecha más reciente y tomar el período de pago
    const sortedSentencias = sentenciasDetalles.sort((a, b) => 
      b.fechaPago.toMillis() - a.fechaPago.toMillis()
    );
    
    return sortedSentencias[0]?.periodoPago || "N/A";
  };

  // Analizar todos los pagos y crear índices
  const analyzePagosForSentencias = async () => {
    setIsAnalyzing(true);
    setError(null);

    try {
      toast({
        title: "Iniciando Análisis",
        description: "Analizando todos los pagos en busca de sentencias...",
        variant: "default"
      });

      // Obtener todos los pensionados
      const pensionadosSnapshot = await getDocs(collection(db, PENSIONADOS_COLLECTION));
      const totalPensionados = pensionadosSnapshot.docs.length;
      let processedCount = 0;

      const usuariosConSentencias: Map<string, UsuarioSentencia> = new Map();

      // Procesar cada pensionado
      for (const pensionadoDoc of pensionadosSnapshot.docs) {
        const pensionadoData = pensionadoDoc.data();
        const pensionadoId = pensionadoDoc.id;

        // Obtener todos los pagos del pensionado
        const pagosSnapshot = await getDocs(
          collection(db, PENSIONADOS_COLLECTION, pensionadoId, PAGOS_SUBCOLLECTION)
        );

        const sentenciasDelUsuario: SentenciaDetalle[] = [];

        // Analizar cada pago
        for (const pagoDoc of pagosSnapshot.docs) {
          const pagoData = pagoDoc.data();
          const pagoId = pagoDoc.id;

          if (pagoData.detalles && Array.isArray(pagoData.detalles)) {
            // Buscar conceptos de sentencias en los detalles
            for (const detalle of pagoData.detalles) {
              const conceptoNombre = detalle.nombre || "";
              
              for (const conceptoBuscado of SENTENCIA_CONCEPTS) {
                if (conceptoNombre.includes(conceptoBuscado.split('-')[1])) {
                  const valor = (detalle.ingresos || 0) - (detalle.egresos || 0);
                  
                  if (valor !== 0) {
                    sentenciasDelUsuario.push({
                      concepto: conceptoBuscado,
                      valor: valor,
                      fechaPago: pagoData.fechaProcesado || Timestamp.now(),
                      pagoId: pagoId,
                      periodoPago: pagoData.periodoPago || "N/A"
                    });

                    // Crear índice individual
                    const indexId = `${pensionadoId}_${pagoId}_${conceptoBuscado.replace(/[^a-zA-Z0-9]/g, '_')}`;
                    const sentenciaIndex: SentenciaIndex = {
                      id: indexId,
                      pensionadoId: pensionadoId,
                      concepto: conceptoBuscado,
                      valor: valor,
                      fechaPago: pagoData.fechaProcesado || Timestamp.now(),
                      pagoId: pagoId,
                      periodoPago: pagoData.periodoPago || "N/A",
                      isProcessed: true,
                      fechaCreacion: Timestamp.now()
                    };

                    await setDoc(doc(db, SENTENCIAS_INDEX_COLLECTION, indexId), sentenciaIndex);
                  }
                }
              }
            }
          }
        }

        // Si encontramos sentencias para este usuario, agregarlo al mapa
        if (sentenciasDelUsuario.length > 0) {
          const totalCostasProc = sentenciasDelUsuario
            .filter(s => s.concepto.includes("Costas Procesales"))
            .reduce((sum, s) => sum + s.valor, 0);

          const totalRetroMesada = sentenciasDelUsuario
            .filter(s => s.concepto.includes("Retro Mesada"))
            .reduce((sum, s) => sum + s.valor, 0);

          const totalProcesos = sentenciasDelUsuario
            .filter(s => s.concepto.includes("Procesos Y Sentencia"))
            .reduce((sum, s) => sum + s.valor, 0);

          const ultimaFecha = sentenciasDelUsuario
            .sort((a, b) => b.fechaPago.toMillis() - a.fechaPago.toMillis())[0]?.fechaPago || null;

          const usuarioSentencia: UsuarioSentencia = {
            id: pensionadoId,
            nombre: pensionadoData.empleado || "Sin nombre",
            dependencia: (pensionadoData.pnlDependencia || "").replace(/^V\d+-/, '') || "N/A",
            centroCosto: pensionadoData.pnlCentroCosto || "N/A",
            sentenciasDetalles: sentenciasDelUsuario,
            totalCostasProc: totalCostasProc,
            totalRetroMesada: totalRetroMesada,
            totalProcesos: totalProcesos,
            totalGeneral: totalCostasProc + totalRetroMesada + totalProcesos,
            ultimaFechaPago: ultimaFecha,
            isAnalyzed: true,
            fechaAnalisis: Timestamp.now()
          };

          usuariosConSentencias.set(pensionadoId, usuarioSentencia);

          // Guardar en la colección de usuarios con sentencias
          await setDoc(doc(db, USUARIOS_SENTENCIAS_COLLECTION, pensionadoId), usuarioSentencia);
        }

        processedCount++;
        
        // Mostrar progress cada 100 usuarios
        if (processedCount % 100 === 0) {
          toast({
            title: "Progreso",
            description: `Procesados ${processedCount} de ${totalPensionados} pensionados...`,
            variant: "default"
          });
        }
      }

      const usuariosArray = Array.from(usuariosConSentencias.values());
      setUsuarios(usuariosArray);
      calculateStats(usuariosArray);

      toast({
        title: "Análisis Completado",
        description: `Se encontraron ${usuariosArray.length} usuarios con sentencias de un total de ${totalPensionados} pensionados.`,
        variant: "default"
      });

    } catch (err: any) {
      console.error("Error analyzing pagos:", err);
      setError("Error durante el análisis: " + err.message);
      toast({
        title: "Error en Análisis",
        description: "Ocurrió un error durante el análisis de pagos.",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Calcular estadísticas
  const calculateStats = (usuariosData: UsuarioSentencia[]) => {
    const stats = {
      totalUsuarios: usuariosData.length,
      totalAnalizados: usuariosData.filter(u => u.isAnalyzed).length,
      totalPendientes: usuariosData.filter(u => !u.isAnalyzed).length,
      montoTotalCostas: usuariosData.reduce((sum, u) => sum + u.totalCostasProc, 0),
      montoTotalRetro: usuariosData.reduce((sum, u) => sum + u.totalRetroMesada, 0),
      montoTotalProcesos: usuariosData.reduce((sum, u) => sum + u.totalProcesos, 0)
    };
    setStats(stats);
  };

  // Marcar usuario como analizado
  const markAsAnalyzed = async (usuarioId: string) => {
    try {
      const usuarioRef = doc(db, USUARIOS_SENTENCIAS_COLLECTION, usuarioId);
      await setDoc(usuarioRef, {
        isAnalyzed: true,
        fechaAnalisis: Timestamp.now()
      }, { merge: true });

      // Actualizar estado local
      const updatedUsuarios = usuarios.map(u => 
        u.id === usuarioId 
          ? { ...u, isAnalyzed: true, fechaAnalisis: Timestamp.now() }
          : u
      );
      setUsuarios(updatedUsuarios);
      calculateStats(updatedUsuarios);

      toast({
        title: "Usuario Marcado",
        description: "Usuario marcado como analizado.",
        variant: "default"
      });

    } catch (err: any) {
      console.error("Error marking as analyzed:", err);
      toast({
        title: "Error",
        description: "No se pudo marcar el usuario como analizado.",
        variant: "destructive"
      });
    }
  };

  // Función para cargar los detalles completos de los pagos
  const loadPagosDetails = async (usuario: UsuarioSentencia) => {
    setLoadingPagosDetails(true);
    try {
      const pagosDetailsArray = [];
      
      // Obtener detalles completos de cada pago relacionado con sentencias
      for (const sentencia of usuario.sentenciasDetalles) {
        const pagoRef = doc(db, PENSIONADOS_COLLECTION, usuario.id, PAGOS_SUBCOLLECTION, sentencia.pagoId);
        const pagoDoc = await getDoc(pagoRef);
        
        if (pagoDoc.exists()) {
          const pagoData = pagoDoc.data();
          pagosDetailsArray.push({
            ...pagoData,
            id: sentencia.pagoId,
            sentenciaConcepto: sentencia.concepto,
            sentenciaValor: sentencia.valor
          });
        }
      }

      setPagosDetails(pagosDetailsArray);
    } catch (error) {
      console.error("Error loading pagos details:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los detalles de los pagos.",
        variant: "destructive"
      });
    } finally {
      setLoadingPagosDetails(false);
    }
  };

  // Función para abrir el modal con los detalles
  const openPagosModal = async (usuario: UsuarioSentencia) => {
    setSelectedUsuario(usuario);
    setIsModalOpen(true);
    await loadPagosDetails(usuario);
  };

  // Función para cerrar el modal
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedUsuario(null);
    setPagosDetails([]);
  };

  // Aplicar filtros
  useEffect(() => {
    let filtered = [...usuarios];
    const currentDate = new Date();

    // Filtro por nombre
    if (filterNombre.trim()) {
      filtered = filtered.filter(u => 
        u.nombre.toLowerCase().includes(filterNombre.toLowerCase()) ||
        u.id.includes(filterNombre)
      );
    }

    // Filtro por dependencia
    if (filterDependencia && filterDependencia !== "ALL") {
      filtered = filtered.filter(u => u.dependencia === filterDependencia);
    }

    // Filtro por concepto
    if (filterConcepto && filterConcepto !== "ALL") {
      filtered = filtered.filter(u => {
        switch (filterConcepto) {
          case "COSTAS":
            return u.totalCostasProc > 0;
          case "RETRO":
            return u.totalRetroMesada > 0;
          case "PROCESOS":
            return u.totalProcesos > 0;
          default:
            return true;
        }
      });
    }

    // Filtro por estado de análisis
    if (filterAnalyzed && filterAnalyzed !== "ALL") {
      filtered = filtered.filter(u => 
        filterAnalyzed === "ANALYZED" ? u.isAnalyzed : !u.isAnalyzed
      );
    }

    // Filtro por año
    if (filterYear && filterYear !== "ALL") {
      filtered = filtered.filter(u => {
        const userYear = getLatestYear(u.sentenciasDetalles);
        return userYear.toString() === filterYear;
      });
    }

    // Ordenamiento
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'nombre':
          return a.nombre.localeCompare(b.nombre);
        case 'total':
          return b.totalGeneral - a.totalGeneral;
        case 'fecha':
          if (!a.ultimaFechaPago && !b.ultimaFechaPago) return 0;
          if (!a.ultimaFechaPago) return 1;
          if (!b.ultimaFechaPago) return -1;
          return b.ultimaFechaPago.toMillis() - a.ultimaFechaPago.toMillis();
        case 'year':
          // Función para obtener la fecha más reciente usando el período de pago
          const getLatestDateFromPeriod = (sentencias: SentenciaDetalle[]): Date => {
            if (!sentencias || sentencias.length === 0) return new Date(0);
            
            const sorted = sentencias.sort((x, y) => y.fechaPago.toMillis() - x.fechaPago.toMillis());
            const latestSentencia = sorted[0];
            
            // Intentar extraer la fecha del período de pago
            const periodoPago = latestSentencia.periodoPago;
            if (periodoPago && periodoPago !== "N/A") {
              // Buscar patrones de fecha en el período (ej: "1 mar. 2025 a 15 mar. 2025")
              const dateMatches = periodoPago.match(/(\d{1,2})\s+(\w{3,4})\.?\s+(\d{4})/g);
              if (dateMatches && dateMatches.length > 0) {
                // Tomar la primera fecha del período
                const dateStr = dateMatches[0];
                const parts = dateStr.match(/(\d{1,2})\s+(\w{3,4})\.?\s+(\d{4})/);
                if (parts) {
                  const day = parseInt(parts[1]);
                  const monthStr = parts[2].toLowerCase().replace('.', '');
                  const year = parseInt(parts[3]);
                  
                  // Mapeo de meses en español
                  const monthMap: { [key: string]: number } = {
                    'ene': 0, 'feb': 1, 'mar': 2, 'abr': 3, 'may': 4, 'jun': 5,
                    'jul': 6, 'ago': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dic': 11
                  };
                  
                  const month = monthMap[monthStr];
                  if (month !== undefined) {
                    return new Date(year, month, day);
                  }
                }
              }
            }
            
            // Fallback: usar la fecha de pago directamente
            return latestSentencia.fechaPago.toDate();
          };

          const dateA = getLatestDateFromPeriod(a.sentenciasDetalles);
          const dateB = getLatestDateFromPeriod(b.sentenciasDetalles);

          // Ordenar por fecha más reciente (descendente)
          const timeDiff = dateB.getTime() - dateA.getTime();
          if (timeDiff !== 0) return timeDiff;
          
          // Si tienen la misma fecha, ordenar por valor total descendente
          return b.totalGeneral - a.totalGeneral;
        default:
          return 0;
      }
    });

    setFilteredUsuarios(filtered);
  }, [usuarios, filterNombre, filterDependencia, filterConcepto, filterAnalyzed, filterYear, sortBy]);

  // Cargar datos al montar el componente
  useEffect(() => {
    loadSentenciasData();
  }, []);

  // Obtener dependencias únicas para el filtro
  const uniqueDependencias = useMemo(() => {
    const deps = [...new Set(usuarios.map(u => u.dependencia))];
    return deps.filter(d => d && d !== "N/A").sort();
  }, [usuarios]);

  // Obtener años únicos para el filtro
  const uniqueYears = useMemo(() => {
    const years = new Set<number>();
    usuarios.forEach(u => {
      const year = getLatestYear(u.sentenciasDetalles);
      if (year > 0) years.add(year);
    });
    
    // Convertir a array y ordenar por año descendente (más reciente primero)
    const yearArray = Array.from(years).sort((a, b) => b - a);
    
    return yearArray;
  }, [usuarios]);

  // Formatear moneda
  const formatCurrency = (value: number): string => {
    return `$${value.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Formatear fecha
  const formatDate = (timestamp: Timestamp | null): string => {
    if (!timestamp) return "N/A";
    return timestamp.toDate().toLocaleDateString('es-CO', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-headline text-primary flex items-center">
            <Scale className="mr-3 h-7 w-7" />
            Consulta de Sentencias Judiciales
          </CardTitle>
          <CardDescription>
            Identificación y seguimiento de usuarios con pagos relacionados a sentencias judiciales, 
            costas procesales y retroactivos de mesada adicional.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <Button 
              onClick={loadSentenciasData} 
              disabled={isLoading || isAnalyzing}
              variant="outline"
              className="w-full sm:w-auto"
            >
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
              Recargar Datos
            </Button>
            <Button 
              onClick={analyzePagosForSentencias} 
              disabled={isLoading || isAnalyzing}
              className="w-full sm:w-auto"
            >
              {isAnalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
              {isAnalyzing ? "Analizando..." : "Re-analizar Pagos"}
            </Button>
          </div>
          
          {error && (
            <div className="mt-4 p-3 bg-destructive/10 border border-destructive/50 text-destructive rounded-md flex items-center text-sm">
              <AlertCircle className="mr-2 h-5 w-5 flex-shrink-0" />
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-primary">{stats.totalUsuarios}</div>
            <p className="text-sm text-muted-foreground">Total Usuarios</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{stats.totalAnalizados}</div>
            <p className="text-sm text-muted-foreground">Analizados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">{stats.totalPendientes}</div>
            <p className="text-sm text-muted-foreground">Pendientes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-lg font-bold text-blue-600">{formatCurrency(stats.montoTotalCostas)}</div>
            <p className="text-sm text-muted-foreground">Costas Procesales</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-lg font-bold text-purple-600">{formatCurrency(stats.montoTotalRetro)}</div>
            <p className="text-sm text-muted-foreground">Retro Mesada</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-lg font-bold text-indigo-600">{formatCurrency(stats.montoTotalProcesos)}</div>
            <p className="text-sm text-muted-foreground">Procesos</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros y Ordenamiento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="space-y-1">
              <Label htmlFor="filterNombre">Nombre/Documento</Label>
              <Input
                id="filterNombre"
                value={filterNombre}
                onChange={(e) => setFilterNombre(e.target.value)}
                placeholder="Buscar..."
                className="text-sm"
              />
            </div>
            
            <div className="space-y-1">
              <Label>Dependencia</Label>
              <Select value={filterDependencia || "ALL"} onValueChange={setFilterDependencia}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todas las dependencias</SelectItem>
                  {uniqueDependencias.map(dep => (
                    <SelectItem key={dep} value={dep}>{dep}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-1">
              <Label>Tipo de Concepto</Label>
              <Select value={filterConcepto || "ALL"} onValueChange={setFilterConcepto}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos los conceptos</SelectItem>
                  <SelectItem value="COSTAS">Costas Procesales</SelectItem>
                  <SelectItem value="RETRO">Retro Mesada</SelectItem>
                  <SelectItem value="PROCESOS">Procesos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Año</Label>
              <Select value={filterYear || "ALL"} onValueChange={setFilterYear}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos los años</SelectItem>
                  {uniqueYears.map(year => (
                    <SelectItem key={year} value={year.toString()}>
                      {year} {year === new Date().getFullYear() ? '(Actual)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-1">
              <Label>Estado</Label>
              <Select value={filterAnalyzed || "ALL"} onValueChange={setFilterAnalyzed}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos</SelectItem>
                  <SelectItem value="ANALYZED">Analizados</SelectItem>
                  <SelectItem value="PENDING">Pendientes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-1">
              <Label>Ordenar por</Label>
              <Select value={sortBy} onValueChange={(value: 'nombre' | 'total' | 'fecha' | 'year') => setSortBy(value)}>
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="year">Fecha Más Reciente</SelectItem>
                  <SelectItem value="total">Total (Mayor a Menor)</SelectItem>
                  <SelectItem value="nombre">Nombre (A-Z)</SelectItem>
                  <SelectItem value="fecha">Fecha de Pago</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Usuarios con Sentencias ({filteredUsuarios.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
              <span>Cargando usuarios...</span>
            </div>
          ) : filteredUsuarios.length > 0 ? (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Nombre del Usuario</TableHead>
                    <TableHead>Dependencia</TableHead>
                    <TableHead>Centro de Costo</TableHead>
                    <TableHead>Año</TableHead>
                    <TableHead className="text-right">Costas Procesales</TableHead>
                    <TableHead className="text-right">Retro Mesada Adicional</TableHead>
                    <TableHead className="text-right">Procesos y Sentencia Judiciales</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsuarios.map((usuario) => {
                    const userYear = getLatestYear(usuario.sentenciasDetalles);
                    const isCurrentYear = userYear === new Date().getFullYear();
                    
                    return (
                      <TableRow key={usuario.id} className={isCurrentYear ? "bg-blue-50 border-l-4 border-l-blue-500" : ""}>
                        <TableCell className="font-medium">
                          <div>
                            <div className="flex items-center gap-2">
                              {usuario.nombre}
                              {userYear === new Date().getFullYear() && (
                                <Badge variant="default" className="text-xs bg-green-600">
                                  Actual
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">C.C. {usuario.id}</div>
                          </div>
                        </TableCell>
                        <TableCell>{usuario.dependencia}</TableCell>
                        <TableCell>{usuario.centroCosto}</TableCell>
                        <TableCell>
                          <Badge variant={userYear === new Date().getFullYear() ? "default" : "outline"} className="text-sm">
                            {userYear || "N/A"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {usuario.totalCostasProc > 0 ? (
                            <span className="text-blue-600 font-medium">
                              {formatCurrency(usuario.totalCostasProc)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">$0,00</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {usuario.totalRetroMesada > 0 ? (
                            <span className="text-purple-600 font-medium">
                              {formatCurrency(usuario.totalRetroMesada)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">$0,00</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {usuario.totalProcesos > 0 ? (
                            <span className="text-indigo-600 font-medium">
                              {formatCurrency(usuario.totalProcesos)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">$0,00</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-bold text-primary">
                            {formatCurrency(usuario.totalGeneral)}
                          </span>
                          <div className="text-xs text-muted-foreground">
                            {getLatestPeriod(usuario.sentenciasDetalles)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={usuario.isAnalyzed ? "default" : "secondary"}>
                            {usuario.isAnalyzed ? (
                              <><CheckCircle2 className="w-3 h-3 mr-1" /> Analizado</>
                            ) : (
                              <><XCircle className="w-3 h-3 mr-1" /> Pendiente</>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {!usuario.isAnalyzed && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => markAsAnalyzed(usuario.id)}
                              >
                                <CheckCircle2 className="w-4 h-4 mr-1" />
                                Marcar
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openPagosModal(usuario)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Ver Pagos
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Scale className="mx-auto h-16 w-16 mb-4 text-primary/30" />
              <p className="text-lg font-semibold">No se encontraron usuarios</p>
              <p className="text-sm">
                {usuarios.length === 0 
                  ? "Haga clic en 'Re-analizar Pagos' para buscar usuarios con sentencias."
                  : "Ajuste los filtros para ver más resultados."
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Detalles de Pagos */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center text-xl">
              <FileText className="mr-2 h-5 w-5" />
              Detalles de Pagos con Sentencias - {selectedUsuario?.nombre}
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-4 top-4"
              onClick={closeModal}
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogHeader>

          {selectedUsuario && (
            <div className="space-y-6">
              {/* Información del Usuario */}
              <Card>
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Documento</Label>
                      <p className="font-medium">{selectedUsuario.id}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Dependencia</Label>
                      <p className="font-medium">{selectedUsuario.dependencia}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Centro de Costo</Label>
                      <p className="font-medium">{selectedUsuario.centroCosto}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Total Sentencias</Label>
                      <p className="font-bold text-primary text-lg">{formatCurrency(selectedUsuario.totalGeneral)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Resumen por Conceptos */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{formatCurrency(selectedUsuario.totalCostasProc)}</div>
                      <p className="text-sm text-muted-foreground">Costas Procesales</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">{formatCurrency(selectedUsuario.totalRetroMesada)}</div>
                      <p className="text-sm text-muted-foreground">Retro Mesada Adicional</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-indigo-600">{formatCurrency(selectedUsuario.totalProcesos)}</div>
                      <p className="text-sm text-muted-foreground">Procesos y Sentencias</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Detalle de Sentencias */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Detalle de Sentencias Encontradas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Concepto</TableHead>
                          <TableHead>Período de Pago</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                          <TableHead>Fecha de Pago</TableHead>
                          <TableHead>ID del Pago</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedUsuario.sentenciasDetalles.map((sentencia, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {sentencia.concepto}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">{sentencia.periodoPago}</TableCell>
                            <TableCell className="text-right font-medium">
                              <span className={sentencia.valor > 0 ? "text-green-600" : "text-red-600"}>
                                {formatCurrency(sentencia.valor)}
                              </span>
                            </TableCell>
                            <TableCell>{formatDate(sentencia.fechaPago)}</TableCell>
                            <TableCell className="font-mono text-sm">{sentencia.pagoId}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Detalles Completos de Pagos */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Información Completa de los Pagos</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingPagosDetails ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mr-2" />
                      <span>Cargando detalles de pagos...</span>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {pagosDetails.map((pago, index) => (
                        <Card key={index} className="border-l-4 border-l-primary">
                          <CardContent className="p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                              <div>
                                <Label className="text-sm font-medium text-muted-foreground">ID del Pago</Label>
                                <p className="font-mono text-sm">{pago.id}</p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium text-muted-foreground">Período</Label>
                                <p className="font-medium">{pago.periodoPago || "N/A"}</p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium text-muted-foreground">Fecha Procesado</Label>
                                <p className="font-medium">{formatDate(pago.fechaProcesado)}</p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium text-muted-foreground">Concepto Sentencia</Label>
                                <Badge variant="secondary" className="text-xs">
                                  {pago.sentenciaConcepto}
                                </Badge>
                              </div>
                            </div>
                            

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <Label className="text-sm font-medium text-muted-foreground">Total Ingresos</Label>
                                <p className="font-bold text-green-600">{formatCurrency(pago.totalIngresos || 0)}</p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium text-muted-foreground">Total Egresos</Label>
                                <p className="font-bold text-red-600">{formatCurrency(pago.totalEgresos || 0)}</p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium text-muted-foreground">Valor Sentencia</Label>
                                <p className="font-bold text-primary">{formatCurrency(pago.sentenciaValor)}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
