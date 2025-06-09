
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Percent } from 'lucide-react';

export default function AdquisitivoPage() {
  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-2xl font-headline text-primary">
            <Percent className="mr-3 h-7 w-7" />
            Adquisitivo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            El módulo Adquisitivo estará disponible aquí.
          </p>
          {/* Placeholder for future content */}
        </CardContent>
      </Card>
    </div>
  );
}
