
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { PlusCircle } from 'lucide-react';

export default function AgregarPagoView() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center text-xl font-headline text-primary">
          <PlusCircle className="mr-3 h-6 w-6" />
          Agregar Pago
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Formulario para registrar un nuevo pago para un cliente se implementará aquí.
        </p>
        {/* Placeholder for future form */}
      </CardContent>
    </Card>
  );
}
