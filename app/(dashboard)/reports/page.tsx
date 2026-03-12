'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { FileText, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchWithAuth } from '@/lib/api/fetch-with-auth';

interface Report {
  id: string;
  type: 'daily' | 'weekly' | 'monthly';
  periodStart: string;
  periodEnd: string;
  summary: {
    spend: number;
    conversions: number;
    roas: number;
  };
  createdAt: string;
}

const mockReports: Report[] = [
  {
    id: '1',
    type: 'weekly',
    periodStart: '2026-01-13',
    periodEnd: '2026-01-19',
    summary: { spend: 28500, conversions: 52, roas: 3.6 },
    createdAt: '2026-01-20',
  },
  {
    id: '2',
    type: 'weekly',
    periodStart: '2026-01-06',
    periodEnd: '2026-01-12',
    summary: { spend: 31200, conversions: 61, roas: 4.1 },
    createdAt: '2026-01-13',
  },
  {
    id: '3',
    type: 'monthly',
    periodStart: '2025-12-01',
    periodEnd: '2025-12-31',
    summary: { spend: 125000, conversions: 245, roas: 3.8 },
    createdAt: '2026-01-01',
  },
];

const typeColors = {
  daily: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  weekly: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  monthly: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

export default function ReportsPage() {
  const t = useTranslations('reports');
  const tc = useTranslations('common');
  const [reports, setReports] = useState<Report[]>(mockReports);
  const [filter, setFilter] = useState<'all' | 'weekly' | 'monthly'>('all');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [isUsingMockData, setIsUsingMockData] = useState(false);

  const typeLabels = {
    daily: t('daily'),
    weekly: t('weekly'),
    monthly: t('monthly'),
  };

  // 從 API 載入報告，失敗時使用 mock data
  useEffect(() => {
    async function fetchReports() {
      try {
        const res = await fetchWithAuth('/api/v1/reports');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setReports(data);
          } else {
            setIsUsingMockData(true);
          }
        } else {
          setIsUsingMockData(true);
        }
      } catch (err) {
        console.error('Failed to fetch reports:', err);
        setIsUsingMockData(true);
      }
    }

    fetchReports();
  }, []);

  const filteredReports = reports.filter(
    (report) => filter === 'all' || report.type === filter
  );

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const formatPeriod = (report: Report) => {
    if (report.type === 'daily') {
      return formatDate(report.periodStart);
    }
    return `${formatDate(report.periodStart)} - ${formatDate(report.periodEnd)}`;
  };

  return (
    <div className="space-y-6">
      {/* 頁面標題 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          📊 {t('title')}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          {t('subtitle')}
        </p>
      </div>

      {/* 使用展示資料提示 */}
      {isUsingMockData && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-2 text-sm text-amber-700 dark:text-amber-300">
          {tc('mockReportsNotice')}
        </div>
      )}

      {/* 篩選器 */}
      <div className="flex gap-2">
        {[
          { value: 'all', label: t('all') },
          { value: 'weekly', label: t('weekly') },
          { value: 'monthly', label: t('monthly') },
        ].map((option) => (
          <Button
            key={option.value}
            variant={filter === option.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(option.value as typeof filter)}
          >
            {option.label}
          </Button>
        ))}
      </div>

      {/* 報告列表 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {filteredReports.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">
              {t('noReports')}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredReports.map((report) => (
              <div
                key={report.id}
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                onClick={() => setSelectedReport(report)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        typeColors[report.type]
                      }`}
                    >
                      {typeLabels[report.type]}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {formatPeriod(report)}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {t('spendLabel', { amount: report.summary.spend.toLocaleString() })} ・
                        {t('ordersLabel', { count: report.summary.conversions })} ・
                        {t('roasLabel', { value: report.summary.roas.toFixed(1) })}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 報告詳情 Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      typeColors[selectedReport.type]
                    }`}
                  >
                    {typeLabels[selectedReport.type]}
                  </span>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {formatPeriod(selectedReport)}
                  </h2>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedReport(null)}
                >
                  {tc('close')}
                </Button>
              </div>

              {/* 報告內容 */}
              <div className="space-y-6">
                {/* 摘要 */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t('spendEmoji')}
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      ${selectedReport.summary.spend.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t('ordersEmoji')}
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {t('ordersUnit', { count: selectedReport.summary.conversions })}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t('roasEmoji')}
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {t('roasUnit', { value: selectedReport.summary.roas.toFixed(1) })}
                    </p>
                  </div>
                </div>

                {/* 白話報告 */}
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-gray-900 dark:text-white leading-relaxed">
                    {selectedReport.type === 'weekly'
                      ? t('weeklyNarrative', { spend: selectedReport.summary.spend.toLocaleString(), conversions: selectedReport.summary.conversions })
                      : t('monthlyNarrative', { spend: selectedReport.summary.spend.toLocaleString(), conversions: selectedReport.summary.conversions })} 📦
                    <br />
                    <br />
                    {t('costPerOrder', { cost: Math.round(selectedReport.summary.spend / selectedReport.summary.conversions).toLocaleString() })}
                    ，{t('performanceRoas', { value: selectedReport.summary.roas.toFixed(1), performance: selectedReport.summary.roas >= 3 ? t('performanceGood') : t('performanceOk') })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
