# AdOptimize - Google Ads API Design Documentation

## 1. Application Overview

**Application Name:** AdOptimize (廣告船長)
**Company:** 1Way SEO
**Website:** https://adoptimize.1wayseo.com
**Contact Email:** acejou27@gmail.com

### 1.1 Purpose
AdOptimize is a **production SaaS advertising analytics platform** designed for the Taiwan market. It helps advertisers monitor and analyze their Google Ads campaign performance through a unified dashboard that aggregates data across multiple advertising platforms (Google Ads, Meta Ads, TikTok Ads, LinkedIn Ads).

The tool is **read-only** — it retrieves campaign and performance data for display and analysis. It does **not** modify campaigns, budgets, or bids.

### 1.2 Target Users
- Small to medium-sized businesses running Google Ads in Taiwan
- Digital marketing agencies managing multiple client accounts
- E-commerce businesses monitoring their advertising ROI

### 1.3 Current Status
- **Production URL:** https://adoptimize.1wayseo.com
- **Backend API:** https://adoptimize-api.fly.dev
- **User Authentication:** Google OAuth + email/password
- **Connected Platforms:** Google Ads, Meta Ads, TikTok Ads, LinkedIn Ads

---

## 2. Google Ads API Usage

### 2.1 Authentication Flow (OAuth 2.0)

```
User clicks "Connect Google Ads"
        │
        ▼
Frontend calls: GET /api/v1/accounts/connect/google/auth
        │
        ▼
Backend generates OAuth URL with:
  - scope: https://www.googleapis.com/auth/adwords
  - state: CSRF token (stored in Redis, expires 10 min)
  - redirect_uri: https://adoptimize-api.fly.dev/api/v1/accounts/callback/google
        │
        ▼
User redirects to Google OAuth consent screen
        │
        ▼
Google redirects back with authorization code
        │
        ▼
Backend exchanges code for access_token + refresh_token
        │
        ▼
Tokens encrypted (AES-256) and stored in PostgreSQL
        │
        ▼
User redirected to /accounts?success=google
```

**OAuth Scopes:**
- `https://www.googleapis.com/auth/adwords` — Read access to Google Ads data

### 2.2 API Operations (Read-Only)

Our application performs **read-only** operations. We do not create, update, or delete any resources in the user's Google Ads account.

| Operation | GAQL Query | Purpose | Frequency |
|-----------|-----------|---------|-----------|
| List Customers | `CustomerService.ListAccessibleCustomers()` | Discover connected accounts | On connection |
| Get Campaigns | See Section 2.3 | Retrieve campaign list and status | Every 15 min |
| Get Ad Groups | See Section 2.3 | Retrieve ad group data | Every 15 min |
| Get Ads | See Section 2.3 | Retrieve individual ad data | Every 15 min |
| Get Metrics | See Section 2.3 | Retrieve performance metrics (7-day window) | Every 15 min |

### 2.3 GAQL Queries Used

**Campaign Data:**
```sql
SELECT
  campaign.id,
  campaign.name,
  campaign.status,
  campaign.advertising_channel_type,
  campaign_budget.amount_micros
FROM campaign
WHERE campaign.status != 'REMOVED'
```

**Ad Group Data:**
```sql
SELECT
  ad_group.id,
  ad_group.name,
  ad_group.status,
  ad_group.campaign,
  ad_group.cpc_bid_micros
FROM ad_group
WHERE ad_group.status != 'REMOVED'
```

**Ad Data:**
```sql
SELECT
  ad_group_ad.ad.id,
  ad_group_ad.ad.name,
  ad_group_ad.status,
  ad_group_ad.ad_group
FROM ad_group_ad
WHERE ad_group_ad.status != 'REMOVED'
```

**Performance Metrics (Last 7 Days):**
```sql
SELECT
  campaign.id,
  campaign.name,
  metrics.impressions,
  metrics.clicks,
  metrics.cost_micros,
  metrics.conversions,
  metrics.ctr,
  metrics.average_cpc
FROM campaign
WHERE segments.date DURING LAST_7_DAYS
  AND campaign.status != 'REMOVED'
```

### 2.4 API Call Volume

| Metric | Value |
|--------|-------|
| Sync interval | Every 15 minutes |
| Calls per sync per account | 4 (campaigns, ad groups, ads, metrics) |
| Syncs per day per account | 96 |
| Calls per day per account | 384 |
| Expected accounts (Year 1) | 10-50 |
| Max daily calls (Year 1) | ~19,200 |

---

## 3. Data Flow Architecture

```
┌──────────────┐         ┌──────────────────┐
│   End User   │◄───────►│ Google OAuth 2.0  │
│ (Advertiser) │  OAuth  │ Consent Screen    │
└──────┬───────┘         └──────────────────┘
       │ HTTPS
       ▼
┌──────────────┐         ┌──────────────────┐
│  AdOptimize  │  GAQL   │  Google Ads API   │
│  Frontend    │◄───────►│  (Read-Only)      │
│  (Vercel)    │         │                   │
└──────┬───────┘         └──────────────────┘
       │ HTTPS
       ▼
┌──────────────┐
│  AdOptimize  │
│  Backend     │
│  (Fly.io)    │
└──────┬───────┘
       │ Encrypted
       ▼
┌──────────────┐    ┌──────────────────┐
│  PostgreSQL  │    │  Redis (Upstash)  │
│  (Supabase)  │    │  Token Cache      │
└──────────────┘    └──────────────────┘
```

### 3.1 Data Storage

We store the following data from Google Ads:

| Data | Storage | Retention |
|------|---------|-----------|
| Campaign metadata | PostgreSQL | Until user disconnects |
| Ad group metadata | PostgreSQL | Until user disconnects |
| Ad metadata | PostgreSQL | Until user disconnects |
| Performance metrics | PostgreSQL | 90 days rolling |
| OAuth tokens | PostgreSQL (AES-256 encrypted) | Until user disconnects |
| CSRF state | Redis | 10 minutes |

---

## 4. Security Measures

### 4.1 Token Security
- Access tokens and refresh tokens encrypted at rest with AES-256
- Tokens stored in PostgreSQL, never exposed to frontend
- Automatic token refresh before expiration
- CSRF protection via Redis-backed state parameter

### 4.2 Access Control
- JWT-based user authentication
- Each user can only access their own connected accounts
- All API calls authenticated with user's JWT token
- Backend validates user ownership before returning data

### 4.3 Data Privacy
- Only aggregated performance metrics are stored
- Personal or PII data is not retained
- Users can disconnect accounts and delete all data at any time
- Compliant with Taiwan PDPA (Personal Data Protection Act)

### 4.4 Infrastructure Security
- HTTPS everywhere (TLS 1.3)
- Backend hosted on Fly.io with isolated containers
- Database on Supabase with connection pooling (pgBouncer)
- Environment variables managed via Fly.io secrets

---

## 5. Rate Limiting & Error Handling

### 5.1 Request Management
- Exponential backoff with jitter for transient failures
- Maximum 3 retries per request
- 15-minute sync interval prevents excessive API usage
- Cached responses to minimize redundant calls

### 5.2 Error Handling
| Error Type | Response |
|-----------|----------|
| 401 Unauthorized | Attempt token refresh, notify user if refresh fails |
| 429 Rate Limited | Exponential backoff, skip current sync cycle |
| 500 Server Error | Log error, retry with backoff |
| Network Error | Skip current sync, retry next cycle |

---

## 6. User Interface

### 6.1 Account Connection Page (`/accounts`)
Users connect their Google Ads account via a single click:
1. Navigate to Accounts page
2. Click "Connect Google Ads" button
3. Redirected to Google OAuth consent
4. Return to AdOptimize with account connected
5. Account displays as "Connected" with last sync timestamp

### 6.2 Dashboard (`/dashboard`)
The unified dashboard displays:
- **Total Spend** — Aggregated across all connected platforms
- **Key Metrics** — Impressions, Clicks, CTR, Conversions, ROAS
- **Performance Trends** — Time-series charts showing 7-day trends
- **Health Score** — 5-dimension account health indicator
- **Platform Breakdown** — Per-platform performance comparison

### 6.3 Health Audit
Automated health scoring across 5 dimensions:
- Structure — Campaign organization quality
- Creative — Ad creative freshness and diversity
- Audience — Targeting breadth and relevance
- Budget — Budget utilization and allocation
- Tracking — Conversion tracking setup

---

## 7. Technical Stack

| Component | Technology |
|-----------|------------|
| Frontend | Next.js 16, React 19, TypeScript |
| Backend | Python 3.12, FastAPI |
| Database | PostgreSQL (Supabase) |
| Caching | Redis (Upstash) |
| Authentication | JWT + OAuth 2.0 |
| Frontend Hosting | Vercel |
| Backend Hosting | Fly.io |
| Scheduler | APScheduler (in-process) |

---

## 8. Compliance

### 8.1 Google Ads API Terms
- We comply with all Google Ads API Terms of Service
- We do not resell or redistribute Google Ads data
- We display required Google branding where applicable
- We perform read-only operations — no modifications to user accounts

### 8.2 User Agreement
- Users must accept Terms of Service before connecting accounts
- Users acknowledge that AdOptimize will access their Google Ads data (read-only)
- Users can revoke access and delete data at any time

---

## 9. Contact Information

**Technical Contact:**
Email: acejou27@gmail.com

**Company:**
1Way SEO
Website: https://1wayseo.com

---

*Document Version: 2.0*
*Last Updated: February 2026*
