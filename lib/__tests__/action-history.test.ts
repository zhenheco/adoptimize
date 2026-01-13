/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import {
  formatActionType,
  formatTargetType,
  getActionTypeIcon,
  getTimeAgo,
  groupHistoryByDate,
  type ActionHistoryItem,
} from '../utils/action-history';

// 建立測試用的歷史記錄
const createMockHistory = (overrides: Partial<ActionHistoryItem>[] = []): ActionHistoryItem[] => {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const twoDaysAgo = new Date(now);
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

  const defaults: ActionHistoryItem[] = [
    {
      id: 'hist-1',
      user_id: 'user-1',
      recommendation_id: 'rec-1',
      action_type: 'PAUSE',
      target_type: 'CREATIVE',
      target_id: 'creative-1',
      target_name: '夏季促銷橫幅',
      before_state: { status: 'active' },
      after_state: { status: 'paused' },
      reverted: false,
      created_at: now.toISOString(),
    },
    {
      id: 'hist-2',
      user_id: 'user-1',
      recommendation_id: 'rec-2',
      action_type: 'BUDGET_CHANGE',
      target_type: 'CAMPAIGN',
      target_id: 'campaign-1',
      target_name: '品牌認知活動',
      before_state: { budget: 1000 },
      after_state: { budget: 800 },
      reverted: false,
      created_at: yesterday.toISOString(),
    },
    {
      id: 'hist-3',
      user_id: 'user-1',
      recommendation_id: 'rec-3',
      action_type: 'ENABLE',
      target_type: 'AD',
      target_id: 'ad-1',
      target_name: '產品廣告 A',
      before_state: { status: 'paused' },
      after_state: { status: 'active' },
      reverted: true,
      reverted_at: now.toISOString(),
      created_at: twoDaysAgo.toISOString(),
    },
  ];

  return defaults.map((item, index) => ({
    ...item,
    ...overrides[index],
  }));
};

describe('action-history utilities', () => {
  describe('formatActionType', () => {
    it('should format PAUSE action type', () => {
      expect(formatActionType('PAUSE')).toBe('暫停');
    });

    it('should format ENABLE action type', () => {
      expect(formatActionType('ENABLE')).toBe('啟用');
    });

    it('should format BUDGET_CHANGE action type', () => {
      expect(formatActionType('BUDGET_CHANGE')).toBe('調整預算');
    });

    it('should format EXCLUDE_AUDIENCE action type', () => {
      expect(formatActionType('EXCLUDE_AUDIENCE')).toBe('排除受眾');
    });

    it('should return original for unknown action type', () => {
      expect(formatActionType('UNKNOWN_ACTION')).toBe('UNKNOWN_ACTION');
    });
  });

  describe('formatTargetType', () => {
    it('should format CREATIVE target type', () => {
      expect(formatTargetType('CREATIVE')).toBe('素材');
    });

    it('should format CAMPAIGN target type', () => {
      expect(formatTargetType('CAMPAIGN')).toBe('活動');
    });

    it('should format ADSET target type', () => {
      expect(formatTargetType('ADSET')).toBe('廣告組');
    });

    it('should format AD target type', () => {
      expect(formatTargetType('AD')).toBe('廣告');
    });

    it('should format AUDIENCE target type', () => {
      expect(formatTargetType('AUDIENCE')).toBe('受眾');
    });

    it('should return original for unknown target type', () => {
      expect(formatTargetType('UNKNOWN')).toBe('UNKNOWN');
    });
  });

  describe('getActionTypeIcon', () => {
    it('should return pause icon name for PAUSE', () => {
      expect(getActionTypeIcon('PAUSE')).toBe('pause');
    });

    it('should return play icon name for ENABLE', () => {
      expect(getActionTypeIcon('ENABLE')).toBe('play');
    });

    it('should return trending-down icon name for BUDGET_CHANGE (decrease)', () => {
      expect(getActionTypeIcon('BUDGET_CHANGE')).toBe('trending-down');
    });

    it('should return users icon name for EXCLUDE_AUDIENCE', () => {
      expect(getActionTypeIcon('EXCLUDE_AUDIENCE')).toBe('users');
    });

    it('should return settings icon name for unknown action', () => {
      expect(getActionTypeIcon('UNKNOWN')).toBe('settings');
    });
  });

  describe('getTimeAgo', () => {
    it('should return "剛剛" for time within 1 minute', () => {
      const now = new Date();
      expect(getTimeAgo(now.toISOString())).toBe('剛剛');
    });

    it('should return minutes ago for time within 1 hour', () => {
      const thirtyMinutesAgo = new Date();
      thirtyMinutesAgo.setMinutes(thirtyMinutesAgo.getMinutes() - 30);
      expect(getTimeAgo(thirtyMinutesAgo.toISOString())).toBe('30 分鐘前');
    });

    it('should return hours ago for time within 24 hours', () => {
      const fiveHoursAgo = new Date();
      fiveHoursAgo.setHours(fiveHoursAgo.getHours() - 5);
      expect(getTimeAgo(fiveHoursAgo.toISOString())).toBe('5 小時前');
    });

    it('should return days ago for time beyond 24 hours', () => {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      expect(getTimeAgo(threeDaysAgo.toISOString())).toBe('3 天前');
    });
  });

  describe('groupHistoryByDate', () => {
    it('should group history items by date', () => {
      const history = createMockHistory();
      const grouped = groupHistoryByDate(history);

      // 應該有 3 個日期分組
      expect(grouped.length).toBe(3);
    });

    it('should label today correctly', () => {
      const history = createMockHistory();
      const grouped = groupHistoryByDate(history);

      expect(grouped[0].label).toBe('今天');
    });

    it('should label yesterday correctly', () => {
      const history = createMockHistory();
      const grouped = groupHistoryByDate(history);

      expect(grouped[1].label).toBe('昨天');
    });

    it('should use date format for older dates', () => {
      const history = createMockHistory();
      const grouped = groupHistoryByDate(history);

      // 第三組應該是日期格式
      expect(grouped[2].label).toMatch(/\d{1,2}\/\d{1,2}/);
    });

    it('should include items in correct groups', () => {
      const history = createMockHistory();
      const grouped = groupHistoryByDate(history);

      // 今天應該有 1 項
      expect(grouped[0].items.length).toBe(1);
      expect(grouped[0].items[0].id).toBe('hist-1');

      // 昨天應該有 1 項
      expect(grouped[1].items.length).toBe(1);
      expect(grouped[1].items[0].id).toBe('hist-2');
    });

    it('should return empty array for empty input', () => {
      const grouped = groupHistoryByDate([]);
      expect(grouped).toEqual([]);
    });

    it('should sort groups by date descending', () => {
      const history = createMockHistory();
      const grouped = groupHistoryByDate(history);

      // 今天在最前面
      expect(grouped[0].label).toBe('今天');
    });
  });
});
