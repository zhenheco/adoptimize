# AdOptimize Technical Requirements

> 詳細技術規格文件，涵蓋系統架構、資料模型、API 設計、計算公式

---

## 1. 系統架構

### 1.1 架構層次

```
┌─────────────────────────────────────────────────────────────┐
│                      展示層 (Presentation)                   │
│                   Next.js + TypeScript + Tailwind            │
├─────────────────────────────────────────────────────────────┤
│                      應用層 (Application)                    │
│                      FastAPI + Python                        │
├─────────────────────────────────────────────────────────────┤
│                      服務層 (Service)                        │
│              Celery Workers + Rule Engine                    │
├─────────────────────────────────────────────────────────────┤
│                      數據層 (Data)                           │
│           PostgreSQL + Redis + TimescaleDB                   │
├─────────────────────────────────────────────────────────────┤
│                      整合層 (Integration)                    │
│              Google Ads API + Meta Marketing API             │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 技術選型

| 層級 | 技術 | 選擇原因 |
|-----|------|---------|
| 後端 | Python + FastAPI | 快速開發、豐富的 Google/Meta API SDK 支援 |
| 資料庫 | PostgreSQL | 穩定可靠、支援 JSONB、ACID 事務 |
| 快取/佇列 | Redis + Celery | 任務排程、數據快取、速率限制 |
| 前端 | Next.js + TypeScript | 組件化開發、類型安全、SSR 支援 |
| 圖表 | Recharts / ECharts | 豐富的視覺化選項、React 整合良好 |

### 1.3 效能要求

| 指標 | 目標值 |
|------|--------|
| API 呼叫成功率 | > 99% |
| 數據同步延遲 | < 30 分鐘 |
| 頁面載入時間 | < 3 秒 |
| 系統可用性 | > 99.5% |

---

## 2. 資料模型設計

### 2.1 核心實體關係

```
用戶 (User)
  │
  └── 廣告帳戶 (AdAccount)
        │
        ├── 廣告活動 (Campaign)
        │     │
        │     └── 廣告組 (AdSet)
        │           │
        │           └── 廣告 (Ad)
        │                 │
        │                 └── 素材 (Creative)
        │
        ├── 受眾 (Audience)
        │
        ├── 健檢報告 (HealthAudit)
        │     │
        │     └── 問題 (AuditIssue)
        │
        └── 建議 (Recommendation)
              │
              └── 操作歷史 (ActionHistory)
```

### 2.2 資料表定義

#### 用戶與帳戶

```sql
-- 用戶表
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255),
  subscription_tier VARCHAR(50) DEFAULT 'free', -- free, pro, enterprise
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 廣告帳戶表
CREATE TABLE ad_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  platform VARCHAR(50) NOT NULL, -- google, meta
  external_id VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  status VARCHAR(50) DEFAULT 'active',
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP,
  last_sync_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(platform, external_id)
);
```

#### 廣告結構

```sql
-- 廣告活動表
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES ad_accounts(id),
  external_id VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  objective VARCHAR(100), -- CONVERSIONS, TRAFFIC, AWARENESS, etc.
  status VARCHAR(50), -- ENABLED, PAUSED, REMOVED
  budget_type VARCHAR(50), -- DAILY, LIFETIME
  budget_amount DECIMAL(15, 2),
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 廣告組表
CREATE TABLE ad_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id),
  external_id VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  targeting JSONB, -- 受眾設定 JSON
  status VARCHAR(50),
  budget_type VARCHAR(50),
  budget_amount DECIMAL(15, 2),
  bid_strategy VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 廣告表
CREATE TABLE ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_set_id UUID REFERENCES ad_sets(id),
  external_id VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  creative_id UUID REFERENCES creatives(id),
  status VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 素材與指標

```sql
-- 素材表
CREATE TABLE creatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES ad_accounts(id),
  external_id VARCHAR(255),
  type VARCHAR(50), -- IMAGE, VIDEO, CAROUSEL, etc.
  headline VARCHAR(500),
  body TEXT,
  image_url TEXT,
  video_url TEXT,
  thumbnail_url TEXT,
  cta VARCHAR(100), -- LEARN_MORE, SHOP_NOW, etc.
  created_at TIMESTAMP DEFAULT NOW()
);

-- 素材每日指標表
CREATE TABLE creative_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creative_id UUID REFERENCES creatives(id),
  date DATE NOT NULL,
  impressions BIGINT DEFAULT 0,
  clicks BIGINT DEFAULT 0,
  ctr DECIMAL(10, 6), -- Click-through rate
  conversions INTEGER DEFAULT 0,
  conversion_rate DECIMAL(10, 6),
  spend DECIMAL(15, 2) DEFAULT 0,
  frequency DECIMAL(10, 2), -- 平均曝光頻率
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(creative_id, date)
);
```

#### 受眾

```sql
-- 受眾表
CREATE TABLE audiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES ad_accounts(id),
  external_id VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  type VARCHAR(100), -- CUSTOM, LOOKALIKE, SAVED, etc.
  size BIGINT, -- 受眾規模
  source VARCHAR(100), -- WEBSITE, CUSTOMER_LIST, APP, etc.
  lookalike_source_id VARCHAR(255), -- Lookalike 來源受眾
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 受眾每日指標表
CREATE TABLE audience_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audience_id UUID REFERENCES audiences(id),
  date DATE NOT NULL,
  reach BIGINT DEFAULT 0,
  impressions BIGINT DEFAULT 0,
  clicks BIGINT DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  spend DECIMAL(15, 2) DEFAULT 0,
  cpa DECIMAL(15, 2), -- Cost per acquisition
  roas DECIMAL(10, 4), -- Return on ad spend
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(audience_id, date)
);
```

#### 健檢與建議

```sql
-- 健檢報告表
CREATE TABLE health_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES ad_accounts(id),
  overall_score INTEGER, -- 0-100
  structure_score INTEGER, -- 帳戶結構分數
  creative_score INTEGER, -- 素材品質分數
  audience_score INTEGER, -- 受眾設定分數
  budget_score INTEGER, -- 預算配置分數
  tracking_score INTEGER, -- 追蹤設定分數
  issues_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 問題清單表
CREATE TABLE audit_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID REFERENCES health_audits(id),
  category VARCHAR(50), -- STRUCTURE, CREATIVE, AUDIENCE, BUDGET, TRACKING
  severity VARCHAR(20), -- CRITICAL, HIGH, MEDIUM, LOW
  issue_code VARCHAR(100), -- 問題代碼，如 CREATIVE_FATIGUE
  title VARCHAR(255),
  description TEXT,
  impact_description TEXT, -- 對廣告效果的影響
  solution TEXT, -- 建議解決方案
  affected_entities JSONB, -- 受影響的實體 ID 列表
  status VARCHAR(50) DEFAULT 'open', -- open, resolved, ignored
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 建議表
CREATE TABLE recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES ad_accounts(id),
  issue_id UUID REFERENCES audit_issues(id),
  type VARCHAR(100), -- PAUSE_CREATIVE, REDUCE_BUDGET, etc.
  priority_score INTEGER, -- 優先級分數
  title VARCHAR(255),
  description TEXT,
  action_module VARCHAR(100), -- 執行此建議的模組
  action_params JSONB, -- 執行參數
  estimated_impact DECIMAL(15, 2), -- 預估影響金額
  status VARCHAR(50) DEFAULT 'pending', -- pending, executed, ignored
  executed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 操作歷史表
CREATE TABLE action_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  recommendation_id UUID REFERENCES recommendations(id),
  action_type VARCHAR(100), -- PAUSE, ENABLE, BUDGET_CHANGE, etc.
  target_type VARCHAR(50), -- CAMPAIGN, ADSET, AD, CREATIVE, AUDIENCE
  target_id VARCHAR(255),
  before_state JSONB,
  after_state JSONB,
  reverted BOOLEAN DEFAULT FALSE,
  reverted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 3. API 端點設計

### 3.1 認證規格

- **認證方式**: JWT Token
- **Access Token 有效期**: 24 小時
- **Refresh Token 有效期**: 30 天

### 3.2 端點詳細規格

#### 帳戶管理

| 方法 | 端點 | 說明 | 請求/回應 |
|-----|------|------|----------|
| POST | `/api/v1/accounts/connect/google` | 連接 Google Ads | `{ redirect_uri }` → `{ auth_url }` |
| POST | `/api/v1/accounts/connect/meta` | 連接 Meta Ads | `{ redirect_uri }` → `{ auth_url }` |
| GET | `/api/v1/accounts/callback/google` | OAuth 回調 | 處理 token 儲存 |
| GET | `/api/v1/accounts/callback/meta` | OAuth 回調 | 處理 token 儲存 |
| GET | `/api/v1/accounts` | 取得帳戶列表 | `→ { accounts: [...] }` |
| DELETE | `/api/v1/accounts/:id` | 斷開帳戶連接 | `→ { success: true }` |

#### 儀表板數據

| 方法 | 端點 | 參數 | 說明 |
|-----|------|------|------|
| GET | `/api/v1/dashboard/overview` | `?period=7d&account_ids=...` | 總覽指標 |
| GET | `/api/v1/dashboard/metrics` | `?period=7d&metrics=spend,cpa,roas` | 詳細指標 |
| GET | `/api/v1/dashboard/trends` | `?period=30d&metric=spend` | 趨勢數據 |
| GET | `/api/v1/dashboard/alerts` | `?severity=high` | 異常警示 |

**Overview 回應格式**:
```json
{
  "period": { "start": "2024-12-01", "end": "2024-12-07" },
  "metrics": {
    "spend": { "value": 1500.00, "change": -5.2, "status": "normal" },
    "impressions": { "value": 50000, "change": 12.3, "status": "normal" },
    "clicks": { "value": 2500, "change": 8.1, "status": "normal" },
    "conversions": { "value": 125, "change": -2.5, "status": "warning" },
    "cpa": { "value": 12.00, "change": 15.3, "status": "danger" },
    "roas": { "value": 3.5, "change": -8.2, "status": "normal" }
  },
  "platforms": {
    "google": { "spend": 800.00, "conversions": 70 },
    "meta": { "spend": 700.00, "conversions": 55 }
  }
}
```

#### 素材管理

| 方法 | 端點 | 說明 |
|-----|------|------|
| GET | `/api/v1/creatives` | 素材列表（支援分頁、排序） |
| GET | `/api/v1/creatives/:id` | 素材詳情 |
| GET | `/api/v1/creatives/fatigued` | 疲勞素材列表 |
| POST | `/api/v1/creatives/:id/pause` | 暫停素材 |
| POST | `/api/v1/creatives/:id/enable` | 啟用素材 |
| POST | `/api/v1/creatives/batch/pause` | 批次暫停 |

**Creative 回應格式**:
```json
{
  "id": "uuid",
  "name": "Summer Sale Banner",
  "type": "IMAGE",
  "thumbnail_url": "https://...",
  "metrics": {
    "impressions": 10000,
    "clicks": 500,
    "ctr": 0.05,
    "conversions": 25,
    "spend": 150.00
  },
  "fatigue": {
    "score": 65,
    "status": "warning",
    "ctr_change": -0.15,
    "frequency": 3.2,
    "days_active": 21
  },
  "status": "active"
}
```

#### 受眾分析

| 方法 | 端點 | 說明 |
|-----|------|------|
| GET | `/api/v1/audiences` | 受眾列表 |
| GET | `/api/v1/audiences/:id` | 受眾詳情 |
| GET | `/api/v1/audiences/overlap` | 重疊分析 |
| POST | `/api/v1/audiences/exclusion` | 建立排除受眾 |

**Overlap 回應格式**:
```json
{
  "pairs": [
    {
      "audience_a": { "id": "uuid", "name": "Website Visitors" },
      "audience_b": { "id": "uuid", "name": "Lookalike 1%" },
      "overlap_rate": 0.35,
      "status": "danger",
      "recommendation": "Consider excluding one audience from the other"
    }
  ]
}
```

#### 健檢系統

| 方法 | 端點 | 說明 |
|-----|------|------|
| POST | `/api/v1/audits` | 觸發健檢 |
| GET | `/api/v1/audits/:id` | 健檢報告 |
| GET | `/api/v1/audits/:id/issues` | 問題清單 |
| POST | `/api/v1/issues/:id/resolve` | 標記解決 |
| POST | `/api/v1/issues/:id/auto-fix` | 自動修復 |

**Audit 回應格式**:
```json
{
  "id": "uuid",
  "account_id": "uuid",
  "overall_score": 72,
  "dimensions": {
    "structure": { "score": 85, "weight": 0.20, "issues": 2 },
    "creative": { "score": 60, "weight": 0.25, "issues": 5 },
    "audience": { "score": 75, "weight": 0.25, "issues": 3 },
    "budget": { "score": 80, "weight": 0.20, "issues": 1 },
    "tracking": { "score": 65, "weight": 0.10, "issues": 2 }
  },
  "grade": "GOOD",
  "issues_count": 13,
  "created_at": "2024-12-07T10:30:00Z"
}
```

#### 行動中心

| 方法 | 端點 | 說明 |
|-----|------|------|
| GET | `/api/v1/recommendations` | 建議清單 |
| POST | `/api/v1/recommendations/:id/execute` | 執行建議 |
| POST | `/api/v1/recommendations/:id/ignore` | 忽略建議 |
| GET | `/api/v1/history` | 操作歷史 |
| POST | `/api/v1/history/:id/revert` | 還原操作 |

---

## 4. 計算公式規格

### 4.1 素材疲勞度計算

```
疲勞度 = (CTR變化率權重 × 40%) + (投放頻率權重 × 30%)
       + (投放天數權重 × 20%) + (轉換率變化權重 × 10%)
```

**各因子評分標準 (0-100)**:

| 因子 | 0-25 分 | 26-50 分 | 51-75 分 | 76-100 分 |
|-----|---------|---------|---------|----------|
| CTR 變化 | > 0% | 0% ~ -10% | -10% ~ -20% | < -20% |
| 頻率 | < 2 | 2-3 | 3-4 | > 4 |
| 天數 | < 7 天 | 7-14 天 | 14-30 天 | > 30 天 |
| 轉換率變化 | > 0% | 0% ~ -10% | -10% ~ -20% | < -20% |

**疲勞警示門檻**:

| 狀態 | 分數範圍 | 建議行動 |
|-----|---------|---------|
| 🟢 健康 | 0 - 40 | 持續投放 |
| 🟡 注意 | 41 - 70 | 準備替換素材 |
| 🔴 疲勞 | 71 - 100 | 立即更換素材 |

### 4.2 受眾健康度評分

| 維度 | 權重 | 健康標準 | 問題標準 |
|-----|------|---------|---------|
| 受眾規模 | 25% | 10K - 2M | < 5K 或 > 10M |
| CPA 表現 | 35% | 低於平均 | 高於平均 30%+ |
| ROAS 表現 | 25% | > 1.5x | < 1.0x |
| 更新新鮮度 | 15% | < 30 天 | > 60 天 |

### 4.3 異常判定規則

| 指標 | 正常 (🟢) | 警示 (🟡) | 異常 (🔴) |
|-----|----------|----------|----------|
| CPA 變化 | < +10% | +10% ~ +30% | > +30% |
| ROAS 變化 | > -10% | -10% ~ -30% | < -30% |
| CTR 變化 | > -15% | -15% ~ -30% | < -30% |
| 花費進度 | 80% ~ 100% | 50% ~ 80% 或 > 100% | < 50% |

### 4.4 優先級分數計算

```
優先級分數 = 嚴重度基礎分 + 金額影響分 + 修復難度分 + 影響範圍分

- 嚴重度基礎分：Critical=100, High=70, Medium=40, Low=20
- 金額影響分：預估影響金額 / 100（上限 50 分）
- 修復難度分：一鍵=30, 簡單=20, 中等=10, 複雜=0
- 影響範圍分：每個受影響實體 +5 分（無上限）
```

---

## 5. 健檢維度規格

### 5.1 帳戶結構檢查（權重 20%）

| 檢查項目 | 健康標準 | 扣分 |
|---------|---------|------|
| 廣告活動命名 | 有清晰命名規則 | -5 |
| 廣告組數量 | 每活動 3-10 個 | -10 |
| 廣告組內廣告數 | 每組 3-6 則 | -8 |
| 目標一致性 | 轉換目標有設追蹤 | -15 |
| 受眾競爭 | 無同受眾多廣告組 | -12 |

### 5.2 素材品質檢查（權重 25%）

| 檢查項目 | 健康標準 | 扣分 |
|---------|---------|------|
| 素材多樣性 | ≥ 3 種類型 | -10 |
| 素材疲勞度 | CTR 週降幅 < 15% | -12 |
| 投放頻率 | < 3 次 | -8 |
| 素材新鮮度 | < 30 天有新素材 | -10 |
| 文案長度 | 標題未被截斷 | -5 |

### 5.3 受眾設定檢查（權重 25%）

| 檢查項目 | 健康標準 | 扣分 |
|---------|---------|------|
| 受眾規模 | 10K - 2M | -10 |
| 受眾重疊率 | < 20% | -12 |
| 排除設定 | 有排除已購買者 | -15 |
| Lookalike 品質 | 基於購買者 | -8 |
| 受眾新鮮度 | < 30 天更新 | -10 |

### 5.4 預算配置檢查（權重 20%）

| 檢查項目 | 健康標準 | 扣分 |
|---------|---------|------|
| 預算效率分配 | 低效活動 < 30% | -15 |
| 預算消耗率 | 80% - 100% | -10 |
| 學習期預算 | ≥ 10 次轉換/天 | -12 |
| 出價策略 | 符合目標 | -10 |

### 5.5 追蹤設定檢查（權重 10%）

| 檢查項目 | 健康標準 | 扣分 |
|---------|---------|------|
| 轉換追蹤 | 已設定且有數據 | -20 |
| Pixel 狀態 | 正常觸發 | -18 |
| 事件完整性 | 追蹤完整漏斗 | -10 |
| UTM 參數 | 有一致的 UTM | -8 |

### 5.6 健康分數等級

| 分數範圍 | 等級 | 說明 |
|---------|------|------|
| 90 - 100 | 🏆 優秀 | 帳戶狀態極佳 |
| 70 - 89 | ✅ 良好 | 有小問題需關注 |
| 50 - 69 | ⚠️ 需改善 | 多個問題需處理 |
| 0 - 49 | 🚨 危險 | 嚴重問題需立即處理 |

---

## 6. 數據同步規格

### 6.1 同步頻率

| 項目 | 規格 |
|-----|------|
| 同步頻率 | 每 15-30 分鐘 |
| 數據保留 | 90 天詳細數據 |
| 延遲容忍 | < 1 小時 |
| 失敗重試 | 3 次，指數退避 |

### 6.2 速率限制處理

- 使用 Token Bucket 演算法
- 請求佇列管理
- 錯誤重試機制（指數退避）

---

## 7. 安全規格

### 7.1 認證與授權

- JWT Token 認證
- OAuth 2.0 for Google/Meta
- 角色基礎存取控制 (RBAC)

### 7.2 數據安全

- 所有 API 通訊使用 HTTPS
- 敏感資料加密儲存
- API Keys 存放於環境變數

### 7.3 API Keys 管理

- 所有 keys 存放於 `.env` 檔案
- `.env` 加入 `.gitignore`
- 定期輪換 tokens

---

## 8. 參考資源

- [Google Ads API Documentation](https://developers.google.com/google-ads/api/docs/start)
- [Meta Marketing API Documentation](https://developers.facebook.com/docs/marketing-apis)
- [Google Ads Best Practices](https://support.google.com/google-ads/answer/6154846)
- [Meta Ads Best Practices](https://www.facebook.com/business/help/202297959811696)

---

## ✅ 完成條件（Done Criteria）

當滿足以下條件時，此技術規格視為 **Completed**：

- [ ] 所有資料表已在 PostgreSQL 中建立
- [ ] 所有 API 端點可正常回應
- [ ] 計算公式已實作並測試通過
- [ ] 健檢系統可產生正確評分
- [ ] 數據同步每 15-30 分鐘執行一次
