"use client";

import { useState } from 'react';
import DocumentUploadForm from '@/components/summarizer/DocumentUploadForm';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { summarizeDocument } from '@/ai/flows/document-summarization';
import { ScrollArea } from "@/components/ui/scroll-area";
import { ThumbsUp, AlertTriangle, Lightbulb } from 'lucide-react';
import Image from 'next/image';

export default function SummarizePage() {
  const [summary, setSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSummarize = async (documentDataUri: string) => {
    setIsLoading(true);
    setSummary(null);
    setError(null);
    try {
      const result = await summarizeDocument({ documentDataUri });
      setSummary(result.summary);
    } catch (e: any) {
      console.error("Summarization failed:", e);
      setError(e.message || "No se pudo generar el resumen. Intente nuevamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-headline text-primary">Resumidor de Documentos con IA</CardTitle>
          <CardDescription>
            Sube un documento (PDF, TXT, DOC, DOCX) y obtén un resumen conciso generado por inteligencia artificial.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DocumentUploadForm onSummarize={handleSummarize} isLoading={isLoading} />
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive" className="shadow-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error en la Sumarización</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {summary && (
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center text-xl font-headline text-primary">
              <ThumbsUp className="mr-2 h-5 w-5 text-green-500" />
              Resumen Generado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px] w-full rounded-md border p-4 bg-muted/30">
              <p className="whitespace-pre-wrap text-foreground leading-relaxed">{summary}</p>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {!isLoading && !summary && !error && (
        <Card className="bg-gradient-to-br from-primary/5 via-background to-accent/5 shadow-md">
            <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row items-center gap-6">
                    <Image 
                        src="https://placehold.co/600x400.png"
                        alt="AI Document Processing"
                        width={200}
                        height={133}
                        className="rounded-lg shadow-sm"
                        data-ai-hint="AI document"
                    />
                    <div>
                        <h3 className="text-lg font-semibold text-primary mb-2 flex items-center">
                            <Lightbulb className="h-5 w-5 mr-2 text-yellow-400" />
                            ¿Cómo funciona?
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            Nuestra IA analiza el contenido de tu documento para extraer los puntos clave y generar un resumen coherente y útil. 
                            Es ideal para entender rápidamente documentos extensos.
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
      )}
    </div>
  );
}
