# SDD v2.0 遷移設計文件

> **建立日期**：2026-01-23
> **狀態**：待實作
> **參考文件**：`docs/AdOptimize_SDD_v2.0.md`

---

## 1. 專案背景

根據 SDD v2.0，專案定位從「代操公司工具」轉變為「中小企業老闆的 AI 廣告顧問」。核心理念是：

> **「不用懂廣告，不用請人，AI 幫你投廣告、顧成效、省預算」**

本設計文件描述如何將現有專案遷移至 SDD v2.0 架構。

---

## 2. 架構設計

### 2.1 整體架構

```
┌─────────────────────────────────────────────────────────────┐
│                  Next.js 前端（Vercel Pro）                   │
│  • 簡化儀表板  • 自動駕駛設定  • AI 創作  • 報告查看          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              FastAPI 後端（Fly.io 免費版）                    │
├─────────────────────────────────────────────────────────────┤
│  API 服務              │  APScheduler 定時任務                │
│  • /api/dashboard      │  • 每 15 分鐘：自動駕駛檢查          │
│  • /api/autopilot      │  • 每天 21:00：每日摘要              │
│  • /api/reports        │  • 每週一 09:00：週報                │
│  • /api/ai/copywriting │  • 每月 1 號：月報                   │
└─────────────────────────────────────────────────────────────┘
         │                           │
         ▼                           ▼
  ┌─────────────┐            ┌─────────────┐
  │  PostgreSQL │            │    Redis    │
  │  (Supabase) │            │  (Upstash)  │
  └─────────────┘            └─────────────┘
```

### 2.2 技術選型決策

| 項目 | 決策 | 理由 |
|------|------|------|
| 定時任務 | APScheduler | 不需額外 Worker process，Fly.io 免費版足夠 |
| 後端語言 | 保留 Python | 變動最小，已有完整後端 |
| 前端部署 | Vercel Pro | 用戶已有 Pro 版 |
| 後端部署 | Fly.io 免費版 | 256MB RAM 足夠運行 |

---

## 3. 資料庫變更

### 3.1 新增表：`autopilot_logs`

自動駕駛執行記錄表。

```sql
CREATE TABLE autopilot_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ad_account_id   UUID NOT NULL REFERENCES ad_accounts(id) ON DELETE CASCADE,

    -- 動作資訊
    action_type     VARCHAR(50) NOT NULL,  -- pause_ad, adjust_budget, pause_creative
    target_type     VARCHAR(50) NOT NULL,  -- campaign, ad_set, ad, creative
    target_id       VARCHAR(255) NOT NULL, -- 外部平台的 ID
    target_name     VARCHAR(255),          -- 廣告名稱（方便顯示）

    -- 執行細節
    reason          TEXT NOT NULL,         -- 白話原因：「成本超標 20%」
    before_state    JSONB,                 -- 執行前狀態
    after_state     JSONB,                 -- 執行後狀態
    estimated_savings DECIMAL(12,2),       -- 預估節省金額

    -- 狀態
    status          VARCHAR(20) DEFAULT 'executed',  -- executed, pending, failed
    executed_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_autopilot_logs_account ON autopilot_logs(ad_account_id);
CREATE INDEX idx_autopilot_logs_executed_at ON autopilot_logs(executed_at DESC);
```

### 3.2 新增表：`reports`

報告記錄表。

```sql
CREATE TABLE reports (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- 報告類型
    report_type     VARCHAR(20) NOT NULL,  -- daily, weekly, monthly
    period_start    DATE NOT NULL,
    period_end      DATE NOT NULL,

    -- 報告內容
    content         JSONB NOT NULL,        -- 結構化數據
    content_text    TEXT,                  -- 白話文字版（AI 生成）

    -- 發送狀態
    sent_via        VARCHAR(20),           -- line, email, web
    sent_at         TIMESTAMPTZ,

    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reports_user ON reports(user_id);
CREATE INDEX idx_reports_type_period ON reports(report_type, period_start DESC);
```

### 3.3 修改表：`ad_accounts`

新增自動駕駛相關欄位。

```sql
ALTER TABLE ad_accounts ADD COLUMN
    autopilot_enabled BOOLEAN DEFAULT FALSE;

ALTER TABLE ad_accounts ADD COLUMN
    autopilot_settings JSONB DEFAULT '{
        "target_cpa": null,
        "monthly_budget": null,
        "goal_type": "maximize_conversions",
        "auto_pause_enabled": true,
        "auto_adjust_budget_enabled": true,
        "auto_boost_enabled": false,
        "notify_before_action": false
    }';
```

---

## 4. 前端設計

### 4.1 導航結構

```
┌──────────────────────────┐
│  🚢 廣告船長              │
├──────────────────────────┤
│                          │
│  🏠 首頁                  │  /dashboard
│                          │
│  🚗 自動駕駛              │  /autopilot
│                          │
│  ✨ AI 創作               │  /ai-studio
│                          │
│  📊 報告                  │  /reports
│                          │
│  🔗 帳號連接              │  /accounts
│                          │
├──────────────────────────┤
│  ⚙️ 設定                  │  /settings
│  🚪 登出                  │
└──────────────────────────┘
```

### 4.2 移除的頁面

以下頁面將被移除，功能整合到自動駕駛：

- `/creatives` - 素材管理
- `/audiences` - 受眾分析
- `/health` - 帳戶健檢
- `/actions` - 行動中心

### 4.3 首頁儀表板設計

簡化為 3 個核心指標 + AI 執行記錄 + 待決定事項。

**核心指標：**
- 💰 已花費（含預算剩餘百分比）
- 📦 訂單數（含每筆訂單成本）
- 📈 投報率（含紅綠燈狀態）

**用語對照：**
| 專業術語 | 白話說法 |
|---------|---------|
| CPA | 每筆訂單成本 |
| ROAS | 投報率 |
| Impressions | 曝光次數 |
| Conversions | 訂單數 |

### 4.4 自動駕駛設定頁面

**目標設定：**
- 目標類型（最大化訂單/營收/控制成本）
- 每筆訂單成本上限
- 每月預算上限

**自動執行權限：**
- ☑ 自動暫停成本過高的廣告
- ☑ 自動暫停疲勞的素材
- ☑ 自動調整預算分配
- ☐ 自動加碼表現好的廣告

### 4.5 AI 創作頁面

**文案生成：**
- 輸入商品/服務描述
- AI 生成廣告標題和描述
- 顯示本月用量（X/20 組）

**圖片生成（預留）：**
- 顯示「升級解鎖」
- 素材包 +$1,990/月

---

## 5. 後端 API 設計

### 5.1 新增 API

| Method | Endpoint | 說明 |
|--------|----------|------|
| GET | `/api/v1/autopilot/settings` | 取得自動駕駛設定 |
| PUT | `/api/v1/autopilot/settings` | 更新自動駕駛設定 |
| GET | `/api/v1/autopilot/logs` | 取得執行記錄 |
| POST | `/api/v1/autopilot/toggle` | 啟用/停用自動駕駛 |
| GET | `/api/v1/reports` | 報告列表 |
| GET | `/api/v1/reports/{id}` | 報告詳情 |
| POST | `/api/v1/ai/copywriting` | AI 文案生成 |

### 5.2 修改 API

| Endpoint | 變更 |
|----------|------|
| `GET /api/v1/dashboard/overview` | 改為回傳簡化指標（花費、訂單、投報率） |

---

## 6. 自動駕駛規則

### 6.1 暫停規則

```python
PAUSE_RULES = [
    {
        "name": "high_cpa",
        "condition": "cpa > target_cpa * 1.2 AND days >= 3",
        "action": "pause_ad",
        "reason": "成本超標 20% 連續 3 天"
    },
    {
        "name": "creative_fatigue",
        "condition": "ctr_trend < -0.2 AND days >= 7",
        "action": "pause_creative",
        "reason": "素材疲勞（點擊率連續下降 7 天）"
    },
    {
        "name": "low_ctr",
        "condition": "ctr < 0.005 AND impressions > 1000 AND days >= 7",
        "action": "pause_ad",
        "reason": "點擊率過低"
    }
]
```

### 6.2 加碼規則

```python
BOOST_RULES = [
    {
        "name": "high_roas",
        "condition": "roas > 4 AND spend > 1000",
        "action": "increase_budget_20",
        "reason": "表現優異（投報率超過 4 倍）"
    }
]
```

### 6.3 執行流程

```
每 15 分鐘：
1. 載入所有啟用自動駕駛的帳戶
2. 同步最新數據
3. 評估每個規則
4. 執行符合條件的動作
5. 記錄到 autopilot_logs
6. 發送通知（未來：LINE）
```

---

## 7. 實作順序

### Phase 1: 基礎建設（1-2 週）

- [ ] 資料庫 migration（autopilot_logs、reports、ad_accounts 欄位）
- [ ] 後端 autopilot_engine 服務骨架
- [ ] APScheduler 整合到 FastAPI

### Phase 2: 前端重構（1-2 週）

- [ ] 側邊欄導航更新
- [ ] 簡化首頁儀表板
- [ ] 自動駕駛設定頁面
- [ ] 移除舊頁面（素材、受眾、健檢、行動中心）

### Phase 3: 核心功能（2 週）

- [ ] 自動駕駛規則執行邏輯
- [ ] 執行記錄 API 與前端顯示
- [ ] 報告生成服務
- [ ] 報告列表頁面

### Phase 4: AI 創作（1 週）

- [ ] AI 創作頁面
- [ ] 文案生成 API（OpenAI 整合）
- [ ] 圖片生成（預留介面，顯示升級提示）

---

## 8. 暫不實作

以下功能留待未來 Phase 實作：

- LINE Bot 整合（Push 訊息費用考量）
- AI 對話顧問
- 競品監控
- WhatsApp / Telegram 整合

---

## 9. 風險與注意事項

1. **Fly.io 免費版限制**：256MB RAM，需確保 APScheduler 不會造成記憶體溢出
2. **OpenAI API 成本**：文案生成需控制 token 用量，建議用 GPT-4o-mini
3. **資料庫遷移**：需先在 staging 環境測試 migration
4. **前端頁面移除**：確保沒有外部連結指向被移除的頁面

---

**文件結束**

*最後更新：2026-01-23*
