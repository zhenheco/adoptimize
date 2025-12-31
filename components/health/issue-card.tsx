'use client';

import { cn } from '@/lib/utils';
import { AlertCircle, AlertTriangle, Info, CheckCircle, EyeOff, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import type { AuditIssue } from '@/lib/api/types';

/**
 * IssueCard 元件屬性
 */
interface IssueCardProps {
  /** 問題資訊 */
  issue: AuditIssue;
  /** 標記為已解決 */
  onResolve?: (issueId: string) => void;
  /** 忽略問題 */
  onIgnore?: (issueId: string) => void;
}

/**
 * 取得嚴重度樣式
 */
function getSeverityStyles(severity: AuditIssue['severity']) {
  switch (severity) {
    case 'CRITICAL':
      return {
        badge: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
        border: 'border-l-red-500',
        icon: <AlertCircle className="w-5 h-5 text-red-500" />,
        label: '嚴重',
      };
    case 'HIGH':
      return {
        badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300',
        border: 'border-l-orange-500',
        icon: <AlertTriangle className="w-5 h-5 text-orange-500" />,
        label: '高',
      };
    case 'MEDIUM':
      return {
        badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
        border: 'border-l-yellow-500',
        icon: <AlertTriangle className="w-5 h-5 text-yellow-500" />,
        label: '中',
      };
    case 'LOW':
      return {
        badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
        border: 'border-l-blue-500',
        icon: <Info className="w-5 h-5 text-blue-500" />,
        label: '低',
      };
  }
}

/**
 * 取得類別標籤
 */
function getCategoryLabel(category: AuditIssue['category']) {
  switch (category) {
    case 'STRUCTURE':
      return '帳戶結構';
    case 'CREATIVE':
      return '素材品質';
    case 'AUDIENCE':
      return '受眾設定';
    case 'BUDGET':
      return '預算配置';
    case 'TRACKING':
      return '追蹤設定';
  }
}

/**
 * 問題卡片元件
 *
 * 顯示單一健檢問題的詳細資訊，包含嚴重度、描述、影響和解決方案
 */
export function IssueCard({ issue, onResolve, onIgnore }: IssueCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const severityStyles = getSeverityStyles(issue.severity);
  const isResolved = issue.status === 'resolved';
  const isIgnored = issue.status === 'ignored';

  return (
    <div
      className={cn(
        'bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden transition-all',
        'border-l-4',
        severityStyles.border,
        (isResolved || isIgnored) && 'opacity-60'
      )}
    >
      {/* 標題列 */}
      <div
        className="flex items-start justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start gap-3 flex-1">
          {severityStyles.icon}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className={cn(
                'font-medium text-gray-900 dark:text-white',
                (isResolved || isIgnored) && 'line-through'
              )}>
                {issue.title}
              </h3>
              <span className={cn('text-xs px-2 py-0.5 rounded-full', severityStyles.badge)}>
                {severityStyles.label}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                {getCategoryLabel(issue.category)}
              </span>
              {isResolved && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-300">
                  已解決
                </span>
              )}
              {isIgnored && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                  已忽略
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
              {issue.description}
            </p>
          </div>
        </div>
        <button className="ml-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
          {isExpanded ? (
            <ChevronUp className="w-5 h-5" />
          ) : (
            <ChevronDown className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* 展開內容 */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700 pt-4 space-y-4">
          {/* 問題描述 */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              問題描述
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {issue.description}
            </p>
          </div>

          {/* 影響評估 */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              影響評估
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {issue.impact_description}
            </p>
          </div>

          {/* 解決方案 */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
            <h4 className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">
              💡 建議解決方案
            </h4>
            <p className="text-sm text-blue-600 dark:text-blue-400">
              {issue.solution}
            </p>
          </div>

          {/* 受影響實體 */}
          {issue.affected_entities.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                受影響項目
              </h4>
              <div className="flex flex-wrap gap-1">
                {issue.affected_entities.map((entity) => (
                  <span
                    key={entity}
                    className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded"
                  >
                    {entity}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 操作按鈕 */}
          {issue.status === 'open' && (
            <div className="flex gap-2 pt-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onResolve?.(issue.id);
                }}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
              >
                <CheckCircle className="w-4 h-4" />
                標記已解決
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onIgnore?.(issue.id);
                }}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                <EyeOff className="w-4 h-4" />
                忽略
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
