'use client';

import { useState } from 'react';

// Google Ads 文案結構
interface GoogleAdsResult {
  headlines: string[];
  descriptions: string[];
}

// Meta Ads 文案結構
interface MetaAdsResult {
  primary_texts: string[];
  headlines: string[];
  descriptions: string[];
}

// 全平台文案結構
interface AllPlatformResult {
  google: GoogleAdsResult;
  meta: MetaAdsResult;
}

// 支援的平台類型
type Platform = 'google' | 'meta' | 'all';

// 根據平台返回不同的結果類型
type CopywritingResult<T extends Platform> = T extends 'all'
  ? AllPlatformResult
  : T extends 'meta'
    ? MetaAdsResult
    : GoogleAdsResult;

export function useAICopywriting() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [result, setResult] = useState<AllPlatformResult | GoogleAdsResult | MetaAdsResult | null>(null);

  const generate = async <T extends Platform = 'all'>(
    productDescription: string,
    style = 'professional',
    platform: T = 'all' as T
  ): Promise<CopywritingResult<T>> => {
    setIsLoading(true);
    setError(null);

    try {
      // 從 localStorage 讀取 token
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

      // 使用相對路徑呼叫 Next.js API 路由（代理到後端）
      const res = await fetch('/api/v1/ai/copywriting', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          product_description: productDescription,
          style,
          platform,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || data.error || '生成失敗');
      }

      setResult(data);
      return data as CopywritingResult<T>;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('生成失敗');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    generate,
    result,
    isLoading,
    error,
    reset: () => {
      setResult(null);
      setError(null);
    },
  };
}

// 匯出類型供其他元件使用
export type { GoogleAdsResult, MetaAdsResult, AllPlatformResult, Platform };
