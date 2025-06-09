
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { FileDollar } from 'lucide-react';

export default function DetallesPage() {
  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-2xl font-headline text-primary">
            <FileDollar className="mr-3 h-7 w-7" />
            Detalles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            El módulo de Detalles estará disponible aquí.
          </p>
          {/* Placeholder for future content */}
        </CardContent>
      </Card>
    </div>
  );
}
