
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { BookText } from 'lucide-react';

export default function ContabilidadPage() {
  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-2xl font-headline text-primary">
            <BookText className="mr-3 h-7 w-7" />
            Contabilidad
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            El módulo de contabilidad estará disponible aquí.
          </p>
          {/* Placeholder for future content */}
        </CardContent>
      </Card>
    </div>
  );
}
