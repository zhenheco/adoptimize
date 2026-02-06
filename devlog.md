# AdOptimize 開發日誌

> 記錄開發過程中的重要決策、問題解決方案與學習經驗。
> 每次完成修復或重要變更後，請在此記錄。

---

## 格式範例

### YYYY-MM-DD - 標題

**問題描述：**
描述遇到的問題或需求

**解決方案：**
說明如何解決

**影響範圍：**
列出受影響的檔案或模組

**學習經驗：**
記錄值得注意的經驗

---

## 開發紀錄

### 2024-12-20 - 專案初始化

**問題描述：**
根據 PRD 文件建立 Ralph 開發環境配置

**解決方案：**
- 建立 PROMPT.md - 定義開發任務與成功標準
- 建立 agent.md - 定義建構指令與技術規範
- 建立 @IMPLEMENTATION_PLAN.md - 追蹤開發進度
- 建立 devlog.md - 記錄開發日誌

**影響範圍：**
- 新增: PROMPT.md, agent.md, @IMPLEMENTATION_PLAN.md, devlog.md

**學習經驗：**
Ralph 框架使用三個核心文件：
1. PROMPT.md - 定義「做什麼」
2. agent.md - 定義「怎麼做」
3. @IMPLEMENTATION_PLAN.md - 追蹤「做到哪」

---

### 2026-02-06 - LinkedIn Ads 整合上線 + get_db 雙重 yield 修復

**問題描述：**
1. LinkedIn Marketing API 審核通過後，需要設定環境變數並測試 OAuth 連接流程
2. 測試時發現點擊「連結 LinkedIn Ads」出現 Internal Server Error（500）

**解決方案：**
1. 設定 Fly.io secrets 和本地 .env 的 LinkedIn 憑證
2. 發現兩個根本原因：
   - JWT token 過期（登入後 7 小時）
   - `get_db()` async generator 有雙重 yield bug：當路由拋出 HTTPException 時，外層 try/except 會嘗試 yield 第二次 MockAsyncSession，導致 `RuntimeError: generator didn't stop after athrow()`
3. 修正 `get_db()` 為分離式結構：session 建立失敗時 yield + return，成功時走正常的 yield/commit/rollback 流程
4. 部署修正後，引導用戶在 LinkedIn Developer Portal 新增 redirect URL
5. 完成端到端 OAuth 授權測試

**影響範圍：**
- `backend/app/db/base.py` - 修正 `get_db()` 函數
- `backend/.env` - 新增 LinkedIn 憑證
- Fly.io secrets - 新增 `LINKEDIN_CLIENT_ID` 和 `LINKEDIN_CLIENT_SECRET`

**學習經驗：**
- Python async generator 每條執行路徑只能有一個 yield 點，否則 athrow() 會導致 RuntimeError
- LinkedIn OAuth redirect URL 必須完全匹配（包含路徑），需在 Developer Portal 預先註冊
- 測試 OAuth 流程前要確保 JWT token 未過期

---

<!-- 在此下方新增新的開發紀錄 -->
