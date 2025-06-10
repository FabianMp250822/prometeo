
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { UserPlus } from 'lucide-react';

export default function CrearClienteView() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center text-xl font-headline text-primary">
          <UserPlus className="mr-3 h-6 w-6" />
          Crear Nuevo Cliente
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Formulario y lógica para crear un nuevo cliente se implementarán aquí.
        </p>
        {/* Placeholder for future form */}
      </CardContent>
    </Card>
  );
}
