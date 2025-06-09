
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Award } from 'lucide-react';

export default function CertificadoPage() {
  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-2xl font-headline text-primary">
            <Award className="mr-3 h-7 w-7" />
            Certificado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            El módulo de Certificados estará disponible aquí.
          </p>
          {/* Placeholder for future content */}
        </CardContent>
      </Card>
    </div>
  );
}
