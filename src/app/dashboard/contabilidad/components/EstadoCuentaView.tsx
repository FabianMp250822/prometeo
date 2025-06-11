
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
  Timestamp,
  doc,
  getDoc
} from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Users, FileText, ChevronLeft, ChevronRight, AlertCircle, Info, BadgeDollarSign } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Pensionado } from '@/contexts/PensionadoContext'; // Reutilizar la interfaz

interface PlanDePagoCuota {
  numeroCuota: number;
  montoCuota: number;
  fechaVencimientoEstimada: Timestamp;
  estadoCuota: 'Pendiente' | 'Pagada' | 'Vencida' | string; // Permitir más estados
}

interface Financiamiento {
  id: string;
  salarioACancelar?: number;
  plazoEnMeses?: number;
  fechaCreacionAcuerdo?: Timestamp;
  planDePagos?: PlanDePagoCuota[];
  [key: string]: any;
}

interface ClienteConEstado extends Pensionado {
  totalFinanciado?: number;
  totalPagado?: number;
  saldoPendiente?: number;
  totalCuotas?: number;
  cuotasPagadas?: number;
  zonaCliente?: string;
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
  // pageDocSnapshots stores: pageDocSnapshots[pageNumber] = DocumentSnapshot_to_startAfter_to_fetch_that_page_number
  // So, pageDocSnapshots[1] is null, pageDocSnapshots[2] is the last doc of page 1, etc.
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

  const fetchClientesYEstadosDeCuenta = useCallback(async (pageToFetch: number, startAfterDocForPage: DocumentData | null = null) => {
    setIsLoading(true);
    setError(null);
    // No limpiar clientesConEstado aquí para una mejor UX en paginación, se sobreescribirá.

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
      
      const newClientesConEstado: ClienteConEstado[] = [];

      for (const pensionadoDoc of fetchedPensionadosDocs.slice(0, ITEMS_PER_PAGE)) {
        const pensionadoData = { id: pensionadoDoc.id, ...pensionadoDoc.data() } as Pensionado;
        let clienteEstado: ClienteConEstado = { 
          ...pensionadoData,
          zonaCliente: pensionadoData.ultimoGrupoCliente || pensionadoData.pnlCentroCosto || 'N/A',
        };

        const financiamientosRef = collection(db, 'pensionados', pensionadoData.id, 'financiamientos');
        const financiamientoQuery = query(financiamientosRef, orderBy('fechaCreacionAcuerdo', 'desc'), limit(1));
        const financiamientoSnapshot = await getDocs(financiamientoQuery);

        if (!financiamientoSnapshot.empty) {
          const financiamientoData = financiamientoSnapshot.docs[0].data() as Financiamiento;
          clienteEstado.totalFinanciado = financiamientoData.salarioACancelar || 0;
          
          let pagado = 0;
          let cuotasPg = 0;
          if (financiamientoData.planDePagos && financiamientoData.planDePagos.length > 0) {
            financiamientoData.planDePagos.forEach(cuota => {
              if (cuota.estadoCuota === 'Pagada') {
                pagado += cuota.montoCuota;
                cuotasPg++;
              }
            });
          }
          clienteEstado.totalPagado = pagado;
          clienteEstado.saldoPendiente = (clienteEstado.totalFinanciado || 0) - pagado;
          clienteEstado.totalCuotas = financiamientoData.plazoEnMeses || financiamientoData.planDePagos?.length || 0;
          clienteEstado.cuotasPagadas = cuotasPg;
        } else {
          clienteEstado.totalFinanciado = 0;
          clienteEstado.totalPagado = 0;
          clienteEstado.saldoPendiente = 0;
          clienteEstado.totalCuotas = 0;
          clienteEstado.cuotasPagadas = 0;
        }
        newClientesConEstado.push(clienteEstado);
      }

      setClientesConEstado(newClientesConEstado);
      
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
  }, [toast]); // pageDocSnapshots REMOVED from dependencies

  useEffect(() => {
    // Fetch initial data only once
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
      // Note: pageDocSnapshots[1] should be null.
      // If pageDocSnapshots[currentPage -1] is undefined, it means we haven't stored that cursor yet (e.g. initial load)
      // but it's okay, startAfter(undefined) is fine for Firestore.
      fetchClientesYEstadosDeCuenta(currentPage - 1, startAfterDocForPrevPage);
    }
  }, [currentPage, pageDocSnapshots, fetchClientesYEstadosDeCuenta]);


  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center text-xl font-headline text-primary">
          <BadgeDollarSign className="mr-3 h-6 w-6" />
          Estado de Cuenta General
        </CardTitle>
        <CardDescription>
          Resumen del estado financiero de los clientes y sus acuerdos de pago.
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
                    <TableHead className="text-right">Total Financiado</TableHead>
                    <TableHead className="text-right">Total Pagado</TableHead>
                    <TableHead className="text-right">Saldo Pendiente</TableHead>
                    <TableHead className="text-center">Cuotas (Pagadas/Total)</TableHead>
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
                      <TableCell className="text-right">{formatCurrency(cliente.totalFinanciado)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(cliente.totalPagado)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(cliente.saldoPendiente)}</TableCell>
                      <TableCell className="text-center">
                        {cliente.totalCuotas !== undefined && cliente.totalCuotas > 0 
                          ? `${cliente.cuotasPagadas || 0} de ${cliente.totalCuotas}`
                          : 'N/A'}
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

