
"use client";

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'; // Using recharts directly for more control or if shadcn chart component isn't suitable for complex cases. For simple cases, shadcn/ui/chart would be used.
import { DollarSign, TrendingUp, TrendingDown, Percent, LineChart as LineChartIcon } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import type { ChartConfig } from "@/components/ui/chart";

// Sample Data for KPIs - Replace with actual data fetching
const kpiData = {
  ingresosTotales: 125000000,
  egresosTotales: 78000000,
  beneficioNeto: 47000000,
  margenBeneficio: 37.6, // Percentage
};

// Sample Data for Chart - Replace with actual data fetching
const monthlyFinancialData = [
  { month: 'Ene', ingresos: 15000000, egresos: 9000000 },
  { month: 'Feb', ingresos: 18000000, egresos: 11000000 },
  { month: 'Mar', ingresos: 16500000, egresos: 10500000 },
  { month: 'Abr', ingresos: 20000000, egresos: 12000000 },
  { month: 'May', ingresos: 17500000, egresos: 9500000 },
  { month: 'Jun', ingresos: 22000000, egresos: 13000000 },
];

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
  return (
    <div className="space-y-6">
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center text-xl font-headline text-primary">
            <LineChartIcon className="mr-3 h-6 w-6" />
            Resumen Financiero General
          </CardTitle>
          <CardDescription>
            Una vista general de los indicadores clave y tendencias financieras. (Datos de ejemplo)
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Totales (Últ. Año)</CardTitle>
            <DollarSign className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpiData.ingresosTotales)}</div>
            <p className="text-xs text-muted-foreground">+15.2% desde el mes pasado</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Egresos Totales (Últ. Año)</CardTitle>
            <TrendingDown className="h-5 w-5 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpiData.egresosTotales)}</div>
            <p className="text-xs text-muted-foreground">+5.1% desde el mes pasado</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Beneficio Neto (Últ. Año)</CardTitle>
            <TrendingUp className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpiData.beneficioNeto)}</div>
            <p className="text-xs text-muted-foreground">+20.3% desde el mes pasado</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Margen de Beneficio</CardTitle>
            <Percent className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercent(kpiData.margenBeneficio)}</div>
            <p className="text-xs text-muted-foreground">+1.5% pts desde el mes pasado</p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-headline text-primary">Ingresos vs. Egresos Mensuales</CardTitle>
          <CardDescription>Comparativa de los últimos 6 meses (Datos de ejemplo)</CardDescription>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    </div>
  );
}
