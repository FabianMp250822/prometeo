
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
  const [pageDocSnapshots, setPageDocSnapshots] = useState<Record<number, DocumentData | null>>({ 1: null });


  const [selectedCliente, setSelectedCliente] = useState<Pensionado | null>(null);
  const [financiamientos, setFinanciamientos] = useState<Financiamiento[]>([]);
  const [selectedFinanciamiento, setSelectedFinanciamiento] = useState<Financiamiento | null>(null);
  const [isLoadingFinanciamientos, setIsLoadingFinanciamientos] = useState(false);
  const [errorFinanciamientos, setErrorFinanciamientos] = useState<string | null>(null);

  const [totalConvenio, setTotalConvenio] = useState<number>(0);
  const [totalCancelado, setTotalCancelado] = useState<number>(0);

  const formatTimestampToDate = (timestamp?: Timestamp, dateFormat: string = 'PPP'): string => {
    if (!timestamp) return 'N/A';
    try {
      const date = timestamp.toDate();
      // Check if date is valid before formatting
      if (isNaN(date.getTime())) return 'Fecha Inválida';
      return format(date, dateFormat, { locale: es });
    } catch (e) {
      console.warn("Error formatting timestamp:", timestamp, e);
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
        orderBy('apellidos'), 
        orderBy('nombres'),
        limit(CLIENTES_PER_PAGE + 1) 
      );

      if (page > 1 && startAfterDoc) {
        q = query(
          collection(db, 'pensionados'),
          orderBy('apellidos'),
          orderBy('nombres'),
          startAfter(startAfterDoc),
          limit(CLIENTES_PER_PAGE + 1)
        );
      }
      
      const querySnapshot = await getDocs(q);
      const fetchedClientesDocs = querySnapshot.docs;
      const clientesData = fetchedClientesDocs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Pensionado));
      
      setClientes(clientesData.slice(0, CLIENTES_PER_PAGE));
      
      const hasMore = fetchedClientesDocs.length > CLIENTES_PER_PAGE;
      setHasMoreClientes(hasMore);
      
      const currentLastVisible = hasMore ? fetchedClientesDocs[CLIENTES_PER_PAGE -1] : null;
      setLastVisibleClienteDoc(currentLastVisible);
      setCurrentPage(page);

      if (hasMore) {
        setPageDocSnapshots(prevSnaps => ({ ...prevSnaps, [page + 1]: currentLastVisible }));
      }
      if (page === 1 && !pageDocSnapshots[1] && clientesData.length > 0) {
         setPageDocSnapshots(prevSnaps => ({...prevSnaps, [1]: null}));
      }


      if (page === 1 && clientesData.length === 0) {
        toast({ title: "Sin Clientes", description: "No se encontraron clientes registrados.", variant: "default" });
      }

    } catch (err: any) {
      console.error("Error fetching clientes:", err);
      setErrorClientes("No se pudieron cargar los clientes: " + err.message);
      toast({ title: "Error", description: "No se pudieron cargar los clientes.", variant: "destructive" });
    } finally {
      setIsLoadingClientes(false);
    }
  }, [toast]); // pageDocSnapshots removed

  useEffect(() => {
    fetchClientes(1, null);
  }, [fetchClientes]);

  const handleNextPage = useCallback(() => {
    if (hasMoreClientes && lastVisibleClienteDoc) {
      fetchClientes(currentPage + 1, lastVisibleClienteDoc);
    }
  }, [hasMoreClientes, lastVisibleClienteDoc, currentPage, fetchClientes]);
  
  const handlePrevPage = useCallback(() => {
    if (currentPage > 1) {
       const startAfterDocForPrevPage = pageDocSnapshots[currentPage - 1];
       fetchClientes(currentPage - 1, startAfterDocForPrevPage); 
    }
  },[currentPage, pageDocSnapshots, fetchClientes]);


  const handleSelectCliente = async (cliente: Pensionado) => {
    setSelectedCliente(cliente);
    setIsLoadingFinanciamientos(true);
    setErrorFinanciamientos(null);
    setFinanciamientos([]);
    setSelectedFinanciamiento(null);
    setTotalConvenio(0);
    setTotalCancelado(0);

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
        const financiamientoSeleccionado = fetchedFinanciamientos[0]; // Seleccionar el más reciente por defecto
        setSelectedFinanciamiento(financiamientoSeleccionado);
        
        const convenio = financiamientoSeleccionado.salarioACancelar || 0;
        setTotalConvenio(convenio);

        let cancelado = 0;
        if (financiamientoSeleccionado.planDePagos) {
          financiamientoSeleccionado.planDePagos.forEach(cuota => {
            if (cuota.estadoCuota === 'Pagada') {
              cancelado += cuota.montoCuota;
            }
          });
        }
        setTotalCancelado(cancelado);
        
        toast({ title: "Financiamientos Cargados", description: `Se encontraron ${fetchedFinanciamientos.length} acuerdo(s). Mostrando el más reciente.`, variant: "default"});
      } else {
        toast({ title: "Sin Financiamientos", description: `No se encontraron acuerdos de financiamiento.`, variant: "default" });
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
    if (cuota.estadoCuota !== 'Pendiente' || !cuota.fechaVencimientoEstimada) return false;
    try {
        const fechaVencimiento = cuota.fechaVencimientoEstimada.toDate();
        if (isNaN(fechaVencimiento.getTime())) return false; // Invalid date from timestamp
        return isPast(fechaVencimiento) && !cuota.fechaPagoReal;
    } catch (e) {
        console.warn("Could not determine if cuota is atrasada", cuota, e);
        return false;
    }
  };
  
  const getNombreCompletoCliente = (cliente: Pensionado | null): string => {
      if (!cliente) return 'N/A';
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
            Seleccione un cliente para ver su estado de cuenta y plan de pagos detallado.
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
                            Ver Estado de Cuenta
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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <div>
            <CardTitle className="flex items-center text-xl font-headline text-primary">
              <FileText className="mr-3 h-6 w-6" />
              Estado de Cuenta: {getNombreCompletoCliente(selectedCliente)} (C.C. {selectedCliente.id})
            </CardTitle>
            <CardDescription>
              {selectedFinanciamiento ? `Acuerdo del ${formatTimestampToDate(selectedFinanciamiento.fechaCreacionAcuerdo)}.` : "Cargando o sin acuerdo seleccionado."}
            </CardDescription>
          </div>
          <Button variant="outline" onClick={handleVolverALista} className="mt-2 sm:mt-0">
            <ChevronLeft className="mr-2 h-4 w-4" /> Volver a Lista de Clientes
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoadingFinanciamientos && (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-3 text-muted-foreground">Cargando detalles del acuerdo...</p>
          </div>
        )}
        {errorFinanciamientos && !isLoadingFinanciamientos && (
           <div className="text-center py-10">
              <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-3" />
              <p className="text-destructive font-semibold">Error al Cargar Acuerdo</p>
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

        {selectedFinanciamiento && !isLoadingFinanciamientos && (
          <div className="space-y-6 mt-4">
            <Card className="bg-muted/30">
              <CardHeader className="pb-3 pt-4">
                <CardTitle className="text-lg flex items-center">
                    <CircleDollarSign className="mr-2 h-5 w-5 text-primary"/>
                    Resumen del Acuerdo
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3 text-sm pt-0">
                <div><strong>Monto Total Convenio:</strong> {formatCurrency(selectedFinanciamiento.salarioACancelar)}</div>
                <div><strong>Plazo:</strong> {selectedFinanciamiento.plazoEnMeses} meses</div>
                <div><strong>Cuota Mensual:</strong> {formatCurrency(selectedFinanciamiento.cuotaMensualCalculada)}</div>
                <div><strong>Estado Acuerdo:</strong> <Badge variant={selectedFinanciamiento.estadoAcuerdo === 'Activo' ? "default" : "secondary"}>{selectedFinanciamiento.estadoAcuerdo || "N/A"}</Badge></div>
                <div><strong>Grupo:</strong> {selectedFinanciamiento.grupoCliente || 'N/A'}</div>
                 {selectedFinanciamiento.convenioGeneralPagoUrl && (
                  <div className="md:col-span-1">
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
              <CardHeader className="pb-3 pt-4">
                <CardTitle className="text-lg flex items-center">
                    <ListChecks className="mr-2 h-5 w-5 text-primary"/>
                    Detalle de Cuotas
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {selectedFinanciamiento.planDePagos && selectedFinanciamiento.planDePagos.length > 0 ? (
                  <div className="overflow-x-auto rounded-md border">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead className="text-center"># Cuota</TableHead>
                          <TableHead className="text-right">Monto</TableHead>
                          <TableHead>Vencimiento</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Observación</TableHead>
                          <TableHead>Fecha Pago Real</TableHead>
                          <TableHead>Comprobante</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedFinanciamiento.planDePagos.sort((a,b) => a.numeroCuota - b.numeroCuota).map((cuota) => (
                          <TableRow key={cuota.numeroCuota}>
                            <TableCell className="text-center">{cuota.numeroCuota}</TableCell>
                            <TableCell className="text-right">{formatCurrency(cuota.montoCuota)}</TableCell>
                            <TableCell>{formatTimestampToDate(cuota.fechaVencimientoEstimada)}</TableCell>
                            <TableCell>
                              <Badge 
                                variant={
                                  cuota.estadoCuota === 'Pagada' ? 'default' : 
                                  (isCuotaAtrasada(cuota) ? 'destructive' : 
                                  (cuota.estadoCuota === 'Enviado para Validación' ? 'outline' : 'secondary'))
                                }
                                className="capitalize"
                              >
                                {isCuotaAtrasada(cuota) ? 'Vencida' : cuota.estadoCuota}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {cuota.notasCuota ? 
                                <span className="block text-xs text-muted-foreground" title={cuota.notasCuota}>
                                  {cuota.notasCuota.length > 30 ? cuota.notasCuota.substring(0,27) + '...' : cuota.notasCuota}
                                </span> 
                                : isCuotaAtrasada(cuota) ? 
                                  <Badge variant="outline" className="text-destructive border-destructive font-normal text-xs py-0.5 px-1.5">
                                      <CalendarClock className="mr-1 h-3 w-3" /> Atrasada
                                  </Badge> 
                                  : '-'
                              }
                            </TableCell>
                             <TableCell>
                                {cuota.fechaPagoReal ? formatTimestampToDate(cuota.fechaPagoReal) : 'N/P'}
                             </TableCell>
                             <TableCell>
                                {cuota.comprobanteCuotaUrl ? (
                                  <Button variant="link" size="sm" asChild className="p-0 h-auto text-xs">
                                     <a href={cuota.comprobanteCuotaUrl} target="_blank" rel="noopener noreferrer">Ver</a>
                                  </Button>
                                ) : (cuota.estadoCuota === 'Pagada' ? 'N/D' : '-')}
                             </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">No hay un plan de pagos detallado para este acuerdo.</p>
                )}
              </CardContent>
               <CardFooter className="flex flex-col sm:flex-row justify-end items-center gap-4 sm:gap-8 pt-4 border-t bg-muted/20 p-4">
                  <div className="text-right">
                      <p className="text-xs text-muted-foreground">Total del Convenio</p>
                      <p className="text-lg font-semibold text-foreground">{formatCurrency(totalConvenio)}</p>
                  </div>
                  <div className="text-right">
                      <p className="text-xs text-muted-foreground">Total Cancelado</p>
                      <p className="text-lg font-semibold text-green-600">{formatCurrency(totalCancelado)}</p>
                  </div>
                  <div className="text-right">
                      <p className="text-xs text-muted-foreground">Saldo Pendiente</p>
                      <p className="text-lg font-bold text-destructive">{formatCurrency(totalConvenio - totalCancelado)}</p>
                  </div>
              </CardFooter>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

