# OAuth 權限申請教學

> 最後更新：2026-02-02

## 📊 權限申請狀態總覽

| 平台 | 權限類型 | 申請狀態 | 需要準備 |
|------|---------|---------|---------|
| **Google OAuth（登入）** | 基本 | ✅ 無需額外申請 | - |
| **Google Ads API** | 敏感 | ⏳ 需驗證 | 示範影片 |
| **Meta（登入）** | 基本 | ✅ 無需額外申請 | - |
| **Meta Ads API** | 進階 | ⏳ 需 App Review | 商業用途說明 |
| **TikTok Ads** | 進階 | ⏳ 需申請 | 開發者帳號審核 |
| **Reddit Ads** | 進階 | ⏳ 需申請 | API Access 申請 |
| **LinkedIn Ads** | 進階 | ⏳ 需申請 | Marketing Developer Platform |
| **LINE Ads** | API Key | ⏳ 需申請 | 商業帳號 + API 憑證 |

---

## 目前使用的 OAuth Scopes

### Google OAuth（用戶登入）
```
openid email profile
```

### Google Ads API
```
https://www.googleapis.com/auth/adwords
```

### Meta/Facebook（用戶登入）
```
email public_profile
```

### Meta Ads API
```
ads_management
ads_read
business_management
```

### TikTok Marketing API
```
ad.read
ad.write
campaign.read
campaign.write
adgroup.read
adgroup.write
```

### Reddit Ads API
```
ads
adsread
adsedit
identity
```

### LinkedIn Marketing API
```
r_ads
rw_ads
r_basicprofile
r_organization_admin
```

### LINE Ads
- 使用 JWS 認證（非 OAuth）
- 需要 Access Key + Secret Key

---

## 1️⃣ Google Ads API 驗證

### 申請連結
https://console.cloud.google.com/apis/credentials/consent

### 待完成事項
- [ ] 錄製示範影片（3-5 分鐘）
- [ ] 上傳到 YouTube（可設為不公開）
- [ ] 在 Google Cloud Console 提交驗證申請

### 影片內容要求
1. 展示用戶登入流程
2. 展示連接 Google Ads 帳戶的 OAuth 流程
3. 展示數據如何在 Dashboard 中顯示
4. 展示用戶如何斷開連接

### 詳細教學
參考：`docs/google-oauth-verification-guide.md`

---

## 2️⃣ Meta Ads API - App Review 申請

### 申請連結
https://developers.facebook.com/apps/1336497714898181/app-review/permissions/

### 需要申請的權限

| Permission | 用途 | 類型 |
|------------|------|------|
| `ads_management` | 管理廣告帳號 | Advanced Access |
| `ads_read` | 讀取廣告數據 | Advanced Access |
| `business_management` | 管理業務帳號 | Advanced Access |

### 申請步驟

**Step 1：完成 Business Verification**
- 前往 Meta Business Suite
- 提交公司驗證文件

**Step 2：切換到「進階存取權」**
- 在 App Review 頁面，點擊每個權限旁的「Request Advanced Access」

**Step 3：準備申請材料**

| 項目 | 內容 |
|------|------|
| 商業驗證 | 需完成 Business Verification |
| 隱私權政策 | https://adoptimize.1wayseo.com/privacy |
| 服務條款 | https://adoptimize.1wayseo.com/terms |
| 螢幕錄影 | 展示如何使用這些權限 |

### 權限用途說明範本

#### ads_management
```
AdOptimize connects to users' Meta Ads accounts to:
1. Display advertising performance metrics in dashboards
2. Analyze campaign effectiveness
3. Provide optimization recommendations

We request ads_management to access ad account information and campaign structures. Users explicitly authorize this connection and can revoke access at any time.

Data handling:
- All data encrypted in transit and at rest
- Data used only for analytics displayed to the account owner
- No data sharing with third parties
- Users can delete data by disconnecting their account
```

#### ads_read
```
We need ads_read permission to retrieve advertising insights and metrics including:
- Campaign performance (impressions, clicks, conversions)
- Ad spend and ROAS
- Audience demographics

This data is displayed only to the account owner in their private dashboard. We do not store raw ad creative content.
```

#### business_management
```
business_management allows users to select which ad accounts to connect from their Business Manager. This is essential for users managing multiple ad accounts.

We only read the list of available ad accounts - we do not modify business settings or permissions.
```

---

## 3️⃣ TikTok Marketing API 申請

### 申請連結
https://business-api.tiktok.com/portal/docs?id=1738855176671234

### 需要申請的權限

| Scope | 用途 |
|-------|------|
| `ad.read` / `ad.write` | 讀寫廣告 |
| `campaign.read` / `campaign.write` | 讀寫廣告活動 |
| `adgroup.read` / `adgroup.write` | 讀寫廣告組 |

### 申請步驟

1. **註冊 TikTok for Business 開發者帳號**
2. **創建 App**
   - 登入 TikTok Marketing API Portal
   - 點擊「Create App」
   - 選擇「Marketing API」
3. **申請 Production Access**
   - 填寫公司資訊
   - 提供使用案例說明
4. **等待審核**（約 3-5 個工作天）

### 申請資訊

| 欄位 | 填寫內容 |
|------|---------|
| App Name | AdOptimize |
| Company Name | [你的公司名稱] |
| Website | https://adoptimize.1wayseo.com |
| Privacy Policy | https://adoptimize.1wayseo.com/privacy |
| Redirect URI | https://adoptimize-api.fly.dev/api/v1/oauth/tiktok/callback |

---

## 4️⃣ Reddit Ads API 申請

### 申請連結
https://www.reddit.com/prefs/apps

### 需要申請的權限

| Scope | 用途 |
|-------|------|
| `ads` | 全面的廣告管理權限 |
| `adsread` | 讀取廣告數據 |
| `adsedit` | 編輯廣告 |
| `identity` | 識別用戶身份 |

### 申請步驟

1. **創建 Reddit App**
   - 前往 https://www.reddit.com/prefs/apps
   - 點擊「create another app...」
   - 選擇「web app」
   - Redirect URI：`https://adoptimize-api.fly.dev/api/v1/oauth/reddit/callback`

2. **申請 Ads API 權限**
   - 發送 email 到 `api@reddit.com`

### Email 範本

```
Subject: Request for Reddit Ads API Access

Hello Reddit API Team,

I am requesting access to the Reddit Ads API for my application AdOptimize.

Application Details:
- Name: AdOptimize
- Website: https://adoptimize.1wayseo.com
- Purpose: Cross-platform advertising analytics and optimization

Use Case:
AdOptimize helps businesses analyze and optimize their advertising campaigns across multiple platforms including Reddit. We need Ads API access to:
1. Display campaign performance metrics
2. Analyze advertising effectiveness
3. Provide optimization recommendations

We only request read access to ads data. All data handling complies with Reddit's API terms and our privacy policy.

Privacy Policy: https://adoptimize.1wayseo.com/privacy

Thank you for considering this request.

Best regards,
[Your Name]
```

---

## 5️⃣ LinkedIn Marketing API 申請

### 申請連結
https://www.linkedin.com/developers/apps

### 需要申請的權限

| Scope | 用途 |
|-------|------|
| `r_ads` | 讀取廣告帳號 |
| `rw_ads` | 讀寫廣告 |
| `r_organization_admin` | 讀取組織管理權限 |

### 申請步驟

1. **創建 LinkedIn App**
   - 前往 LinkedIn Developers
   - 點擊「Create app」
   - 需要有公司 LinkedIn Page

2. **申請 Marketing Developer Platform**
   - 在 App 設定中，前往「Products」
   - 找到「Marketing Developer Platform」
   - 點擊「Request Access」

3. **填寫申請表單**
   - 提供公司資訊
   - 說明使用案例
   - 提供隱私權政策連結

4. **等待審核**（約 2-4 週）

### 申請資訊

| 欄位 | 填寫內容 |
|------|---------|
| Company Name | [你的公司名稱] |
| Company Website | https://adoptimize.1wayseo.com |
| Privacy Policy | https://adoptimize.1wayseo.com/privacy |
| Redirect URI | https://adoptimize-api.fly.dev/api/v1/oauth/linkedin/callback |

---

## 6️⃣ LINE Ads API 申請

LINE Ads 使用 JWS 認證，不是標準 OAuth。

### 申請連結
https://www.linebiz.com/

### 申請步驟

1. **註冊 LINE for Business 帳號**
2. **申請 LINE Ads API 存取**
   - 登入 LINE Business Manager
   - 前往「帳號設定」→「API 設定」
   - 申請 API Access Key 和 Secret Key
3. **等待審核**（約 1-2 週）

### 注意事項
- 需要有 LINE 官方帳號或廣告帳號
- API 憑證有效期設定為 10 年

---

## ⏱️ 預估審核時間

| 平台 | 預估時間 |
|------|---------|
| Google Ads | 2-4 週 |
| Meta Ads | 1-4 週 |
| TikTok | 3-5 工作天 |
| LinkedIn | 2-4 週 |
| Reddit | 1-2 週 |
| LINE | 1-2 週 |

---

## 📋 優先行動清單

### 🔴 優先處理（核心功能）

- [ ] **Google Ads**：錄製示範影片並提交驗證
- [ ] **Meta Ads**：完成 Business Verification 並提交 App Review

### 🟡 次要處理（擴展平台）

- [ ] **TikTok**：完成開發者帳號審核
- [ ] **LinkedIn**：申請 Marketing Developer Platform
- [ ] **Reddit**：發送 API Access 申請 email
- [ ] **LINE**：申請 API 憑證

---

## 相關文件

- Google OAuth 驗證詳細教學：`docs/google-oauth-verification-guide.md`
- 隱私權政策：https://adoptimize.1wayseo.com/privacy
- 服務條款：https://adoptimize.1wayseo.com/terms
