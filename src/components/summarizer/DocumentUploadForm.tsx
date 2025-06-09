"use client";

import { useState, ChangeEvent, FormEvent } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, FileUp, Sparkles } from 'lucide-react';

// Define Zod schema for form validation
const formSchema = z.object({
  document: z.instanceof(FileList)
    .refine(files => files?.length > 0, "Se requiere un archivo.")
    .refine(files => files?.[0]?.size <= 5 * 1024 * 1024, "El archivo no debe exceder 5MB.") // Max 5MB
    .refine(
      files => ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(files?.[0]?.type),
      "Formato de archivo no soportado. Sube PDF, TXT, DOC o DOCX."
    ),
});

type FormValues = z.infer<typeof formSchema>;

interface DocumentUploadFormProps {
  onSummarize: (documentDataUri: string) => Promise<void>;
  isLoading: boolean;
}

export default function DocumentUploadForm({ onSummarize, isLoading }: DocumentUploadFormProps) {
  const [fileName, setFileName] = useState<string | null>(null);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFileName(file.name);
    } else {
      setFileName(null);
    }
  };

  const processSubmit: SubmitHandler<FormValues> = async (data) => {
    const file = data.document[0];
    if (!file) return;

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const base64File = reader.result as string;
      try {
        await onSummarize(base64File);
        // Do not reset form here, summary might be displayed alongside
      } catch (error) {
        console.error("Summarization error:", error);
        toast({
          title: "Error al resumir",
          description: "Ocurrió un problema al procesar el documento.",
          variant: "destructive",
        });
      }
    };
    reader.onerror = (error) => {
      console.error("Error reading file:", error);
      toast({
        title: "Error de Archivo",
        description: "No se pudo leer el archivo seleccionado.",
        variant: "destructive",
      });
    };
  };

  return (
    <form onSubmit={handleSubmit(processSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="document-upload" className="text-base">Subir Documento</Label>
        <div className="flex items-center space-x-2">
          <Input
            id="document-upload"
            type="file"
            {...register('document')}
            onChange={handleFileChange}
            className="hidden"
            accept=".pdf,.txt,.doc,.docx"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => document.getElementById('document-upload')?.click()}
            className="flex-grow sm:flex-grow-0"
            disabled={isLoading}
          >
            <FileUp className="mr-2 h-4 w-4" />
            Seleccionar Archivo
          </Button>
          {fileName && <span className="text-sm text-muted-foreground truncate max-w-[200px]">{fileName}</span>}
        </div>
        {errors.document && (
          <p className="text-sm text-destructive">
            {(errors.document as any).message || "Error con el archivo."}
          </p>
        )}
        <p className="text-xs text-muted-foreground">Soporta PDF, TXT, DOC, DOCX. Máximo 5MB.</p>
      </div>

      <Button type="submit" className="w-full sm:w-auto" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Resumiendo...
          </>
        ) : (
          <>
            <Sparkles className="mr-2 h-4 w-4" />
            Resumir Documento
          </>
        )}
      </Button>
    </form>
  );
}
