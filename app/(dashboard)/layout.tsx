import { Sidebar } from '@/components/nav/sidebar';
import { OnboardingTour } from '@/components/onboarding';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-6">{children}</div>
      </main>
      {/* 新手引導導覽 */}
      <OnboardingTour />
    </div>
  );
}
