export const ROLES = {
  ADMINISTRADOR: 'Administrador',
  CONTADOR: 'Contador',
  ASISTENTE: 'Asistente',
  COLABORADOR: 'Colaborador',
  PENSIONADO: 'Pensionado',
} as const;

export type UserRole = typeof ROLES[keyof typeof ROLES];

export const ALL_ROLES: UserRole[] = Object.values(ROLES);
