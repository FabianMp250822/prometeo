
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, ListOrdered, CheckCircle, XCircle, AlertCircle, Search, Info } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Timestamp } from 'firebase/firestore'; // Import Timestamp
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Definición de la estructura de datos para un registro de pago
interface PaymentRecord {
  id: string;
  clienteId: string;
  nombreCliente: string;
  financiamientoId?: string;
  numeroCuota?: number;
  monto: number;
  fechaPago: Timestamp; // Fecha en que el cliente dice que pagó o se registró el pago
  fechaRegistro: Timestamp; // Fecha en que se creó este registro en el sistema
  origen: 'admin_directo' | 'cliente_portal_validacion';
  estado: 'Pendiente Validación' | 'Validado' | 'Rechazado' | 'Registrado Admin';
  comprobanteUrl?: string;
  metodoPagoAdmin?: string;
  notasAdmin?: string;
  validadoPor?: string;
  fechaDecisionAdmin?: Timestamp;
}

// Datos de ejemplo
const mockPaymentRecords: PaymentRecord[] = [
  {
    id: 'pay_001',
    clienteId: '12345678',
    nombreCliente: 'Ana Pérez',
    financiamientoId: 'fin_abc',
    numeroCuota: 1,
    monto: 150000,
    fechaPago: Timestamp.fromDate(new Date('2024-05-03')),
    fechaRegistro: Timestamp.fromDate(new Date('2024-05-04T10:00:00Z')),
    origen: 'cliente_portal_validacion',
    estado: 'Pendiente Validación',
    comprobanteUrl: 'https://placehold.co/100x50.png?text=Comp1',
  },
  {
    id: 'pay_002',
    clienteId: '87654321',
    nombreCliente: 'Luis Gómez',
    monto: 250000,
    fechaPago: Timestamp.fromDate(new Date('2024-05-05')),
    fechaRegistro: Timestamp.fromDate(new Date('2024-05-05T14:30:00Z')),
    origen: 'admin_directo',
    estado: 'Registrado Admin',
    metodoPagoAdmin: 'Efectivo en Oficina',
  },
  {
    id: 'pay_003',
    clienteId: '10067001',
    nombreCliente: 'Carlos Falquez',
    financiamientoId: 'fin_xyz',
    numeroCuota: 3,
    monto: 75000,
    fechaPago: Timestamp.fromDate(new Date('2024-04-28')),
    fechaRegistro: Timestamp.fromDate(new Date('2024-04-29T09:15:00Z')),
    origen: 'cliente_portal_validacion',
    estado: 'Validado',
    comprobanteUrl: 'https://placehold.co/100x50.png?text=Comp3',
    validadoPor: 'admin_user_1',
    fechaDecisionAdmin: Timestamp.fromDate(new Date('2024-04-30T11:00:00Z')),
  },
  {
    id: 'pay_004',
    clienteId: '11223344',
    nombreCliente: 'Sofía Castro',
    financiamientoId: 'fin_def',
    numeroCuota: 2,
    monto: 320000,
    fechaPago: Timestamp.fromDate(new Date('2024-05-01')),
    fechaRegistro: Timestamp.fromDate(new Date('2024-05-02T16:45:00Z')),
    origen: 'cliente_portal_validacion',
    estado: 'Rechazado',
    comprobanteUrl: 'https://placehold.co/100x50.png?text=Comp4',
    notasAdmin: 'Comprobante ilegible.',
    validadoPor: 'admin_user_2',
    fechaDecisionAdmin: Timestamp.fromDate(new Date('2024-05-03T10:20:00Z')),
  },
];

const ESTADOS_PAGO: PaymentRecord['estado'][] = ['Pendiente Validación', 'Validado', 'Rechazado', 'Registrado Admin'];

export default function HistorialPagosView() {
  const { toast } = useToast();
  const [paymentRecords, setPaymentRecords] = useState<PaymentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('Todos');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Simular carga de datos
    setIsLoading(true);
    setTimeout(() => {
      setPaymentRecords(mockPaymentRecords);
      setIsLoading(false);
    }, 1000);
  }, []);

  const formatTimestampToDate = (timestamp?: Timestamp, dateFormat: string = 'PPP p'): string => {
    if (!timestamp) return 'N/A';
    try {
      return format(timestamp.toDate(), dateFormat, { locale: es });
    } catch (e) {
      console.warn("Error formatting timestamp:", e);
      return 'Fecha inválida';
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(amount);
  };

  const handleValidatePayment = (recordId: string) => {
    toast({ title: "Acción Simulada", description: `Pago ${recordId} validado (simulación).` });
    // Aquí iría la lógica para actualizar el estado en Firestore
    setPaymentRecords(prev => prev.map(rec => rec.id === recordId ? {...rec, estado: 'Validado'} : rec));
  };

  const handleRejectPayment = (recordId: string) => {
    toast({ title: "Acción Simulada", description: `Pago ${recordId} rechazado (simulación). Se necesitaría un modal para notas.`, variant: "destructive" });
    // Aquí iría la lógica para actualizar el estado y notas en Firestore
    setPaymentRecords(prev => prev.map(rec => rec.id === recordId ? {...rec, estado: 'Rechazado', notasAdmin: 'Rechazado por admin (sim.)'} : rec));
  };

  const filteredRecords = useMemo(() => {
    return paymentRecords.filter(record => {
      const statusMatch = filterStatus === 'Todos' || record.estado === filterStatus;
      const searchMatch = searchTerm === '' ||
        record.nombreCliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.clienteId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.id.toLowerCase().includes(searchTerm.toLowerCase());
      return statusMatch && searchMatch;
    });
  }, [paymentRecords, filterStatus, searchTerm]);

  const getBadgeVariant = (estado: PaymentRecord['estado']): "default" | "secondary" | "destructive" | "outline" => {
    switch (estado) {
      case 'Pendiente Validación': return "outline"; // Yellow-ish or neutral waiting
      case 'Validado': return "default"; // Greenish or primary success
      case 'Rechazado': return "destructive"; // Red
      case 'Registrado Admin': return "secondary"; // Blue-ish or neutral info
      default: return "secondary";
    }
  };


  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center text-xl font-headline text-primary">
          <ListOrdered className="mr-3 h-6 w-6" />
          Historial de Pagos y Validaciones
        </CardTitle>
        <CardDescription>
          Consulta todos los registros de pagos, incluyendo solicitudes de clientes pendientes de validación.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar por cliente, cédula, ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-full"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filtrar por estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Todos los Estados</SelectItem>
              {ESTADOS_PAGO.map(estado => (
                <SelectItem key={estado} value={estado}>{estado}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-3 text-muted-foreground">Cargando historial...</p>
          </div>
        ) : errorClientes ? (
          <div className="text-center py-10">
            <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-3" />
            <p className="text-destructive font-semibold">Error al Cargar Historial</p>
            <p className="text-sm text-muted-foreground">{errorClientes}</p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="text-center py-10">
            <Info className="mx-auto h-12 w-12 text-primary/50 mb-3" />
            <p className="text-lg text-muted-foreground">No se encontraron registros.</p>
            <p className="text-sm text-muted-foreground">Prueba con otros filtros o términos de búsqueda.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Fecha Solicitud/Registro</TableHead>
                  <TableHead>Fecha Pago (Declarada)</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead>Origen</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Comprobante</TableHead>
                  <TableHead className="text-center">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      <div className="font-medium">{record.nombreCliente}</div>
                      <div className="text-xs text-muted-foreground">ID: {record.clienteId}</div>
                       {record.financiamientoId && <div className="text-xs text-muted-foreground">Financ.: {record.financiamientoId} {record.numeroCuota && `(Cuota ${record.numeroCuota})`}</div>}
                    </TableCell>
                    <TableCell>{formatTimestampToDate(record.fechaRegistro)}</TableCell>
                    <TableCell>{formatTimestampToDate(record.fechaPago, 'PPP')}</TableCell>
                    <TableCell className="text-right">{formatCurrency(record.monto)}</TableCell>
                    <TableCell>
                      <Badge variant={record.origen === 'admin_directo' ? 'secondary' : 'outline'}>
                        {record.origen === 'admin_directo' ? 'Admin' : 'Cliente'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getBadgeVariant(record.estado)} className="capitalize">
                        {record.estado}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {record.comprobanteUrl ? (
                        <Button variant="link" size="sm" asChild className="p-0 h-auto">
                          <a href={record.comprobanteUrl} target="_blank" rel="noopener noreferrer">Ver</a>
                        </Button>
                      ) : (
                        'N/A'
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {record.estado === 'Pendiente Validación' ? (
                        <div className="flex gap-1 justify-center">
                          <Button size="icon" variant="outline" className="h-7 w-7 border-green-500 text-green-600 hover:bg-green-50 hover:text-green-700" onClick={() => handleValidatePayment(record.id)} title="Validar Pago">
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="outline" className="h-7 w-7 border-red-500 text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => handleRejectPayment(record.id)} title="Rechazar Pago">
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : record.estado === 'Rechazado' && record.notasAdmin ? (
                         <div className="text-xs text-destructive text-left">Nota: {record.notasAdmin}</div>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {/* Aquí se podría añadir paginación si es necesario */}
      </CardContent>
    </Card>
  );
}

// Variable dummy para evitar error de no uso si fetchClientes no se implementa aún
const errorClientes = null; 
