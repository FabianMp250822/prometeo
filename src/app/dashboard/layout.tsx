import DashboardLayoutComponent from '@/components/layout/DashboardLayoutComponent';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayoutComponent>{children}</DashboardLayoutComponent>;
}
