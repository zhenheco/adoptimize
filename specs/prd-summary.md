# AdOptimize Platform - PRD 規格摘要

> 此文件為 PRD 的精簡版本，供 Ralph 開發時快速參考

---

## 1. 產品概述

### 1.1 產品願景

打造一套「半自動化」的廣告優化平台，透過智能分析與建議系統，協助沒有廣告投放經驗的團隊快速上手，並逐步節省 90% 以上的手動操作時間。

### 1.2 設計原則

**AI 建議 + 人工確認 + 一鍵執行**

### 1.3 目標平台

- Google Ads
- Meta (Facebook/Instagram)

---

## 2. 目標用戶

### 用戶類型 A：中小企業主

- 月廣告預算：$500 - $5,000 美元
- 痛點：沒時間學習複雜的廣告後台

### 用戶類型 B：初階行銷人員

- 月廣告預算：$1,000 - $20,000 美元
- 痛點：不確定設定是否正確，擔心浪費預算

---

## 3. 技術架構

### 3.1 技術選型

| 類別 | 技術 | 說明 |
|------|------|------|
| 後端 | Python + FastAPI | Google/Meta SDK 最佳支援 |
| 資料庫 | PostgreSQL | ACID 事務、JSONB |
| 快取 | Redis + Celery | 速率限制、任務排程 |
| 前端 | React + TypeScript | Dashboard UI |
| 圖表 | Recharts / ECharts | 效能優異 |

### 3.2 架構層次

1. **展示層**：React Dashboard
2. **應用層**：FastAPI + 五大模組 + 規則引擎
3. **服務層**：Celery 任務佇列、排程同步
4. **數據層**：PostgreSQL + Redis
5. **整合層**：Google Ads API、Meta Marketing API

---

## 4. 核心模組規格

### 模組一：數據儀表板

#### 功能需求

| ID | 功能 | 優先級 |
|----|------|--------|
| D-001 | 跨平台整合檢視 | P0 |
| D-002 | 核心指標卡片（花費、曝光、點擊、轉換、CPA、ROAS） | P0 |
| D-003 | 時間篩選器（今日、7天、30天、自訂） | P0 |
| D-004 | 趨勢折線圖 | P0 |
| D-005 | 異常標記系統（紅/黃/綠燈） | P1 |
| D-006 | 比較功能 | P1 |
| D-007 | 數據匯出（CSV/Excel） | P2 |

#### 數據同步規格

- 同步頻率：每 15-30 分鐘
- 歷史數據：保留 90 天
- 延遲容忍：< 1 小時

#### 異常判定規則

| 指標 | 🟢 正常 | 🟡 警示 | 🔴 異常 |
|------|--------|--------|--------|
| CPA 變化 | < +10% | +10% ~ +30% | > +30% |
| ROAS 變化 | > -10% | -10% ~ -30% | < -30% |
| CTR 變化 | > -15% | -15% ~ -30% | < -30% |
| 花費進度 | 80-100% | 50-80% 或 >100% | < 50% |

---

### 模組二：素材管理

#### 功能需求

| ID | 功能 | 優先級 |
|----|------|--------|
| C-001 | 素材庫總覽（縮圖/清單） | P0 |
| C-002 | 素材效能卡片（CTR、轉換率、花費） | P0 |
| C-003 | 疲勞度指標（0-100分） | P0 |
| C-004 | 疲勞警示通知 | P1 |
| C-005 | 素材優化建議 | P1 |
| C-006 | 批次暫停/啟用 | P1 |
| C-007 | A/B 測試追蹤 | P2 |

#### 疲勞度計算公式

```
疲勞度 = CTR變化率(40%) + 投放頻率(30%) + 投放天數(20%) + 轉換率變化(10%)
```

| 因素 | 計算方式 | 權重 |
|------|---------|------|
| CTR 變化率 | (初始CTR - 當前CTR) / 初始CTR | 40% |
| 投放頻率 | 每用戶平均曝光次數 | 30% |
| 投放天數 | 啟用至今天數 | 20% |
| 轉換率變化 | 近7天 vs 前7天 | 10% |

#### 疲勞警示門檻

| 等級 | 分數 | 建議 |
|------|------|------|
| 🟢 健康 | 0-40 | 持續投放 |
| 🟡 注意 | 41-70 | 準備替換 |
| 🔴 疲勞 | 71-100 | 立即更換或暫停 |

---

### 模組三：受眾分析

#### 功能需求

| ID | 功能 | 優先級 |
|----|------|--------|
| A-001 | 受眾清單管理 | P0 |
| A-002 | 受眾效能排名（CPA/ROAS） | P0 |
| A-003 | 受眾健康度指標 | P0 |
| A-004 | 重疊分析 | P1 |
| A-005 | 排除建議 | P1 |
| A-006 | 擴展建議 | P1 |
| A-007 | 自動排除執行 | P2 |

#### 受眾健康度評分

| 因素 | 健康標準 | 問題判定 | 權重 |
|------|---------|---------|------|
| 受眾規模 | 10K - 2M | <5K 或 >10M | 25% |
| CPA 表現 | 低於帳戶平均 | 高於平均 30%+ | 35% |
| ROAS 表現 | >1.5x | <1.0x | 25% |
| 更新新鮮度 | <30 天 | >60 天 | 15% |

#### 重疊率警示門檻

| 重疊率 | 狀態 | 建議 |
|--------|------|------|
| < 20% | 🟢 正常 | 無需處理 |
| 20-30% | 🟡 注意 | 考慮合併或區隔 |
| > 30% | 🔴 高重疊 | 廣告可能互相競價 |

---

### 模組四：行動中心

#### 功能需求

| ID | 功能 | 優先級 |
|----|------|--------|
| T-001 | 待辦事項清單 | P0 |
| T-002 | 優先級排序 | P0 |
| T-003 | 一鍵執行 | P0 |
| T-004 | 批次操作 | P1 |
| T-005 | 操作歷史記錄 | P1 |
| T-006 | 忽略/稍後 | P1 |
| T-007 | 還原功能 | P2 |

#### 優先級計算公式

```
優先級 = 嚴重度基礎分 + 金額影響分 + 修復難度分 + 影響範圍分
```

| 因素 | 計算方式 | 最高分 |
|------|---------|--------|
| 嚴重度基礎分 | Critical=100, High=70, Medium=40, Low=20 | 100 |
| 金額影響分 | 預估節省金額 / 100（上限50） | 50 |
| 修復難度分 | 一鍵=30, 簡單=20, 中等=10, 複雜=0 | 30 |
| 影響範圍分 | 受影響數量 × 2 | 無上限 |

#### 操作類型

| 類型 | 自動執行 | 需確認 | 範例 |
|------|---------|--------|------|
| 暫停廣告/素材 | ✓ 可 | 建議確認 | 暫停疲勞素材 |
| 降低預算 | ✓ 可 | 必須確認 | CPA過高降50% |
| 增加預算 | ✓ 可 | 必須確認 | ROAS好增20% |
| 建立排除受眾 | ✓ 可 | 建議確認 | 排除已購買者 |
| 結構調整 | ✗ 不可 | 提供指引 | 重組廣告活動 |

---

### 模組五：廣告健檢

#### 功能需求

| ID | 功能 | 優先級 |
|----|------|--------|
| H-001 | 自動健檢觸發 | P0 |
| H-002 | 五維度評分 | P0 |
| H-003 | 綜合健康分數（0-100） | P0 |
| H-004 | 問題清單 | P0 |
| H-005 | 問題詳情卡片 | P0 |
| H-006 | 修復引導 | P1 |
| H-007 | 報告匯出（PDF） | P2 |
| H-008 | 定期重新健檢 | P2 |

#### 五維度檢查

##### 維度一：帳戶結構（20%）

| 檢查項目 | 健康標準 | 問題判定 | 扣分 |
|---------|---------|---------|------|
| 命名規則 | 有清晰命名 | 含「Copy」或亂碼 | -5 |
| 廣告組數量 | 每活動 3-10 個 | <3 或 >15 | -10 |
| 廣告組內廣告數 | 每組 3-6 則 | <2 或 >10 | -8 |
| 目標一致性 | 目標與設定匹配 | 未設追蹤 | -15 |
| 受眾競爭 | 無重複競標 | 同受眾多廣告組 | -12 |

##### 維度二：素材品質（25%）

| 檢查項目 | 健康標準 | 問題判定 | 扣分 |
|---------|---------|---------|------|
| 素材多樣性 | ≥3 種類型 | 只有單一類型 | -10 |
| 素材疲勞度 | CTR 週降幅 <15% | CTR 下降 >20% | -12 |
| 投放頻率 | 頻率 <3 | 頻率 >4 | -8 |
| 素材新鮮度 | <30 天有新素材 | >45 天無更新 | -10 |
| 文案長度 | 符合最佳實踐 | 標題被截斷 | -5 |

##### 維度三：受眾設定（25%）

| 檢查項目 | 健康標準 | 問題判定 | 扣分 |
|---------|---------|---------|------|
| 受眾規模 | 10K - 2M | <5K 或 >10M | -10 |
| 受眾重疊率 | <20% | >30% | -12 |
| 排除設定 | 已排除購買者 | 無排除設定 | -15 |
| Lookalike 品質 | 基於購買者 | 基於所有訪客 | -8 |
| 受眾新鮮度 | <30 天更新 | >60 天未更新 | -10 |

##### 維度四：預算配置（20%）

| 檢查項目 | 健康標準 | 問題判定 | 扣分 |
|---------|---------|---------|------|
| 預算效率分配 | 高 ROAS 獲較多預算 | 低效活動佔 >30% | -15 |
| 預算消耗率 | 80-100% | <50% 或常超支 | -10 |
| 學習期預算 | ≥10 次轉換/天 | 預算不足學習 | -12 |
| 出價策略 | 符合目標 | 轉換目標用 CPM | -10 |

##### 維度五：追蹤設定（10%）

| 檢查項目 | 健康標準 | 問題判定 | 扣分 |
|---------|---------|---------|------|
| 轉換追蹤 | 已設定且有數據 | 未設定或無數據 | -20 |
| Pixel 狀態 | 正常觸發 | 錯誤或未觸發 | -18 |
| 事件完整性 | 追蹤完整漏斗 | 只追蹤最終轉換 | -10 |
| UTM 參數 | 有一致規則 | 無 UTM 或不一致 | -8 |

---

## 5. API 端點規格

### 認證

- 方式：JWT Token
- 有效期：24 小時
- 刷新：Refresh Token 30 天

### 帳戶管理

| 方法 | 端點 | 說明 |
|------|------|------|
| POST | /api/v1/accounts/connect/google | 連接 Google Ads |
| POST | /api/v1/accounts/connect/meta | 連接 Meta Ads |
| GET | /api/v1/accounts | 取得已連接帳戶 |
| DELETE | /api/v1/accounts/:id | 斷開連接 |

### 儀表板

| 方法 | 端點 | 說明 |
|------|------|------|
| GET | /api/v1/dashboard/overview | 總覽數據 |
| GET | /api/v1/dashboard/metrics | 指標數據 |
| GET | /api/v1/dashboard/trends | 趨勢數據 |
| GET | /api/v1/dashboard/alerts | 異常警示 |

### 素材管理

| 方法 | 端點 | 說明 |
|------|------|------|
| GET | /api/v1/creatives | 素材清單 |
| GET | /api/v1/creatives/:id | 素材詳情 |
| GET | /api/v1/creatives/fatigued | 疲勞素材 |
| POST | /api/v1/creatives/:id/pause | 暫停素材 |
| POST | /api/v1/creatives/batch/pause | 批次暫停 |

### 受眾分析

| 方法 | 端點 | 說明 |
|------|------|------|
| GET | /api/v1/audiences | 受眾清單 |
| GET | /api/v1/audiences/:id | 受眾詳情 |
| GET | /api/v1/audiences/overlap | 重疊分析 |
| POST | /api/v1/audiences/exclusion | 建立排除受眾 |

### 行動中心

| 方法 | 端點 | 說明 |
|------|------|------|
| GET | /api/v1/recommendations | 建議清單 |
| POST | /api/v1/recommendations/:id/execute | 執行建議 |
| POST | /api/v1/recommendations/:id/ignore | 忽略建議 |
| GET | /api/v1/history | 操作歷史 |
| POST | /api/v1/history/:id/revert | 還原操作 |

### 健檢系統

| 方法 | 端點 | 說明 |
|------|------|------|
| POST | /api/v1/audits | 觸發健檢 |
| GET | /api/v1/audits/:id | 取得報告 |
| GET | /api/v1/audits/:id/issues | 問題清單 |
| POST | /api/v1/issues/:id/resolve | 標記已解決 |
| POST | /api/v1/issues/:id/auto-fix | 自動修復 |

---

## 6. 資料模型

### 主要實體

#### 用戶與帳戶

```
users: id, email, name, subscription_tier, created_at
ad_accounts: id, user_id, platform, external_id, name, status, access_token
campaigns: id, account_id, external_id, name, objective, status, budget
ad_sets: id, campaign_id, external_id, name, targeting, status, budget
ads: id, ad_set_id, external_id, name, creative_id, status
```

#### 素材與受眾

```
creatives: id, account_id, type, headline, body, image_url, video_url, cta
creative_metrics: id, creative_id, date, impressions, clicks, ctr, conversions, spend
audiences: id, account_id, external_id, name, type, size, source
audience_metrics: id, audience_id, date, reach, cpa, roas, conversions
```

#### 健檢與操作

```
health_audits: id, account_id, overall_score, structure_score, creative_score...
audit_issues: id, audit_id, category, severity, issue_code, title, description, status
action_history: id, user_id, action_type, target_type, target_id, before_state, after_state
recommendations: id, account_id, type, priority_score, title, description, action_module
```

---

## 7. 成功指標

### 技術指標

| 指標 | 目標 |
|------|------|
| API 呼叫成功率 | > 99% |
| 數據同步延遲 | < 30 分鐘 |
| 頁面載入時間 | < 3 秒 |
| 系統可用性 | > 99.5% |

### 產品指標

| 指標 | 目標 |
|------|------|
| 每日檢視時間節省 | 2小時 → 30分鐘 |
| 異常發現速度 | 隔天 → 當天 |
| 建議採納率 | > 60% |
| 操作執行時間 | 10分鐘 → 1分鐘 |

---

## 8. 術語表

| 術語 | 定義 |
|------|------|
| CPA | Cost Per Acquisition，每次轉換成本 |
| ROAS | Return On Ad Spend，廣告投資報酬率 |
| CTR | Click Through Rate，點擊率 |
| CPM | Cost Per Mille，每千次曝光成本 |
| Lookalike | 相似受眾，基於種子受眾特徵找到相似用戶 |
| Custom Audience | 自訂受眾，上傳客戶名單或網站訪客建立的受眾 |
| Pixel | 追蹤代碼，安裝於網站追蹤用戶行為 |
| 頻率 | 平均每位用戶看到廣告的次數 |

---

## 9. 參考資源

- [Google Ads API](https://developers.google.com/google-ads/api)
- [Meta Marketing API](https://developers.facebook.com/docs/marketing-apis)
- [Google Ads 最佳實踐](https://support.google.com/google-ads)
- [Meta Business Help](https://facebook.com/business/help)
