'use client';

import { useState } from 'react';
import { FileText, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

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

const typeLabels = {
  daily: '每日摘要',
  weekly: '週報',
  monthly: '月報',
};

const typeColors = {
  daily: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  weekly: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  monthly: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

export default function ReportsPage() {
  const [filter, setFilter] = useState<'all' | 'weekly' | 'monthly'>('all');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  const filteredReports = mockReports.filter(
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
          📊 報告
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          查看週報和月報，了解廣告表現
        </p>
      </div>

      {/* 篩選器 */}
      <div className="flex gap-2">
        {[
          { value: 'all', label: '全部' },
          { value: 'weekly', label: '週報' },
          { value: 'monthly', label: '月報' },
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
              尚無報告
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
                        花費 ${report.summary.spend.toLocaleString()} ・
                        訂單 {report.summary.conversions} 筆 ・
                        投報率 {report.summary.roas.toFixed(1)} 倍
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
                  關閉
                </Button>
              </div>

              {/* 報告內容 */}
              <div className="space-y-6">
                {/* 摘要 */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      💰 花費
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      ${selectedReport.summary.spend.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      📦 訂單
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {selectedReport.summary.conversions} 筆
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      📈 投報率
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {selectedReport.summary.roas.toFixed(1)} 倍
                    </p>
                  </div>
                </div>

                {/* 白話報告 */}
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-gray-900 dark:text-white leading-relaxed">
                    這{selectedReport.type === 'weekly' ? '週' : '個月'}花了 $
                    {selectedReport.summary.spend.toLocaleString()}，帶來{' '}
                    {selectedReport.summary.conversions} 筆訂單 📦
                    <br />
                    <br />
                    每筆訂單成本 $
                    {Math.round(
                      selectedReport.summary.spend /
                        selectedReport.summary.conversions
                    ).toLocaleString()}
                    ，投報率 {selectedReport.summary.roas.toFixed(1)} 倍，表現
                    {selectedReport.summary.roas >= 3 ? '不錯' : '還可以'}！
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
