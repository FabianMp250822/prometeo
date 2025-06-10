
"use client";

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
  FileText 
} from 'lucide-react';

interface SubmenuItem {
  id: string;
  label: string;
  icon: React.ElementType;
  isPrimaryAction?: boolean;
}

const submenuItems: SubmenuItem[] = [
  { id: 'crear-cliente', label: 'Crear Nuevo Cliente', icon: UserPlus },
  { id: 'ver-pagos-cliente', label: 'Ver Pagos de Cliente', icon: CreditCard },
  { id: 'historial-pagos', label: 'Ver Historial de Pagos', icon: History },
  { id: 'agregar-pago', label: 'Agregar Pago', icon: PlusCircle, isPrimaryAction: true },
  { id: 'editar-usuario', label: 'Editar Usuario', icon: UserCog },
  { id: 'resumen-financiero', label: 'Resumen Financiero', icon: LineChart },
  { id: 'documentos-soporte', label: 'Documentos Soporte', icon: FileText },
];

export default function ContabilidadPage() {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center text-2xl font-headline text-primary">
          <BookText className="mr-3 h-7 w-7" />
          Contabilidad
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col md:flex-row gap-6 pt-2">
        <aside className="w-full md:w-1/4 lg:w-1/5 space-y-2 pr-4 border-r-0 md:border-r">
          <h3 className="text-lg font-semibold text-foreground mb-3 px-1">Operaciones</h3>
          {submenuItems.map((item) => (
            <Button
              key={item.id}
              variant={item.isPrimaryAction ? 'default' : 'ghost'}
              className="w-full justify-start text-left h-auto py-2.5 px-3"
              // onClick={() => console.log(item.id)} // Placeholder for future navigation
            >
              <item.icon className={`mr-3 h-5 w-5 ${item.isPrimaryAction ? '' : 'text-primary'}`} />
              <span className="flex-1">{item.label}</span>
            </Button>
          ))}
        </aside>
        <section className="flex-1 pl-0 md:pl-6">
          {/* Main content area for Contabilidad submodules will go here */}
          <div className="p-6 bg-muted/30 rounded-lg h-full flex items-center justify-center">
            <p className="text-muted-foreground text-center">
              Seleccione una opción del submenú para ver el contenido.
              <br />
              El módulo de Contabilidad y sus funcionalidades se implementarán aquí.
            </p>
          </div>
        </section>
      </CardContent>
    </Card>
  );
}
