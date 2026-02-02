import { Sidebar } from '@/components/nav/sidebar';
import { OnboardingTour } from '@/components/onboarding';
import { BalanceWarningProvider } from '@/components/billing';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 餘額警告橫幅 */}
        <BalanceWarningProvider />
        <main className="flex-1 overflow-auto">
          <div className="p-6">{children}</div>
        </main>
      </div>
      {/* 新手引導導覽 */}
      <OnboardingTour />
    </div>
  );
}
