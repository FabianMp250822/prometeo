
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { MessageSquareText } from 'lucide-react';

export default function AsistenteLegalPage() {
  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-2xl font-headline text-primary">
            <MessageSquareText className="mr-3 h-7 w-7" />
            Asistente Legal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            La funcionalidad del Asistente Legal estará disponible aquí.
          </p>
          {/* Placeholder for future content */}
        </CardContent>
      </Card>
    </div>
  );
}
