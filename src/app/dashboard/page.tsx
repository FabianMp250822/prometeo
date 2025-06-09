import WelcomeMessage from '@/components/dashboard/WelcomeMessage';
import RoleSpecificContent from '@/components/dashboard/RoleSpecificContent';

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <WelcomeMessage />
      <RoleSpecificContent />
    </div>
  );
}
