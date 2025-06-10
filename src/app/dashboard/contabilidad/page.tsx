
"use client";

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookText, UserPlus, CreditCard, History, PlusCircle, UserCog, LineChart, FileText, LayoutGrid } from 'lucide-react';
import Link from 'next/link';
import React from 'react';

// Importar los componentes de las vistas
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
  component: React.ElementType;
  isPrimaryAction?: boolean;
}

const submenuItems: SubmenuItem[] = [
  { id: 'crear-cliente', label: 'Crear Nuevo Cliente', icon: UserPlus, component: CrearClienteView },
  { id: 'ver-pagos-cliente', label: 'Ver Pagos de Cliente', icon: CreditCard, component: VerPagosClienteView },
  { id: 'historial-pagos', label: 'Ver Historial de Pagos', icon: History, component: HistorialPagosView },
  { id: 'agregar-pago', label: 'Agregar Pago', icon: PlusCircle, component: AgregarPagoView, isPrimaryAction: true },
  { id: 'editar-usuario-contable', label: 'Editar Usuario', icon: UserCog, component: EditarUsuarioContableView },
  { id: 'resumen-financiero', label: 'Resumen Financiero', icon: LineChart, component: ResumenFinancieroView },
  { id: 'documentos-soporte', label: 'Documentos Soporte', icon: FileText, component: DocumentosSoporteView },
];

const DefaultContabilidadView = () => (
    <Card>
        <CardHeader>
            <CardTitle className="flex items-center text-xl font-headline text-primary">
                <LayoutGrid className="mr-3 h-6 w-6" />
                Bienvenido a Contabilidad
            </CardTitle>
        </CardHeader>
        <CardContent>
            <p className="text-muted-foreground">
                Seleccione una opción del menú de la izquierda para comenzar a trabajar en las funcionalidades de contabilidad.
            </p>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                {submenuItems.filter(item => item.id !== 'agregar-pago').slice(0,4).map(item => (
                     <Link key={item.id} href={`/dashboard/contabilidad?view=${item.id}`} passHref legacyBehavior>
                        <Button variant="outline" className="w-full justify-start text-left h-auto py-3">
                            <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                            <div>
                                <p className="font-semibold">{item.label}</p>
                                <p className="text-xs text-muted-foreground">Acceder a {item.label.toLowerCase()}</p>
                            </div>
                        </Button>
                    </Link>
                ))}
            </div>
        </CardContent>
    </Card>
);


export default function ContabilidadPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentView = searchParams.get('view');

  const ActiveComponent = submenuItems.find(item => item.id === currentView)?.component || DefaultContabilidadView;

  return (
    <div className="flex flex-col md:flex-row gap-8">
      <aside className="w-full md:w-72 flex-shrink-0">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center text-xl font-headline text-primary">
              <BookText className="mr-3 h-6 w-6" />
              Menú Contabilidad
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {submenuItems.map((item) => (
              <Link key={item.id} href={`${pathname}?view=${item.id}`} passHref legacyBehavior>
                <Button
                  variant={item.isPrimaryAction ? 'default' : (currentView === item.id ? 'secondary' : 'ghost')}
                  className="w-full justify-start text-left h-auto py-2.5 px-3"
                  aria-current={currentView === item.id ? 'page' : undefined}
                >
                  <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                  {item.label}
                </Button>
              </Link>
            ))}
          </CardContent>
        </Card>
      </aside>

      <main className="flex-1 min-w-0">
        <ActiveComponent />
      </main>
    </div>
  );
}
