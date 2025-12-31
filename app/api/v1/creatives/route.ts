import { NextRequest, NextResponse } from 'next/server';
import type { Creative, ApiResponse } from '@/lib/api/types';
import { calculateFatigueScore, getFatigueStatus } from '@/lib/utils/fatigue-score';

/**
 * 產生模擬素材資料
 */
function generateMockCreatives(): Creative[] {
  const types: Creative['type'][] = ['IMAGE', 'VIDEO', 'CAROUSEL'];
  const names = [
    '夏季促銷活動 - 限時折扣',
    '新品上市 - 智能手錶',
    '品牌形象 - 企業核心價值',
    '節日特惠 - 聖誕禮盒組',
    '產品介紹 - 無線耳機',
    '用戶見證 - 客戶評價影片',
    '限量版發售 - 聯名款式',
    '新年特賣 - 福袋優惠',
    '春季新款 - 時尚服飾',
    '運動系列 - 健身器材',
    '美食推薦 - 餐廳優惠券',
    '旅遊促銷 - 暑假特惠行程',
  ];

  return names.map((name, index) => {
    // 產生各因子的隨機值
    const ctrChange = (Math.random() - 0.5) * 40; // -20% to +20%
    const frequency = Math.random() * 4 + 1; // 1-5
    const daysActive = Math.floor(Math.random() * 60) + 1;
    const conversionRateChange = (Math.random() - 0.5) * 30; // -15% to +15%
    const isActive = Math.random() > 0.2;

    // 使用公式計算疲勞度
    const fatigueResult = calculateFatigueScore({
      ctrChange,
      frequency,
      daysActive,
      conversionRateChange,
    });

    return {
      id: `creative-${index + 1}`,
      name,
      type: types[index % 3],
      thumbnail_url: `https://picsum.photos/seed/${index + 1}/400/225`,
      metrics: {
        impressions: Math.floor(Math.random() * 100000) + 1000,
        clicks: Math.floor(Math.random() * 5000) + 100,
        ctr: (Math.random() * 0.08) + 0.01, // 1% - 9%
        conversions: Math.floor(Math.random() * 200) + 5,
        spend: Math.floor(Math.random() * 5000) + 50,
      },
      fatigue: {
        score: fatigueResult.score,
        status: fatigueResult.status,
        ctr_change: ctrChange,
        frequency,
        days_active: daysActive,
      },
      status: isActive ? 'active' : 'paused',
    };
  });
}

// 快取模擬數據（實際應用中會從 Python 後端取得）
let mockCreatives: Creative[] | null = null;

function getMockCreatives(): Creative[] {
  if (!mockCreatives) {
    mockCreatives = generateMockCreatives();
  }
  return mockCreatives;
}

/**
 * GET /api/v1/creatives
 *
 * 取得素材列表
 *
 * Query Parameters:
 * - page: 頁碼（預設 1）
 * - pageSize: 每頁筆數（預設 12）
 * - type: 素材類型（IMAGE, VIDEO, CAROUSEL）
 * - fatigue_status: 疲勞狀態（healthy, warning, fatigued）
 * - status: 素材狀態（active, paused）
 * - sort_by: 排序欄位（fatigue, ctr, spend, conversions）
 * - sort_order: 排序方向（asc, desc）
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '12', 10);
  const type = searchParams.get('type');
  const fatigueStatus = searchParams.get('fatigue_status');
  const status = searchParams.get('status');
  const sortBy = searchParams.get('sort_by');
  const sortOrder = searchParams.get('sort_order') || 'desc';

  // TODO: 連接到 Python 後端 API
  // const pythonApiUrl = process.env.PYTHON_API_URL || 'http://localhost:8000';
  // const response = await fetch(`${pythonApiUrl}/api/v1/creatives?${searchParams}`);

  // 使用模擬數據
  let creatives = [...getMockCreatives()];

  // 篩選
  if (type && type !== 'all') {
    creatives = creatives.filter((c) => c.type === type);
  }
  if (fatigueStatus && fatigueStatus !== 'all') {
    creatives = creatives.filter((c) => c.fatigue.status === fatigueStatus);
  }
  if (status && status !== 'all') {
    creatives = creatives.filter((c) => c.status === status);
  }

  // 排序
  if (sortBy) {
    creatives.sort((a, b) => {
      let aVal: number;
      let bVal: number;

      switch (sortBy) {
        case 'fatigue':
          aVal = a.fatigue.score;
          bVal = b.fatigue.score;
          break;
        case 'ctr':
          aVal = a.metrics.ctr;
          bVal = b.metrics.ctr;
          break;
        case 'spend':
          aVal = a.metrics.spend;
          bVal = b.metrics.spend;
          break;
        case 'conversions':
          aVal = a.metrics.conversions;
          bVal = b.metrics.conversions;
          break;
        default:
          return 0;
      }

      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }

  // 分頁
  const total = creatives.length;
  const startIndex = (page - 1) * pageSize;
  const paginatedCreatives = creatives.slice(startIndex, startIndex + pageSize);

  const response: ApiResponse<Creative[]> = {
    data: paginatedCreatives,
    meta: {
      page,
      total,
    },
  };

  return NextResponse.json(response);
}
