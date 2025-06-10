
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { LineChart } from 'lucide-react';

export default function ResumenFinancieroView() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center text-xl font-headline text-primary">
          <LineChart className="mr-3 h-6 w-6" />
          Resumen Financiero
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Visualización de gráficos y KPIs financieros se implementará aquí.
        </p>
        {/* Placeholder for future charts/data */}
      </CardContent>
    </Card>
  );
}
