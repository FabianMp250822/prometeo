
"use client";

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DollarSign, TrendingUp, TrendingDown, Percent, LineChart as LineChartIcon, Info } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import type { ChartConfig } from "@/components/ui/chart";
import { useEffect, useState } from 'react';

// Define interfaces for your data structures
interface KpiData {
  ingresosTotales: number;
  egresosTotales: number;
  beneficioNeto: number;
  margenBeneficio: number;
}

interface MonthlyFinancialRecord {
  month: string;
  ingresos: number;
  egresos: number;
}

const chartConfig = {
  ingresos: {
    label: "Ingresos",
    color: "hsl(var(--chart-1))",
  },
  egresos: {
    label: "Egresos",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
};

const formatPercent = (value: number) => {
  return `${value.toFixed(1)}%`;
};

export default function ResumenFinancieroView() {
  const [kpiData, setKpiData] = useState<KpiData | null>(null);
  const [monthlyFinancialData, setMonthlyFinancialData] = useState<MonthlyFinancialRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate data fetching
    // In a real application, you would fetch this data from your backend/Firestore
    const fetchFinancialData = async () => {
      setIsLoading(true);
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Set empty data for now, to remove mock data
      setKpiData({
        ingresosTotales: 0,
        egresosTotales: 0,
        beneficioNeto: 0,
        margenBeneficio: 0,
      });
      setMonthlyFinancialData([]);
      
      setIsLoading(false);
    };

    fetchFinancialData();
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-xl font-headline text-primary">
            <LineChartIcon className="mr-3 h-6 w-6" />
            Resumen Financiero General
          </CardTitle>
          <CardDescription>Cargando datos financieros...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!kpiData || monthlyFinancialData.length === 0) {
     return (
       <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center text-xl font-headline text-primary">
            <LineChartIcon className="mr-3 h-6 w-6" />
            Resumen Financiero General
          </CardTitle>
          <CardDescription>
            Una vista general de los indicadores clave y tendencias financieras.
          </CardDescription>
        </CardHeader>
         <CardContent className="text-center py-10">
            <Info className="mx-auto h-12 w-12 text-primary/50 mb-3" />
            <p className="text-lg text-muted-foreground">No hay datos financieros disponibles.</p>
            <p className="text-sm text-muted-foreground">Cuando haya datos, se mostrarán los KPIs y gráficos aquí.</p>
          </CardContent>
       </Card>
     );
  }


  return (
    <div className="space-y-6">
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center text-xl font-headline text-primary">
            <LineChartIcon className="mr-3 h-6 w-6" />
            Resumen Financiero General
          </CardTitle>
          <CardDescription>
            Una vista general de los indicadores clave y tendencias financieras.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
            <DollarSign className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpiData.ingresosTotales)}</div>
            {/* <p className="text-xs text-muted-foreground">+15.2% desde el mes pasado</p> */}
          </CardContent>
        </Card>
        <Card className="shadow-sm hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Egresos Totales</CardTitle>
            <TrendingDown className="h-5 w-5 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpiData.egresosTotales)}</div>
            {/* <p className="text-xs text-muted-foreground">+5.1% desde el mes pasado</p> */}
          </CardContent>
        </Card>
        <Card className="shadow-sm hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Beneficio Neto</CardTitle>
            <TrendingUp className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpiData.beneficioNeto)}</div>
            {/* <p className="text-xs text-muted-foreground">+20.3% desde el mes pasado</p> */}
          </CardContent>
        </Card>
        <Card className="shadow-sm hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Margen de Beneficio</CardTitle>
            <Percent className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercent(kpiData.margenBeneficio)}</div>
            {/* <p className="text-xs text-muted-foreground">+1.5% pts desde el mes pasado</p> */}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-headline text-primary">Ingresos vs. Egresos Mensuales</CardTitle>
          <CardDescription>Comparativa de los últimos meses.</CardDescription>
        </CardHeader>
        <CardContent>
          {monthlyFinancialData.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyFinancialData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis 
                    dataKey="month" 
                    tickLine={false} 
                    axisLine={false} 
                    tickMargin={8}
                    fontSize={12}
                  />
                  <YAxis 
                    tickFormatter={(value) => formatCurrency(value as number).replace('COP', '').trim()} 
                    tickLine={false} 
                    axisLine={false} 
                    tickMargin={8}
                    fontSize={12}
                    width={80}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dot" />}
                    formatter={(value, name) => [`${formatCurrency(value as number)}`, name === 'ingresos' ? 'Ingresos' : 'Egresos']}
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="ingresos" fill="var(--color-ingresos)" radius={[4, 4, 0, 0]} barSize={30} />
                  <Bar dataKey="egresos" fill="var(--color-egresos)" radius={[4, 4, 0, 0]} barSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          ) : (
            <p className="text-muted-foreground text-center py-4">No hay datos mensuales para mostrar el gráfico.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
