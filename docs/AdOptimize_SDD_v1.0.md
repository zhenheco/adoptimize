# AdOptimize - 軟體設計規格書 (SDD)

> **版本**：1.0  
> **建立日期**：2026-01-09  
> **專案代號**：AdOptimize  
> **定位**：代操公司的效率武器

---

## 1. 系統概述

### 1.1 專案目標

建立一套專為**台灣廣告代操公司**設計的半自動化廣告優化平台，透過 AI 建議 + 人工確認 + 一鍵執行的模式，幫助代操公司大幅降低廣告管理的時間成本，同時提升廣告投放效率。

### 1.2 核心價值主張

| 價值 | 說明 |
|-----|------|
| **節省時間** | 減少 90% 手動檢查時間，每月省下 40+ 小時 |
| **避免浪費** | 即時發現問題，阻止無效廣告支出 |
| **降低門檻** | 透過系統建議優化，降低專業知識門檻 |
| **規模化管理** | 同時管理多個客戶帳戶，提升接案能力 |

### 1.3 目標客群

| 客群 | 描述 | 預算規模 |
|-----|------|---------|
| **主要客群** | 小型代操公司、Freelancer | 管理 3-30 個帳戶 |
| **次要客群** | 月廣告預算 ≤ NT$20,000 的小廣告主 | NT$5,000 - 20,000/月 |

### 1.4 商業模式

| 方案 | 月費 | 帳戶數 | 同步頻率 | 一鍵執行 | 主要功能 |
|-----|------|-------|---------|---------|---------|
| **Starter** | NT$1,500 | 3 | 2次/天 | 10次/月 | 健檢、素材疲勞度、Email 通知 |
| **Professional** ⭐ | NT$2,800 | 10 | 15分鐘 | 無限 | + 受眾分析、趨勢分析 |
| **Agency** | NT$6,800 | 30 | 5分鐘 | 無限 | + 批次操作、白標報告、自動化規則 |
| **Enterprise** | NT$15,000+ | 無限 | 即時 | 無限 | + API、專屬支援 |

### 1.5 系統範圍

| 模組 | 功能描述 | MVP 階段 |
|------|---------|:--------:|
| 帳戶連接 | OAuth 連接 Google Ads / Meta Ads | ✅ Phase 1 |
| 數據儀表板 | 跨平台整合檢視、核心指標、趨勢圖 | ✅ Phase 1 |
| 廣告健檢 | 五維度評分、問題清單、修復建議 | ✅ Phase 1 |
| 素材管理 | 素材疲勞度監控、替換建議 | ✅ Phase 1 |
| 行動中心 | 一鍵執行、操作歷史 | ✅ Phase 1 |
| 通知系統 | Email 異常通知、週報 | ✅ Phase 1 |
| 受眾分析 | 受眾健康度、重疊分析 | Phase 2 |
| 成效報告 | ROI 計算、價值展示 | Phase 2 |
| 批次操作 | 多帳戶同時處理 | Phase 2 |
| 白標報告 | 客製化 Logo 報告 | Phase 3 |
| 自動化規則 | 條件觸發自動執行 | Phase 3 |
| 子帳號 | 團隊成員管理 | Phase 3 |

### 1.6 技術架構

```mermaid
graph TB
    subgraph Frontend[前端層]
        WEB[Web 應用程式<br/>React + TypeScript]
    end
    
    subgraph Backend[後端層 - Python]
        API[FastAPI<br/>RESTful API]
        SERVICE[業務邏輯服務層]
        RULE[規則引擎]
        SYNC[數據同步服務]
    end
    
    subgraph Queue[任務佇列]
        CELERY[Celery Workers]
        REDIS[(Redis)]
    end
    
    subgraph Database[資料層]
        DB[(PostgreSQL)]
        CACHE[(Redis Cache)]
    end
    
    subgraph External[外部 API]
        GOOGLE[Google Ads API]
        META[Meta Marketing API]
    end
    
    WEB --> API
    API --> SERVICE
    SERVICE --> RULE
    SERVICE --> DB
    SYNC --> CELERY
    CELERY --> REDIS
    CELERY --> GOOGLE
    CELERY --> META
    CELERY --> DB
    API --> CACHE
```

### 1.7 技術規格

| 層級 | 技術 | 版本需求 | 說明 |
|------|------|---------|------|
| **後端框架** | Python + FastAPI | 3.11+ | 高效能非同步 API |
| **資料庫** | PostgreSQL | 15+ | 支援 JSONB、支援時序數據 |
| **快取/佇列** | Redis | 7+ | 任務佇列、數據快取 |
| **任務排程** | Celery | 5.3+ | 背景任務、定時同步 |
| **前端框架** | React + TypeScript | 18+ | 組件化開發、類型安全 |
| **CSS 框架** | Tailwind CSS | 3.x | 快速開發響應式 UI |
| **圖表庫** | Recharts | 2.x | 數據視覺化 |
| **部署** | AWS | - | EC2 + RDS + ElastiCache |

### 1.8 專案結構

```
/adoptimize/
├── backend/                        # 後端應用
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                # FastAPI 入口
│   │   ├── config.py              # 設定檔
│   │   ├── api/                   # API 路由
│   │   │   ├── __init__.py
│   │   │   ├── auth.py            # 認證相關
│   │   │   ├── accounts.py        # 帳戶連接
│   │   │   ├── dashboard.py       # 儀表板
│   │   │   ├── audits.py          # 健檢
│   │   │   ├── creatives.py       # 素材管理
│   │   │   ├── audiences.py       # 受眾分析
│   │   │   └── actions.py         # 行動中心
│   │   ├── models/                # 資料模型
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── ad_account.py
│   │   │   ├── campaign.py
│   │   │   ├── creative.py
│   │   │   ├── audience.py
│   │   │   ├── audit.py
│   │   │   └── action.py
│   │   ├── services/              # 業務邏輯
│   │   │   ├── __init__.py
│   │   │   ├── sync_service.py    # 數據同步
│   │   │   ├── audit_service.py   # 健檢服務
│   │   │   ├── fatigue_calculator.py  # 疲勞度計算
│   │   │   ├── rule_engine.py     # 規則引擎
│   │   │   └── notification_service.py  # 通知服務
│   │   ├── integrations/          # 外部整合
│   │   │   ├── __init__.py
│   │   │   ├── google_ads.py
│   │   │   └── meta_ads.py
│   │   └── utils/                 # 工具函式
│   │       ├── __init__.py
│   │       └── helpers.py
│   ├── tasks/                     # Celery 任務
│   │   ├── __init__.py
│   │   ├── sync_tasks.py
│   │   └── notification_tasks.py
│   ├── migrations/                # 資料庫遷移
│   ├── tests/                     # 測試
│   │   ├── unit/
│   │   └── integration/
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/                      # 前端應用
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── utils/
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

### 1.9 開發規範

#### 1.9.1 命名規範

| 類型 | 規範 | 範例 |
|------|------|------|
| 類別名稱 | PascalCase | `AdAccount`, `AuditService` |
| 函式/方法 | snake_case | `get_account_by_id()`, `calculate_fatigue()` |
| 變數名稱 | snake_case | `account_id`, `total_spend` |
| 常數 | UPPER_SNAKE_CASE | `SYNC_INTERVAL_MINUTES` |
| 資料表 | snake_case (複數) | `ad_accounts`, `audit_issues` |
| API 端點 | kebab-case | `/api/ad-accounts`, `/api/health-audits` |

#### 1.9.2 Python 型別提示

```python
from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from enum import Enum

class Platform(str, Enum):
    GOOGLE_ADS = "google_ads"
    META_ADS = "meta_ads"

class SyncStatus(str, Enum):
    PENDING = "pending"
    SYNCING = "syncing"
    COMPLETED = "completed"
    FAILED = "failed"

class AdAccount:
    def __init__(
        self,
        id: int,
        user_id: int,
        platform: Platform,
        account_name: str,
        external_account_id: str,
        sync_status: SyncStatus = SyncStatus.PENDING,
        last_synced_at: Optional[datetime] = None,
    ) -> None:
        self.id = id
        self.user_id = user_id
        self.platform = platform
        self.account_name = account_name
        self.external_account_id = external_account_id
        self.sync_status = sync_status
        self.last_synced_at = last_synced_at

def calculate_fatigue_score(
    ctr_change: float,
    frequency: float,
    days_running: int,
    conversion_rate_change: float
) -> int:
    """計算素材疲勞度分數 (0-100)"""
    ...
```

### 1.10 資料庫設定

```python
# app/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql://user:password@localhost:5432/adoptimize"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # Google Ads
    GOOGLE_ADS_DEVELOPER_TOKEN: str
    GOOGLE_ADS_CLIENT_ID: str
    GOOGLE_ADS_CLIENT_SECRET: str
    
    # Meta Ads
    META_APP_ID: str
    META_APP_SECRET: str
    
    # JWT
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 1440  # 24 hours
    
    # Sync Settings
    SYNC_INTERVAL_STARTER: int = 720      # 12 hours (2x/day)
    SYNC_INTERVAL_PROFESSIONAL: int = 15  # 15 minutes
    SYNC_INTERVAL_AGENCY: int = 5         # 5 minutes
    
    class Config:
        env_file = ".env"

settings = Settings()
```

---

## 2. 資料庫設計

### 2.1 實體關係圖 (ERD)

```mermaid
erDiagram
    USERS ||--o{ AD_ACCOUNTS : "owns"
    USERS ||--o{ SUBSCRIPTIONS : "has"
    
    AD_ACCOUNTS ||--o{ CAMPAIGNS : "contains"
    AD_ACCOUNTS ||--o{ AUDIENCES : "has"
    AD_ACCOUNTS ||--o{ HEALTH_AUDITS : "audited"
    AD_ACCOUNTS ||--o{ SYNC_LOGS : "synced"
    
    CAMPAIGNS ||--o{ AD_SETS : "contains"
    AD_SETS ||--o{ ADS : "contains"
    ADS ||--o{ CREATIVES : "uses"
    
    CREATIVES ||--o{ CREATIVE_METRICS_DAILY : "tracked"
    AUDIENCES ||--o{ AUDIENCE_METRICS_DAILY : "tracked"
    CAMPAIGNS ||--o{ CAMPAIGN_METRICS_DAILY : "tracked"
    
    HEALTH_AUDITS ||--o{ AUDIT_ISSUES : "found"
    AUDIT_ISSUES ||--o{ RECOMMENDATIONS : "generates"
    RECOMMENDATIONS ||--o{ ACTION_HISTORY : "executed"
    
    USERS ||--o{ NOTIFICATIONS : "receives"
    
    USERS {
        int id PK
        string email "唯一"
        string password_hash
        string name
        string company_name
        string subscription_tier "STARTER | PRO | AGENCY | ENTERPRISE"
        int monthly_action_count "本月一鍵執行次數"
        datetime created_at
        datetime updated_at
    }
    
    SUBSCRIPTIONS {
        int id PK
        int user_id FK
        string tier "STARTER | PRO | AGENCY | ENTERPRISE"
        decimal price
        date start_date
        date end_date
        string status "ACTIVE | CANCELLED | EXPIRED"
        datetime created_at
    }
    
    AD_ACCOUNTS {
        int id PK
        int user_id FK
        string platform "GOOGLE_ADS | META_ADS"
        string account_name
        string external_account_id
        text access_token_encrypted
        text refresh_token_encrypted
        string sync_status "PENDING | SYNCING | COMPLETED | FAILED"
        datetime last_synced_at
        int health_score "0-100"
        boolean is_active
        datetime created_at
        datetime updated_at
    }
    
    CAMPAIGNS {
        int id PK
        int ad_account_id FK
        string external_campaign_id
        string name
        string status "ENABLED | PAUSED | REMOVED"
        string objective
        decimal daily_budget
        decimal lifetime_budget
        string bid_strategy
        date start_date
        date end_date
        datetime created_at
        datetime updated_at
    }
    
    AD_SETS {
        int id PK
        int campaign_id FK
        string external_ad_set_id
        string name
        string status "ENABLED | PAUSED | REMOVED"
        json targeting "定向設定 JSONB"
        decimal daily_budget
        datetime created_at
        datetime updated_at
    }
    
    ADS {
        int id PK
        int ad_set_id FK
        string external_ad_id
        string name
        string status "ENABLED | PAUSED | REMOVED"
        string review_status "APPROVED | PENDING | REJECTED"
        datetime created_at
        datetime updated_at
    }
    
    CREATIVES {
        int id PK
        int ad_id FK
        string creative_type "IMAGE | VIDEO | CAROUSEL | RESPONSIVE"
        string headline
        string description
        string url
        string media_url
        int fatigue_score "0-100"
        int days_running
        float frequency
        datetime created_at
        datetime updated_at
    }
    
    CREATIVE_METRICS_DAILY {
        int id PK
        int creative_id FK
        date metric_date
        int impressions
        int clicks
        decimal spend
        int conversions
        decimal ctr
        decimal cpc
        decimal cpa
        decimal roas
        float frequency
        datetime created_at
    }
    
    AUDIENCES {
        int id PK
        int ad_account_id FK
        string external_audience_id
        string name
        string audience_type "CUSTOM | LOOKALIKE | REMARKETING | INTEREST"
        int size_estimate
        int health_score "0-100"
        date last_updated
        datetime created_at
        datetime updated_at
    }
    
    AUDIENCE_METRICS_DAILY {
        int id PK
        int audience_id FK
        date metric_date
        decimal spend
        int conversions
        decimal cpa
        decimal roas
        datetime created_at
    }
    
    CAMPAIGN_METRICS_DAILY {
        int id PK
        int campaign_id FK
        date metric_date
        int impressions
        int clicks
        decimal spend
        int conversions
        decimal ctr
        decimal cpc
        decimal cpa
        decimal roas
        datetime created_at
    }
    
    HEALTH_AUDITS {
        int id PK
        int ad_account_id FK
        int overall_score "0-100"
        int structure_score "0-100"
        int creative_score "0-100"
        int audience_score "0-100"
        int budget_score "0-100"
        int tracking_score "0-100"
        int issues_count
        int critical_count
        int high_count
        int medium_count
        int low_count
        datetime created_at
    }
    
    AUDIT_ISSUES {
        int id PK
        int audit_id FK
        string dimension "STRUCTURE | CREATIVE | AUDIENCE | BUDGET | TRACKING"
        string severity "CRITICAL | HIGH | MEDIUM | LOW"
        string issue_code
        string title
        text description
        text recommendation
        json affected_entities "受影響的實體 JSONB"
        decimal estimated_waste "預估浪費金額"
        boolean is_auto_fixable
        string status "OPEN | FIXED | IGNORED"
        datetime created_at
        datetime updated_at
    }
    
    RECOMMENDATIONS {
        int id PK
        int issue_id FK
        int ad_account_id FK
        string action_type "PAUSE | ADJUST_BUDGET | CREATE_EXCLUSION | etc"
        string title
        text description
        json action_params "執行參數 JSONB"
        int priority_score
        decimal estimated_savings
        string status "PENDING | EXECUTED | IGNORED | REVERTED"
        datetime created_at
        datetime executed_at
    }
    
    ACTION_HISTORY {
        int id PK
        int user_id FK
        int recommendation_id FK
        string action_type
        json before_state "執行前狀態"
        json after_state "執行後狀態"
        boolean is_revertible
        boolean is_reverted
        datetime executed_at
        datetime reverted_at
    }
    
    NOTIFICATIONS {
        int id PK
        int user_id FK
        string notification_type "ALERT | WEEKLY_REPORT | SYSTEM"
        string severity "CRITICAL | HIGH | MEDIUM | LOW | INFO"
        string title
        text content
        json metadata
        boolean is_read
        boolean is_email_sent
        datetime created_at
        datetime read_at
    }
    
    SYNC_LOGS {
        int id PK
        int ad_account_id FK
        string sync_type "FULL | INCREMENTAL"
        string status "STARTED | COMPLETED | FAILED"
        int records_synced
        text error_message
        datetime started_at
        datetime completed_at
    }
```

### 2.2 資料表詳細規格

#### 2.2.1 `users` - 用戶資料表

| 欄位名稱 | 資料型態 | 約束 | 說明 |
|---------|---------|------|------|
| `id` | SERIAL | PK | 主鍵 |
| `email` | VARCHAR(255) | NOT NULL, UNIQUE | 登入信箱 |
| `password_hash` | VARCHAR(255) | NOT NULL | 密碼雜湊 |
| `name` | VARCHAR(100) | NOT NULL | 姓名 |
| `company_name` | VARCHAR(200) | NULL | 公司名稱 |
| `subscription_tier` | VARCHAR(20) | NOT NULL, DEFAULT 'STARTER' | 訂閱層級 |
| `monthly_action_count` | INT | NOT NULL, DEFAULT 0 | 本月一鍵執行次數 |
| `action_count_reset_at` | DATE | NOT NULL | 次數重置日期 |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT TRUE | 是否啟用 |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 建立時間 |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 更新時間 |

#### 2.2.2 `ad_accounts` - 廣告帳戶表

| 欄位名稱 | 資料型態 | 約束 | 說明 |
|---------|---------|------|------|
| `id` | SERIAL | PK | 主鍵 |
| `user_id` | INT | FK → users.id, NOT NULL | 所屬用戶 |
| `platform` | VARCHAR(20) | NOT NULL | 平台：`GOOGLE_ADS`, `META_ADS` |
| `account_name` | VARCHAR(200) | NOT NULL | 帳戶名稱 |
| `external_account_id` | VARCHAR(100) | NOT NULL | 平台帳戶 ID |
| `access_token_encrypted` | TEXT | NULL | 加密的 Access Token |
| `refresh_token_encrypted` | TEXT | NULL | 加密的 Refresh Token |
| `token_expires_at` | TIMESTAMPTZ | NULL | Token 過期時間 |
| `sync_status` | VARCHAR(20) | NOT NULL, DEFAULT 'PENDING' | 同步狀態 |
| `last_synced_at` | TIMESTAMPTZ | NULL | 最後同步時間 |
| `health_score` | INT | NULL | 健康分數 0-100 |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT TRUE | 是否啟用 |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 建立時間 |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 更新時間 |

> **唯一約束**：`UNIQUE(user_id, platform, external_account_id)`

#### 2.2.3 `creatives` - 素材資料表

| 欄位名稱 | 資料型態 | 約束 | 說明 |
|---------|---------|------|------|
| `id` | SERIAL | PK | 主鍵 |
| `ad_id` | INT | FK → ads.id, NOT NULL | 所屬廣告 |
| `external_creative_id` | VARCHAR(100) | NULL | 平台素材 ID |
| `creative_type` | VARCHAR(20) | NOT NULL | 類型：`IMAGE`, `VIDEO`, `CAROUSEL`, `RESPONSIVE` |
| `headline` | VARCHAR(200) | NULL | 標題 |
| `description` | TEXT | NULL | 描述 |
| `url` | VARCHAR(500) | NULL | 連結網址 |
| `media_url` | VARCHAR(500) | NULL | 素材網址 |
| `fatigue_score` | INT | NOT NULL, DEFAULT 0 | 疲勞度 0-100 |
| `days_running` | INT | NOT NULL, DEFAULT 0 | 投放天數 |
| `frequency` | DECIMAL(5,2) | NULL | 頻率 |
| `status` | VARCHAR(20) | NOT NULL, DEFAULT 'ACTIVE' | 狀態 |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 建立時間 |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 更新時間 |

#### 2.2.4 `health_audits` - 健檢報告表

| 欄位名稱 | 資料型態 | 約束 | 說明 |
|---------|---------|------|------|
| `id` | SERIAL | PK | 主鍵 |
| `ad_account_id` | INT | FK → ad_accounts.id, NOT NULL | 受檢帳戶 |
| `overall_score` | INT | NOT NULL | 總分 0-100 |
| `structure_score` | INT | NOT NULL | 結構分數 0-100 |
| `creative_score` | INT | NOT NULL | 素材分數 0-100 |
| `audience_score` | INT | NOT NULL | 受眾分數 0-100 |
| `budget_score` | INT | NOT NULL | 預算分數 0-100 |
| `tracking_score` | INT | NOT NULL | 追蹤分數 0-100 |
| `issues_count` | INT | NOT NULL, DEFAULT 0 | 問題總數 |
| `critical_count` | INT | NOT NULL, DEFAULT 0 | 嚴重問題數 |
| `high_count` | INT | NOT NULL, DEFAULT 0 | 高優先問題數 |
| `medium_count` | INT | NOT NULL, DEFAULT 0 | 中優先問題數 |
| `low_count` | INT | NOT NULL, DEFAULT 0 | 低優先問題數 |
| `estimated_total_waste` | DECIMAL(12,2) | NULL | 預估總浪費金額 |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 建立時間 |

#### 2.2.5 `audit_issues` - 健檢問題表

| 欄位名稱 | 資料型態 | 約束 | 說明 |
|---------|---------|------|------|
| `id` | SERIAL | PK | 主鍵 |
| `audit_id` | INT | FK → health_audits.id, NOT NULL | 所屬健檢 |
| `dimension` | VARCHAR(20) | NOT NULL | 維度 |
| `severity` | VARCHAR(20) | NOT NULL | 嚴重度 |
| `issue_code` | VARCHAR(50) | NOT NULL | 問題代碼 |
| `title` | VARCHAR(200) | NOT NULL | 問題標題 |
| `description` | TEXT | NOT NULL | 問題描述 |
| `recommendation` | TEXT | NOT NULL | 建議做法 |
| `affected_entities` | JSONB | NULL | 受影響實體 |
| `estimated_waste` | DECIMAL(10,2) | NULL | 預估浪費 |
| `is_auto_fixable` | BOOLEAN | NOT NULL, DEFAULT FALSE | 可否自動修復 |
| `status` | VARCHAR(20) | NOT NULL, DEFAULT 'OPEN' | 狀態 |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 建立時間 |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 更新時間 |

#### 2.2.6 `recommendations` - 建議行動表

| 欄位名稱 | 資料型態 | 約束 | 說明 |
|---------|---------|------|------|
| `id` | SERIAL | PK | 主鍵 |
| `issue_id` | INT | FK → audit_issues.id | 關聯問題 |
| `ad_account_id` | INT | FK → ad_accounts.id, NOT NULL | 所屬帳戶 |
| `action_type` | VARCHAR(50) | NOT NULL | 行動類型 |
| `title` | VARCHAR(200) | NOT NULL | 行動標題 |
| `description` | TEXT | NOT NULL | 行動描述 |
| `action_params` | JSONB | NOT NULL | 執行參數 |
| `priority_score` | INT | NOT NULL | 優先級分數 |
| `estimated_savings` | DECIMAL(10,2) | NULL | 預估節省 |
| `status` | VARCHAR(20) | NOT NULL, DEFAULT 'PENDING' | 狀態 |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 建立時間 |
| `executed_at` | TIMESTAMPTZ | NULL | 執行時間 |

### 2.3 索引設計

```sql
-- 用戶查詢
CREATE INDEX idx_users_email ON users(email);

-- 帳戶查詢
CREATE INDEX idx_ad_accounts_user_id ON ad_accounts(user_id);
CREATE INDEX idx_ad_accounts_sync_status ON ad_accounts(sync_status);
CREATE INDEX idx_ad_accounts_platform ON ad_accounts(platform);

-- 素材查詢
CREATE INDEX idx_creatives_ad_id ON creatives(ad_id);
CREATE INDEX idx_creatives_fatigue_score ON creatives(fatigue_score DESC);

-- 指標查詢（時間範圍）
CREATE INDEX idx_creative_metrics_date ON creative_metrics_daily(creative_id, metric_date DESC);
CREATE INDEX idx_campaign_metrics_date ON campaign_metrics_daily(campaign_id, metric_date DESC);

-- 健檢查詢
CREATE INDEX idx_health_audits_account ON health_audits(ad_account_id, created_at DESC);
CREATE INDEX idx_audit_issues_audit ON audit_issues(audit_id);
CREATE INDEX idx_audit_issues_severity ON audit_issues(severity);
CREATE INDEX idx_audit_issues_status ON audit_issues(status);

-- 建議查詢
CREATE INDEX idx_recommendations_account ON recommendations(ad_account_id, status);
CREATE INDEX idx_recommendations_priority ON recommendations(priority_score DESC);

-- 通知查詢
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at DESC);
```

---

## 3. 種子資料 (Seed Data)

### 3.1 問題代碼定義

```sql
-- 問題代碼種子資料
INSERT INTO issue_definitions (code, dimension, severity, title, description_template, recommendation_template, is_auto_fixable) VALUES

-- 素材問題
('CREATIVE_FATIGUE_HIGH', 'CREATIVE', 'HIGH', '素材疲勞度過高', 
 '素材「{creative_name}」疲勞度已達 {fatigue_score} 分，CTR 下降 {ctr_drop}%',
 '建議立即暫停此素材，並準備新素材替換', TRUE),

('CREATIVE_FREQUENCY_HIGH', 'CREATIVE', 'MEDIUM', '投放頻率過高',
 '素材「{creative_name}」頻率已達 {frequency}，超過建議值 3.0',
 '建議擴大受眾範圍或暫停此素材', TRUE),

('CREATIVE_NO_REFRESH', 'CREATIVE', 'MEDIUM', '素材長期未更新',
 '廣告組「{ad_set_name}」已超過 {days} 天沒有新素材',
 '建議新增 2-3 個新素材進行測試', FALSE),

-- 受眾問題
('AUDIENCE_OVERLAP_HIGH', 'AUDIENCE', 'HIGH', '受眾重疊率過高',
 '受眾「{audience_1}」與「{audience_2}」重疊率達 {overlap_rate}%',
 '建議合併受眾或建立排除設定', TRUE),

('AUDIENCE_SIZE_SMALL', 'AUDIENCE', 'MEDIUM', '受眾規模過小',
 '受眾「{audience_name}」規模僅 {size}，低於建議值 10,000',
 '建議擴大定向條件或使用相似受眾擴展', FALSE),

('AUDIENCE_NO_EXCLUSION', 'AUDIENCE', 'HIGH', '未排除已轉換客戶',
 '廣告活動「{campaign_name}」未排除已購買/已轉換客戶',
 '建議建立排除受眾，避免浪費廣告費', TRUE),

-- 預算問題
('BUDGET_CPA_HIGH', 'BUDGET', 'HIGH', 'CPA 過高',
 '廣告活動「{campaign_name}」CPA 為 {cpa}，高於目標 {target_cpa} 達 {percent}%',
 '建議降低預算或暫停效果差的廣告組', TRUE),

('BUDGET_UNDERSPEND', 'BUDGET', 'MEDIUM', '預算消耗率過低',
 '廣告活動「{campaign_name}」預算消耗率僅 {spend_rate}%',
 '建議檢查出價策略或擴大定向', FALSE),

('BUDGET_LEARNING_INSUFFICIENT', 'BUDGET', 'MEDIUM', '學習期數據不足',
 '廣告組「{ad_set_name}」每日轉換僅 {conversions} 次，低於建議值 10 次',
 '建議增加預算以加速學習期', FALSE),

-- 追蹤問題
('TRACKING_PIXEL_ERROR', 'TRACKING', 'CRITICAL', 'Pixel 追蹤異常',
 '帳戶「{account_name}」的 Pixel 狀態異常：{error_detail}',
 '請立即檢查 Pixel 安裝，這會嚴重影響轉換追蹤', FALSE),

('TRACKING_NO_CONVERSION', 'TRACKING', 'CRITICAL', '轉換追蹤未設定',
 '轉換型廣告活動「{campaign_name}」未設定轉換追蹤',
 '請設定轉換追蹤，否則無法優化廣告效果', FALSE),

-- 結構問題
('STRUCTURE_TOO_FEW_ADS', 'STRUCTURE', 'MEDIUM', '廣告數量不足',
 '廣告組「{ad_set_name}」僅有 {ad_count} 則廣告，低於建議值 3 則',
 '建議新增廣告進行 A/B 測試', FALSE),

('STRUCTURE_TOO_MANY_ADS', 'STRUCTURE', 'LOW', '廣告數量過多',
 '廣告組「{ad_set_name}」有 {ad_count} 則廣告，超過建議值 6 則',
 '建議保留效果最佳的 3-5 則，暫停其餘廣告', TRUE);
```

### 3.2 訂閱方案定義

```sql
INSERT INTO subscription_plans (tier, name, price, max_accounts, sync_interval_minutes, monthly_action_limit, features) VALUES
('STARTER', '入門版', 1500, 3, 720, 10, 
 '{"health_audit": true, "fatigue_monitor": true, "one_click_execute": true, "email_notification": true, "audience_analysis": false, "batch_operation": false, "white_label": false, "automation_rules": false}'),

('PROFESSIONAL', '專業版', 2800, 10, 15, -1,
 '{"health_audit": true, "fatigue_monitor": true, "one_click_execute": true, "email_notification": true, "audience_analysis": true, "batch_operation": false, "white_label": false, "automation_rules": false}'),

('AGENCY', '代理商版', 6800, 30, 5, -1,
 '{"health_audit": true, "fatigue_monitor": true, "one_click_execute": true, "email_notification": true, "audience_analysis": true, "batch_operation": true, "white_label": true, "automation_rules": true}'),

('ENTERPRISE', '企業版', 15000, -1, 1, -1,
 '{"health_audit": true, "fatigue_monitor": true, "one_click_execute": true, "email_notification": true, "audience_analysis": true, "batch_operation": true, "white_label": true, "automation_rules": true, "api_access": true, "dedicated_support": true}');
```

---

## 4. API 設計規格

### 4.1 API 總覽

| HTTP Method | Endpoint | 說明 | 認證 |
|-------------|----------|------|:----:|
| **認證** ||||
| POST | `/api/auth/register` | 註冊 | ❌ |
| POST | `/api/auth/login` | 登入 | ❌ |
| POST | `/api/auth/refresh` | 更新 Token | ✅ |
| **帳戶連接** ||||
| GET | `/api/accounts` | 取得已連接帳戶列表 | ✅ |
| POST | `/api/accounts/connect/google` | 連接 Google Ads | ✅ |
| POST | `/api/accounts/connect/meta` | 連接 Meta Ads | ✅ |
| DELETE | `/api/accounts/{id}` | 斷開帳戶連接 | ✅ |
| POST | `/api/accounts/{id}/sync` | 手動觸發同步 | ✅ |
| **儀表板** ||||
| GET | `/api/dashboard/overview` | 總覽數據 | ✅ |
| GET | `/api/dashboard/metrics` | 詳細指標 | ✅ |
| GET | `/api/dashboard/trends` | 趨勢數據 | ✅ |
| GET | `/api/dashboard/alerts` | 異常警示 | ✅ |
| **健檢系統** ||||
| POST | `/api/audits` | 觸發健檢 | ✅ |
| GET | `/api/audits/{id}` | 取得健檢報告 | ✅ |
| GET | `/api/audits/{id}/issues` | 取得問題清單 | ✅ |
| GET | `/api/accounts/{id}/latest-audit` | 取得最新健檢 | ✅ |
| **素材管理** ||||
| GET | `/api/creatives` | 素材列表 | ✅ |
| GET | `/api/creatives/fatigued` | 疲勞素材列表 | ✅ |
| GET | `/api/creatives/{id}` | 素材詳情 | ✅ |
| GET | `/api/creatives/{id}/metrics` | 素材指標歷史 | ✅ |
| **行動中心** ||||
| GET | `/api/recommendations` | 建議清單 | ✅ |
| POST | `/api/recommendations/{id}/execute` | 執行建議 | ✅ |
| POST | `/api/recommendations/{id}/ignore` | 忽略建議 | ✅ |
| GET | `/api/actions/history` | 操作歷史 | ✅ |
| POST | `/api/actions/{id}/revert` | 還原操作 | ✅ |
| **通知** ||||
| GET | `/api/notifications` | 通知列表 | ✅ |
| PUT | `/api/notifications/{id}/read` | 標記已讀 | ✅ |
| PUT | `/api/notifications/read-all` | 全部已讀 | ✅ |

### 4.2 API 詳細規格

#### 4.2.1 儀表板總覽 `GET /api/dashboard/overview`

**Query Parameters:**
| 參數 | 類型 | 必填 | 說明 |
|-----|------|:----:|------|
| `account_ids` | string | ❌ | 帳戶 ID，逗號分隔，空值表示全部 |
| `date_range` | string | ❌ | `today`, `7d`, `30d`, `custom` |
| `start_date` | date | ❌ | 自訂開始日期 |
| `end_date` | date | ❌ | 自訂結束日期 |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "summary": {
      "total_spend": 125000,
      "total_impressions": 2500000,
      "total_clicks": 45000,
      "total_conversions": 850,
      "avg_ctr": 1.8,
      "avg_cpc": 2.78,
      "avg_cpa": 147.06,
      "avg_roas": 3.2
    },
    "comparison": {
      "spend_change": 12.5,
      "conversions_change": 8.3,
      "cpa_change": -5.2,
      "roas_change": 15.1
    },
    "alerts": [
      {
        "severity": "high",
        "type": "cpa_spike",
        "message": "客戶 A 帳戶 CPA 上升 35%",
        "account_id": 1,
        "account_name": "客戶 A"
      }
    ],
    "accounts_health": [
      {
        "account_id": 1,
        "account_name": "客戶 A",
        "platform": "google_ads",
        "health_score": 72,
        "issues_count": 5,
        "spend_today": 3500
      }
    ]
  }
}
```

#### 4.2.2 觸發健檢 `POST /api/audits`

**Request Body:**
```json
{
  "account_id": 1
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "audit_id": 150,
    "account_id": 1,
    "account_name": "客戶 A",
    "status": "processing",
    "message": "健檢已開始，預計 1-2 分鐘完成",
    "created_at": "2026-01-09T10:30:00+08:00"
  }
}
```

#### 4.2.3 取得健檢報告 `GET /api/audits/{id}`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": 150,
    "account_id": 1,
    "account_name": "客戶 A",
    "overall_score": 68,
    "grade": "需改善",
    "scores": {
      "structure": { "score": 75, "weight": 20, "issues": 2 },
      "creative": { "score": 55, "weight": 25, "issues": 4 },
      "audience": { "score": 70, "weight": 25, "issues": 3 },
      "budget": { "score": 80, "weight": 20, "issues": 1 },
      "tracking": { "score": 60, "weight": 10, "issues": 2 }
    },
    "summary": {
      "total_issues": 12,
      "critical": 1,
      "high": 4,
      "medium": 5,
      "low": 2,
      "auto_fixable": 6,
      "estimated_monthly_waste": 8500
    },
    "created_at": "2026-01-09T10:32:00+08:00"
  }
}
```

#### 4.2.4 執行建議 `POST /api/recommendations/{id}/execute`

**Request Body:**
```json
{
  "confirm": true,
  "notes": "客戶同意暫停"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "action_id": 500,
    "recommendation_id": 123,
    "action_type": "pause_creative",
    "status": "completed",
    "before_state": {
      "creative_id": "abc123",
      "status": "ENABLED"
    },
    "after_state": {
      "creative_id": "abc123",
      "status": "PAUSED"
    },
    "is_revertible": true,
    "executed_at": "2026-01-09T10:35:00+08:00",
    "message": "素材已成功暫停"
  }
}
```

**錯誤回應 (403 Forbidden) - 次數限制：**
```json
{
  "success": false,
  "error": {
    "code": "ACTION_LIMIT_EXCEEDED",
    "message": "本月一鍵執行次數已達上限 (10/10)",
    "detail": "升級至專業版可享無限次一鍵執行",
    "upgrade_url": "/pricing"
  }
}
```

---

## 5. 頁面功能規格

### 5.1 頁面總覽

| 頁面 | 路徑 | 說明 | MVP |
|-----|------|------|:---:|
| 登入 | `/login` | 用戶登入 | ✅ |
| 註冊 | `/register` | 用戶註冊 | ✅ |
| 儀表板 | `/dashboard` | 總覽數據 | ✅ |
| 帳戶管理 | `/accounts` | 連接/管理廣告帳戶 | ✅ |
| 健檢報告 | `/audits/{id}` | 單一帳戶健檢結果 | ✅ |
| 素材管理 | `/creatives` | 素材列表與疲勞度 | ✅ |
| 行動中心 | `/actions` | 待辦建議與執行 | ✅ |
| 操作歷史 | `/history` | 已執行操作記錄 | ✅ |
| 受眾分析 | `/audiences` | 受眾健康度與重疊 | Phase 2 |
| 成效報告 | `/reports` | ROI 價值報告 | Phase 2 |
| 設定 | `/settings` | 帳戶設定、通知偏好 | ✅ |

### 5.2 儀表板頁面

**路徑**: `/dashboard`

**功能區塊**:

```
┌─────────────────────────────────────────────────────────────────┐
│  📊 儀表板                           [今日] [7天] [30天] [自訂]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │ 總花費    │ │ 總轉換   │ │ 平均 CPA │ │ 平均 ROAS│            │
│  │ $125,000 │ │ 850      │ │ $147     │ │ 3.2x     │            │
│  │ ↑ 12.5%  │ │ ↑ 8.3%   │ │ ↓ 5.2%  │ │ ↑ 15.1%  │            │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘            │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                      趨勢圖                              │    │
│  │  [花費] [轉換] [CPA] [ROAS]                              │    │
│  │                                                          │    │
│  │  📈 (折線圖)                                             │    │
│  │                                                          │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌──────────────────────┐ ┌────────────────────────────────┐    │
│  │ ⚠️ 異常警示 (3)       │ │ 📋 帳戶健康狀況                │    │
│  │                       │ │                                │    │
│  │ 🔴 客戶A CPA +35%    │ │ 客戶A  🟡 72分  5問題  $3,500 │    │
│  │ 🟡 客戶B 素材疲勞    │ │ 客戶B  🟢 85分  2問題  $2,800 │    │
│  │ 🟡 客戶C 預算消耗低  │ │ 客戶C  🟡 65分  7問題  $1,200 │    │
│  │                       │ │ 客戶D  🔴 45分  12問題 $4,500 │    │
│  └──────────────────────┘ └────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.3 健檢報告頁面

**路徑**: `/audits/{id}`

**功能區塊**:

```
┌─────────────────────────────────────────────────────────────────┐
│  🏥 健檢報告 - 客戶 A                    [重新檢查] [匯出 PDF]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                          │    │
│  │            總分：68 / 100                                │    │
│  │            ⚠️ 需改善                                     │    │
│  │                                                          │    │
│  │    結構 ████████░░ 75    素材 █████░░░░░ 55             │    │
│  │    受眾 ███████░░░ 70    預算 ████████░░ 80             │    │
│  │    追蹤 ██████░░░░ 60                                    │    │
│  │                                                          │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  📊 問題摘要                                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │ 🔴 嚴重  │ │ 🟠 高    │ │ 🟡 中    │ │ 🟢 低    │            │
│  │    1     │ │    4     │ │    5     │ │    2     │            │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘            │
│                                                                  │
│  💰 預估每月浪費：NT$ 8,500                                      │
│  🔧 可自動修復：6 個問題                                         │
│                                                                  │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  📋 問題清單                        [全部] [可自動修復] [依維度] │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 🔴 CRITICAL | 追蹤                                       │    │
│  │ Pixel 追蹤異常                                           │    │
│  │ 帳戶的 Pixel 狀態異常，無法正確追蹤轉換                  │    │
│  │ 👉 建議：請立即檢查 Pixel 安裝                           │    │
│  │                                        [查看詳情]        │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 🟠 HIGH | 素材                              [一鍵修復]   │    │
│  │ 素材疲勞度過高                                           │    │
│  │ 素材「新年促銷 A」疲勞度已達 82 分，CTR 下降 25%         │    │
│  │ 👉 建議：立即暫停此素材                                  │    │
│  │ 💰 預估浪費：NT$ 2,500/月                                │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.4 素材管理頁面

**路徑**: `/creatives`

**功能**:
- 顯示所有素材，依疲勞度排序
- 篩選（帳戶、狀態、疲勞度範圍）
- 一鍵暫停疲勞素材

**表格欄位**:

| 欄位 | 說明 |
|-----|------|
| 素材預覽 | 縮圖 |
| 素材名稱 | 標題 + 廣告組 |
| 帳戶 | 所屬帳戶名稱 |
| 疲勞度 | 0-100 分 + 狀態燈 |
| CTR | 點擊率 + 變化 |
| 頻率 | 平均展示頻率 |
| 投放天數 | 已投放天數 |
| 狀態 | ENABLED / PAUSED |
| 操作 | [暫停] [查看] |

### 5.5 行動中心頁面

**路徑**: `/actions`

**功能**:
- 顯示所有待處理建議
- 依優先級排序
- 一鍵執行 / 忽略 / 批次處理

```
┌─────────────────────────────────────────────────────────────────┐
│  🎯 行動中心                                                     │
│                                                                  │
│  待處理：15 項    本月已執行：8/10 次 (Starter)   [升級]        │
│                                                                  │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ ⚡ 優先級 95                                 客戶 A      │    │
│  │                                                          │    │
│  │ 暫停疲勞素材                                             │    │
│  │ 素材「新年促銷 A」疲勞度達 82 分                         │    │
│  │                                                          │    │
│  │ 💰 預估節省：NT$ 2,500/月                                │    │
│  │                                                          │    │
│  │                          [忽略] [稍後] [🚀 執行]         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ ⚡ 優先級 88                                 客戶 B      │    │
│  │                                                          │    │
│  │ 建立排除受眾                                             │    │
│  │ 廣告活動「品牌推廣」未排除已購買客戶                     │    │
│  │                                                          │    │
│  │ 💰 預估節省：NT$ 1,800/月                                │    │
│  │                                                          │    │
│  │                          [忽略] [稍後] [🚀 執行]         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. 業務邏輯規格

### 6.1 素材疲勞度計算

```python
# app/services/fatigue_calculator.py

from dataclasses import dataclass
from typing import Optional
from decimal import Decimal

@dataclass
class FatigueInput:
    """疲勞度計算輸入"""
    ctr_current: float          # 目前 CTR
    ctr_baseline: float         # 基準 CTR（首週平均）
    frequency: float            # 投放頻率
    days_running: int           # 投放天數
    conversion_rate_current: Optional[float] = None
    conversion_rate_baseline: Optional[float] = None

class FatigueCalculator:
    """素材疲勞度計算服務"""
    
    # 權重設定
    WEIGHT_CTR = 0.40           # CTR 變化權重 40%
    WEIGHT_FREQUENCY = 0.30     # 頻率權重 30%
    WEIGHT_DAYS = 0.20          # 天數權重 20%
    WEIGHT_CONVERSION = 0.10    # 轉換率權重 10%
    
    def calculate(self, input: FatigueInput) -> int:
        """
        計算素材疲勞度分數 (0-100)
        
        公式：
        疲勞度 = CTR變化分數×40% + 頻率分數×30% + 天數分數×20% + 轉換率分數×10%
        """
        ctr_score = self._calculate_ctr_score(input.ctr_current, input.ctr_baseline)
        frequency_score = self._calculate_frequency_score(input.frequency)
        days_score = self._calculate_days_score(input.days_running)
        conversion_score = self._calculate_conversion_score(
            input.conversion_rate_current, 
            input.conversion_rate_baseline
        )
        
        total_score = (
            ctr_score * self.WEIGHT_CTR +
            frequency_score * self.WEIGHT_FREQUENCY +
            days_score * self.WEIGHT_DAYS +
            conversion_score * self.WEIGHT_CONVERSION
        )
        
        return min(100, max(0, int(total_score)))
    
    def _calculate_ctr_score(self, current: float, baseline: float) -> int:
        """
        CTR 變化分數
        
        | CTR 變化 | 分數 |
        |---------|------|
        | > 0%    | 0-25 |
        | 0~-10%  | 26-50|
        | -10~-20%| 51-75|
        | < -20%  | 76-100|
        """
        if baseline == 0:
            return 0
            
        change_rate = (current - baseline) / baseline * 100
        
        if change_rate > 0:
            return max(0, 25 - int(change_rate))
        elif change_rate >= -10:
            return 26 + int(abs(change_rate) * 2.4)
        elif change_rate >= -20:
            return 51 + int((abs(change_rate) - 10) * 2.4)
        else:
            return min(100, 76 + int((abs(change_rate) - 20) * 1.2))
    
    def _calculate_frequency_score(self, frequency: float) -> int:
        """
        頻率分數
        
        | 頻率  | 分數 |
        |-------|------|
        | < 2   | 0-25 |
        | 2-3   | 26-50|
        | 3-4   | 51-75|
        | > 4   | 76-100|
        """
        if frequency < 2:
            return int(frequency * 12.5)
        elif frequency < 3:
            return 26 + int((frequency - 2) * 24)
        elif frequency < 4:
            return 51 + int((frequency - 3) * 24)
        else:
            return min(100, 76 + int((frequency - 4) * 12))
    
    def _calculate_days_score(self, days: int) -> int:
        """
        投放天數分數
        
        | 天數    | 分數 |
        |---------|------|
        | < 7     | 0-25 |
        | 7-14    | 26-50|
        | 14-30   | 51-75|
        | > 30    | 76-100|
        """
        if days < 7:
            return int(days * 3.5)
        elif days < 14:
            return 26 + int((days - 7) * 3.4)
        elif days < 30:
            return 51 + int((days - 14) * 1.5)
        else:
            return min(100, 76 + int((days - 30) * 0.8))
    
    def _calculate_conversion_score(
        self, 
        current: Optional[float], 
        baseline: Optional[float]
    ) -> int:
        """轉換率變化分數（與 CTR 相同邏輯）"""
        if current is None or baseline is None or baseline == 0:
            return 25  # 無數據時給予中間值
        return self._calculate_ctr_score(current, baseline)
    
    def get_status(self, score: int) -> str:
        """取得疲勞狀態"""
        if score <= 40:
            return "healthy"    # 🟢 健康
        elif score <= 70:
            return "warning"    # 🟡 注意
        else:
            return "fatigued"   # 🔴 疲勞
```

### 6.2 健檢評分服務

```python
# app/services/audit_service.py

from dataclasses import dataclass
from typing import List, Dict, Any
from enum import Enum

class Dimension(str, Enum):
    STRUCTURE = "structure"
    CREATIVE = "creative"
    AUDIENCE = "audience"
    BUDGET = "budget"
    TRACKING = "tracking"

class Severity(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

@dataclass
class AuditIssue:
    dimension: Dimension
    severity: Severity
    code: str
    title: str
    description: str
    recommendation: str
    affected_entities: List[Dict[str, Any]]
    estimated_waste: float
    is_auto_fixable: bool
    deduction: int  # 扣分

class HealthAuditService:
    """廣告健檢服務"""
    
    # 維度權重
    DIMENSION_WEIGHTS = {
        Dimension.STRUCTURE: 0.20,
        Dimension.CREATIVE: 0.25,
        Dimension.AUDIENCE: 0.25,
        Dimension.BUDGET: 0.20,
        Dimension.TRACKING: 0.10,
    }
    
    async def run_audit(self, account_id: int) -> Dict[str, Any]:
        """執行完整健檢"""
        
        # 收集各維度問題
        issues: List[AuditIssue] = []
        
        issues.extend(await self._check_structure(account_id))
        issues.extend(await self._check_creative(account_id))
        issues.extend(await self._check_audience(account_id))
        issues.extend(await self._check_budget(account_id))
        issues.extend(await self._check_tracking(account_id))
        
        # 計算各維度分數
        dimension_scores = self._calculate_dimension_scores(issues)
        
        # 計算總分
        overall_score = self._calculate_overall_score(dimension_scores)
        
        return {
            "overall_score": overall_score,
            "dimension_scores": dimension_scores,
            "issues": issues,
            "summary": self._generate_summary(issues, overall_score)
        }
    
    def _calculate_dimension_scores(
        self, 
        issues: List[AuditIssue]
    ) -> Dict[Dimension, int]:
        """計算各維度分數"""
        scores = {dim: 100 for dim in Dimension}
        
        for issue in issues:
            scores[issue.dimension] = max(0, scores[issue.dimension] - issue.deduction)
        
        return scores
    
    def _calculate_overall_score(
        self, 
        dimension_scores: Dict[Dimension, int]
    ) -> int:
        """計算加權總分"""
        total = sum(
            score * self.DIMENSION_WEIGHTS[dim]
            for dim, score in dimension_scores.items()
        )
        return int(total)
    
    async def _check_creative(self, account_id: int) -> List[AuditIssue]:
        """素材品質檢查"""
        issues = []
        
        # 檢查素材疲勞度
        fatigued_creatives = await self._get_fatigued_creatives(account_id)
        for creative in fatigued_creatives:
            issues.append(AuditIssue(
                dimension=Dimension.CREATIVE,
                severity=Severity.HIGH if creative.fatigue_score > 80 else Severity.MEDIUM,
                code="CREATIVE_FATIGUE_HIGH",
                title="素材疲勞度過高",
                description=f"素材「{creative.name}」疲勞度已達 {creative.fatigue_score} 分",
                recommendation="建議立即暫停此素材，並準備新素材替換",
                affected_entities=[{"type": "creative", "id": creative.id, "name": creative.name}],
                estimated_waste=creative.estimated_waste,
                is_auto_fixable=True,
                deduction=12 if creative.fatigue_score > 80 else 8
            ))
        
        # 檢查素材多樣性
        # 檢查素材新鮮度
        # ... 其他檢查項目
        
        return issues
    
    # ... 其他維度檢查方法
```

### 6.3 成效價值計算

```python
# app/services/value_calculator.py

from dataclasses import dataclass
from decimal import Decimal
from typing import List

@dataclass
class MonthlyValueReport:
    """每月價值報告"""
    time_saved_hours: float
    time_value: Decimal          # 時間價值（以時薪計算）
    waste_prevented: Decimal     # 避免的浪費
    issues_found: int
    issues_fixed: int
    subscription_cost: Decimal
    roi: float                   # 投資報酬率

class ValueCalculator:
    """成效價值計算服務"""
    
    # 預設時薪（可由用戶自訂）
    DEFAULT_HOURLY_RATE = Decimal("800")  # NT$800
    
    # 每帳戶原本檢查時間（分鐘）
    ORIGINAL_CHECK_TIME_PER_ACCOUNT = 30
    
    # 使用系統後檢查時間（分鐘）
    OPTIMIZED_CHECK_TIME_PER_ACCOUNT = 5
    
    def calculate_monthly_value(
        self,
        accounts_count: int,
        issues_found: int,
        issues_fixed: int,
        waste_prevented: Decimal,
        subscription_tier: str,
        hourly_rate: Decimal = None
    ) -> MonthlyValueReport:
        """計算月度價值報告"""
        
        rate = hourly_rate or self.DEFAULT_HOURLY_RATE
        
        # 計算節省時間
        original_time = accounts_count * self.ORIGINAL_CHECK_TIME_PER_ACCOUNT * 30  # 分鐘/月
        optimized_time = accounts_count * self.OPTIMIZED_CHECK_TIME_PER_ACCOUNT * 30
        saved_minutes = original_time - optimized_time
        saved_hours = saved_minutes / 60
        
        # 時間價值
        time_value = Decimal(str(saved_hours)) * rate
        
        # 訂閱成本
        subscription_costs = {
            "STARTER": Decimal("1500"),
            "PROFESSIONAL": Decimal("2800"),
            "AGENCY": Decimal("6800"),
            "ENTERPRISE": Decimal("15000"),
        }
        subscription_cost = subscription_costs.get(subscription_tier, Decimal("0"))
        
        # 總價值
        total_value = time_value + waste_prevented
        
        # ROI
        roi = float(total_value / subscription_cost) if subscription_cost > 0 else 0
        
        return MonthlyValueReport(
            time_saved_hours=saved_hours,
            time_value=time_value,
            waste_prevented=waste_prevented,
            issues_found=issues_found,
            issues_fixed=issues_fixed,
            subscription_cost=subscription_cost,
            roi=roi
        )
```

### 6.4 同步頻率控制

```python
# app/services/sync_scheduler.py

from datetime import datetime, timedelta
from typing import Optional

class SyncScheduler:
    """同步排程服務"""
    
    # 各方案同步間隔（分鐘）
    SYNC_INTERVALS = {
        "STARTER": 720,       # 12 小時 (2次/天)
        "PROFESSIONAL": 15,   # 15 分鐘
        "AGENCY": 5,          # 5 分鐘
        "ENTERPRISE": 1,      # 1 分鐘
    }
    
    def get_next_sync_time(
        self, 
        subscription_tier: str,
        last_synced_at: Optional[datetime]
    ) -> datetime:
        """取得下次同步時間"""
        
        interval = self.SYNC_INTERVALS.get(subscription_tier, 720)
        
        if last_synced_at is None:
            return datetime.utcnow()
        
        return last_synced_at + timedelta(minutes=interval)
    
    def should_sync(
        self,
        subscription_tier: str,
        last_synced_at: Optional[datetime]
    ) -> bool:
        """判斷是否應該同步"""
        
        next_sync = self.get_next_sync_time(subscription_tier, last_synced_at)
        return datetime.utcnow() >= next_sync
    
    def get_sync_times_for_starter(self) -> tuple:
        """取得 Starter 方案的固定同步時間"""
        # 早上 8:00 和晚上 20:00
        return ("08:00", "20:00")
```

### 6.5 一鍵執行次數限制

```python
# app/services/action_limiter.py

from datetime import date
from typing import Tuple

class ActionLimiter:
    """一鍵執行次數限制服務"""
    
    # 各方案月執行限制 (-1 表示無限)
    ACTION_LIMITS = {
        "STARTER": 10,
        "PROFESSIONAL": -1,
        "AGENCY": -1,
        "ENTERPRISE": -1,
    }
    
    async def check_and_increment(
        self,
        user_id: int,
        subscription_tier: str
    ) -> Tuple[bool, str]:
        """
        檢查並增加執行次數
        
        Returns:
            (是否允許, 訊息)
        """
        limit = self.ACTION_LIMITS.get(subscription_tier, 10)
        
        # 無限制方案直接通過
        if limit == -1:
            return True, "執行成功"
        
        user = await self._get_user(user_id)
        
        # 檢查是否需要重置（每月 1 號重置）
        if user.action_count_reset_at < date.today().replace(day=1):
            await self._reset_count(user_id)
            user.monthly_action_count = 0
        
        # 檢查是否超過限制
        if user.monthly_action_count >= limit:
            return False, f"本月一鍵執行次數已達上限 ({user.monthly_action_count}/{limit})"
        
        # 增加計數
        await self._increment_count(user_id)
        
        remaining = limit - user.monthly_action_count - 1
        return True, f"執行成功，本月剩餘 {remaining} 次"
```

---

## 7. 通知系統規格

### 7.1 通知類型

| 類型 | 觸發條件 | 頻率 | 嚴重度 |
|-----|---------|------|-------|
| CPA 暴增 | CPA 上升 > 30% | 即時 | HIGH |
| ROAS 暴跌 | ROAS 下降 > 30% | 即時 | HIGH |
| 素材疲勞 | 疲勞度 > 70 | 每日 | MEDIUM |
| 預算消耗異常 | < 50% 或 > 110% | 每日 | MEDIUM |
| Pixel 異常 | 狀態非 active | 即時 | CRITICAL |
| 週報摘要 | 每週一 | 每週 | INFO |

### 7.2 Email 模板

```html
<!-- 異常警示 Email -->
Subject: ⚠️ [AdOptimize] 客戶 A 的廣告帳戶出現異常

Hi {user_name},

您管理的廣告帳戶「{account_name}」出現以下異常：

🔴 CPA 暴增警示
- 目前 CPA：NT$ 250
- 前期 CPA：NT$ 180
- 變化幅度：+38.9%

💡 建議行動：
檢查近期廣告變更，考慮暫停效果差的廣告組

👉 立即查看：{dashboard_link}

---
AdOptimize - 您的廣告效率守護者
```

---

## 8. 驗證計畫

### 8.1 單元測試

| 模組 | 測試項目 |
|-----|---------|
| 疲勞度計算 | 各情境分數計算正確性 |
| 健檢評分 | 各維度扣分邏輯 |
| 價值計算 | ROI 計算正確性 |
| 次數限制 | 月度重置、限制檢查 |
| 同步排程 | 各方案間隔判斷 |

### 8.2 整合測試

| 流程 | 測試項目 |
|-----|---------|
| OAuth 連接 | Google/Meta 帳戶連接流程 |
| 數據同步 | 完整同步 + 增量同步 |
| 健檢流程 | 觸發 → 執行 → 產生報告 |
| 一鍵執行 | 執行 → 記錄 → 還原 |
| 通知發送 | 觸發 → 產生 → 發送 Email |

### 8.3 邊界條件測試

| 情境 | 測試項目 |
|-----|---------|
| Starter 次數限制 | 第 10 次執行、第 11 次被拒絕、月初重置 |
| 同步頻率 | 各方案在邊界時間點的行為 |
| 疲勞度邊界 | 0 分、40 分、70 分、100 分情境 |
| Token 過期 | 自動刷新、刷新失敗處理 |

---

## 9. 開發時程

### 9.1 Phase 1：MVP（8-10 週）

| 週次 | 任務 | 交付物 |
|-----|------|-------|
| 1-2 | 專案設置、資料庫、API 骨架 | 可運行的後端框架 |
| 3-4 | OAuth 整合、數據同步 | 可連接 Google/Meta |
| 5-6 | 儀表板、健檢系統 | 可看到數據和健檢報告 |
| 7-8 | 素材疲勞度、一鍵執行 | 核心功能完成 |
| 9-10 | 通知系統、測試、修正 | MVP 上線 |

### 9.2 Phase 2（4-6 週）

- 受眾分析
- 成效報告（ROI 價值展示）
- 批次操作

### 9.3 Phase 3（4-6 週）

- 白標報告
- 自動化規則
- 子帳號管理

---

## 10. 附錄

### 10.1 名詞對照表

| 中文 | 英文 | 說明 |
|-----|------|------|
| 素材疲勞度 | Creative Fatigue Score | 衡量素材效果衰退程度 |
| 健檢 | Health Audit | 廣告帳戶全面檢查 |
| 一鍵執行 | One-Click Execute | 確認後自動執行優化建議 |
| 受眾重疊 | Audience Overlap | 不同受眾間的重複比例 |
| 白標報告 | White-Label Report | 可放客戶 Logo 的報告 |

### 10.2 錯誤代碼

| 代碼 | 說明 |
|-----|------|
| `AUTH_001` | 認證失敗 |
| `AUTH_002` | Token 過期 |
| `ACCOUNT_001` | 帳戶連接失敗 |
| `ACCOUNT_002` | 帳戶同步失敗 |
| `ACTION_001` | 執行次數已達上限 |
| `ACTION_002` | 操作執行失敗 |
| `ACTION_003` | 操作無法還原 |

---

**文件結束**

*最後更新：2026-01-09*
*版本：1.0*
