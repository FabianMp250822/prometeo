
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { CreditCard } from 'lucide-react';

export default function ConsultaPagosPage() {
  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-2xl font-headline text-primary">
            <CreditCard className="mr-3 h-7 w-7" />
            Consulta de Pagos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            La funcionalidad para consultar pagos estará disponible aquí.
          </p>
          {/* Placeholder for future content */}
        </CardContent>
      </Card>
    </div>
  );
}
