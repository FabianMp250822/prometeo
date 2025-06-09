"use client";

import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Download, FileText, FileSpreadsheet, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { useState } from 'react';

// Sample data - replace with actual data fetching logic
const sampleReportData = [
  { id: 1, caso: "Caso Alpha", cliente: "Cliente Corp", estado: "Activo", fecha: "2023-01-15" },
  { id: 2, caso: "Caso Beta", cliente: "Cliente Solutions", estado: "Cerrado", fecha: "2023-02-20" },
  { id: 3, caso: "Caso Gamma", cliente: "Cliente Inc.", estado: "Pendiente", fecha: "2023-03-10" },
  { id: 4, caso: "Caso Delta", cliente: "Cliente LLC", estado: "Activo", fecha: "2023-04-05" },
];

export default function ReportGeneratorButtons() {
  const { toast } = useToast();
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [isExcelLoading, setIsExcelLoading] = useState(false);

  const generatePdfReport = async () => {
    setIsPdfLoading(true);
    // Simulate data fetching
    await new Promise(resolve => setTimeout(resolve, 500));

    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text("Reporte General de Casos - Prometeo", 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Fecha de Generación: ${new Date().toLocaleDateString()}`, 14, 30);

    autoTable(doc, {
      startY: 35,
      head: [['ID', 'Caso', 'Cliente', 'Estado', 'Fecha Creación']],
      body: sampleReportData.map(item => [item.id, item.caso, item.cliente, item.estado, item.fecha]),
      theme: 'striped',
      headStyles: { fillColor: [63, 81, 181] }, // #3F51B5 (Primary color)
      styles: { font: "Inter", fontSize: 10 }, 
      didDrawPage: (data) => {
        // Footer
        const pageCount = doc.getNumberOfPages();
        doc.setFontSize(10);
        doc.text(`Página ${data.pageNumber} de ${pageCount}`, data.settings.margin.left, doc.internal.pageSize.height - 10);
      }
    });

    doc.save("reporte_casos_prometeo.pdf");
    toast({
      title: "Reporte PDF Generado",
      description: "El archivo PDF se ha descargado.",
    });
    setIsPdfLoading(false);
  };

  const generateExcelReport = async () => {
    setIsExcelLoading(true);
    // Simulate data fetching
    await new Promise(resolve => setTimeout(resolve, 500));

    const worksheet = XLSX.utils.json_to_sheet(sampleReportData.map(item => ({
      "ID": item.id,
      "Nombre del Caso": item.caso,
      "Cliente": item.cliente,
      "Estado Actual": item.estado,
      "Fecha de Creación": item.fecha,
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Casos");

    const columnWidths = [
        { wch: 5 }, 
        { wch: 25 }, 
        { wch: 25 }, 
        { wch: 15 }, 
        { wch: 20 }  
    ];
    worksheet["!cols"] = columnWidths;

    XLSX.writeFile(workbook, "reporte_casos_prometeo.xlsx");
    toast({
      title: "Reporte Excel Generado",
      description: "El archivo Excel se ha descargado.",
    });
    setIsExcelLoading(false);
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <Button onClick={generatePdfReport} disabled={isPdfLoading} className="w-full sm:w-auto">
        {isPdfLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <FileText className="mr-2 h-4 w-4" />
        )}
        Generar Reporte PDF
      </Button>
      <Button onClick={generateExcelReport} disabled={isExcelLoading} className="w-full sm:w-auto">
        {isExcelLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <FileSpreadsheet className="mr-2 h-4 w-4" />
        )}
        Generar Reporte Excel
      </Button>
    </div>
  );
}
