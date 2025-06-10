
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { History } from 'lucide-react';

export default function HistorialPagosView() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center text-xl font-headline text-primary">
          <History className="mr-3 h-6 w-6" />
          Ver Historial de Pagos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Visualización del historial completo de pagos (todos los clientes o filtrado) se implementará aquí.
        </p>
        {/* Placeholder for future content */}
      </CardContent>
    </Card>
  );
}
