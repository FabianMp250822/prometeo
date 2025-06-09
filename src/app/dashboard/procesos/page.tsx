
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Search } from 'lucide-react';

export default function ProcesosPage() {
  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-2xl font-headline text-primary">
            <Search className="mr-3 h-7 w-7" />
            Procesos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            El módulo de Procesos estará disponible aquí.
          </p>
          {/* Placeholder for future content */}
        </CardContent>
      </Card>
    </div>
  );
}
