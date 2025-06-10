
"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  BookText, 
  UserPlus, 
  CreditCard, 
  History, 
  PlusCircle, 
  UserCog, 
  LineChart, 
  FileText,
  ChevronRight,
  Settings,
  FileSearch,
  Receipt
} from 'lucide-react';

// Importar los componentes de las vistas de los submódulos
import CrearClienteView from './components/CrearClienteView';
import VerPagosClienteView from './components/VerPagosClienteView';
import HistorialPagosView from './components/HistorialPagosView';
import AgregarPagoView from './components/AgregarPagoView';
import EditarUsuarioContableView from './components/EditarUsuarioContableView';
import ResumenFinancieroView from './components/ResumenFinancieroView';
import DocumentosSoporteView from './components/DocumentosSoporteView';

interface SubmenuItem {
  id: string;
  label: string;
  icon: React.ElementType;
  isPrimaryAction?: boolean;
}

// Actualizando para que coincida con la imagen proporcionada
const submenuItems: SubmenuItem[] = [
  { id: 'crear-cliente', label: 'Crear Cliente', icon: UserPlus },
  { id: 'ver-pagos-cliente', label: 'Ver Pagos Cliente', icon: CreditCard },
  { id: 'historial-pagos', label: 'Historial de Pagos', icon: History },
  { id: 'agregar-pago', label: 'Agregar Pago', icon: PlusCircle, isPrimaryAction: true },
  { id: 'editar-usuario', label: 'Editar Usuario', icon: UserCog },
  { id: 'resumen-financiero', label: 'Resumen Financiero', icon: LineChart },
  { id: 'documentos-soporte', label: 'Docs. Soporte', icon: FileText },
  { id: 'configuracion', label: 'Configuración', icon: Settings },
  { id: 'buscar-factura', label: 'Buscar Factura', icon: FileSearch },
  { id: 'estado-cuenta', label: 'Estado de Cuenta', icon: Receipt },
];


// Vista por defecto para la página de Contabilidad
const DefaultContabilidadView = () => (
  <Card className="shadow-lg border-dashed">
    <CardContent className="pt-6">
      <div className="text-center text-muted-foreground py-12">
        <BookText className="mx-auto h-20 w-20 mb-4 text-primary/20" />
        <p className="text-xl font-semibold text-foreground">Módulo de Contabilidad</p>
        <p className="text-md mt-2">
          Seleccione una opción del submenú superior para comenzar.
        </p>
        <div className="mt-8 flex justify-center">
          <Link href="/dashboard/contabilidad?view=agregar-pago">
            <Button size="lg">
              <PlusCircle className="mr-2 h-5 w-5" />
              Comenzar agregando un pago
            </Button>
          </Link>
        </div>
      </div>
    </CardContent>
  </Card>
);


// Mapeo de IDs de vista a componentes
const componentMap: Record<string, React.ElementType> = {
  'crear-cliente': CrearClienteView,
  'ver-pagos-cliente': VerPagosClienteView,
  'historial-pagos': HistorialPagosView,
  'agregar-pago': AgregarPagoView,
  'editar-usuario': EditarUsuarioContableView,
  'resumen-financiero': ResumenFinancieroView,
  'documentos-soporte': DocumentosSoporteView,
  // Añadir placeholders para los nuevos botones si se crean los componentes
  'configuracion': () => <Card><CardContent className="pt-6"><p>Vista de Configuración (Contabilidad)</p></CardContent></Card>,
  'buscar-factura': () => <Card><CardContent className="pt-6"><p>Vista de Buscar Factura</p></CardContent></Card>,
  'estado-cuenta': () => <Card><CardContent className="pt-6"><p>Vista de Estado de Cuenta</p></CardContent></Card>,
  'default': DefaultContabilidadView,
};

export default function ContabilidadPage() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentView = searchParams.get('view') || 'default';

  const ActiveComponent = componentMap[currentView] || DefaultContabilidadView;

  return (
    <>
      <Card className="sticky top-0 z-10 mt-0 shadow-md bg-card rounded-lg">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="flex items-center text-xl font-headline text-primary">
            <BookText className="mr-3 h-6 w-6" />
            Contabilidad
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <nav className="flex flex-wrap items-center gap-1 border-t border-b px-3 py-2 bg-muted/30">
            {submenuItems.map((item) => (
              <Link key={item.id} href={`${pathname}?view=${item.id}`}>
                <Button
                  asChild
                  variant={item.isPrimaryAction ? 'default' : (currentView === item.id ? 'secondary' : 'ghost')}
                  size="sm"
                  className={`text-xs sm:text-sm h-auto py-1.5 px-2.5 ${item.isPrimaryAction ? '' : (currentView === item.id ? 'bg-primary/10 text-primary font-semibold' : 'hover:bg-accent/50')}`}
                >
                  <span>
                    <item.icon className={`mr-1.5 h-4 w-4 ${currentView !== item.id && !item.isPrimaryAction && !(currentView === item.id && !item.isPrimaryAction) ? 'text-primary' : ''}`} />
                    {item.label}
                    {item.isPrimaryAction && <ChevronRight className="ml-1 h-3 w-3" />}
                  </span>
                </Button>
              </Link>
            ))}
          </nav>
        </CardContent>
      </Card>
      
      <section className="pt-4">
        <ActiveComponent />
      </section>
    </>
  );
}
