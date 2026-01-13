/**
 * Anomaly Detection 測試
 * 測試 getAnomalyStatus 函數根據變化百分比判斷異常狀態
 *
 * 異常判定規則（來自 specs/requirements.md）:
 * - change < -20%: danger (紅色警示)
 * - -20% <= change < -10%: warning (黃色警示)
 * - change >= -10%: normal (綠色正常)
 *
 * @module lib/__tests__/anomaly-detection.test
 */

import { describe, it, expect } from 'vitest';
import { getAnomalyStatus, type AnomalyStatus } from '../utils';

describe('getAnomalyStatus', () => {
  describe('danger status (change < -20%)', () => {
    it('should return danger when change is -25%', () => {
      const result = getAnomalyStatus(-25);
      expect(result).toBe('danger');
    });

    it('should return danger when change is -50%', () => {
      const result = getAnomalyStatus(-50);
      expect(result).toBe('danger');
    });

    it('should return danger when change is -100%', () => {
      const result = getAnomalyStatus(-100);
      expect(result).toBe('danger');
    });

    it('should return danger when change is -20.01%', () => {
      const result = getAnomalyStatus(-20.01);
      expect(result).toBe('danger');
    });
  });

  describe('warning status (-20% <= change < -10%)', () => {
    it('should return warning when change is -15%', () => {
      const result = getAnomalyStatus(-15);
      expect(result).toBe('warning');
    });

    it('should return warning when change is -20% (boundary)', () => {
      const result = getAnomalyStatus(-20);
      expect(result).toBe('warning');
    });

    it('should return warning when change is -10.01%', () => {
      const result = getAnomalyStatus(-10.01);
      expect(result).toBe('warning');
    });

    it('should return warning when change is -19.99%', () => {
      const result = getAnomalyStatus(-19.99);
      expect(result).toBe('warning');
    });
  });

  describe('normal status (change >= -10%)', () => {
    it('should return normal when change is -5%', () => {
      const result = getAnomalyStatus(-5);
      expect(result).toBe('normal');
    });

    it('should return normal when change is -10% (boundary)', () => {
      const result = getAnomalyStatus(-10);
      expect(result).toBe('normal');
    });

    it('should return normal when change is 0%', () => {
      const result = getAnomalyStatus(0);
      expect(result).toBe('normal');
    });

    it('should return normal when change is positive (+10%)', () => {
      const result = getAnomalyStatus(10);
      expect(result).toBe('normal');
    });

    it('should return normal when change is +50%', () => {
      const result = getAnomalyStatus(50);
      expect(result).toBe('normal');
    });

    it('should return normal when change is -9.99%', () => {
      const result = getAnomalyStatus(-9.99);
      expect(result).toBe('normal');
    });
  });

  describe('edge cases', () => {
    it('should handle very small negative change', () => {
      const result = getAnomalyStatus(-0.01);
      expect(result).toBe('normal');
    });

    it('should handle very large positive change', () => {
      const result = getAnomalyStatus(999);
      expect(result).toBe('normal');
    });

    it('should handle very large negative change', () => {
      const result = getAnomalyStatus(-999);
      expect(result).toBe('danger');
    });
  });

  describe('type safety', () => {
    it('should return a valid AnomalyStatus type', () => {
      const result: AnomalyStatus = getAnomalyStatus(-15);
      expect(['normal', 'warning', 'danger']).toContain(result);
    });
  });
});
