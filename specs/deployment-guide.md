# AdOptimize 部署指南

> 架構：Vercel (Next.js) + Railway (Python) + Supabase (PostgreSQL)

---

## 目錄

1. [架構總覽](#1-架構總覽)
2. [前置準備](#2-前置準備)
3. [Supabase 設定 (PostgreSQL)](#3-supabase-設定-postgresql)
4. [Vercel 部署 (Next.js)](#4-vercel-部署-nextjs)
5. [Railway 部署 (Python Backend)](#5-railway-部署-python-backend)
6. [Upstash 設定 (Redis)](#6-upstash-設定-redis)
7. [環境變數總覽](#7-環境變數總覽)
8. [驗證部署](#8-驗證部署)

---

## 1. 架構總覽

```
┌─────────────────────────────────────────────────────────────────┐
│                         用戶瀏覽器                                │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Vercel (Next.js 14)                         │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Frontend UI (React)                                         ││
│  │  - Dashboard, Health, Creatives, Audiences, Actions          ││
│  └─────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  BFF API Routes (/api/v1/*)                                  ││
│  │  - Proxy requests to Python Backend                          ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Railway (Python)                            │
│  ┌──────────────────────┐  ┌──────────────────────────────────┐ │
│  │  FastAPI Server       │  │  Celery Workers                  │ │
│  │  - OAuth endpoints    │  │  - sync_google (15min)           │ │
│  │  - Audit API          │  │  - sync_meta (15min)             │ │
│  │  - Data API           │  │  - run_health_audit              │ │
│  └──────────────────────┘  └──────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
                ┌───────────────┴───────────────┐
                ▼                               ▼
┌───────────────────────────┐   ┌───────────────────────────────┐
│   Supabase (PostgreSQL)    │   │       Upstash (Redis)          │
│   - Users                  │   │   - Session cache              │
│   - AdAccounts             │   │   - API response cache         │
│   - Campaigns, Ads         │   │   - Celery broker              │
│   - Audits, Issues         │   │                                │
└───────────────────────────┘   └───────────────────────────────┘
```

### 成本估算

| 服務 | 方案 | 免費額度 | 月費 |
|------|------|----------|------|
| Vercel | Pro | 你已購買 | - |
| Railway | Hobby | $5 credit/月 | $0 |
| Supabase | Free | 500MB DB, 1GB storage | $0 |
| Upstash | Free | 10K commands/day | $0 |
| **總計** | | | **$0/月** |

---

## 2. 前置準備

### 2.1 需要的帳號

- [ ] [Vercel](https://vercel.com) - 你已有 Pro
- [ ] [Supabase](https://supabase.com) - 免費註冊
- [ ] [Railway](https://railway.app) - 用 GitHub 登入
- [ ] [Upstash](https://upstash.com) - 免費註冊

### 2.2 Google Ads API 憑證

1. 前往 [Google Cloud Console](https://console.cloud.google.com)
2. 建立專案或選擇現有專案
3. 啟用 Google Ads API
4. 建立 OAuth 2.0 憑證（Web application）
5. 設定授權重新導向 URI：
   - 開發：`http://localhost:8000/api/v1/oauth/google/callback`
   - 生產：`https://your-railway-app.up.railway.app/api/v1/oauth/google/callback`

### 2.3 Meta Marketing API 憑證

1. 前往 [Meta for Developers](https://developers.facebook.com)
2. 建立應用程式（類型：Business）
3. 新增 Marketing API 產品
4. 取得 App ID 和 App Secret
5. 設定 OAuth 重新導向 URI：
   - 開發：`http://localhost:8000/api/v1/oauth/meta/callback`
   - 生產：`https://your-railway-app.up.railway.app/api/v1/oauth/meta/callback`

---

## 3. Supabase 設定 (PostgreSQL)

### 3.1 建立專案

1. 登入 [Supabase Dashboard](https://app.supabase.com)
2. 點擊「New Project」
3. 填寫：
   - **Name**: `adoptimize`
   - **Database Password**: 記下這個密碼！
   - **Region**: 選擇離你最近的區域
4. 等待專案建立完成（約 2 分鐘）

### 3.2 取得連線資訊

1. 進入專案 > Settings > Database
2. 複製「Connection string」區塊的 URI
3. 格式：`postgresql://postgres:[YOUR-PASSWORD]@db.xxxx.supabase.co:5432/postgres`

### 3.3 記錄環境變數

```bash
# Supabase 連線資訊
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.xxxx.supabase.co:5432/postgres
```

---

## 4. Vercel 部署 (Next.js)

### 4.1 連接 GitHub Repository

1. 登入 [Vercel Dashboard](https://vercel.com/dashboard)
2. 點擊「Add New...」>「Project」
3. 選擇 `zhenheco/adoptimize` repository
4. Import

### 4.2 設定專案

**Framework Preset**: Next.js（自動偵測）

**Root Directory**: `.` (根目錄)

**Build Command**: `pnpm run build`

**Output Directory**: `.next` (預設)

### 4.3 設定環境變數

在 Vercel 專案設定 > Environment Variables 新增：

| Name | Value | Environment |
|------|-------|-------------|
| `NEXT_PUBLIC_API_URL` | `https://your-railway-app.up.railway.app` | Production |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Development |
| `NEXTAUTH_URL` | `https://your-vercel-app.vercel.app` | Production |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` 產生的值 | All |

### 4.4 部署

點擊「Deploy」等待完成。

部署完成後，你會得到：
- Production URL: `https://adoptimize.vercel.app` (或自訂域名)

---

## 5. Railway 部署 (Python Backend)

### 5.1 準備 Dockerfile

在 `backend/` 目錄建立 `Dockerfile`：

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# 安裝系統依賴
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# 複製依賴檔案
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 複製應用程式
COPY . .

# 預設啟動 FastAPI
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 5.2 建立 Railway 專案

1. 登入 [Railway Dashboard](https://railway.app/dashboard)
2. 點擊「New Project」
3. 選擇「Deploy from GitHub repo」
4. 選擇 `zhenheco/adoptimize` repository
5. 設定：
   - **Root Directory**: `backend`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### 5.3 設定環境變數

在 Railway 專案 > Variables 新增：

```bash
# Database (從 Supabase 取得)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.xxxx.supabase.co:5432/postgres

# Redis (從 Upstash 取得，見第 6 節)
REDIS_URL=rediss://default:xxx@xxx.upstash.io:6379

# Google Ads API
GOOGLE_ADS_CLIENT_ID=your-client-id
GOOGLE_ADS_CLIENT_SECRET=your-client-secret
GOOGLE_ADS_DEVELOPER_TOKEN=your-developer-token

# Meta Marketing API
META_APP_ID=your-app-id
META_APP_SECRET=your-app-secret

# Application
SECRET_KEY=your-secret-key-here
CORS_ORIGINS=https://your-vercel-app.vercel.app
```

### 5.4 新增 Celery Worker 服務

1. 在同一專案，點擊「New Service」
2. 選擇「GitHub Repo」> 同一個 repository
3. 設定：
   - **Root Directory**: `backend`
   - **Start Command**: `celery -A app.workers.celery_app worker --loglevel=info`
4. 複製相同的環境變數

### 5.5 新增 Celery Beat 服務（排程器）

1. 再次「New Service」
2. 設定：
   - **Root Directory**: `backend`
   - **Start Command**: `celery -A app.workers.celery_app beat --loglevel=info`
3. 複製相同的環境變數

### 5.6 執行資料庫遷移

在 Railway 專案中，開啟 FastAPI 服務的 Shell：

```bash
alembic upgrade head
```

---

## 6. Upstash 設定 (Redis)

### 6.1 建立 Redis Database

1. 登入 [Upstash Console](https://console.upstash.com)
2. 點擊「Create Database」
3. 填寫：
   - **Name**: `adoptimize-redis`
   - **Region**: 選擇離你最近的區域
   - **Type**: Regional (免費版)
4. 點擊「Create」

### 6.2 取得連線資訊

建立完成後，複製：
- **UPSTASH_REDIS_REST_URL**
- **UPSTASH_REDIS_REST_TOKEN**
- **Redis URL** (格式：`rediss://default:xxx@xxx.upstash.io:6379`)

### 6.3 更新 Railway 環境變數

將 `REDIS_URL` 更新為 Upstash 提供的 URL。

---

## 7. 環境變數總覽

### Vercel (Next.js)

| 變數名稱 | 說明 | 範例 |
|----------|------|------|
| `NEXT_PUBLIC_API_URL` | Python Backend URL | `https://xxx.up.railway.app` |
| `NEXTAUTH_URL` | Vercel App URL | `https://adoptimize.vercel.app` |
| `NEXTAUTH_SECRET` | 32+ 字元隨機字串 | `openssl rand -base64 32` |

### Railway (Python Backend)

| 變數名稱 | 說明 | 範例 |
|----------|------|------|
| `DATABASE_URL` | Supabase PostgreSQL URL | `postgresql://...` |
| `REDIS_URL` | Upstash Redis URL | `rediss://...` |
| `SECRET_KEY` | 應用程式密鑰 | 隨機字串 |
| `CORS_ORIGINS` | 允許的來源 | Vercel URL |
| `GOOGLE_ADS_CLIENT_ID` | Google OAuth Client ID | - |
| `GOOGLE_ADS_CLIENT_SECRET` | Google OAuth Secret | - |
| `GOOGLE_ADS_DEVELOPER_TOKEN` | Google Ads API Token | - |
| `META_APP_ID` | Meta App ID | - |
| `META_APP_SECRET` | Meta App Secret | - |

---

## 8. 驗證部署

### 8.1 檢查 Vercel

```bash
# 訪問首頁
curl https://your-vercel-app.vercel.app

# 應該回傳 HTML
```

### 8.2 檢查 Railway (FastAPI)

```bash
# 健康檢查
curl https://your-railway-app.up.railway.app/api/health

# 預期回應：
# {"status": "healthy"}
```

### 8.3 檢查 API 連通性

```bash
# 從 Vercel BFF 呼叫 Python Backend
curl https://your-vercel-app.vercel.app/api/v1/dashboard/overview

# 應該回傳 dashboard 數據
```

### 8.4 檢查 OAuth Flow

1. 訪問 `https://your-vercel-app.vercel.app`
2. 點擊「連接 Google Ads 帳戶」
3. 應該重導向到 Google OAuth 頁面

---

## 常見問題

### Q: Railway 部署失敗

**可能原因**：
1. `requirements.txt` 有套件版本衝突
2. 環境變數未設定

**解決**：
```bash
# 本地測試
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Q: Vercel 顯示 API 錯誤

**可能原因**：
1. `NEXT_PUBLIC_API_URL` 未設定
2. Railway 服務尚未啟動

**解決**：
1. 確認環境變數已設定
2. 確認 Railway 服務狀態為 Running

### Q: CORS 錯誤

**可能原因**：
Railway 的 `CORS_ORIGINS` 未包含 Vercel URL

**解決**：
```bash
# 在 Railway 設定
CORS_ORIGINS=https://your-vercel-app.vercel.app
```

### Q: OAuth 重導向失敗

**可能原因**：
Google/Meta 後台的重導向 URI 未更新

**解決**：
將 Railway URL 加入 OAuth 設定：
- `https://your-railway-app.up.railway.app/api/v1/oauth/google/callback`
- `https://your-railway-app.up.railway.app/api/v1/oauth/meta/callback`

---

## 下一步

1. [ ] 設定自訂域名（Vercel + Railway）
2. [ ] 設定 SSL 憑證（自動）
3. [ ] 設定監控告警（Railway Metrics）
4. [ ] 設定 CI/CD Pipeline（GitHub Actions）

---

## 相關連結

- [Vercel 文件](https://vercel.com/docs)
- [Railway 文件](https://docs.railway.app)
- [Supabase 文件](https://supabase.com/docs)
- [Upstash 文件](https://docs.upstash.com)
