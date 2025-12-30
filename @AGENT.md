# AdOptimize Platform - Agent Build Instructions

## 專案概述

AdOptimize 是一個半自動化廣告優化平台，整合 Google Ads 與 Meta Marketing API，提供：
- 跨平台數據儀表板
- 素材疲勞度追蹤
- 受眾重疊分析
- 一鍵執行優化建議
- 五維度廣告健檢

**設計原則**：AI 建議 + 人工確認 + 一鍵執行

---

## 技術棧

| 層級 | 技術 | 版本要求 |
|------|------|---------|
| 後端 | Python + FastAPI | 3.11+ |
| 前端 | React + TypeScript | 18+ |
| 資料庫 | PostgreSQL | 15+ |
| 快取 | Redis | 7+ |
| 任務佇列 | Celery | Latest |
| ORM | SQLAlchemy | 2.0+ |
| 遷移 | Alembic | Latest |

---

## 專案結構

```
adoptimize/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI 入口
│   │   ├── config.py            # 設定管理（環境變數）
│   │   ├── database.py          # 資料庫連線
│   │   ├── api/v1/              # API 路由
│   │   │   ├── accounts.py      # 帳戶連接
│   │   │   ├── dashboard.py     # 儀表板
│   │   │   ├── creatives.py     # 素材管理
│   │   │   ├── audiences.py     # 受眾分析
│   │   │   ├── recommendations.py # 行動中心
│   │   │   └── audits.py        # 健檢系統
│   │   ├── models/              # SQLAlchemy 模型
│   │   ├── schemas/             # Pydantic 模型
│   │   ├── services/            # 業務邏輯
│   │   │   ├── google_ads.py
│   │   │   ├── meta_ads.py
│   │   │   ├── sync_service.py
│   │   │   ├── fatigue_calculator.py
│   │   │   ├── overlap_analyzer.py
│   │   │   ├── rule_engine.py
│   │   │   └── health_auditor.py
│   │   ├── tasks/               # Celery 任務
│   │   └── utils/               # 工具函數
│   ├── tests/
│   ├── alembic/
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── types/
│   ├── package.json
│   └── tsconfig.json
└── docker/
```

---

## 構建指令（Build Instructions）

### 後端設定

```bash
# 進入後端目錄
cd backend

# 建立虛擬環境
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 安裝依賴
pip install -r requirements.txt

# 設定環境變數
cp .env.example .env
# 編輯 .env 填入必要設定

# 執行資料庫遷移
alembic upgrade head

# 啟動開發伺服器
uvicorn app.main:app --reload --port 8000
```

### 前端設定

```bash
# 進入前端目錄
cd frontend

# 安裝依賴
npm install

# 啟動開發伺服器
npm run dev
```

### Docker 完整環境

```bash
docker-compose up -d
```

---

## 測試指令

### 後端測試

```bash
cd backend

# 執行所有測試
pytest

# 監視模式
pytest-watch

# 查看覆蓋率（必須達到 85%）
pytest --cov=app --cov-report=term-missing --cov-fail-under=85

# 執行特定測試
pytest tests/unit/test_fatigue_calculator.py -v
```

### 前端測試

```bash
cd frontend

# 執行所有測試
npm test

# 覆蓋率報告
npm test -- --coverage
```

### 程式碼品質

```bash
# 後端
cd backend
ruff check .
mypy app/

# 前端
cd frontend
npm run lint
npm run type-check
```

---

## 環境變數（.env）

```bash
# 資料庫
DATABASE_URL=postgresql://user:password@localhost:5432/adoptimize
REDIS_URL=redis://localhost:6379/0

# Google Ads API
GOOGLE_ADS_DEVELOPER_TOKEN=your_developer_token
GOOGLE_ADS_CLIENT_ID=your_client_id
GOOGLE_ADS_CLIENT_SECRET=your_client_secret

# Meta Marketing API
META_APP_ID=your_app_id
META_APP_SECRET=your_app_secret

# JWT 認證
JWT_SECRET_KEY=your_secret_key
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24

# 應用程式
APP_ENV=development
DEBUG=true
```

**⚠️ 重要**：所有環境變數讀取時必須使用 `.trim()` 處理！

---

## 關鍵業務規則

### 異常判定門檻

| 指標 | 🟢 正常 | 🟡 警示 | 🔴 異常 |
|------|--------|--------|--------|
| CPA 變化 | < +10% | +10% ~ +30% | > +30% |
| ROAS 變化 | > -10% | -10% ~ -30% | < -30% |
| CTR 變化 | > -15% | -15% ~ -30% | < -30% |

### 素材疲勞度計算

```
疲勞度 = CTR變化率(40%) + 投放頻率(30%) + 投放天數(20%) + 轉換率變化(10%)
```

| 等級 | 分數 | 建議 |
|------|------|------|
| 🟢 健康 | 0-40 | 持續投放 |
| 🟡 注意 | 41-70 | 準備替換 |
| 🔴 疲勞 | 71-100 | 立即更換 |

### 受眾健康度評分

```
健康度 = 規模(25%) + CPA(35%) + ROAS(25%) + 新鮮度(15%)
```

### 優先級計算

```
優先級 = 嚴重度基礎分 + 金額影響分 + 修復難度分 + 影響範圍分
```

### 健檢五維度權重

1. 帳戶結構 (20%)
2. 素材品質 (25%)
3. 受眾設定 (25%)
4. 預算配置 (20%)
5. 追蹤設定 (10%)

---

## 架構決策

### API 設計
- RESTful API，版本化路徑 `/api/v1/`
- JWT 認證，24 小時過期
- 統一錯誤回應格式

### 資料同步
- 每 15-30 分鐘同步一次
- 保留 90 天歷史數據
- 增量同步優先

### 快取策略
- Redis 用於 API 速率限制
- Celery 用於背景任務佇列

---

## 當前狀態

- **Phase**: 1 - 技術基礎建設
- **進度**: 尚未開始
- **阻塞**: 無

---

## Feature Completion Checklist

完成任何功能前，必須驗證：

- [ ] 所有測試通過
- [ ] 覆蓋率達到 85%
- [ ] 程式碼格式化通過（ruff/eslint）
- [ ] 型別檢查通過（mypy/tsc）
- [ ] 變更已提交（conventional commits）
- [ ] @fix_plan.md 更新
- [ ] 文件同步更新

---

## Key Learnings

_（開發過程中更新此區域）_

- 環境變數必須 `.trim()` 處理
- Google Ads API 需要 Developer Token（申請需 1-2 週）
- Meta API 需要 App Review 通過

---

## 參考資源

- [Google Ads API](https://developers.google.com/google-ads/api)
- [Meta Marketing API](https://developers.facebook.com/docs/marketing-apis)
- [FastAPI 文件](https://fastapi.tiangolo.com/)
- [SQLAlchemy 2.0](https://docs.sqlalchemy.org/)
