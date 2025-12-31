/**
 * 通用工具函數測試
 * @module lib/__tests__/utils.test
 */

import { describe, it, expect } from 'vitest';
import {
  cn,
  formatNumber,
  formatCurrency,
  formatChange,
  getStatusColor,
  getStatusIcon,
} from '../utils';

describe('cn (className merge)', () => {
  it('should merge class names correctly', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('should handle conditional classes', () => {
    const isActive = true;
    expect(cn('base', isActive && 'active')).toBe('base active');
  });

  it('should handle false/undefined/null values', () => {
    expect(cn('base', false, undefined, null)).toBe('base');
  });

  it('should merge Tailwind classes correctly', () => {
    // tailwind-merge should override conflicting classes
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
    expect(cn('p-4', 'p-2')).toBe('p-2');
  });

  it('should handle array of classes', () => {
    expect(cn(['foo', 'bar'])).toBe('foo bar');
  });

  it('should handle object syntax', () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz');
  });

  it('should return empty string when no classes', () => {
    expect(cn()).toBe('');
  });
});

describe('formatNumber', () => {
  it('should format integers with thousands separator', () => {
    expect(formatNumber(1234567)).toBe('1,234,567');
  });

  it('should format small numbers correctly', () => {
    expect(formatNumber(123)).toBe('123');
  });

  it('should format zero', () => {
    expect(formatNumber(0)).toBe('0');
  });

  it('should format decimal numbers', () => {
    const result = formatNumber(1234.56);
    // Locale-dependent, but should contain the whole number part
    expect(result).toContain('1,234');
  });

  it('should format negative numbers', () => {
    const result = formatNumber(-1234);
    expect(result).toContain('1,234');
    expect(result).toContain('-');
  });

  it('should format very large numbers', () => {
    expect(formatNumber(1000000000)).toBe('1,000,000,000');
  });
});

describe('formatCurrency', () => {
  it('should format USD currency by default', () => {
    expect(formatCurrency(1234.56)).toBe('$1,234.56');
  });

  it('should format zero amount', () => {
    expect(formatCurrency(0)).toBe('$0.00');
  });

  it('should format negative amounts', () => {
    const result = formatCurrency(-1234.56);
    expect(result).toContain('1,234.56');
    // Negative currency format varies by locale
  });

  it('should format whole numbers with decimals', () => {
    expect(formatCurrency(1234)).toBe('$1,234.00');
  });

  it('should round to 2 decimal places', () => {
    expect(formatCurrency(1234.567)).toBe('$1,234.57');
  });

  it('should format very large amounts', () => {
    expect(formatCurrency(1000000.00)).toBe('$1,000,000.00');
  });

  it('should format small amounts', () => {
    expect(formatCurrency(0.99)).toBe('$0.99');
  });

  it('should handle different currencies', () => {
    const eurResult = formatCurrency(1234.56, 'EUR');
    // EUR format varies but should contain the amount
    expect(eurResult).toContain('1,234.56');
  });
});

describe('formatChange', () => {
  it('should format positive changes with plus sign', () => {
    expect(formatChange(12.5)).toBe('+12.5%');
  });

  it('should format negative changes with minus sign', () => {
    expect(formatChange(-5.2)).toBe('-5.2%');
  });

  it('should format zero change', () => {
    expect(formatChange(0)).toBe('+0.0%');
  });

  it('should round to 1 decimal place', () => {
    expect(formatChange(12.567)).toBe('+12.6%');
  });

  it('should handle very small changes', () => {
    expect(formatChange(0.01)).toBe('+0.0%');
    expect(formatChange(0.05)).toBe('+0.1%'); // rounds up
  });

  it('should handle very large changes', () => {
    expect(formatChange(150.0)).toBe('+150.0%');
  });

  it('should handle negative decimals', () => {
    expect(formatChange(-0.5)).toBe('-0.5%');
  });
});

describe('getStatusColor', () => {
  it('should return green classes for normal status', () => {
    const result = getStatusColor('normal');
    expect(result).toContain('text-green-600');
    expect(result).toContain('bg-green-50');
  });

  it('should return yellow classes for warning status', () => {
    const result = getStatusColor('warning');
    expect(result).toContain('text-yellow-600');
    expect(result).toContain('bg-yellow-50');
  });

  it('should return red classes for danger status', () => {
    const result = getStatusColor('danger');
    expect(result).toContain('text-red-600');
    expect(result).toContain('bg-red-50');
  });

  it('should include dark mode classes for normal status', () => {
    const result = getStatusColor('normal');
    expect(result).toContain('dark:text-green-400');
    expect(result).toContain('dark:bg-green-900/50');
  });

  it('should include dark mode classes for warning status', () => {
    const result = getStatusColor('warning');
    expect(result).toContain('dark:text-yellow-400');
    expect(result).toContain('dark:bg-yellow-900/50');
  });

  it('should include dark mode classes for danger status', () => {
    const result = getStatusColor('danger');
    expect(result).toContain('dark:text-red-400');
    expect(result).toContain('dark:bg-red-900/50');
  });

  it('should return gray classes for unknown status', () => {
    // @ts-expect-error - Testing invalid input
    const result = getStatusColor('unknown');
    expect(result).toContain('text-gray-600');
    expect(result).toContain('bg-gray-50');
  });
});

describe('getStatusIcon', () => {
  it('should return green circle for normal status', () => {
    expect(getStatusIcon('normal')).toBe('🟢');
  });

  it('should return yellow circle for warning status', () => {
    expect(getStatusIcon('warning')).toBe('🟡');
  });

  it('should return red circle for danger status', () => {
    expect(getStatusIcon('danger')).toBe('🔴');
  });

  it('should return white circle for unknown status', () => {
    // @ts-expect-error - Testing invalid input
    expect(getStatusIcon('unknown')).toBe('⚪');
  });
});
