/**
 * 受眾重疊分析測試
 *
 * A-004: Overlap Analysis
 * AC1: 顯示受眾重疊矩陣圖
 * AC2: 重疊率 > 30% 標記為警示
 * AC3: 點擊查看詳細重疊數據
 */
import { describe, it, expect } from 'vitest';
import {
  calculateOverlapPercentage,
  getOverlapStatus,
  generateOverlapMatrix,
  getOverlapSuggestion,
  sortOverlapPairsByRisk,
  type AudienceOverlapPair,
  type OverlapStatus,
} from '../utils/audience-overlap';

describe('calculateOverlapPercentage', () => {
  it('should return 0 when there is no overlap', () => {
    const result = calculateOverlapPercentage(1000, 1000, 0);
    expect(result).toBe(0);
  });

  it('should return 100 when audiences are identical', () => {
    const result = calculateOverlapPercentage(1000, 1000, 1000);
    expect(result).toBe(100);
  });

  it('should calculate correct percentage for partial overlap', () => {
    // 較小受眾的 50% 與較大受眾重疊
    const result = calculateOverlapPercentage(1000, 500, 250);
    expect(result).toBe(50);
  });

  it('should use smaller audience as base for percentage', () => {
    // 500 是較小受眾，250 重疊 = 50%
    const result = calculateOverlapPercentage(2000, 500, 250);
    expect(result).toBe(50);
  });

  it('should handle when first audience is smaller', () => {
    const result = calculateOverlapPercentage(500, 2000, 250);
    expect(result).toBe(50);
  });

  it('should cap at 100% even if overlap exceeds smaller audience', () => {
    // 邊界情況：重疊數超過較小受眾（不應該發生，但要處理）
    const result = calculateOverlapPercentage(1000, 500, 600);
    expect(result).toBe(100);
  });

  it('should return 0 when smaller audience size is 0', () => {
    const result = calculateOverlapPercentage(0, 1000, 0);
    expect(result).toBe(0);
  });

  it('should round to one decimal place', () => {
    // 333 / 1000 = 33.3%
    const result = calculateOverlapPercentage(1000, 1000, 333);
    expect(result).toBe(33.3);
  });
});

describe('getOverlapStatus', () => {
  it('should return "low" for overlap < 20%', () => {
    expect(getOverlapStatus(0)).toBe('low');
    expect(getOverlapStatus(10)).toBe('low');
    expect(getOverlapStatus(19.9)).toBe('low');
  });

  it('should return "moderate" for overlap 20-30%', () => {
    expect(getOverlapStatus(20)).toBe('moderate');
    expect(getOverlapStatus(25)).toBe('moderate');
    expect(getOverlapStatus(29.9)).toBe('moderate');
  });

  it('should return "high" for overlap >= 30%', () => {
    expect(getOverlapStatus(30)).toBe('high');
    expect(getOverlapStatus(50)).toBe('high');
    expect(getOverlapStatus(100)).toBe('high');
  });
});

describe('generateOverlapMatrix', () => {
  const mockAudiences = [
    { id: 'a1', name: 'Audience 1', size: 1000 },
    { id: 'a2', name: 'Audience 2', size: 800 },
    { id: 'a3', name: 'Audience 3', size: 500 },
  ];

  // 模擬重疊數據：(a1, a2) = 400, (a1, a3) = 200, (a2, a3) = 100
  const mockOverlapData: Record<string, number> = {
    'a1-a2': 400,
    'a2-a1': 400,
    'a1-a3': 200,
    'a3-a1': 200,
    'a2-a3': 100,
    'a3-a2': 100,
  };

  it('should generate matrix with correct dimensions', () => {
    const matrix = generateOverlapMatrix(mockAudiences, mockOverlapData);
    expect(matrix).toHaveLength(3);
    expect(matrix[0]).toHaveLength(3);
  });

  it('should have 100% on diagonal (self-overlap)', () => {
    const matrix = generateOverlapMatrix(mockAudiences, mockOverlapData);
    expect(matrix[0][0]).toBe(100);
    expect(matrix[1][1]).toBe(100);
    expect(matrix[2][2]).toBe(100);
  });

  it('should calculate correct overlap percentages', () => {
    const matrix = generateOverlapMatrix(mockAudiences, mockOverlapData);
    // a1 (1000) vs a2 (800): 400 overlap, 400/800 = 50%
    expect(matrix[0][1]).toBe(50);
    expect(matrix[1][0]).toBe(50);
    // a1 (1000) vs a3 (500): 200 overlap, 200/500 = 40%
    expect(matrix[0][2]).toBe(40);
    expect(matrix[2][0]).toBe(40);
    // a2 (800) vs a3 (500): 100 overlap, 100/500 = 20%
    expect(matrix[1][2]).toBe(20);
    expect(matrix[2][1]).toBe(20);
  });

  it('should return 0 for pairs without overlap data', () => {
    const matrix = generateOverlapMatrix(mockAudiences, {});
    expect(matrix[0][1]).toBe(0);
    expect(matrix[1][2]).toBe(0);
  });

  it('should handle empty audiences array', () => {
    const matrix = generateOverlapMatrix([], {});
    expect(matrix).toHaveLength(0);
  });

  it('should handle single audience', () => {
    const matrix = generateOverlapMatrix([mockAudiences[0]], {});
    expect(matrix).toHaveLength(1);
    expect(matrix[0]).toHaveLength(1);
    expect(matrix[0][0]).toBe(100);
  });
});

describe('getOverlapSuggestion', () => {
  it('should suggest no action for low overlap', () => {
    const suggestion = getOverlapSuggestion(15);
    expect(suggestion.action).toBe('none');
    expect(suggestion.priority).toBe('low');
  });

  it('should suggest monitoring for moderate overlap', () => {
    const suggestion = getOverlapSuggestion(25);
    expect(suggestion.action).toBe('monitor');
    expect(suggestion.priority).toBe('medium');
    expect(suggestion.message).toContain('監控');
  });

  it('should suggest exclusion for high overlap', () => {
    const suggestion = getOverlapSuggestion(40);
    expect(suggestion.action).toBe('exclude');
    expect(suggestion.priority).toBe('high');
    expect(suggestion.message).toContain('排除');
  });

  it('should suggest merge for very high overlap', () => {
    const suggestion = getOverlapSuggestion(75);
    expect(suggestion.action).toBe('merge');
    expect(suggestion.priority).toBe('critical');
    expect(suggestion.message).toContain('合併');
  });
});

describe('sortOverlapPairsByRisk', () => {
  const mockPairs: AudienceOverlapPair[] = [
    {
      audience1: { id: 'a1', name: 'Audience 1', size: 1000 },
      audience2: { id: 'a2', name: 'Audience 2', size: 800 },
      overlapCount: 200,
      overlapPercentage: 25,
      status: 'moderate',
    },
    {
      audience1: { id: 'a1', name: 'Audience 1', size: 1000 },
      audience2: { id: 'a3', name: 'Audience 3', size: 500 },
      overlapCount: 250,
      overlapPercentage: 50,
      status: 'high',
    },
    {
      audience1: { id: 'a2', name: 'Audience 2', size: 800 },
      audience2: { id: 'a3', name: 'Audience 3', size: 500 },
      overlapCount: 50,
      overlapPercentage: 10,
      status: 'low',
    },
  ];

  it('should sort by overlap percentage descending', () => {
    const sorted = sortOverlapPairsByRisk(mockPairs);
    expect(sorted[0].overlapPercentage).toBe(50);
    expect(sorted[1].overlapPercentage).toBe(25);
    expect(sorted[2].overlapPercentage).toBe(10);
  });

  it('should return empty array for empty input', () => {
    const sorted = sortOverlapPairsByRisk([]);
    expect(sorted).toHaveLength(0);
  });

  it('should not mutate original array', () => {
    const original = [...mockPairs];
    sortOverlapPairsByRisk(mockPairs);
    expect(mockPairs).toEqual(original);
  });
});

describe('AudienceOverlapPair type', () => {
  it('should have required fields', () => {
    const pair: AudienceOverlapPair = {
      audience1: { id: 'a1', name: 'Audience 1', size: 1000 },
      audience2: { id: 'a2', name: 'Audience 2', size: 800 },
      overlapCount: 400,
      overlapPercentage: 50,
      status: 'high',
    };

    expect(pair.audience1).toBeDefined();
    expect(pair.audience2).toBeDefined();
    expect(pair.overlapCount).toBeDefined();
    expect(pair.overlapPercentage).toBeDefined();
    expect(pair.status).toBeDefined();
  });
});

describe('OverlapStatus type', () => {
  it('should accept valid status values', () => {
    const statuses: OverlapStatus[] = ['low', 'moderate', 'high'];
    expect(statuses).toContain('low');
    expect(statuses).toContain('moderate');
    expect(statuses).toContain('high');
  });
});
