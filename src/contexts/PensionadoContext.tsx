
"use client";

import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import type { Timestamp } from 'firebase/firestore';

// Definición de Interfaces (para evitar importaciones circulares o duplicados)
// Estas interfaces deben ser consistentes con las usadas en las páginas.

interface Pariss1Data {
  Comparte?: Timestamp;
  afilia?: string;
  cedula?: string;
  ciudad_iss?: string;
  dir_iss?: string;
  fe_adquiere?: Timestamp;
  fe_causa?: Timestamp;
  fe_ingreso?: Timestamp;
  fe_nacido?: Timestamp;
  fe_vinculado?: Timestamp;
  identifica?: number;
  mesada?: number;
  pension_ini?: number;
  regimen?: number;
  res_ano?: number;
  res_nro?: string;
  riesgo?: string;
  seguro?: number;
  semanas?: number;
  sexo?: number;
  telefono_iss?: number;
  tranci?: boolean;
}

export interface Pensionado extends Pariss1Data {
  id: string;
  ano_jubilacion?: string;
  basico?: string;
  cargo?: string;
  documento?: string;
  dtgLiquidacion?: string;
  empleado?: string;
  empresa?: string;
  esquema?: string;
  fecha?: string;
  fondoSalud?: string;
  grado?: string;
  mensaje?: string;
  neto?: string;
  nitEmpresa?: string;
  pnlCentroCosto?: string;
  pnlDependencia?: string;
  pnlMensaje?: string;
  pnlNivContratacion?: string;
}

export interface PagoDetalle {
  codigo: string | null;
  egresos: number;
  ingresos: number;
  nombre: string;
}

export interface Pago {
  id: string;
  año?: string;
  basico?: string;
  detalles?: PagoDetalle[];
  fechaLiquidacion?: string | Timestamp;
  fechaProcesado?: Timestamp;
  grado?: string;
  periodoPago?: string;
  procesado?: boolean;
  valorLiquidado?: string;
  valorNeto?: string;
}
// Fin Definición de Interfaces

interface PensionadoContextType {
  contextPensionado: Pensionado | null;
  contextPagos: Pago[] | null;
  setContextPensionadoData: (pensionado: Pensionado | null, pagos: Pago[] | null) => void;
  clearContextPensionadoData: () => void;
  isContextLoading: boolean;
  setContextIsLoading: (loading: boolean) => void;
}

const PensionadoContext = createContext<PensionadoContextType | undefined>(undefined);

export const PensionadoProvider = ({ children }: { children: ReactNode }) => {
  const [contextPensionado, setContextPensionadoState] = useState<Pensionado | null>(null);
  const [contextPagos, setContextPagosState] = useState<Pago[] | null>(null);
  const [isContextLoading, setContextIsLoadingState] = useState<boolean>(false);

  const setContextPensionadoData = useCallback((pensionado: Pensionado | null, pagos: Pago[] | null) => {
    console.log("PensionadoContext: Setting data - Pensionado ID:", pensionado?.id, "Pagos count:", pagos?.length);
    setContextPensionadoState(pensionado);
    setContextPagosState(pagos);
  }, []);

  const clearContextPensionadoData = useCallback(() => {
    console.log("PensionadoContext: Clearing data");
    setContextPensionadoState(null);
    setContextPagosState(null);
  }, []);

  const setContextIsLoading = useCallback((loading: boolean) => {
    console.log("PensionadoContext: Setting loading state to:", loading);
    setContextIsLoadingState(loading);
  }, []);

  return (
    <PensionadoContext.Provider value={{ 
        contextPensionado, 
        contextPagos, 
        setContextPensionadoData, 
        clearContextPensionadoData,
        isContextLoading,
        setContextIsLoading
    }}>
      {children}
    </PensionadoContext.Provider>
  );
};

export const usePensionadoContext = (): PensionadoContextType => {
  const context = useContext(PensionadoContext);
  if (context === undefined) {
    throw new Error('usePensionadoContext must be used within a PensionadoProvider');
  }
  return context;
};
