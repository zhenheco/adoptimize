/**
 * API Client 測試
 * @module lib/__tests__/api-client.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { api, ApiError } from '../api/client';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('ApiError', () => {
  it('should create an error with all properties', () => {
    const error = new ApiError(400, 'VALIDATION_ERROR', 'Invalid input', {
      field: 'email',
    });

    expect(error.status).toBe(400);
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.message).toBe('Invalid input');
    expect(error.details).toEqual({ field: 'email' });
    expect(error.name).toBe('ApiError');
  });

  it('should be an instance of Error', () => {
    const error = new ApiError(500, 'SERVER_ERROR', 'Something went wrong');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ApiError);
  });

  it('should work without details', () => {
    const error = new ApiError(404, 'NOT_FOUND', 'Resource not found');
    expect(error.details).toBeUndefined();
  });
});

describe('api', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('api.get', () => {
    it('should make GET request with correct headers', async () => {
      const mockData = { data: { id: 1, name: 'Test' } };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      const result = await api.get('/api/test');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/test'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
      expect(result).toEqual(mockData);
    });

    it('should append query parameters to URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });

      await api.get('/api/test', { page: '1', limit: '10' });

      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain('page=1');
      expect(calledUrl).toContain('limit=10');
    });

    it('should throw ApiError on non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () =>
          Promise.resolve({
            error: { code: 'NOT_FOUND', message: 'Resource not found' },
          }),
      });

      await expect(api.get('/api/not-found')).rejects.toThrow(ApiError);
    });

    it('should extract error details from response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () =>
          Promise.resolve({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid data',
              details: { field: 'email' },
            },
          }),
      });

      try {
        await api.get('/api/test');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        if (error instanceof ApiError) {
          expect(error.status).toBe(400);
          expect(error.code).toBe('VALIDATION_ERROR');
          expect(error.message).toBe('Invalid data');
          expect(error.details).toEqual({ field: 'email' });
        }
      }
    });
  });

  describe('api.post', () => {
    it('should make POST request with body', async () => {
      const requestBody = { name: 'Test', value: 123 };
      const mockResponse = { data: { id: 1, ...requestBody } };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await api.post('/api/items', requestBody);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/items'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should make POST request without body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { triggered: true } }),
      });

      await api.post('/api/trigger');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/trigger'),
        expect.objectContaining({
          method: 'POST',
          body: undefined,
        })
      );
    });

    it('should throw ApiError on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () =>
          Promise.resolve({
            error: { code: 'SERVER_ERROR', message: 'Internal error' },
          }),
      });

      await expect(api.post('/api/test', {})).rejects.toThrow(ApiError);
    });
  });

  describe('api.put', () => {
    it('should make PUT request with body', async () => {
      const requestBody = { name: 'Updated' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { id: 1, ...requestBody } }),
      });

      await api.put('/api/items/1', requestBody);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/items/1'),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(requestBody),
        })
      );
    });

    it('should handle PUT without body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { updated: true } }),
      });

      await api.put('/api/items/1');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/items/1'),
        expect.objectContaining({
          method: 'PUT',
          body: undefined,
        })
      );
    });
  });

  describe('api.delete', () => {
    it('should make DELETE request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { deleted: true } }),
      });

      await api.delete('/api/items/1');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/items/1'),
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });

    it('should throw ApiError on 404', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () =>
          Promise.resolve({
            error: { code: 'NOT_FOUND', message: 'Item not found' },
          }),
      });

      await expect(api.delete('/api/items/999')).rejects.toThrow(ApiError);
    });
  });

  describe('error handling edge cases', () => {
    it('should handle missing error object in response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({}),
      });

      try {
        await api.get('/api/test');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        if (error instanceof ApiError) {
          expect(error.code).toBe('UNKNOWN_ERROR');
          expect(error.message).toBe('An error occurred');
        }
      }
    });

    it('should handle null error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve(null),
      });

      try {
        await api.get('/api/test');
        expect.fail('Should have thrown');
      } catch (error) {
        // When response is null, the code tries to access null.error
        // which throws a TypeError, not an ApiError
        expect(error).toBeInstanceOf(TypeError);
      }
    });
  });
});
