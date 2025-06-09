import ReportGeneratorButtons from '@/components/reporting/ReportGeneratorButtons';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { BarChartBig, DownloadCloud } from 'lucide-react';
import Image from 'next/image';

export default function ReportsPage() {
  return (
    <div className="space-y-8">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-headline text-primary flex items-center">
            <BarChartBig className="mr-3 h-7 w-7" />
            Generación de Reportes
          </CardTitle>
          <CardDescription>
            Exporta datos importantes del sistema en formatos PDF o Excel para análisis y archivo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-6 text-muted-foreground">
            Selecciona el tipo de reporte que deseas generar. Actualmente, ofrecemos un reporte general de casos.
            Próximamente se añadirán más opciones de reportes personalizados.
          </p>
          <ReportGeneratorButtons />
        </CardContent>
      </Card>

       <Card className="bg-gradient-to-br from-accent/5 via-background to-primary/5 shadow-md">
            <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row items-center gap-6">
                    <Image 
                        src="https://placehold.co/600x400.png"
                        alt="Data Analytics"
                        width={200}
                        height={133}
                        className="rounded-lg shadow-sm"
                        data-ai-hint="data charts"
                    />
                    <div>
                        <h3 className="text-lg font-semibold text-primary mb-2 flex items-center">
                            <DownloadCloud className="h-5 w-5 mr-2 text-accent" />
                            ¿Necesitas más información?
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            Los reportes generados te proporcionan una vista detallada de la información clave. 
                            Utilízalos para tomar decisiones informadas y mantener un registro de la actividad del consorcio.
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    </div>
  );
}
