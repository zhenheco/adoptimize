/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  calculateSnoozeUntil,
  isSnoozeExpired,
  formatSnoozeRemaining,
  getSnoozeOptions,
  type SnoozeOption,
} from '../utils/snooze-utils';

describe('snooze-utils', () => {
  // 使用固定時間進行測試
  const mockNow = new Date('2026-01-02T10:00:00.000Z');

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(mockNow);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('calculateSnoozeUntil', () => {
    it('should calculate 1 hour snooze correctly', () => {
      const result = calculateSnoozeUntil('1h');
      expect(new Date(result)).toEqual(new Date('2026-01-02T11:00:00.000Z'));
    });

    it('should calculate 4 hours snooze correctly', () => {
      const result = calculateSnoozeUntil('4h');
      expect(new Date(result)).toEqual(new Date('2026-01-02T14:00:00.000Z'));
    });

    it('should calculate 1 day snooze correctly', () => {
      const result = calculateSnoozeUntil('1d');
      expect(new Date(result)).toEqual(new Date('2026-01-03T10:00:00.000Z'));
    });

    it('should calculate 3 days snooze correctly', () => {
      const result = calculateSnoozeUntil('3d');
      expect(new Date(result)).toEqual(new Date('2026-01-05T10:00:00.000Z'));
    });

    it('should calculate 7 days snooze correctly', () => {
      const result = calculateSnoozeUntil('7d');
      expect(new Date(result)).toEqual(new Date('2026-01-09T10:00:00.000Z'));
    });
  });

  describe('isSnoozeExpired', () => {
    it('should return true when snooze time has passed', () => {
      const pastTime = '2026-01-02T09:00:00.000Z';
      expect(isSnoozeExpired(pastTime)).toBe(true);
    });

    it('should return false when snooze time has not passed', () => {
      const futureTime = '2026-01-02T11:00:00.000Z';
      expect(isSnoozeExpired(futureTime)).toBe(false);
    });

    it('should return false when snooze_until is undefined', () => {
      expect(isSnoozeExpired(undefined)).toBe(false);
    });

    it('should return false when snooze_until is null', () => {
      expect(isSnoozeExpired(null as unknown as string)).toBe(false);
    });
  });

  describe('formatSnoozeRemaining', () => {
    it('should format hours remaining correctly', () => {
      const in2Hours = '2026-01-02T12:00:00.000Z';
      expect(formatSnoozeRemaining(in2Hours)).toBe('2 小時後到期');
    });

    it('should format minutes remaining correctly', () => {
      const in30Minutes = '2026-01-02T10:30:00.000Z';
      expect(formatSnoozeRemaining(in30Minutes)).toBe('30 分鐘後到期');
    });

    it('should format days remaining correctly', () => {
      const in2Days = '2026-01-04T10:00:00.000Z';
      expect(formatSnoozeRemaining(in2Days)).toBe('2 天後到期');
    });

    it('should return expired message for past time', () => {
      const pastTime = '2026-01-02T09:00:00.000Z';
      expect(formatSnoozeRemaining(pastTime)).toBe('已到期');
    });
  });

  describe('getSnoozeOptions', () => {
    it('should return all snooze options', () => {
      const options = getSnoozeOptions();

      expect(options).toHaveLength(5);
      expect(options.map((o: SnoozeOption) => o.value)).toEqual(['1h', '4h', '1d', '3d', '7d']);
    });

    it('should have correct labels', () => {
      const options = getSnoozeOptions();

      expect(options[0].label).toBe('1 小時後');
      expect(options[1].label).toBe('4 小時後');
      expect(options[2].label).toBe('明天');
      expect(options[3].label).toBe('3 天後');
      expect(options[4].label).toBe('1 週後');
    });

    it('should have calculated snooze_until times', () => {
      const options = getSnoozeOptions();

      expect(new Date(options[0].snooze_until)).toEqual(new Date('2026-01-02T11:00:00.000Z'));
      expect(new Date(options[2].snooze_until)).toEqual(new Date('2026-01-03T10:00:00.000Z'));
    });
  });
});
