
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Gavel } from 'lucide-react';

export default function ConsultaSentenciasPage() {
  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-2xl font-headline text-primary">
            <Gavel className="mr-3 h-7 w-7" />
            Consulta de Sentencias
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            La funcionalidad para consultar sentencias estará disponible aquí.
          </p>
          {/* Placeholder for future content */}
        </CardContent>
      </Card>
    </div>
  );
}
