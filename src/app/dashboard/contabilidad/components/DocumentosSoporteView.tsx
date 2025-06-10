
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { FileText } from 'lucide-react';

export default function DocumentosSoporteView() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center text-xl font-headline text-primary">
          <FileText className="mr-3 h-6 w-6" />
          Documentos Soporte
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Sistema para gestionar (subir, ver, descargar) documentos de soporte contable se implementará aquí.
        </p>
        {/* Placeholder for future document management UI */}
      </CardContent>
    </Card>
  );
}
