/**
 * 受眾重疊分析工具函數
 *
 * A-004: Overlap Analysis
 * - 計算受眾間重疊率
 * - 產生重疊矩陣
 * - 提供優化建議
 */

/**
 * 重疊狀態類型
 * - low: 重疊率 < 20%，無需處理
 * - moderate: 重疊率 20-30%，需監控
 * - high: 重疊率 >= 30%，需處理
 */
export type OverlapStatus = 'low' | 'moderate' | 'high';

/**
 * 受眾基本資訊（用於重疊計算）
 */
export interface AudienceBase {
  id: string;
  name: string;
  size: number;
}

/**
 * 受眾重疊配對資訊
 */
export interface AudienceOverlapPair {
  audience1: AudienceBase;
  audience2: AudienceBase;
  overlapCount: number;
  overlapPercentage: number;
  status: OverlapStatus;
}

/**
 * 重疊優化建議
 */
export interface OverlapSuggestion {
  action: 'none' | 'monitor' | 'exclude' | 'merge';
  priority: 'low' | 'medium' | 'high' | 'critical';
  message: string;
}

/**
 * 計算兩個受眾間的重疊百分比
 *
 * 重疊率 = 重疊人數 / 較小受眾規模 * 100
 * 使用較小受眾作為基準，因為這更能反映實際競爭情況
 *
 * @param size1 - 第一個受眾規模
 * @param size2 - 第二個受眾規模
 * @param overlapCount - 重疊人數
 * @returns 重疊百分比 (0-100)，精確到小數點一位
 */
export function calculateOverlapPercentage(
  size1: number,
  size2: number,
  overlapCount: number
): number {
  // 取較小受眾作為基準
  const minSize = Math.min(size1, size2);

  // 避免除以零
  if (minSize === 0) {
    return 0;
  }

  // 計算百分比，上限 100%
  const percentage = Math.min((overlapCount / minSize) * 100, 100);

  // 四捨五入到小數點一位
  return Math.round(percentage * 10) / 10;
}

/**
 * 根據重疊百分比判斷狀態
 *
 * - low: < 20% - 正常，無需處理
 * - moderate: 20-30% - 需監控，可能影響效能
 * - high: >= 30% - 警示，應考慮排除或合併
 *
 * @param percentage - 重疊百分比
 * @returns 重疊狀態
 */
export function getOverlapStatus(percentage: number): OverlapStatus {
  if (percentage < 20) {
    return 'low';
  } else if (percentage < 30) {
    return 'moderate';
  } else {
    return 'high';
  }
}

/**
 * 產生受眾重疊矩陣
 *
 * 矩陣中的值代表兩個受眾間的重疊百分比
 * 對角線上的值為 100%（自己與自己完全重疊）
 * 矩陣是對稱的
 *
 * @param audiences - 受眾列表
 * @param overlapData - 重疊數據，key 格式為 "id1-id2"
 * @returns 二維矩陣，matrix[i][j] 表示受眾 i 與受眾 j 的重疊百分比
 */
export function generateOverlapMatrix(
  audiences: AudienceBase[],
  overlapData: Record<string, number>
): number[][] {
  const n = audiences.length;

  // 空陣列處理
  if (n === 0) {
    return [];
  }

  // 初始化矩陣
  const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));

  // 填充矩陣
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) {
        // 對角線：自己與自己 100%
        matrix[i][j] = 100;
      } else {
        // 從 overlapData 中取得重疊人數
        const key = `${audiences[i].id}-${audiences[j].id}`;
        const overlapCount = overlapData[key] || 0;

        // 計算重疊百分比
        matrix[i][j] = calculateOverlapPercentage(
          audiences[i].size,
          audiences[j].size,
          overlapCount
        );
      }
    }
  }

  return matrix;
}

/**
 * 根據重疊百分比提供優化建議
 *
 * - < 20%: 無需處理
 * - 20-30%: 監控，觀察效能變化
 * - 30-70%: 建議排除，避免競爭
 * - > 70%: 建議合併，重疊太高不如合為一個受眾
 *
 * @param percentage - 重疊百分比
 * @returns 優化建議
 */
export function getOverlapSuggestion(percentage: number): OverlapSuggestion {
  if (percentage < 20) {
    return {
      action: 'none',
      priority: 'low',
      message: '重疊率正常，無需特別處理',
    };
  } else if (percentage < 30) {
    return {
      action: 'monitor',
      priority: 'medium',
      message: '建議監控這兩個受眾的效能表現，若 CPA 上升可考慮調整',
    };
  } else if (percentage < 70) {
    return {
      action: 'exclude',
      priority: 'high',
      message: '重疊率偏高，建議在其中一個受眾中排除另一個，避免自我競爭',
    };
  } else {
    return {
      action: 'merge',
      priority: 'critical',
      message: '重疊率極高，建議將這兩個受眾合併為一個，以簡化管理並避免預算浪費',
    };
  }
}

/**
 * 將重疊配對按風險程度排序（高到低）
 *
 * @param pairs - 重疊配對列表
 * @returns 排序後的配對列表（不修改原陣列）
 */
export function sortOverlapPairsByRisk(
  pairs: AudienceOverlapPair[]
): AudienceOverlapPair[] {
  return [...pairs].sort((a, b) => b.overlapPercentage - a.overlapPercentage);
}
