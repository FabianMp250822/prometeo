
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { UserCog } from 'lucide-react';

export default function EditarUsuarioContableView() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center text-xl font-headline text-primary">
          <UserCog className="mr-3 h-6 w-6" />
          Editar Usuario (Contabilidad)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Funcionalidad para editar usuarios (posiblemente roles o datos específicos de contabilidad) se implementará aquí.
        </p>
        {/* Placeholder for future content */}
      </CardContent>
    </Card>
  );
}
