/**
 * BalanceWarningProvider 元件測試
 * @module components/billing/__tests__/balance-warning-provider.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BalanceWarningProvider } from '../balance-warning-provider';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

describe('BalanceWarningProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should not render when user is not logged in', async () => {
    mockLocalStorage.getItem.mockReturnValue(null);

    const { container } = render(<BalanceWarningProvider />);

    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it('should not render when balance is above threshold', async () => {
    mockLocalStorage.getItem.mockReturnValue('test-token');
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ balance: 1000 }),
    });

    const { container } = render(<BalanceWarningProvider />);

    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it('should render warning when balance is below threshold', async () => {
    mockLocalStorage.getItem.mockReturnValue('test-token');
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ balance: 300 }),
    });

    render(<BalanceWarningProvider />);

    await waitFor(() => {
      expect(screen.getByText(/餘額偏低/)).toBeDefined();
    });
  });

  it('should render critical warning when balance is below critical threshold', async () => {
    mockLocalStorage.getItem.mockReturnValue('test-token');
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ balance: 50 }),
    });

    render(<BalanceWarningProvider />);

    await waitFor(() => {
      expect(screen.getByText(/餘額不足/)).toBeDefined();
    });
  });

  it('should not render while loading', () => {
    mockLocalStorage.getItem.mockReturnValue('test-token');
    mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

    const { container } = render(<BalanceWarningProvider />);

    // Should be null while loading
    expect(container.firstChild).toBeNull();
  });

  it('should call API with correct authorization header', async () => {
    mockLocalStorage.getItem.mockReturnValue('test-token');
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ balance: 1000 }),
    });

    render(<BalanceWarningProvider />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/v1/billing/wallet', {
        headers: { Authorization: 'Bearer test-token' },
      });
    });
  });

  it('should handle API error gracefully', async () => {
    mockLocalStorage.getItem.mockReturnValue('test-token');
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const { container } = render(<BalanceWarningProvider />);

    await waitFor(() => {
      // Should not render anything on error
      expect(container.firstChild).toBeNull();
    });
  });
});
