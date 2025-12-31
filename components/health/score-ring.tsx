'use client';

import { cn } from '@/lib/utils';
import type { AuditGrade } from '@/lib/api/types';

/**
 * ScoreRing 元件屬性
 */
interface ScoreRingProps {
  /** 分數 (0-100) */
  score: number;
  /** 等級 */
  grade: AuditGrade;
  /** 尺寸 (預設 160) */
  size?: number;
  /** 環的寬度 (預設 12) */
  strokeWidth?: number;
}

/**
 * 取得等級顏色
 */
function getGradeColor(grade: AuditGrade): { ring: string; text: string; bg: string } {
  switch (grade) {
    case 'excellent':
      return {
        ring: 'stroke-green-500',
        text: 'text-green-600 dark:text-green-400',
        bg: 'bg-green-100 dark:bg-green-900/30',
      };
    case 'good':
      return {
        ring: 'stroke-blue-500',
        text: 'text-blue-600 dark:text-blue-400',
        bg: 'bg-blue-100 dark:bg-blue-900/30',
      };
    case 'needs_improvement':
      return {
        ring: 'stroke-yellow-500',
        text: 'text-yellow-600 dark:text-yellow-400',
        bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      };
    case 'critical':
      return {
        ring: 'stroke-red-500',
        text: 'text-red-600 dark:text-red-400',
        bg: 'bg-red-100 dark:bg-red-900/30',
      };
  }
}

/**
 * 取得等級圖示和標籤
 */
function getGradeInfo(grade: AuditGrade): { icon: string; label: string } {
  switch (grade) {
    case 'excellent':
      return { icon: '🏆', label: '優秀' };
    case 'good':
      return { icon: '✅', label: '良好' };
    case 'needs_improvement':
      return { icon: '⚠️', label: '需改善' };
    case 'critical':
      return { icon: '🚨', label: '危險' };
  }
}

/**
 * 分數環形圖元件
 *
 * 以圓環方式顯示健康分數，中心顯示數字和等級
 */
export function ScoreRing({
  score,
  grade,
  size = 160,
  strokeWidth = 12,
}: ScoreRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const offset = circumference - progress;

  const colors = getGradeColor(grade);
  const gradeInfo = getGradeInfo(grade);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* 背景環 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className="stroke-gray-200 dark:stroke-gray-700"
          strokeWidth={strokeWidth}
        />
        {/* 進度環 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className={cn(colors.ring, 'transition-all duration-1000 ease-out')}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      {/* 中心內容 */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold text-gray-900 dark:text-white">
          {score}
        </span>
        <span className={cn('text-sm font-medium mt-1', colors.text)}>
          {gradeInfo.icon} {gradeInfo.label}
        </span>
      </div>
    </div>
  );
}
