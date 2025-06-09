
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Banknote } from 'lucide-react';

export default function PagosPage() {
  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-2xl font-headline text-primary">
            <Banknote className="mr-3 h-7 w-7" />
            Pagos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            El módulo de Pagos estará disponible aquí.
          </p>
          {/* Placeholder for future content */}
        </CardContent>
      </Card>
    </div>
  );
}
