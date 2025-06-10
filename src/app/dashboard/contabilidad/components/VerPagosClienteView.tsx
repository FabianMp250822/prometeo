
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { CreditCard } from 'lucide-react';

export default function VerPagosClienteView() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center text-xl font-headline text-primary">
          <CreditCard className="mr-3 h-6 w-6" />
          Ver Pagos de Cliente
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Funcionalidad para buscar un cliente y ver sus pagos se implementará aquí.
        </p>
        {/* Placeholder for future content */}
      </CardContent>
    </Card>
  );
}
