import { NextRequest, NextResponse } from 'next/server';
import type { Audience, ApiResponse } from '@/lib/api/types';

/**
 * 產生模擬受眾資料
 * TODO: 連接 Python 後端 API
 */
function generateMockAudiences(): Audience[] {
  const audienceTypes: Audience['type'][] = ['CUSTOM', 'LOOKALIKE', 'SAVED'];
  const sources = ['WEBSITE', 'CUSTOMER_LIST', 'APP', 'ENGAGEMENT'];
  const names = [
    'Website Visitors 30D',
    'Lookalike 1% - Purchasers',
    'Cart Abandoners',
    'High Value Customers',
    'Email Subscribers',
    'App Users Active 7D',
    'Video Viewers 95%',
    'Page Engagers',
    'Lookalike 2% - Website',
    'Retargeting Pool',
    'New Customer Prospects',
    'Seasonal Shoppers',
  ];

  return names.map((name, i) => {
    const type = audienceTypes[i % audienceTypes.length];
    const size = Math.floor(Math.random() * 2000000) + 5000;
    const conversions = Math.floor(Math.random() * 500) + 10;
    const spend = Math.floor(Math.random() * 5000) + 100;
    const cpa = spend / conversions;
    const roas = (Math.random() * 4) + 0.5;

    // 健康度評分 (0-100)
    // 規模(25%) + CPA表現(35%) + ROAS表現(25%) + 新鮮度(15%)
    const sizeScore = size >= 10000 && size <= 2000000 ? 100 : size < 5000 ? 20 : 60;
    const cpaScore = cpa < 15 ? 100 : cpa < 25 ? 70 : cpa < 40 ? 40 : 20;
    const roasScore = roas > 2 ? 100 : roas > 1.5 ? 80 : roas > 1 ? 50 : 20;
    const freshnessScore = Math.floor(Math.random() * 40) + 60; // 60-100
    const healthScore = Math.round(
      sizeScore * 0.25 + cpaScore * 0.35 + roasScore * 0.25 + freshnessScore * 0.15
    );

    return {
      id: `aud-${i + 1}`,
      name,
      type,
      size,
      source: sources[i % sources.length],
      metrics: {
        reach: Math.floor(size * 0.7),
        impressions: Math.floor(Math.random() * 100000) + 10000,
        conversions,
        spend,
        cpa: Math.round(cpa * 100) / 100,
        roas: Math.round(roas * 100) / 100,
      },
      health_score: healthScore,
    };
  });
}

/**
 * GET /api/v1/audiences
 * 取得受眾列表
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // 解析查詢參數
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);
  const type = searchParams.get('type');
  const sortBy = searchParams.get('sort_by') || 'health_score';
  const sortOrder = searchParams.get('sort_order') || 'desc';

  // 產生模擬資料
  let audiences = generateMockAudiences();

  // 類型篩選
  if (type && type !== 'all') {
    audiences = audiences.filter((a) => a.type === type);
  }

  // 排序
  audiences.sort((a, b) => {
    let aValue: number, bValue: number;

    switch (sortBy) {
      case 'cpa':
        aValue = a.metrics.cpa;
        bValue = b.metrics.cpa;
        break;
      case 'roas':
        aValue = a.metrics.roas;
        bValue = b.metrics.roas;
        break;
      case 'size':
        aValue = a.size;
        bValue = b.size;
        break;
      case 'conversions':
        aValue = a.metrics.conversions;
        bValue = b.metrics.conversions;
        break;
      case 'spend':
        aValue = a.metrics.spend;
        bValue = b.metrics.spend;
        break;
      case 'health_score':
      default:
        aValue = a.health_score;
        bValue = b.health_score;
        break;
    }

    // CPA 預設升序（越低越好），其他預設降序（越高越好）
    if (sortBy === 'cpa') {
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    }
    return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
  });

  // 分頁
  const total = audiences.length;
  const startIndex = (page - 1) * pageSize;
  const paginatedAudiences = audiences.slice(startIndex, startIndex + pageSize);

  const response: ApiResponse<Audience[]> = {
    data: paginatedAudiences,
    meta: {
      page,
      total,
    },
  };

  return NextResponse.json(response);
}
