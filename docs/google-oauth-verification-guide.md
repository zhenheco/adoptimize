# Google OAuth 驗證申請指南

> 最後更新：2026-02-06

## 概述

AdOptimize（廣告船長）使用 Google Ads API 來讀取和分析用戶的廣告數據。由於使用了敏感權限（`adwords` scope），需要通過 Google 的 OAuth 驗證才能讓所有用戶使用。

---

## 準備材料清單

| 項目 | 狀態 | 說明 |
|------|------|------|
| 隱私權政策頁面 | ✅ 已完成 | https://adoptimize.1wayseo.com/privacy |
| 服務條款頁面 | ✅ 已完成 | https://adoptimize.1wayseo.com/terms |
| 應用程式首頁 | ✅ 已完成 | https://adoptimize.1wayseo.com |
| OAuth Consent Screen 設定 | ⏳ 需確認 | 見步驟 1 |
| 示範影片 | ❌ 需錄製 | 見步驟 2 |
| 驗證表單填寫 | ❌ 需提交 | 見步驟 3（文字已備好） |

---

## 步驟 1：確認 OAuth Consent Screen 設定

### 前往位置
Google Cloud Console → APIs & Services → OAuth consent screen
https://console.cloud.google.com/apis/credentials/consent

### 1.1 App Information（應用程式資訊）

直接複製貼上以下內容：

| 欄位 | 填入值 |
|------|--------|
| App name | `AdOptimize` |
| User support email | `acejou27@gmail.com` |
| App logo | 上傳 AdOptimize logo（120x120 px，PNG/JPG） |

### 1.2 App Domain（應用程式網域）

| 欄位 | 填入值 |
|------|--------|
| Application home page | `https://adoptimize.1wayseo.com` |
| Application privacy policy link | `https://adoptimize.1wayseo.com/privacy` |
| Application terms of service link | `https://adoptimize.1wayseo.com/terms` |

### 1.3 Authorized Domains（已授權網域）

只需新增：
```
1wayseo.com
```

> **注意**：`fly.dev` 是共用網域，無法加入 Authorized Domains。
> 但不影響 OAuth 流程 — callback URL 是設定在 Credentials 頁面的 Authorized Redirect URIs，不是這裡。

### 1.4 Developer Contact Information（開發者聯絡資訊）

| 欄位 | 填入值 |
|------|--------|
| Email addresses | `acejou27@gmail.com` |

### 1.5 Scopes（權限範圍）

點擊「ADD OR REMOVE SCOPES」，新增：

| Scope | 類型 | 說明 |
|-------|------|------|
| `https://www.googleapis.com/auth/adwords` | 敏感 | Google Ads API 讀取權限 |

### 1.6 Test Users（測試用戶）

在驗證通過前，最多可加 100 個測試用戶。新增你自己和需要測試的帳號 email。

---

## 步驟 2：錄製示範影片

### 影片規格

| 項目 | 要求 |
|------|------|
| 長度 | 3-5 分鐘 |
| 解析度 | 720p 以上 |
| 語言 | 英文（建議） |
| 上傳平台 | YouTube，設為「不公開」(Unlisted) |
| 錄製工具 | OBS Studio / QuickTime / Loom 皆可 |

### 影片錄製腳本（逐段照做）

---

#### 第 1 段：開場介紹（約 30 秒）

**畫面**：打開 https://adoptimize.1wayseo.com 首頁

**旁白**（建議英文）：
```
Hello, this is a demonstration of AdOptimize — a cross-platform
advertising optimization tool that helps businesses analyze and
optimize their ad campaigns across Google Ads, Meta, TikTok,
and other platforms.

I will demonstrate how AdOptimize uses the Google Ads API scope
to provide value to our users.
```

---

#### 第 2 段：用戶登入（約 30 秒）

**操作步驟**：
1. 點擊首頁的「登入」或直接前往 `/auth/login`
2. 使用 Email/密碼 或 Google OAuth 登入
3. 登入成功後進入 Dashboard

**旁白**：
```
Users can sign in to AdOptimize using email and password,
or through Google OAuth for a seamless login experience.

After logging in, users land on their Dashboard where they
can see an overview of their advertising performance.
```

---

#### 第 3 段：連接 Google Ads 帳戶（約 1 分鐘）⭐ 重點

**操作步驟**：
1. 點擊側邊欄的「帳戶管理」(Accounts) 進入帳戶頁面
2. 展示「連結新帳戶」區塊，有多個平台按鈕
3. 點擊「連結 Google Ads」按鈕
4. 跳轉到 Google 的 OAuth 授權畫面
5. 展示 Google 授權頁面顯示的 scope 和權限說明
6. 點擊「Allow」授權
7. 重新導向回 AdOptimize，顯示成功連結訊息
8. 已連結帳戶出現在「已連結帳戶」列表中

**旁白**：
```
Now let me demonstrate the Google Ads connection flow.

On the Accounts page, users can connect various advertising
platforms. I'll click "Connect Google Ads".

This redirects to Google's OAuth consent screen, where users
can see exactly what permissions AdOptimize is requesting —
specifically, read-only access to their Google Ads data through
the "adwords" scope.

The user must explicitly authorize this access. After clicking
"Allow", they are redirected back to AdOptimize with a success
confirmation.

The connected Google Ads account now appears in the accounts
list with its status and last sync time.
```

---

#### 第 4 段：展示數據使用方式（約 1 分鐘）

**操作步驟**：
1. 回到 Dashboard，展示廣告數據概覽
2. 展示 Campaign 指標（Impressions, Clicks, Conversions, Spend）
3. 展示 ROAS 分析
4. 展示優化建議功能

**旁白**：
```
Once connected, AdOptimize syncs campaign data from Google Ads
and displays it in the user's dashboard.

Users can see key performance metrics including impressions,
clicks, conversions, and advertising spend. The platform
analyzes this data to calculate important KPIs like ROAS
(Return on Ad Spend) and provides data-driven optimization
recommendations.

All of this data is read-only — AdOptimize does NOT modify,
create, or delete any campaigns or ads on behalf of the user.
We only read performance data to provide analytics and insights.
```

---

#### 第 5 段：數據安全與中斷連接（約 1 分鐘）⭐ 重點

**操作步驟**：
1. 回到帳戶管理頁面
2. 展示已連結帳戶的「X」(中斷連結) 按鈕
3. 點擊中斷連結，展示帳戶被移除
4. 開一個新分頁，打開隱私權政策頁面 https://adoptimize.1wayseo.com/privacy

**旁白**：
```
Data security is a top priority for AdOptimize.

Users have full control over their connected accounts. They
can disconnect any advertising account at any time by clicking
the disconnect button on the Accounts page. When disconnected,
access tokens are immediately revoked and cleared.

Our privacy policy, available at adoptimize.1wayseo.com/privacy,
details our data handling practices:

- All data is encrypted in transit using TLS and at rest
- We do not share, sell, or transfer user data to third parties
- Users can request complete data deletion at any time
- Data is retained only while the user maintains an active account

Users can also revoke access from their Google Account settings
at any time.
```

---

#### 第 6 段：結尾（約 15 秒）

**畫面**：回到首頁或 Dashboard

**旁白**：
```
Thank you for reviewing this demonstration of AdOptimize.
For any questions regarding our application or data practices,
please contact us at acejou27@gmail.com.
```

---

### 影片錄製注意事項

1. **確保帳戶有真實數據**：錄製前先連接一個 Google Ads 測試帳戶，確保 Dashboard 有數據展示
2. **隱藏敏感資訊**：遮蓋真實的帳戶 ID、花費金額等（可以用馬賽克）
3. **操作速度適中**：不要太快，讓審核人員能看清楚每一步
4. **全螢幕錄製**：確保瀏覽器地址欄可見（Google 會確認 URL 正確）
5. **展示 OAuth 授權頁面**：這是最重要的部分，確保清楚展示 scope 資訊

---

## 步驟 3：提交驗證申請

### 3.1 點擊「PUBLISH APP」

在 OAuth consent screen 頁面，將 App 從 Testing 切換到 Production：
- 點擊 **「PUBLISH APP」**
- 確認彈窗

### 3.2 點擊「Prepare for verification」

### 3.3 填寫驗證表單

以下是每個欄位的完整填寫內容，直接複製貼上即可：

---

#### 欄位 1：Why do you need access to sensitive or restricted scopes?

```
AdOptimize is a cross-platform advertising optimization SaaS platform
that helps businesses analyze and optimize their advertising campaigns
across multiple platforms including Google Ads, Meta Ads, and TikTok Ads.

We need access to the Google Ads API (adwords scope) to:

1. Read campaign performance data (impressions, clicks, conversions, spend)
2. Read ad set and ad-level performance metrics
3. Analyze advertising effectiveness and calculate KPIs (ROAS, CPA, CTR)
4. Display performance dashboards and generate optimization recommendations
5. Sync campaign structures (campaigns, ad sets, ads) for unified reporting

IMPORTANT: We request READ-ONLY access. AdOptimize does NOT:
- Create, modify, or delete campaigns or ads
- Change budget settings or bidding strategies
- Manage audience targeting or ad creatives
- Perform any write operations on the user's Google Ads account

Users explicitly authorize this connection through the standard OAuth
consent flow and can revoke access at any time from within AdOptimize
or from their Google Account security settings.
```

---

#### 欄位 2：Describe how you will use the user data obtained from Google APIs

```
User data obtained from the Google Ads API is used exclusively for
the following purposes:

1. DASHBOARD DISPLAY: Advertising performance metrics (impressions,
   clicks, conversions, spend, ROAS) are displayed in the user's
   private dashboard, visible only to the account owner.

2. ANALYTICS & INSIGHTS: Campaign data is analyzed to generate
   optimization recommendations, trend analysis, and performance
   reports for the account owner.

3. CROSS-PLATFORM COMPARISON: Google Ads data is compared alongside
   data from other connected platforms (Meta, TikTok) to provide
   unified advertising insights.

DATA HANDLING PRACTICES:

- Encryption: All data is encrypted in transit (TLS 1.2+) and at
  rest (AES-256) using industry-standard encryption.

- Storage: Data is stored in Supabase (PostgreSQL) hosted on AWS
  with strict access controls and regular security audits.

- Access Control: Each user can only access their own advertising
  data. Multi-tenant isolation ensures no cross-user data access.

- Data Minimization: We only store aggregated performance metrics.
  We do not store personally identifiable information of ad viewers
  or raw ad creative content.

- No Third-Party Sharing: We do NOT share, sell, license, or
  transfer user data to any third parties for any purpose.

- Data Retention: Data is retained only while the user maintains
  an active account. Users can disconnect their Google Ads account
  at any time, which immediately revokes API access tokens.

- Data Deletion: Users can request complete deletion of their data
  by disconnecting their account or contacting support.

- Compliance: Our data practices comply with GDPR and applicable
  data protection regulations.

Privacy Policy: https://adoptimize.1wayseo.com/privacy
Terms of Service: https://adoptimize.1wayseo.com/terms
```

---

#### 欄位 3：YouTube 影片連結

```
[錄製完成後填入 YouTube 不公開連結]
格式：https://www.youtube.com/watch?v=XXXXXXXXX
```

---

#### 欄位 4：其他補充說明（如有此欄位）

```
AdOptimize is a SaaS platform currently in early access. Our target
users are small to medium-sized businesses and marketing agencies
who manage advertising campaigns across multiple platforms.

The Google Ads integration is a core feature that enables our users
to view their Google Ads performance data alongside other platform
data in a unified dashboard.

We have implemented comprehensive security measures including:
- CSRF protection on all OAuth flows using Redis-backed state tokens
- JWT-based authentication for API access
- Token encryption and secure storage
- Automatic token refresh to maintain valid access
- Immediate token clearing on account disconnection

Contact: acejou27@gmail.com
Website: https://adoptimize.1wayseo.com
```

---

### 3.4 提交

點擊 **「Submit」** 送出驗證申請。

---

## 步驟 4：等待審核

| 項目 | 說明 |
|------|------|
| 審核時間 | 通常 2-4 週 |
| 通知方式 | Email 通知到開發者聯絡信箱 |
| 審核期間 | 最多 100 個測試用戶可使用（會看到未經驗證警告） |
| 被拒絕 | Google 會說明原因，修正後可重新提交 |

---

## 快速行動清單

- [ ] 確認 OAuth consent screen 所有欄位已正確填寫
- [ ] 確認 Authorized Domain 已加入 `1wayseo.com`
- [ ] 確認 Scope 已加入 `adwords`
- [ ] 錄製示範影片（依照上方腳本）
- [ ] 上傳影片到 YouTube（設為不公開）
- [ ] 點擊「PUBLISH APP」切換到 Production
- [ ] 點擊「Prepare for verification」
- [ ] 填寫驗證表單（複製上方文字）
- [ ] 貼上影片連結
- [ ] 點擊「Submit」提交
- [ ] 記錄提交日期，等待審核結果

---

## 常見問題

### Q: 審核期間用戶能使用嗎？
A: 可以，但會看到「此應用程式未經 Google 驗證」警告。測試用戶（最多 100 人）可以點擊「進階 → 前往 AdOptimize（不安全）」繼續使用。

### Q: 審核被拒絕怎麼辦？
A: Google 會說明拒絕原因。常見原因包括：影片不夠清楚、隱私權政策不完整、未展示中斷連接功能等。根據反饋修改後重新提交即可。

### Q: 需要年度審核嗎？
A: 是的，Google 會定期審查已驗證的應用程式，確保仍符合政策要求。

### Q: Authorized Redirect URI 需要設定什麼？
A: 在 Credentials 頁面（非 consent screen），確認 OAuth 2.0 Client ID 的 Authorized redirect URIs 包含：
```
https://adoptimize-api.fly.dev/api/v1/accounts/connect/google/callback
http://localhost:8000/api/v1/accounts/connect/google/callback
```
