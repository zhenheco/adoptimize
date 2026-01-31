# 多平台廣告整合設計文件

> 建立日期：2026-01-30
> 狀態：已確認，待實作

## 1. 需求摘要

| 項目 | 決定 |
|------|------|
| 功能範圍 | 完整功能（OAuth + 帳戶管理 + 健檢 + 數據同步） |
| 開發方法 | TDD（Red-Green-Refactor） |
| API 狀態 | 全部未申請 → Mock-First 策略 |
| 測試架構 | pytest（後端）+ Vitest（前端） |
| 功能開關 | 環境變數白名單（BETA_WHITELIST_EMAILS） |
| 數據模型 | 統一模型（現有 campaigns/ad_sets/ads 表） |
| 開發順序 | TikTok → Reddit → LINE → LinkedIn |
| 開發策略 | 垂直切片（一次完成一個平台的所有層級） |

---

## 2. 檔案結構

每個平台新增的檔案（以 TikTok 為例）：

```
backend/
├── app/
│   ├── routers/
│   │   └── oauth_tiktok.py          # OAuth 路由
│   ├── services/
│   │   ├── tiktok_api_client.py     # API 客戶端（真實/Mock 切換）
│   │   └── sync_tiktok.py           # 數據同步服務
│   └── tests/
│       ├── unit/
│       │   ├── test_tiktok_oauth.py
│       │   ├── test_tiktok_api_client.py
│       │   └── test_sync_tiktok.py
│       └── integration/
│           └── test_tiktok_flow.py

src/  (Next.js 前端)
├── app/
│   └── api/v1/accounts/
│       ├── connect/tiktok/route.ts   # 連接代理
│       └── callback/tiktok/route.ts  # 回調代理
└── components/
    └── dashboard/
        └── __tests__/
            └── tiktok-connect.test.tsx
```

---

## 3. Mock 切換機制

```python
# backend/app/services/tiktok_api_client.py

class TikTokAPIClient:
    def __init__(self, use_mock: bool = None):
        if use_mock is None:
            use_mock = os.getenv("USE_MOCK_ADS_API", "true") == "true"
        self.use_mock = use_mock
```

環境變數 `USE_MOCK_ADS_API=true` 時使用 Mock，API 通過後改成 `false`。

---

## 4. 測試策略

### 測試金字塔

```
                 ┌─────────────┐
                 │   E2E 測試   │  ← 手動測試（真實 API 後）
                 │  (少量)      │
                 └─────────────┘
              ┌─────────────────────┐
              │    整合測試          │  ← OAuth 流程、API 代理
              │   (中等數量)         │
              └─────────────────────┘
         ┌─────────────────────────────────┐
         │         單元測試                  │  ← 服務邏輯、數據轉換
         │        (大量)                    │
         └─────────────────────────────────┘
```

### 每個平台的測試案例

| 類型 | 測試檔案 | 測試案例數 |
|------|----------|-----------|
| 單元 | `test_{platform}_api_client.py` | ~15 個 |
| 單元 | `test_sync_{platform}.py` | ~20 個 |
| 整合 | `test_{platform}_oauth.py` | ~8 個 |
| 整合 | `test_{platform}_flow.py` | ~5 個 |
| 前端 | `{platform}-connect.test.tsx` | ~6 個 |

---

## 5. OAuth 流程設計

### 各平台 OAuth 特性

| 平台 | Token 類型 | 有效期 | 刷新機制 | 特殊需求 |
|------|-----------|--------|----------|----------|
| TikTok | Access + Refresh | 24hr / 365天 | Refresh Token | 需要 `advertiser_id` |
| Reddit | Access + Refresh | 24hr / 永久 | Refresh Token | 需要 Basic Auth header |
| LINE | Access | 不明 | 重新授權 | 需要 Business Manager |
| LinkedIn | Access + Refresh | 60天 / 365天 | Refresh Token | 需要公司帳號 |

### 統一路由結構

```
GET /api/v1/accounts/connect/{platform}/auth
  → 產生授權 URL + state（存 Redis）

GET /api/v1/accounts/connect/{platform}/callback
  → 驗證 state + 交換 token + 儲存帳戶

POST /api/v1/accounts/connect/{platform}/refresh
  → 刷新 token（如適用）
```

### Mock OAuth 實作

```python
class MockTikTokOAuth:
    def get_auth_url(self, state: str) -> str:
        return f"/api/v1/accounts/callback/tiktok?code=MOCK_CODE&state={state}"

    def exchange_token(self, code: str) -> dict:
        return {
            "access_token": "mock_access_token_tiktok",
            "refresh_token": "mock_refresh_token_tiktok",
            "expires_in": 86400,
            "advertiser_ids": ["mock_adv_001", "mock_adv_002"]
        }
```

---

## 6. 數據同步設計

### 統一數據模型映射

| 平台 | 原生結構 | 映射到 |
|------|----------|--------|
| TikTok | Campaign → Ad Group → Ad | campaigns → ad_sets → ads |
| Reddit | Campaign → Ad Group → Ad | campaigns → ad_sets → ads |
| LINE | Campaign → Ad Group → Ad | campaigns → ad_sets → ads |
| LinkedIn | Campaign Group → Campaign → Ad | campaigns → ad_sets → ads |

### 同步服務基底類別

```python
class BasePlatformSync(ABC):
    """所有平台同步服務的基底類別"""

    @abstractmethod
    async def sync_campaigns(self, account_id: UUID) -> list[Campaign]:
        pass

    @abstractmethod
    async def sync_ad_sets(self, account_id: UUID) -> list[AdSet]:
        pass

    @abstractmethod
    async def sync_ads(self, account_id: UUID) -> list[Ad]:
        pass

    @abstractmethod
    async def sync_metrics(self, account_id: UUID, date_range: DateRange) -> list[Metric]:
        pass
```

---

## 7. 前端設計

### 平台配置

```tsx
const PLATFORMS = [
  { id: 'google', name: 'Google Ads', icon: GoogleIcon, color: 'bg-red-500' },
  { id: 'meta', name: 'Meta Ads', icon: MetaIcon, color: 'bg-blue-500' },
  { id: 'tiktok', name: 'TikTok Ads', icon: TikTokIcon, color: 'bg-black' },
  { id: 'reddit', name: 'Reddit Ads', icon: RedditIcon, color: 'bg-orange-500' },
  { id: 'line', name: 'LINE Ads', icon: LineIcon, color: 'bg-green-500' },
  { id: 'linkedin', name: 'LinkedIn Ads', icon: LinkedInIcon, color: 'bg-blue-700' },
] as const;
```

### 白名單邏輯

非白名單用戶看到「敬請期待」，白名單用戶看到連接按鈕。

---

## 8. 環境變數

### 後端（Fly.io）

```bash
# Mock 模式開關
USE_MOCK_ADS_API=true

# TikTok
TIKTOK_APP_ID=xxx
TIKTOK_APP_SECRET=xxx

# Reddit
REDDIT_CLIENT_ID=xxx
REDDIT_CLIENT_SECRET=xxx

# LINE
LINE_CHANNEL_ID=xxx
LINE_CHANNEL_SECRET=xxx

# LinkedIn
LINKEDIN_CLIENT_ID=xxx
LINKEDIN_CLIENT_SECRET=xxx

# 功能白名單（現有）
BETA_WHITELIST_EMAILS=acejou27@gmail.com
```

### 前端（Vercel）

```bash
NEXT_PUBLIC_TIKTOK_APP_ID=xxx
NEXT_PUBLIC_REDDIT_CLIENT_ID=xxx
NEXT_PUBLIC_LINE_CHANNEL_ID=xxx
NEXT_PUBLIC_LINKEDIN_CLIENT_ID=xxx
```

---

## 9. 功能開關

```python
def is_platform_enabled(user_email: str, platform: str) -> bool:
    # Google/Meta 對所有人開放
    if platform in ["google", "meta"]:
        return True

    # 其他平台檢查白名單
    whitelist = os.getenv("BETA_WHITELIST_EMAILS", "").split(",")
    return user_email in [e.strip() for e in whitelist]
```

---

## 10. TDD 實作順序（每個平台）

```
1. 🔴 寫 OAuth 授權 URL 生成測試 → 失敗
2. 🟢 實作 OAuth 路由 → 通過
3. 🔵 重構

4. 🔴 寫 OAuth 回調處理測試 → 失敗
5. 🟢 實作回調邏輯 → 通過
6. 🔵 重構

7. 🔴 寫 API Client Mock 測試 → 失敗
8. 🟢 實作 Mock API Client → 通過
9. 🔵 重構

10. 🔴 寫數據同步測試 → 失敗
11. 🟢 實作同步服務 → 通過
12. 🔵 重構

13. 🔴 寫前端連接測試 → 失敗
14. 🟢 實作前端元件 → 通過
15. 🔵 重構

16. 🔴 寫整合測試 → 失敗
17. 🟢 完成整合 → 通過
18. 🔵 最終重構
```

---

## 11. 預估工時

| 平台 | 預估時間 | 備註 |
|------|----------|------|
| TikTok | 40-50 hr | 第一個，建立模式 |
| Reddit | 30-40 hr | 複製 TikTok 模式 |
| LINE | 40-50 hr | 文件較少，可能需要更多探索 |
| LinkedIn | 35-45 hr | OAuth 較複雜 |

**總計：145-185 小時**
