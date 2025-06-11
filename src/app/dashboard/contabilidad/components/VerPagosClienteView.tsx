
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
  getDoc,
  collectionGroup
} from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, User, Users, FileText, ChevronLeft, ChevronRight, AlertCircle, Info, CalendarClock, CircleDollarSign, ListChecks } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { format, isPast } from 'date-fns';
import { es } from 'date-fns/locale';

interface Pensionado {
  id: string;
  nombres?: string;
  apellidos?: string;
  empleado?: string;
  ultimoGrupoCliente?: string;
  [key: string]: any; 
}

interface PlanDePagoCuota {
  numeroCuota: number;
  montoCuota: number;
  fechaVencimientoEstimada: Timestamp;
  estadoCuota: 'Pendiente' | 'Pagada' | 'Vencida' | string;
  comprobanteCuotaUrl?: string | null;
  fechaPagoReal?: Timestamp | null;
  notasCuota?: string | null;
}

interface Financiamiento {
  id: string; // ID del documento de financiamiento
  aporteCostosOperativos?: number;
  grupoCliente?: string;
  multiplicadorSalarioMinimo?: number;
  salarioACancelar?: number;
  plazoEnMeses?: number;
  cuotaMensualCalculada?: number;
  convenioGeneralPagoUrl?: string | null;
  fechaCreacionAcuerdo?: Timestamp;
  estadoAcuerdo?: 'Activo' | 'Pagado' | 'Cancelado' | string;
  planDePagos?: PlanDePagoCuota[];
  cedulaCliente?: string;
  nombreCliente?: string;
}

const CLIENTES_PER_PAGE = 10;

export default function VerPagosClienteView() {
  const { toast } = useToast();

  const [clientes, setClientes] = useState<Pensionado[]>([]);
  const [isLoadingClientes, setIsLoadingClientes] = useState(false);
  const [errorClientes, setErrorClientes] = useState<string | null>(null);
  const [lastVisibleClienteDoc, setLastVisibleClienteDoc] = useState<DocumentData | null>(null);
  const [hasMoreClientes, setHasMoreClientes] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedCliente, setSelectedCliente] = useState<Pensionado | null>(null);
  const [financiamientos, setFinanciamientos] = useState<Financiamiento[]>([]);
  const [selectedFinanciamiento, setSelectedFinanciamiento] = useState<Financiamiento | null>(null);
  const [isLoadingFinanciamientos, setIsLoadingFinanciamientos] = useState(false);
  const [errorFinanciamientos, setErrorFinanciamientos] = useState<string | null>(null);

  const formatTimestampToDate = (timestamp?: Timestamp, dateFormat: string = 'PPP'): string => {
    if (!timestamp) return 'N/A';
    try {
      return format(timestamp.toDate(), dateFormat, { locale: es });
    } catch (e) {
      console.warn("Error formatting timestamp:", e);
      return 'Fecha inválida';
    }
  };

  const formatCurrency = (amount?: number): string => {
    if (amount === undefined || amount === null || isNaN(amount)) return '$0,00';
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(amount);
  };

  const fetchClientes = useCallback(async (page: number, startAfterDoc: DocumentData | null = null) => {
    setIsLoadingClientes(true);
    setErrorClientes(null);
    try {
      let q = query(
        collection(db, 'pensionados'),
        orderBy('apellidos'), // O el campo por el que quieras ordenar por defecto
        orderBy('nombres'),
        limit(CLIENTES_PER_PAGE + 1) // Fetch one extra to check if there's a next page
      );

      if (page > 1 && startAfterDoc) {
        q = query(
          collection(db, 'pensionados'),
          orderBy('apellidos'),
          orderBy('nombres'),
          startAfter(startAfterDoc),
          limit(CLIENTES_PER_PAGE + 1)
        );
      } else if (page === 1) {
        // Reset last visible doc for first page
        setLastVisibleClienteDoc(null);
      }
      
      const querySnapshot = await getDocs(q);
      const fetchedClientes: Pensionado[] = [];
      querySnapshot.docs.forEach(docSnap => {
        fetchedClientes.push({ id: docSnap.id, ...docSnap.data() } as Pensionado);
      });

      if (fetchedClientes.length > CLIENTES_PER_PAGE) {
        setHasMoreClientes(true);
        setLastVisibleClienteDoc(querySnapshot.docs[CLIENTES_PER_PAGE -1]); 
        setClientes(fetchedClientes.slice(0, CLIENTES_PER_PAGE));
      } else {
        setHasMoreClientes(false);
        setLastVisibleClienteDoc(null);
        setClientes(fetchedClientes);
      }
      
      setCurrentPage(page);

      if (page === 1 && fetchedClientes.length === 0) {
        toast({ title: "Sin Clientes", description: "No se encontraron clientes registrados.", variant: "default" });
      }

    } catch (err: any) {
      console.error("Error fetching clientes:", err);
      setErrorClientes("No se pudieron cargar los clientes: " + err.message);
      toast({ title: "Error", description: "No se pudieron cargar los clientes.", variant: "destructive" });
    } finally {
      setIsLoadingClientes(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchClientes(1);
  }, [fetchClientes]);

  const handleNextPage = () => {
    if (hasMoreClientes && lastVisibleClienteDoc) {
      fetchClientes(currentPage + 1, lastVisibleClienteDoc);
    }
  };
  
  const handlePrevPage = () => {
    // Firestore pagination doesn't directly support "previous" easily without storing firstVisible docs per page.
    // For simplicity, this will just go back to page 1 if not on page 1.
    // A more robust solution would store page snapshots.
    if (currentPage > 1) {
       toast({ title: "Navegación", description: "Volviendo a la primera página. Paginación 'anterior' completa requiere más configuración.", variant: "default"});
       fetchClientes(1); 
    }
  };


  const handleSelectCliente = async (cliente: Pensionado) => {
    setSelectedCliente(cliente);
    setIsLoadingFinanciamientos(true);
    setErrorFinanciamientos(null);
    setFinanciamientos([]);
    setSelectedFinanciamiento(null);

    try {
      const financiamientosRef = collection(db, 'pensionados', cliente.id, 'financiamientos');
      const q = query(financiamientosRef, orderBy('fechaCreacionAcuerdo', 'desc'));
      const querySnapshot = await getDocs(q);

      const fetchedFinanciamientos: Financiamiento[] = [];
      querySnapshot.forEach(docSnap => {
        fetchedFinanciamientos.push({ id: docSnap.id, ...docSnap.data() } as Financiamiento);
      });

      setFinanciamientos(fetchedFinanciamientos);

      if (fetchedFinanciamientos.length > 0) {
        setSelectedFinanciamiento(fetchedFinanciamientos[0]); // Seleccionar el más reciente por defecto
        toast({ title: "Financiamientos Cargados", description: `Se encontraron ${fetchedFinanciamientos.length} acuerdo(s) para ${cliente.nombres || cliente.id}. Mostrando el más reciente.`, variant: "default"});
      } else {
        toast({ title: "Sin Financiamientos", description: `No se encontraron acuerdos de financiamiento para ${cliente.nombres || cliente.id}.`, variant: "default" });
      }
    } catch (err: any) {
      console.error("Error fetching financiamientos:", err);
      setErrorFinanciamientos("No se pudieron cargar los financiamientos: " + err.message);
      toast({ title: "Error", description: "No se pudieron cargar los financiamientos.", variant: "destructive" });
    } finally {
      setIsLoadingFinanciamientos(false);
    }
  };

  const handleVolverALista = () => {
    setSelectedCliente(null);
    setFinanciamientos([]);
    setSelectedFinanciamiento(null);
    setErrorFinanciamientos(null);
  };

  const isCuotaAtrasada = (cuota: PlanDePagoCuota): boolean => {
    return cuota.estadoCuota === 'Pendiente' && cuota.fechaVencimientoEstimada && isPast(cuota.fechaVencimientoEstimada.toDate());
  };
  
  const getNombreCompletoCliente = (cliente: Pensionado): string => {
      if (cliente.empleado && cliente.empleado.includes('(C.C.')) {
        return cliente.empleado.substring(0, cliente.empleado.indexOf('(C.C.')).trim();
      }
      return `${cliente.apellidos || ''} ${cliente.nombres || ''}`.trim() || cliente.id;
  };


  if (!selectedCliente) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-xl font-headline text-primary">
            <Users className="mr-3 h-6 w-6" />
            Clientes Registrados
          </CardTitle>
          <CardDescription>
            Seleccione un cliente para ver sus acuerdos de financiamiento y detalles de pago.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingClientes && (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-3 text-muted-foreground">Cargando clientes...</p>
            </div>
          )}
          {errorClientes && !isLoadingClientes && (
            <div className="text-center py-10">
              <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-3" />
              <p className="text-destructive font-semibold">Error al Cargar Clientes</p>
              <p className="text-sm text-muted-foreground">{errorClientes}</p>
              <Button onClick={() => fetchClientes(1)} variant="outline" className="mt-4">Reintentar</Button>
            </div>
          )}
          {!isLoadingClientes && !errorClientes && clientes.length === 0 && (
            <div className="text-center py-10">
              <Info className="mx-auto h-12 w-12 text-primary/50 mb-3" />
              <p className="text-lg text-muted-foreground">No hay clientes registrados.</p>
              <p className="text-sm text-muted-foreground">Puede crear nuevos clientes desde la sección "Crear Cliente".</p>
            </div>
          )}
          {!isLoadingClientes && !errorClientes && clientes.length > 0 && (
            <>
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Cédula</TableHead>
                      <TableHead>Nombre Completo</TableHead>
                      <TableHead>Grupo</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientes.map((cliente) => (
                      <TableRow key={cliente.id}>
                        <TableCell>{cliente.id}</TableCell>
                        <TableCell>{getNombreCompletoCliente(cliente)}</TableCell>
                        <TableCell>{cliente.ultimoGrupoCliente || 'N/A'}</TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm" onClick={() => handleSelectCliente(cliente)}>
                            Ver Pagos
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-between items-center mt-6">
                <Button onClick={handlePrevPage} disabled={currentPage === 1 || isLoadingClientes} variant="outline">
                  <ChevronLeft className="mr-2 h-4 w-4" /> Anterior
                </Button>
                <span className="text-sm text-muted-foreground">Página {currentPage}</span>
                <Button onClick={handleNextPage} disabled={!hasMoreClientes || isLoadingClientes} variant="outline">
                  Siguiente <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  // Vista de Detalles del Financiamiento del Cliente Seleccionado
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center text-xl font-headline text-primary">
              <FileText className="mr-3 h-6 w-6" />
              Financiamientos de: {getNombreCompletoCliente(selectedCliente)} (C.C. {selectedCliente.id})
            </CardTitle>
            <CardDescription>
              {selectedFinanciamiento ? `Mostrando detalles del acuerdo creado el ${formatTimestampToDate(selectedFinanciamiento.fechaCreacionAcuerdo)}.` : "Seleccione un acuerdo o cargando..."}
            </CardDescription>
          </div>
          <Button variant="outline" onClick={handleVolverALista}>
            <ChevronLeft className="mr-2 h-4 w-4" /> Volver a la Lista
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoadingFinanciamientos && (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-3 text-muted-foreground">Cargando financiamientos...</p>
          </div>
        )}
        {errorFinanciamientos && !isLoadingFinanciamientos && (
           <div className="text-center py-10">
              <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-3" />
              <p className="text-destructive font-semibold">Error al Cargar Financiamientos</p>
              <p className="text-sm text-muted-foreground">{errorFinanciamientos}</p>
              <Button onClick={() => selectedCliente && handleSelectCliente(selectedCliente)} variant="outline" className="mt-4">Reintentar</Button>
            </div>
        )}
        {!isLoadingFinanciamientos && !errorFinanciamientos && financiamientos.length === 0 && (
           <div className="text-center py-10">
              <Info className="mx-auto h-12 w-12 text-primary/50 mb-3" />
              <p className="text-lg text-muted-foreground">Sin Acuerdos de Financiamiento</p>
              <p className="text-sm text-muted-foreground">Este cliente no tiene acuerdos de financiamiento registrados.</p>
            </div>
        )}

        {/* Aquí podrías añadir un selector si hay múltiples financiamientos */}
        {/* Por ahora, se muestra el 'selectedFinanciamiento' (que es el más reciente) */}

        {selectedFinanciamiento && !isLoadingFinanciamientos && (
          <div className="space-y-6 mt-4">
            <Card className="bg-muted/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                    <CircleDollarSign className="mr-2 h-5 w-5 text-primary"/>
                    Resumen del Acuerdo
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-2 text-sm pt-2">
                <div><strong>Monto Total a Cancelar:</strong> {formatCurrency(selectedFinanciamiento.salarioACancelar)}</div>
                <div><strong>Plazo:</strong> {selectedFinanciamiento.plazoEnMeses} meses</div>
                <div><strong>Cuota Mensual:</strong> {formatCurrency(selectedFinanciamiento.cuotaMensualCalculada)}</div>
                <div><strong>Estado Acuerdo:</strong> <Badge variant={selectedFinanciamiento.estadoAcuerdo === 'Activo' ? "default" : "secondary"}>{selectedFinanciamiento.estadoAcuerdo || "N/A"}</Badge></div>
                <div><strong>Grupo:</strong> {selectedFinanciamiento.grupoCliente || 'N/A'}</div>
                <div><strong>Creado el:</strong> {formatTimestampToDate(selectedFinanciamiento.fechaCreacionAcuerdo)}</div>
                 {selectedFinanciamiento.convenioGeneralPagoUrl && (
                  <div className="md:col-span-2 lg:col-span-1">
                    <Button variant="link" asChild className="p-0 h-auto text-sm">
                      <a href={selectedFinanciamiento.convenioGeneralPagoUrl} target="_blank" rel="noopener noreferrer">
                        Ver Convenio General
                      </a>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                    <ListChecks className="mr-2 h-5 w-5 text-primary"/>
                    Plan de Pagos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedFinanciamiento.planDePagos && selectedFinanciamiento.planDePagos.length > 0 ? (
                  <div className="overflow-x-auto rounded-md border">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead># Cuota</TableHead>
                          <TableHead className="text-right">Monto</TableHead>
                          <TableHead>Fecha Vencimiento</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Observación</TableHead>
                           <TableHead>Pago Realizado</TableHead>
                          {/* Podrías añadir acciones como "Registrar Pago" aquí en el futuro */}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedFinanciamiento.planDePagos.map((cuota) => (
                          <TableRow key={cuota.numeroCuota}>
                            <TableCell>{cuota.numeroCuota}</TableCell>
                            <TableCell className="text-right">{formatCurrency(cuota.montoCuota)}</TableCell>
                            <TableCell>{formatTimestampToDate(cuota.fechaVencimientoEstimada)}</TableCell>
                            <TableCell>
                              <Badge 
                                variant={
                                  cuota.estadoCuota === 'Pagada' ? 'default' : 
                                  (isCuotaAtrasada(cuota) ? 'destructive' : 'secondary')
                                }
                                className="capitalize"
                              >
                                {cuota.estadoCuota}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {isCuotaAtrasada(cuota) && (
                                <Badge variant="outline" className="text-destructive border-destructive">
                                  <CalendarClock className="mr-1 h-3 w-3" /> Atrasada
                                </Badge>
                              )}
                              {!isCuotaAtrasada(cuota) && cuota.estadoCuota === 'Pendiente' && '-'}
                              {cuota.notasCuota && <span className="block text-xs text-muted-foreground">{cuota.notasCuota}</span>}
                            </TableCell>
                             <TableCell>
                                {cuota.fechaPagoReal ? formatTimestampToDate(cuota.fechaPagoReal) : 'N/P'}
                                {cuota.comprobanteCuotaUrl && (
                                  <Button variant="link" size="sm" asChild className="p-0 h-auto ml-1 text-xs">
                                     <a href={cuota.comprobanteCuotaUrl} target="_blank" rel="noopener noreferrer">(Ver Comp.)</a>
                                  </Button>
                                )}
                             </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No hay un plan de pagos detallado para este acuerdo.</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

