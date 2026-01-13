'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  getRepairSteps,
  calculateRepairProgress,
  areAllStepsComplete,
  calculateEstimatedTime,
  calculateRemainingTime,
  type RepairStep,
  type IssueCategory,
} from '@/lib/utils/repair-guide';
import type { AuditIssue } from '@/lib/api/types';
import { X, Check, Clock, ListChecks, ExternalLink, Play, ArrowRight } from 'lucide-react';

/**
 * RepairWizard 元件屬性
 */
interface RepairWizardProps {
  /** 要修復的問題 */
  issue: AuditIssue;
  /** 完成修復的回調 */
  onComplete: (issueId: string) => void;
  /** 關閉彈窗的回調 */
  onClose: () => void;
}

/**
 * 步驟項目元件
 */
function StepItem({
  step,
  isCompleted,
  onToggle,
}: {
  step: RepairStep;
  isCompleted: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={cn(
        'flex items-start gap-4 p-4 rounded-lg border transition-all',
        isCompleted
          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
      )}
    >
      {/* 步驟編號與勾選框 */}
      <div className="flex-shrink-0">
        <label className="relative flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={isCompleted}
            onChange={onToggle}
            className="sr-only"
            aria-label={`完成步驟 ${step.order}: ${step.title}`}
          />
          <div
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all',
              isCompleted
                ? 'bg-green-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
            )}
          >
            {isCompleted ? <Check className="w-4 h-4" /> : step.order}
          </div>
        </label>
      </div>

      {/* 步驟內容 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h4
            className={cn(
              'font-medium',
              isCompleted
                ? 'text-green-700 dark:text-green-300 line-through'
                : 'text-gray-900 dark:text-white'
            )}
          >
            {step.title}
          </h4>
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {step.estimatedMinutes} 分鐘
          </span>
        </div>
        <p
          className={cn(
            'text-sm mt-1',
            isCompleted ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'
          )}
        >
          {step.description}
        </p>

        {/* 操作按鈕 */}
        {step.actionType && !isCompleted && (
          <div className="mt-2">
            {step.actionType === 'navigate' && (
              <button className="text-sm text-blue-600 dark:text-blue-400 flex items-center gap-1 hover:underline">
                <ExternalLink className="w-3 h-3" />
                前往設定
              </button>
            )}
            {step.actionType === 'execute' && (
              <button className="text-sm text-blue-600 dark:text-blue-400 flex items-center gap-1 hover:underline">
                <Play className="w-3 h-3" />
                一鍵執行
              </button>
            )}
          </div>
        )}
      </div>

      {/* 完成狀態指示 */}
      <div className="flex-shrink-0">
        {isCompleted && <Check className="w-5 h-5 text-green-500" />}
        {!isCompleted && <ArrowRight className="w-5 h-5 text-gray-300" />}
      </div>
    </div>
  );
}

/**
 * 修復進度條
 */
function ProgressBar({ progress }: { progress: number }) {
  return (
    <div className="relative">
      <div
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"
      >
        <div
          className={cn(
            'h-full transition-all duration-300',
            progress === 100 ? 'bg-green-500' : 'bg-blue-500'
          )}
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className="absolute right-0 -top-6 text-sm text-gray-500 dark:text-gray-400">
        {progress}%
      </span>
    </div>
  );
}

/**
 * 修復指南彈窗元件
 *
 * 提供步驟式修復指導，讓用戶可以逐步完成問題修復
 * H-006: Step-by-step repair guide
 */
export function RepairWizard({ issue, onComplete, onClose }: RepairWizardProps) {
  // 取得修復步驟
  const initialSteps = getRepairSteps(issue.issue_code, issue.category as IssueCategory);
  const [steps, setSteps] = useState<RepairStep[]>(initialSteps);

  // 計算進度
  const progress = calculateRepairProgress(steps);
  const allComplete = areAllStepsComplete(steps);
  const estimatedTime = calculateEstimatedTime(steps);
  const remainingTime = calculateRemainingTime(steps);

  // 切換步驟完成狀態
  const toggleStep = useCallback((stepId: string) => {
    setSteps((prev) =>
      prev.map((step) => (step.id === stepId ? { ...step, isCompleted: !step.isCompleted } : step))
    );
  }, []);

  // 處理完成
  const handleComplete = useCallback(() => {
    onComplete(issue.id);
  }, [issue.id, onComplete]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 max-w-2xl w-full max-h-[90vh] flex flex-col">
      {/* 標題區 */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
              <ListChecks className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                修復指南：{issue.title}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                依照以下步驟修復問題
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="關閉"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 進度與時間 */}
        <div className="mt-6">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-600 dark:text-gray-300">
              {steps.filter((s) => s.isCompleted).length} / {steps.length} 步驟完成
            </span>
            <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {allComplete ? '已完成！' : `預估剩餘 ${remainingTime} 分鐘`}
            </span>
          </div>
          <ProgressBar progress={progress} />
        </div>
      </div>

      {/* 步驟列表 */}
      <div className="flex-1 overflow-y-auto p-6 space-y-3">
        {steps.map((step) => (
          <StepItem
            key={step.id}
            step={step}
            isCompleted={step.isCompleted}
            onToggle={() => toggleStep(step.id)}
          />
        ))}
      </div>

      {/* 底部操作區 */}
      <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            總預估時間：{estimatedTime} 分鐘
          </span>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            關閉
          </button>
          {allComplete && (
            <button
              onClick={handleComplete}
              className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              完成並重新健檢
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
