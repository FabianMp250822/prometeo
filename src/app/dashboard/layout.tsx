
import DashboardLayoutComponent from '@/components/layout/DashboardLayoutComponent';
import { PensionadoProvider } from '@/contexts/PensionadoContext';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PensionadoProvider>
      <DashboardLayoutComponent>{children}</DashboardLayoutComponent>
    </PensionadoProvider>
  );
}
