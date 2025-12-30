# AdOptimize Fix Plan

> 根據 PRD 建立的開發任務清單，Ralph 依優先級自動執行

---

## 🔴 Phase 1：技術基礎建設（High Priority）

### P1-001 初始化後端專案結構

- [ ] **建立 FastAPI 專案骨架**
  - 建立 `backend/` 目錄結構
  - 設定 `pyproject.toml` 與 `requirements.txt`
  - 設定 ruff、mypy 程式碼品質工具
  - 建立 `.env.example` 環境變數範本
  - Done Criteria: `uvicorn app.main:app` 可啟動，回傳 health check

### P1-002 設計資料庫模型

- [ ] **建立 SQLAlchemy 模型**
  - User（用戶）
  - AdAccount（廣告帳戶：Google/Meta）
  - Campaign（廣告活動）
  - AdSet（廣告組）
  - Ad（廣告）
  - Creative（素材）+ CreativeMetrics（素材指標）
  - Audience（受眾）+ AudienceMetrics（受眾指標）
  - HealthAudit（健檢報告）+ AuditIssue（問題）
  - Recommendation（建議）+ ActionHistory（操作歷史）
  - Done Criteria: `alembic upgrade head` 成功執行，所有資料表建立

### P1-003 實作 OAuth 2.0 認證

- [ ] **實作認證流程**
  - Google OAuth 2.0 流程
  - Meta OAuth 2.0 流程
  - JWT Token 產生與驗證
  - Refresh Token 機制
  - Done Criteria: 可成功取得 Google/Meta access token 並儲存

### P1-004 建立 Google Ads API 整合

- [ ] **實作 Google Ads 服務**
  - 帳戶連接功能
  - Campaign 數據讀取
  - AdSet/Ad 數據讀取
  - 錯誤處理與指數退避重試
  - Done Criteria: 可讀取測試帳戶的 Campaign 清單

### P1-005 建立 Meta Marketing API 整合

- [ ] **實作 Meta Ads 服務**
  - 帳戶連接功能
  - Campaign 數據讀取
  - AdSet/Ad 數據讀取
  - 錯誤處理與速率限制處理
  - Done Criteria: 可讀取測試帳戶的 Campaign 清單

### P1-006 設定 Redis 與 Celery

- [ ] **建立任務佇列基礎**
  - Redis 連線配置
  - Celery 應用程式設定
  - Celery Beat 排程設定
  - 基本測試任務
  - Done Criteria: `celery worker` 可執行測試任務

### ✅ Phase 1 完成條件

當滿足以下所有條件時，Phase 1 視為 **Completed**：

- [ ] `backend/` 目錄結構完整，`uvicorn app.main:app` 可啟動
- [ ] 所有 SQLAlchemy 模型建立，`alembic upgrade head` 成功
- [ ] OAuth 2.0 流程可取得 Google/Meta access token
- [ ] Google Ads API 可讀取 Campaign 清單
- [ ] Meta Marketing API 可讀取 Campaign 清單
- [ ] Celery worker 可執行背景任務
- [ ] 測試覆蓋率 ≥ 85%
- [ ] 所有程式碼通過 ruff 和 mypy 檢查

---

## 🟡 Phase 2：數據儀表板（Medium Priority）

### P2-001 實作 Google Ads 數據同步

- [ ] **建立同步服務**
  - Celery 定時任務（每 15-30 分鐘）
  - 增量同步邏輯
  - 數據標準化轉換（跨平台格式）
  - Done Criteria: 數據自動同步並儲存至 DB

### P2-002 實作 Meta Marketing 數據同步

- [ ] **建立同步服務**
  - Celery 定時任務
  - 增量同步邏輯
  - 數據標準化轉換
  - Done Criteria: 數據自動同步並儲存至 DB

### P2-003 開發儀表板 API 端點

- [ ] **實作 Dashboard API**
  - `GET /api/v1/dashboard/overview` - 總覽數據
  - `GET /api/v1/dashboard/metrics` - 指定時間區間指標
  - `GET /api/v1/dashboard/trends` - 趨勢數據
  - `GET /api/v1/dashboard/alerts` - 異常警示
  - Done Criteria: 所有端點回傳正確格式資料

### P2-004 實作核心指標計算

- [ ] **建立計算邏輯**
  - 花費、曝光、點擊、轉換計算
  - CPA、ROAS、CTR 計算
  - 跨平台數據合併
  - Done Criteria: 計算結果與 Google/Meta 後台一致

### P2-005 實作異常判定系統

- [ ] **建立異常規則引擎**
  - CPA 變化率計算（±10%/30%）
  - ROAS 變化率計算（±10%/30%）
  - CTR 變化率計算（±15%/30%）
  - 紅燈/黃燈/綠燈標記
  - Done Criteria: 異常正確觸發警示

### ✅ Phase 2 完成條件

當滿足以下所有條件時，Phase 2 視為 **Completed**：

- [ ] Google Ads 數據每 15-30 分鐘自動同步
- [ ] Meta Ads 數據每 15-30 分鐘自動同步
- [ ] Dashboard API 4 個端點全部正常回傳數據
- [ ] CPA/ROAS/CTR 計算結果與平台後台一致
- [ ] 異常判定正確觸發（CPA>30%=紅燈, 10-30%=黃燈）
- [ ] 數據同步延遲 < 30 分鐘
- [ ] 測試覆蓋率 ≥ 85%

---

## 🟡 Phase 3：素材與受眾管理（Medium Priority）

### P3-001 開發素材庫 API

- [ ] **實作 Creatives API**
  - `GET /api/v1/creatives` - 素材清單
  - `GET /api/v1/creatives/:id` - 素材詳情
  - `GET /api/v1/creatives/fatigued` - 疲勞素材
  - `POST /api/v1/creatives/:id/pause` - 暫停素材
  - `POST /api/v1/creatives/batch/pause` - 批次暫停
  - Done Criteria: 所有端點功能正常

### P3-002 實作素材疲勞度計算

- [ ] **建立疲勞計算服務**
  - CTR 變化率計算 (40% 權重)
  - 投放頻率計算 (30% 權重)
  - 投放天數計算 (20% 權重)
  - 轉換率變化計算 (10% 權重)
  - 綜合疲勞分數 (0-100)
  - Done Criteria: 疲勞分數計算正確

### P3-003 開發受眾分析 API

- [ ] **實作 Audiences API**
  - `GET /api/v1/audiences` - 受眾清單
  - `GET /api/v1/audiences/:id` - 受眾詳情
  - `GET /api/v1/audiences/overlap` - 重疊分析
  - `POST /api/v1/audiences/exclusion` - 建立排除受眾
  - Done Criteria: 所有端點功能正常

### P3-004 實作受眾重疊計算

- [ ] **建立重疊分析服務**
  - 受眾比對邏輯
  - 重疊率計算
  - 警示門檻判定（<20% 正常, 20-30% 注意, >30% 高度重疊）
  - Done Criteria: 重疊率計算正確

### P3-005 實作受眾健康度評分

- [ ] **建立評分服務**
  - 規模評分 (25%)
  - CPA 評分 (35%)
  - ROAS 評分 (25%)
  - 新鮮度評分 (15%)
  - Done Criteria: 健康度分數計算正確

### ✅ Phase 3 完成條件

當滿足以下所有條件時，Phase 3 視為 **Completed**：

- [ ] Creatives API 5 個端點全部正常運作
- [ ] 素材疲勞度計算正確（權重: CTR 40%, 頻率 30%, 天數 20%, 轉換 10%）
- [ ] 疲勞分數正確分級（0-40=健康, 41-70=注意, 71-100=疲勞）
- [ ] Audiences API 4 個端點全部正常運作
- [ ] 受眾重疊率計算正確（<20%=正常, 20-30%=注意, >30%=高重疊）
- [ ] 受眾健康度評分正確（權重: 規模 25%, CPA 35%, ROAS 25%, 新鮮度 15%）
- [ ] 批次暫停功能可透過 API 執行
- [ ] 測試覆蓋率 ≥ 85%

---

## 🟢 Phase 4：行動中心（Lower Priority）

### P4-001 開發規則引擎

- [ ] **建立規則框架**
  - 規則定義格式（JSON Schema）
  - 規則執行器
  - 規則優先級排序
  - Done Criteria: 可新增、執行自訂規則

### P4-002 實作建議產生邏輯

- [ ] **建立建議服務**
  - 素材相關建議（疲勞警示）
  - 受眾相關建議（重疊排除）
  - 預算相關建議（效率分配）
  - 優先級分數計算
  - Done Criteria: 系統自動產生建議

### P4-003 開發行動中心 API

- [ ] **實作 Recommendations API**
  - `GET /api/v1/recommendations` - 建議清單
  - `POST /api/v1/recommendations/:id/execute` - 執行建議
  - `POST /api/v1/recommendations/:id/ignore` - 忽略建議
  - `GET /api/v1/history` - 操作歷史
  - `POST /api/v1/history/:id/revert` - 還原操作
  - Done Criteria: 所有端點功能正常

### P4-004 實作一鍵執行功能

- [ ] **建立執行服務**
  - Google Ads API 寫入操作
  - Meta Marketing API 寫入操作
  - 操作前狀態快照
  - 操作後驗證
  - Done Criteria: 可透過 API 執行廣告變更

### ✅ Phase 4 完成條件

當滿足以下所有條件時，Phase 4 視為 **Completed**：

- [ ] 規則引擎可新增、執行自訂規則
- [ ] 系統自動產生素材/受眾/預算建議
- [ ] 優先級分數計算正確（嚴重度+金額影響+修復難度+影響範圍）
- [ ] Recommendations API 5 個端點全部正常運作
- [ ] 一鍵執行可透過 Google Ads API 執行變更
- [ ] 一鍵執行可透過 Meta API 執行變更
- [ ] 操作前快照與還原功能正常
- [ ] 測試覆蓋率 ≥ 85%

---

## 🟢 Phase 5：廣告健檢系統（Lower Priority）

### P5-001 實作帳戶結構檢查 (20%)

- [ ] **建立結構檢查服務**
  - 命名規則檢查
  - 廣告組數量檢查（3-10 個為健康）
  - 目標一致性檢查
  - 受眾競爭檢查
  - Done Criteria: 檢查正確識別問題

### P5-002 實作素材品質檢查 (25%)

- [ ] **建立素材檢查服務**
  - 素材多樣性檢查（≥3 種類型）
  - 素材疲勞度檢查（CTR 降幅 <15%）
  - 投放頻率檢查（<3 為健康）
  - 素材新鮮度檢查（<30 天有新素材）
  - Done Criteria: 檢查正確識別問題

### P5-003 實作受眾設定檢查 (25%)

- [ ] **建立受眾檢查服務**
  - 受眾規模檢查（10K-2M）
  - 受眾重疊率檢查（<20%）
  - 排除設定檢查
  - Lookalike 品質檢查
  - Done Criteria: 檢查正確識別問題

### P5-004 實作預算配置檢查 (20%)

- [ ] **建立預算檢查服務**
  - 預算效率分配檢查
  - 預算消耗率檢查（80-100%）
  - 學習期預算檢查
  - 出價策略檢查
  - Done Criteria: 檢查正確識別問題

### P5-005 實作追蹤設定檢查 (10%)

- [ ] **建立追蹤檢查服務**
  - 轉換追蹤檢查
  - Pixel 狀態檢查
  - 事件完整性檢查
  - UTM 參數檢查
  - Done Criteria: 檢查正確識別問題

### P5-006 開發健檢 API

- [ ] **實作 Audits API**
  - `POST /api/v1/audits` - 觸發健檢
  - `GET /api/v1/audits/:id` - 取得報告
  - `GET /api/v1/audits/:id/issues` - 問題清單
  - `POST /api/v1/issues/:id/resolve` - 標記已解決
  - `POST /api/v1/issues/:id/auto-fix` - 自動修復
  - Done Criteria: 所有端點功能正常

### ✅ Phase 5 完成條件

當滿足以下所有條件時，Phase 5 視為 **Completed**：

- [ ] 帳戶結構檢查 (20%) 正確識別命名/數量/目標問題
- [ ] 素材品質檢查 (25%) 正確識別多樣性/疲勞度/頻率/新鮮度問題
- [ ] 受眾設定檢查 (25%) 正確識別規模/重疊/排除/Lookalike 問題
- [ ] 預算配置檢查 (20%) 正確識別效率/消耗率/學習期問題
- [ ] 追蹤設定檢查 (10%) 正確識別轉換/Pixel/事件/UTM 問題
- [ ] 五維度加權計算綜合健康分數 (0-100) 正確
- [ ] Audits API 5 個端點全部正常運作
- [ ] 連接帳戶後自動觸發健檢
- [ ] 測試覆蓋率 ≥ 85%

---

## 🟢 Phase 6：前端開發（Lower Priority）

### P6-001 初始化前端專案

- [ ] **建立 React + TypeScript 專案**
  - Vite 專案設定
  - ESLint + Prettier 設定
  - 基本路由（React Router）
  - API 服務層（Axios）
  - Done Criteria: `npm run dev` 可啟動

### P6-002 開發儀表板頁面

- [ ] **實作 Dashboard 元件**
  - 核心指標卡片
  - 時間篩選器
  - 趨勢折線圖（Recharts）
  - 異常標記顯示
  - Done Criteria: 頁面正確顯示數據

### P6-003 開發素材庫頁面

- [ ] **實作 Creatives 元件**
  - 縮圖/清單檢視切換
  - 素材效能卡片
  - 疲勞度指標顯示
  - 批次操作 UI
  - Done Criteria: 頁面正確顯示數據

### P6-004 開發受眾分析頁面

- [ ] **實作 Audiences 元件**
  - 受眾清單
  - 效能排名顯示
  - 重疊分析視覺化
  - 排除建議卡片
  - Done Criteria: 頁面正確顯示數據

### P6-005 開發行動中心頁面

- [ ] **實作 Actions 元件**
  - 待辦事項清單
  - 優先級排序顯示
  - 一鍵執行按鈕
  - 操作歷史時間軸
  - Done Criteria: 頁面正確顯示數據

### P6-006 開發健檢報告頁面

- [ ] **實作 Audit 元件**
  - 綜合評分儀表
  - 五維度雷達圖
  - 問題清單
  - 修復引導流程
  - Done Criteria: 頁面正確顯示數據

### ✅ Phase 6 完成條件

當滿足以下所有條件時，Phase 6 視為 **Completed**：

- [ ] `npm run dev` 可啟動前端開發伺服器
- [ ] 儀表板頁面正確顯示跨平台整合數據
- [ ] 素材庫頁面支援縮圖/清單切換與批次操作
- [ ] 受眾分析頁面顯示重疊視覺化圖表
- [ ] 行動中心頁面支援一鍵執行與操作歷史
- [ ] 健檢報告頁面顯示五維度雷達圖
- [ ] 所有頁面載入時間 < 3 秒
- [ ] 前端測試覆蓋率 ≥ 70%
- [ ] ESLint 和 TypeScript 檢查全部通過

---

## ✅ Completed

- [x] 專案初始化（Ralph 框架設定）
- [x] PRD 轉換為 Ralph 格式

---

## 📝 Notes

- **MVP 優先**：先完成 Phase 1-3 核心功能
- **TDD 開發**：每個功能先寫測試再實作
- **覆蓋率 85%**：所有程式碼必須達到測試覆蓋率門檻
- **環境變數**：所有讀取必須 `.trim()` 處理

---

## ✅ 完成條件（Done Criteria）

當滿足以下條件時，此專案視為 **MVP Completed**：

- [ ] Phase 1-5 所有任務標記完成
- [ ] 所有測試通過（覆蓋率 ≥ 85%）
- [ ] 可成功連接 Google Ads 與 Meta 帳戶
- [ ] 儀表板正確顯示跨平台整合數據
- [ ] 素材疲勞度計算正確且警示功能正常
- [ ] 受眾重疊分析正確運作
- [ ] 一鍵執行功能可正確透過 API 執行變更
- [ ] 健檢報告五維度評分邏輯正確
- [ ] API 呼叫成功率 > 99%
- [ ] 數據同步延遲 < 30 分鐘
- [ ] 頁面載入時間 < 3 秒
