
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
  FileText,
  ChevronRight // Icon for primary action button if needed
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
  // Placeholder for future state to manage active view if needed
  // const [activeView, setActiveView] = useState<string | null>(null);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center text-2xl font-headline text-primary">
          <BookText className="mr-3 h-7 w-7" />
          Contabilidad
        </CardTitle>
      </CardHeader>

      <nav className="flex flex-wrap items-center gap-2 border-y px-4 py-3 bg-muted/20">
        {submenuItems.map((item) => (
          <Button
            key={item.id}
            variant={item.isPrimaryAction ? 'default' : 'outline'}
            size="sm"
            className={`
              text-xs sm:text-sm 
              ${item.isPrimaryAction 
                ? 'bg-primary hover:bg-primary/90 text-primary-foreground' 
                : 'bg-background hover:bg-accent hover:text-accent-foreground border-input'}
            `}
            // onClick={() => setActiveView(item.id)} // Placeholder for future navigation
          >
            <item.icon className="mr-2 h-4 w-4" />
            {item.label}
            {item.isPrimaryAction && <ChevronRight className="ml-1 h-4 w-4" />}
          </Button>
        ))}
      </nav>

      <CardContent className="flex-1 pt-6">
        {/* Main content area for Contabilidad submodules will go here */}
        {/* For now, a placeholder */}
        <div className="p-6 bg-muted/30 rounded-lg h-full flex items-center justify-center">
          <p className="text-muted-foreground text-center">
            Seleccione una opción del submenú para ver el contenido.
            <br />
            El módulo de Contabilidad y sus funcionalidades se implementarán aquí.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
