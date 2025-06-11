
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
  DocumentData,
  Timestamp
} from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, ChevronLeft, ChevronRight, AlertCircle, Info, BadgeDollarSign, FileWarning, CheckCircle, Clock } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { format, isPast } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Pensionado } from '@/contexts/PensionadoContext'; 

interface PlanDePagoCuota {
  numeroCuota: number;
  montoCuota: number;
  fechaVencimientoEstimada: Timestamp;
  estadoCuota: 'Pendiente' | 'Pagada' | 'Vencida' | 'Enviado para Validación' | string;
}

interface Financiamiento {
  id: string;
  salarioACancelar?: number;
  plazoEnMeses?: number;
  fechaCreacionAcuerdo?: Timestamp;
  planDePagos?: PlanDePagoCuota[];
  estadoAcuerdo?: 'Activo' | 'Pagado' | 'Cancelado' | string;
  [key: string]: any;
}

type ConvenioStatus = "Pagado" | "Con Atrasos" | "Al Día" | "Activo" | "Sin Acuerdo" | "Desconocido";


interface ClienteConEstado extends Pensionado {
  totalFinanciado?: number;
  totalPagado?: number;
  saldoPendiente?: number;
  totalCuotas?: number;
  cuotasPagadas?: number;
  zonaCliente?: string;
  estadoConvenio?: ConvenioStatus;
  fechaUltimoAcuerdo?: Timestamp | null;
}

const ITEMS_PER_PAGE = 10;

export default function EstadoCuentaView() {
  const { toast } = useToast();

  const [clientesConEstado, setClientesConEstado] = useState<ClienteConEstado[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [lastVisibleClienteDoc, setLastVisibleClienteDoc] = useState<DocumentData | null>(null);
  const [hasMoreClientes, setHasMoreClientes] = useState(true);
  const [pageDocSnapshots, setPageDocSnapshots] = useState<Record<number, DocumentData | null>>({ 1: null });


  const formatCurrency = (amount?: number): string => {
    if (amount === undefined || amount === null || isNaN(amount)) return '$0,00';
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
  };
  
  const getNombreCompletoCliente = (cliente: Pensionado): string => {
      if (cliente.empleado && cliente.empleado.includes('(C.C.')) {
        return cliente.empleado.substring(0, cliente.empleado.indexOf('(C.C.')).trim();
      }
      return `${cliente.apellidos || ''} ${cliente.nombres || ''}`.trim() || cliente.id;
  };

  const determineConvenioStatus = (financiamiento: Financiamiento | null, saldoPendiente: number, cuotasPagadas: number, totalCuotas: number): ConvenioStatus => {
    if (!financiamiento || !financiamiento.planDePagos || financiamiento.planDePagos.length === 0) {
      return "Sin Acuerdo";
    }
    if (financiamiento.estadoAcuerdo === 'Pagado' || (saldoPendiente <= 0 && cuotasPagadas === totalCuotas)) {
      return "Pagado";
    }

    let hayAtrasos = false;
    for (const cuota of financiamiento.planDePagos) {
      if (cuota.estadoCuota === 'Pendiente' && cuota.fechaVencimientoEstimada && isPast(cuota.fechaVencimientoEstimada.toDate())) {
        hayAtrasos = true;
        break;
      }
    }

    if (hayAtrasos) {
      return "Con Atrasos";
    }
    
    if (financiamiento.estadoAcuerdo === 'Activo') {
        return "Al Día"; // Si está activo y no hay atrasos, está al día.
    }
    
    return "Activo"; // Fallback general si está activo pero no se cumplen otras condiciones
  };


  const fetchClientesYEstadosDeCuenta = useCallback(async (pageToFetch: number, startAfterDocForPage: DocumentData | null = null) => {
    setIsLoading(true);
    setError(null);
    
    try {
      let pensionadosQuery = query(
        collection(db, 'pensionados'),
        orderBy('apellidos'),
        orderBy('nombres'),
        limit(ITEMS_PER_PAGE + 1)
      );

      if (pageToFetch > 1 && startAfterDocForPage) {
        pensionadosQuery = query(
          collection(db, 'pensionados'),
          orderBy('apellidos'),
          orderBy('nombres'),
          startAfter(startAfterDocForPage),
          limit(ITEMS_PER_PAGE + 1)
        );
      }
      
      const pensionadosSnapshot = await getDocs(pensionadosQuery);
      const fetchedPensionadosDocs = pensionadosSnapshot.docs;
      
      const newClientesConEstadoPromises = fetchedPensionadosDocs.slice(0, ITEMS_PER_PAGE).map(async (pensionadoDoc) => {
        const pensionadoData = { id: pensionadoDoc.id, ...pensionadoDoc.data() } as Pensionado;
        let clienteEstado: ClienteConEstado = { 
          ...pensionadoData,
          zonaCliente: pensionadoData.ultimoGrupoCliente || pensionadoData.pnlCentroCosto || 'N/A',
          totalFinanciado: 0,
          totalPagado: 0,
          saldoPendiente: 0,
          totalCuotas: 0,
          cuotasPagadas: 0,
          estadoConvenio: "Sin Acuerdo",
          fechaUltimoAcuerdo: null,
        };

        const financiamientosRef = collection(db, 'pensionados', pensionadoData.id, 'financiamientos');
        const financiamientoQuery = query(financiamientosRef, orderBy('fechaCreacionAcuerdo', 'desc'), limit(1));
        const financiamientoSnapshot = await getDocs(financiamientoQuery);

        let financiamientoActivo: Financiamiento | null = null;
        if (!financiamientoSnapshot.empty) {
          financiamientoActivo = financiamientoSnapshot.docs[0].data() as Financiamiento;
          clienteEstado.fechaUltimoAcuerdo = financiamientoActivo.fechaCreacionAcuerdo || null;
          clienteEstado.totalFinanciado = financiamientoActivo.salarioACancelar || 0;
          
          let pagado = 0;
          let cuotasPg = 0;
          if (financiamientoActivo.planDePagos && financiamientoActivo.planDePagos.length > 0) {
            financiamientoActivo.planDePagos.forEach(cuota => {
              if (cuota.estadoCuota === 'Pagada') { // Considerar "Validado" si es parte del flujo
                pagado += cuota.montoCuota;
                cuotasPg++;
              }
            });
            clienteEstado.totalCuotas = financiamientoActivo.planDePagos.length;
          } else {
             clienteEstado.totalCuotas = financiamientoActivo.plazoEnMeses || 0;
          }

          clienteEstado.totalPagado = pagado;
          clienteEstado.cuotasPagadas = cuotasPg;
          clienteEstado.saldoPendiente = clienteEstado.totalFinanciado - pagado;
          
          clienteEstado.estadoConvenio = determineConvenioStatus(financiamientoActivo, clienteEstado.saldoPendiente, cuotasPg, clienteEstado.totalCuotas);

        }
        return clienteEstado;
      });

      const resolvedClientesConEstado = await Promise.all(newClientesConEstadoPromises);
      setClientesConEstado(resolvedClientesConEstado);
      
      const hasMore = fetchedPensionadosDocs.length > ITEMS_PER_PAGE;
      setHasMoreClientes(hasMore);
      
      const currentLastVisible = hasMore ? fetchedPensionadosDocs[ITEMS_PER_PAGE - 1] : null;
      setLastVisibleClienteDoc(currentLastVisible);
      setCurrentPage(pageToFetch);

      if (hasMore) {
        setPageDocSnapshots(prevSnaps => ({
          ...prevSnaps,
          [pageToFetch + 1]: currentLastVisible 
        }));
      }
      if (pageToFetch === 1 && !pageDocSnapshots[1]) {
         setPageDocSnapshots(prevSnaps => ({...prevSnaps, [1]: null}));
      }

    } catch (err: any) {
      console.error("Error fetching data:", err);
      setError("No se pudieron cargar los datos: " + err.message);
      toast({ title: "Error", description: "No se pudieron cargar los datos.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]); 

  useEffect(() => {
    fetchClientesYEstadosDeCuenta(1, null);
  }, [fetchClientesYEstadosDeCuenta]);


  const handleNextPage = useCallback(() => {
    if (hasMoreClientes && lastVisibleClienteDoc) {
      fetchClientesYEstadosDeCuenta(currentPage + 1, lastVisibleClienteDoc);
    }
  }, [hasMoreClientes, lastVisibleClienteDoc, currentPage, fetchClientesYEstadosDeCuenta]);
  
  const handlePrevPage = useCallback(() => {
    if (currentPage > 1) {
      const startAfterDocForPrevPage = pageDocSnapshots[currentPage - 1];
      fetchClientesYEstadosDeCuenta(currentPage - 1, startAfterDocForPrevPage);
    }
  }, [currentPage, pageDocSnapshots, fetchClientesYEstadosDeCuenta]);

  const getStatusBadge = (status: ConvenioStatus | undefined) => {
    switch (status) {
      case "Pagado":
        return <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-white"><CheckCircle className="mr-1 h-3.5 w-3.5" />{status}</Badge>;
      case "Con Atrasos":
        return <Badge variant="destructive"><FileWarning className="mr-1 h-3.5 w-3.5" />{status}</Badge>;
      case "Al Día":
        return <Badge variant="secondary" className="text-blue-600 border-blue-500"><Clock className="mr-1 h-3.5 w-3.5" />{status}</Badge>;
      case "Sin Acuerdo":
        return <Badge variant="outline">{status}</Badge>;
      case "Activo":
         return <Badge variant="outline" className="text-primary border-primary">{status}</Badge>;
      default:
        return <Badge variant="outline">Desconocido</Badge>;
    }
  };


  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center text-xl font-headline text-primary">
          <BadgeDollarSign className="mr-3 h-6 w-6" />
          Estado de Cuenta General de Clientes
        </CardTitle>
        <CardDescription>
          Resumen consolidado del estado financiero de los convenios de todos los clientes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-3 text-muted-foreground">Cargando estados de cuenta...</p>
          </div>
        )}
        {error && !isLoading && (
          <div className="text-center py-10">
            <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-3" />
            <p className="text-destructive font-semibold">Error al Cargar Datos</p>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button onClick={() => fetchClientesYEstadosDeCuenta(1)} variant="outline" className="mt-4">Reintentar</Button>
          </div>
        )}
        {!isLoading && !error && clientesConEstado.length === 0 && (
          <div className="text-center py-10">
            <Info className="mx-auto h-12 w-12 text-primary/50 mb-3" />
            <p className="text-lg text-muted-foreground">No hay clientes con estados de cuenta para mostrar.</p>
            <p className="text-sm text-muted-foreground">Verifique si hay clientes con acuerdos de financiamiento registrados.</p>
          </div>
        )}
        {!isLoading && !error && clientesConEstado.length > 0 && (
          <>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Cliente (C.C.)</TableHead>
                    <TableHead>Zona/Grupo</TableHead>
                    <TableHead>Últ. Acuerdo</TableHead>
                    <TableHead className="text-right">Total Convenio</TableHead>
                    <TableHead className="text-right">Total Pagado</TableHead>
                    <TableHead className="text-right">Saldo Pendiente</TableHead>
                    <TableHead className="text-center">Progreso Cuotas</TableHead>
                    <TableHead className="text-center">Estado Convenio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientesConEstado.map((cliente) => (
                    <TableRow key={cliente.id}>
                      <TableCell>
                        <div className="font-medium">{getNombreCompletoCliente(cliente)}</div>
                        <div className="text-xs text-muted-foreground">{cliente.id}</div>
                      </TableCell>
                      <TableCell>{cliente.zonaCliente || 'N/A'}</TableCell>
                       <TableCell>
                        {cliente.fechaUltimoAcuerdo ? format(cliente.fechaUltimoAcuerdo.toDate(), 'dd MMM yyyy', { locale: es }) : 'N/A'}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(cliente.totalFinanciado)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(cliente.totalPagado)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(cliente.saldoPendiente)}</TableCell>
                      <TableCell className="text-center">
                        {cliente.totalCuotas !== undefined && cliente.totalCuotas > 0 
                          ? `${cliente.cuotasPagadas || 0} de ${cliente.totalCuotas}`
                          : cliente.estadoConvenio === "Sin Acuerdo" ? 'N/A' : '0 de 0'}
                      </TableCell>
                      <TableCell className="text-center">
                        {getStatusBadge(cliente.estadoConvenio)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex justify-between items-center mt-6">
              <Button onClick={handlePrevPage} disabled={currentPage === 1 || isLoading} variant="outline">
                <ChevronLeft className="mr-2 h-4 w-4" /> Anterior
              </Button>
              <span className="text-sm text-muted-foreground">Página {currentPage}</span>
              <Button onClick={handleNextPage} disabled={!hasMoreClientes || isLoading} variant="outline">
                Siguiente <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

