
"use client";

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
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
  { id: 'crear-cliente', label: 'Crear Cliente', icon: UserPlus, component: CrearClienteView },
  { id: 'ver-pagos-cliente', label: 'Pagos Cliente', icon: CreditCard, component: VerPagosClienteView },
  { id: 'historial-pagos', label: 'Historial Pagos', icon: History, component: HistorialPagosView },
  { id: 'agregar-pago', label: 'Agregar Pago', icon: PlusCircle, component: AgregarPagoView, isPrimaryAction: true },
  { id: 'editar-usuario-contable', label: 'Editar Usuario', icon: UserCog, component: EditarUsuarioContableView },
  { id: 'resumen-financiero', label: 'Resumen Financ.', icon: LineChart, component: ResumenFinancieroView },
  { id: 'documentos-soporte', label: 'Doc. Soporte', icon: FileText, component: DocumentosSoporteView },
];

const DefaultContabilidadView = () => (
    <Card className="mt-6">
        <CardHeader>
            <CardTitle className="flex items-center text-2xl font-headline text-primary">
                <LayoutGrid className="mr-3 h-7 w-7" />
                Módulo de Contabilidad
            </CardTitle>
            <CardDescription>
                Bienvenido al módulo de contabilidad. Seleccione una opción de la barra de navegación superior para comenzar.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-muted-foreground">
                Este módulo le permite gestionar clientes, pagos, ver historiales financieros y más.
            </p>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {submenuItems.filter(item => item.id !== 'agregar-pago').slice(0,3).map(item => (
                     <Link key={item.id} href={`/dashboard/contabilidad?view=${item.id}`}>
                        <Button asChild variant="outline" className="w-full justify-start text-left h-auto py-3 shadow-sm hover:shadow-md transition-shadow">
                            <span> {/* Added span to be the direct child for Button with asChild */}
                                <item.icon className="mr-3 h-5 w-5 flex-shrink-0 text-primary" />
                                <div>
                                    <p className="font-semibold text-foreground">{item.label}</p>
                                    <p className="text-xs text-muted-foreground">Acceder a {item.label.toLowerCase()}</p>
                                </div>
                            </span>
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
    <div className="space-y-6">
      <Card className="shadow-md sticky top-[7.5rem] z-10 bg-card/95 backdrop-blur-sm">
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="flex items-center text-xl font-headline text-primary">
            <BookText className="mr-3 h-6 w-6" />
            Contabilidad
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <nav className="flex flex-wrap items-center gap-1 border-t border-b px-3 py-2">
            {submenuItems.map((item) => (
              <Link key={item.id} href={`${pathname}?view=${item.id}`}>
                <Button
                  asChild
                  variant={item.isPrimaryAction ? 'default' : (currentView === item.id ? 'secondary' : 'ghost')}
                  size="sm"
                  className={`font-medium text-xs sm:text-sm px-2 py-1.5 h-auto sm:px-3 sm:py-2 ${item.isPrimaryAction ? 'shadow-md' : ''}`}
                  aria-current={currentView === item.id ? 'page' : undefined}
                >
                  <span> {/* Added span to be the direct child for Button with asChild */}
                    <item.icon className="mr-1.5 h-4 w-4 sm:mr-2 sm:h-4 sm:w-4 flex-shrink-0" />
                    {item.label}
                  </span>
                </Button>
              </Link>
            ))}
          </nav>
        </CardContent>
      </Card>

      <main className="flex-1 min-w-0">
        <ActiveComponent />
      </main>
    </div>
  );
}
