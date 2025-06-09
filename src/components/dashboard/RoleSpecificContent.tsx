"use client";

import { useAuth } from '@/hooks/useAuth';
import { ROLES } from '@/config/roles';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { FileText, BarChart3, Users, FolderKanban, ShieldCheck } from 'lucide-react';
import Image from 'next/image';

const QuickActionCard = ({ title, description, href, icon: Icon }: { title: string, description: string, href: string, icon: React.ElementType }) => (
  <Card className="hover:shadow-lg transition-shadow duration-200">
    <CardHeader>
      <CardTitle className="flex items-center text-xl font-headline">
        <Icon className="mr-3 h-6 w-6 text-primary" />
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-muted-foreground mb-4 text-sm">{description}</p>
      <Button asChild variant="outline" className="w-full sm:w-auto">
        <Link href={href}>Acceder</Link>
      </Button>
    </CardContent>
  </Card>
);

export default function RoleSpecificContent() {
  const { userProfile } = useAuth();

  if (!userProfile) {
    return <p>Cargando información del usuario...</p>;
  }

  let roleSpecificMessage = <p>Contenido general del dashboard.</p>;
  const quickActions = [];

  switch (userProfile.role) {
    case ROLES.ADMINISTRADOR:
      roleSpecificMessage = (
        <p className="text-lg">Tienes acceso completo a todas las funcionalidades del sistema. Gestiona usuarios, configuraciones y supervisa toda la actividad.</p>
      );
      quickActions.push(
        { title: "Gestión de Usuarios", description: "Administra roles y accesos de usuarios.", href: "/dashboard/admin/users", icon: Users },
        { title: "Configuración General", description: "Ajusta parámetros del sistema.", href: "/dashboard/admin/settings", icon: ShieldCheck }
      );
      break;
    case ROLES.CONTADOR:
      roleSpecificMessage = (
        <p className="text-lg">Accede a los módulos financieros, genera reportes y gestiona la contabilidad del consorcio.</p>
      );
      quickActions.push(
        { title: "Ver Reportes Financieros", description: "Analiza el estado financiero.", href: "/dashboard/reports", icon: BarChart3 },
        { title: "Gestión Contable", description: "Administra cuentas y transacciones.", href: "/dashboard/accounting", icon: FileText }
      );
      break;
    case ROLES.ASISTENTE:
      roleSpecificMessage = (
        <p className="text-lg">Gestiona casos, documentos importantes y la agenda del consorcio.</p>
      );
      quickActions.push(
        { title: "Administrar Casos", description: "Consulta y actualiza información de casos.", href: "/dashboard/cases", icon: FolderKanban },
        { title: "Resumir Documentos", description: "Utiliza la IA para resumir textos.", href: "/dashboard/summarize", icon: FileText }
      );
      break;
    case ROLES.COLABORADOR:
      roleSpecificMessage = (
        <p className="text-lg">Consulta los casos en los que participas y accede a la documentación relevante.</p>
      );
      quickActions.push(
        { title: "Mis Casos Asignados", description: "Revisa los casos en los que colaboras.", href: "/dashboard/my-cases", icon: FolderKanban }
      );
      break;
    case ROLES.PENSIONADO:
      roleSpecificMessage = (
        <p className="text-lg">Consulta la información actualizada sobre tu caso y documentos asociados.</p>
      );
      quickActions.push(
        { title: "Ver Mi Caso", description: "Accede a los detalles de tu caso.", href: "/dashboard/my-pension-case", icon: FileText }
      );
      break;
    default:
      roleSpecificMessage = <p>Bienvenido al dashboard. Tu rol no tiene contenido específico configurado.</p>;
  }

  return (
    <div className="space-y-8">
      <Card className="bg-card">
        <CardHeader>
          <CardTitle className="text-2xl font-headline text-primary">Panel de {userProfile.role}</CardTitle>
        </CardHeader>
        <CardContent>
          {roleSpecificMessage}
        </CardContent>
      </Card>

      {quickActions.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold font-headline mb-4 text-foreground">Accesos Rápidos</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quickActions.map(action => <QuickActionCard key={action.href} {...action} />)}
          </div>
        </div>
      )}

      {!quickActions.length && userProfile.role === ROLES.PENSIONADO && (
         <Card className="mt-8">
            <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row items-center gap-6">
                    <Image src="https://placehold.co/600x400.png" alt="Información Pensionados" width={250} height={160} className="rounded-lg shadow-md" data-ai-hint="legal documents" />
                    <div>
                        <h3 className="text-xl font-semibold text-primary mb-2">Mantente Informado</h3>
                        <p className="text-muted-foreground mb-4">
                            Aquí podrás encontrar toda la información relevante sobre el estado de tu caso, próximos pasos y documentos importantes.
                            Nuestro equipo trabaja para mantenerte al día.
                        </p>
                        <Button asChild>
                            <Link href="/dashboard/my-pension-case/details">Ver detalles de mi caso</Link>
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
      )}
    </div>
  );
}
