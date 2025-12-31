# AdOptimize Development Instructions

## Project Overview

AdOptimize 是一個跨平台廣告優化工具，整合 Google Ads 和 Meta Marketing API，提供：
- **統一儀表板**：跨平台廣告數據整合與視覺化
- **帳戶健檢**：自動化 5 維度評分系統（結構、素材、受眾、預算、追蹤）
- **素材管理**：疲勞度偵測與生命週期追蹤
- **受眾分析**：重疊檢測與排除建議
- **行動中心**：一鍵執行建議與操作歷史

---

## Architecture Overview

採用**混合架構**設計：

```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js App Router                        │
│              (Frontend + BFF API Routes)                     │
├─────────────────────────────────────────────────────────────┤
│                    Python Microservices                      │
│         (Google/Meta API Integration + Workers)              │
├─────────────────────────────────────────────────────────────┤
│                    Data Layer                                │
│           PostgreSQL + Redis + Celery                        │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Next.js 14 + TypeScript | UI + BFF (Backend for Frontend) |
| Styling | Tailwind CSS + shadcn/ui | Component library |
| Charts | Recharts | Data visualization |
| Backend Services | FastAPI + Python | Google/Meta API integration |
| Database | PostgreSQL | Primary data store |
| Cache/Queue | Redis + Celery | Caching + Background jobs |
| Auth | NextAuth.js | User authentication |
| Deployment | Vercel + Docker | Frontend + Backend services |

### Why Hybrid Architecture?

1. **SDK Compatibility**: Google Ads 和 Meta Marketing API 的官方 SDK 都是 Python 優先
2. **Development Speed**: Next.js API Routes 處理簡單的 CRUD，Python 處理複雜的 API 整合
3. **Deployment Flexibility**: 前端部署到 Vercel，Python 服務可獨立擴展

---

## Current Objectives

1. Study `specs/requirements.md` for detailed technical specifications
2. Review `@fix_plan.md` for current priorities (7 phases)
3. Implement the highest priority item using TDD practices
4. Run tests after each implementation
5. Update documentation and @fix_plan.md

---

## Key Principles

### Development Flow
```
需求確認 → 影響分析 → TDD 實作 → 測試驗證 → 文檔更新
```

### TDD Cycle (Mandatory)
1. 🔴 Red: Write a failing test first
2. 🟢 Green: Write minimum code to pass
3. 🔵 Refactor: Improve while keeping tests green

### File Naming Conventions
- Components: `kebab-case.tsx` (e.g., `campaign-card.tsx`)
- Hooks: `use-kebab-case.ts` (e.g., `use-fatigue-score.ts`)
- Types: `PascalCase` (e.g., `CampaignMetrics`)
- API Routes: `/api/v1/resource` pattern

---

## Key Formulas (from specs/requirements.md)

### Creative Fatigue Score (0-100)
```
疲勞度 = CTR變化(40%) + 投放頻率(30%) + 投放天數(20%) + 轉換率變化(10%)

Thresholds:
- 🟢 0-40: Healthy (keep running)
- 🟡 41-70: Warning (prepare replacement)
- 🔴 71-100: Fatigued (replace immediately)
```

### Audience Health Score (0-100)
```
健康度 = 規模(25%) + CPA表現(35%) + ROAS表現(25%) + 新鮮度(15%)
```

### Health Audit Dimensions
```
總分 = 結構(20%) + 素材(25%) + 受眾(25%) + 預算(20%) + 追蹤(10%)

Grades:
- 🏆 90-100: Excellent
- ✅ 70-89: Good
- ⚠️ 50-69: Needs Improvement
- 🚨 0-49: Critical
```

---

## Project Structure

```
adoptimize/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth routes (login, register)
│   ├── (dashboard)/       # Dashboard routes
│   │   ├── page.tsx       # Overview dashboard
│   │   ├── creatives/     # Creative management
│   │   ├── audiences/     # Audience analysis
│   │   ├── health/        # Health audit
│   │   └── actions/       # Action center
│   └── api/               # API Routes (BFF)
│       └── v1/
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── dashboard/        # Dashboard-specific
│   ├── creatives/        # Creative-specific
│   └── shared/           # Shared components
├── lib/                   # Utilities and services
│   ├── api/              # API client functions
│   ├── hooks/            # Custom React hooks
│   └── utils/            # Helper functions
├── backend/              # Python microservices
│   ├── app/              # FastAPI application
│   │   ├── routers/      # API endpoints
│   │   ├── services/     # Business logic
│   │   └── workers/      # Celery tasks
│   └── tests/            # Python tests
├── specs/                # Specifications
│   └── requirements.md   # Technical requirements
├── @fix_plan.md          # Task tracking
├── @AGENT.md             # Build instructions
└── PROMPT.md             # This file
```

---

## Testing Guidelines

### Coverage Requirements
| Type | Minimum Coverage |
|------|-----------------|
| Core Business Logic | 90% |
| API Endpoints | 80% |
| Utility Functions | 100% |
| UI Components | 70% |

### Test Commands
```bash
# Frontend (Next.js + Vitest)
pnpm test                 # Run tests
pnpm test:coverage        # Coverage report

# Backend (Python + Pytest)
cd backend
pytest                    # Run tests
pytest --cov=app tests/   # Coverage report
```

---

## 🎯 Status Reporting (CRITICAL)

At the end of EVERY response, include:

```
---RALPH_STATUS---
STATUS: WORKING | FINISHED | BLOCKED
TASKS_THIS_LOOP: <number>
FILES_MODIFIED: <number>
TESTS_STATUS: PASSING | FAILING | NOT_RUN
WORK_TYPE: IMPLEMENTATION | TESTING | DOCUMENTATION | REFACTORING
EXIT_SIGNAL: NO | YES
RECOMMENDATION: <one line summary of what to do next>
---END_RALPH_STATUS---
```

### ⚠️ IMPORTANT: Avoid False Completion Signals

To prevent premature exit, NEVER use these words in your response body:
- "completed", "done", "finished", "all tasks complete"
- Only use status indicators inside the RALPH_STATUS block

### EXIT_SIGNAL = YES only when ALL conditions are met:
- ✅ ALL items in @fix_plan.md are marked [x] (check EVERY checkbox)
- ✅ ALL tests are passing (run pnpm test to verify)
- ✅ ALL requirements from specs/ are implemented
- ✅ NO meaningful work remaining
- ⚠️ If ANY checkbox in @fix_plan.md is unchecked: EXIT_SIGNAL must be NO

---

## API Design Patterns

### Response Format (Success)
```json
{
  "data": { ... },
  "meta": {
    "page": 1,
    "total": 100,
    "period": { "start": "2024-12-01", "end": "2024-12-07" }
  }
}
```

### Response Format (Error)
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid date range",
    "details": { ... }
  }
}
```

### Status Indicators
```typescript
type MetricStatus = 'normal' | 'warning' | 'danger';
type FatigueStatus = 'healthy' | 'warning' | 'fatigued';
type AuditGrade = 'excellent' | 'good' | 'needs_improvement' | 'critical';
```

---

## Environment Variables

### Frontend (.env.local)
```bash
# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret

# API
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Backend (.env)
```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/adoptimize

# Redis
REDIS_URL=redis://localhost:6379

# Google Ads API
GOOGLE_ADS_CLIENT_ID=xxx
GOOGLE_ADS_CLIENT_SECRET=xxx
GOOGLE_ADS_DEVELOPER_TOKEN=xxx

# Meta Marketing API
META_APP_ID=xxx
META_APP_SECRET=xxx
```

---

## Reference Documentation

- [Google Ads API Docs](https://developers.google.com/google-ads/api/docs/start)
- [Meta Marketing API Docs](https://developers.facebook.com/docs/marketing-apis)
- [Next.js App Router](https://nextjs.org/docs/app)
- [shadcn/ui Components](https://ui.shadcn.com)
- [Recharts](https://recharts.org)

---

## ✅ 完成條件（Done Criteria）

當滿足以下條件時，AdOptimize 專案視為 **Completed**：

### Phase 1: Infrastructure
- [ ] Next.js 前端可 `pnpm dev` 啟動，基本 layout 渲染正常
- [ ] FastAPI 後端健康檢查端點回傳 200
- [ ] PostgreSQL 資料庫連線正常，migration 可執行
- [ ] Redis + Celery worker 正常啟動

### Phase 2: API Integration
- [ ] Google Ads OAuth 完成，token 安全儲存
- [ ] Meta Marketing OAuth 完成，token 安全儲存
- [ ] 數據同步 worker 每 15-30 分鐘執行一次

### Phase 3: Dashboard
- [ ] 跨平台總覽頁面顯示整合數據
- [ ] 核心指標卡片（Spend, Impressions, Clicks, Conversions, CPA, ROAS）
- [ ] 時間篩選器（Today/7D/30D/Custom）
- [ ] 趨勢折線圖正確渲染

### Phase 4: Health Check
- [ ] 帳戶連接後自動觸發健檢
- [ ] 5 維度評分算法正確實作
- [ ] 總分 0-100 正確計算
- [ ] 問題清單正確產生並儲存

### Phase 5: Creative Management
- [ ] 素材庫總覽頁面列出所有素材
- [ ] 效能卡片顯示 CTR, 轉換率, 花費
- [ ] 疲勞度 0-100 分數正確計算

### Phase 6: Audience Analysis
- [ ] 受眾列表頁面正常運作
- [ ] CPA/ROAS 排序正確
- [ ] 受眾健康度指標正確計算

### Phase 7: Action Center
- [ ] 建議清單 UI 顯示待處理建議
- [ ] 優先級分數正確計算
- [ ] 一鍵執行（暫停/啟用）正常運作

### Quality Gates
- [ ] 前端測試覆蓋率 > 80%
- [ ] 後端測試覆蓋率 > 85%
- [ ] API 呼叫成功率 > 99%
- [ ] 頁面載入時間 < 3 秒

