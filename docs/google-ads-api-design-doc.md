# AdOptimize - Google Ads API Design Documentation

## 1. Application Overview

**Application Name:** AdOptimize  
**Company:** 1Way SEO  
**Website:** https://adoptimize.1wayseo.com  
**Contact Email:** acejou27@gmail.com

### 1.1 Purpose
AdOptimize is a SaaS advertising optimization platform designed specifically for the Taiwan market. It helps advertisers and agencies monitor, analyze, and optimize their Google Ads campaigns through an intuitive dashboard interface.

### 1.2 Target Users
- Small to medium-sized businesses running Google Ads in Taiwan
- Digital marketing agencies managing multiple client accounts
- E-commerce businesses optimizing their advertising ROI

---

## 2. Google Ads API Usage

### 2.1 Authentication Flow
We use OAuth 2.0 for user authentication:

1. User clicks "Connect Google Ads" button in our application
2. User is redirected to Google's OAuth consent screen
3. User grants permission to access their Google Ads data
4. Our application receives authorization code
5. We exchange the code for access and refresh tokens
6. Tokens are securely stored and used for API calls

**OAuth Scopes Required:**
- https://www.googleapis.com/auth/adwords - Full access to Google Ads

### 2.2 API Operations

#### Read Operations (Primary Use)
| Resource | Purpose | Frequency |
|----------|---------|-----------|
| Campaigns | Retrieve campaign performance data | Every 15-60 minutes |
| Ad Groups | Analyze ad group metrics | Every 15-60 minutes |
| Ads | Monitor individual ad performance | Every 15-60 minutes |
| Keywords | Keyword performance analysis | Daily |
| Audience Segments | Audience overlap detection | Daily |

#### Write Operations (User-Initiated)
| Operation | Purpose | User Consent |
|-----------|---------|--------------|
| Pause Campaign | Stop underperforming campaigns | Explicit click |
| Pause Ad | Stop fatigued creatives | Explicit click |
| Adjust Budget | Reallocate budget to better performers | Explicit click |
| Update Bid | Optimize bidding strategy | Explicit click |

**Important:** All write operations require explicit user confirmation before execution.

---

## 3. Data Flow Architecture

```
+------------------+     OAuth 2.0      +------------------+
|                  |<------------------>|                  |
|   End User       |                    |  Google OAuth    |
|   (Advertiser)   |                    |                  |
+--------+---------+                    +------------------+
         |
         | HTTPS
         v
+------------------+                    +------------------+
|                  |    API Calls       |                  |
|   AdOptimize     |<------------------>|  Google Ads      |
|   Platform       |   (Read/Write)     |  API             |
|                  |                    |                  |
+--------+---------+                    +------------------+
         |
         | Encrypted
         v
+------------------+
|                  |
|   PostgreSQL     |
|   (Supabase)     |
|                  |
+------------------+
```

---

## 4. Security Measures

### 4.1 Token Storage
- Access tokens and refresh tokens are encrypted at rest
- Tokens are stored in PostgreSQL with AES-256 encryption
- Refresh tokens are never exposed to the frontend

### 4.2 API Access Control
- Each user can only access their own connected Google Ads accounts
- Role-based access control (RBAC) for team features
- All API calls are logged for audit purposes

### 4.3 Data Privacy
- We only store aggregated performance metrics
- Personal/sensitive data is not retained
- Users can disconnect accounts and delete data at any time
- Compliant with GDPR and Taiwan PDPA

---

## 5. Rate Limiting & Best Practices

### 5.1 Request Management
- Implement exponential backoff for failed requests
- Cache frequently accessed data to minimize API calls
- Use batch requests where possible
- Respect Google Ads API quotas and limits

### 5.2 Expected API Usage
| Tier | Daily Requests | Monthly Requests |
|------|----------------|------------------|
| Starter | 1,000 | 30,000 |
| Professional | 5,000 | 150,000 |
| Agency | 10,000 | 300,000 |

---

## 6. User Interface Description

### 6.1 Dashboard Overview
The main dashboard displays:
- Total ad spend across all connected accounts
- Key metrics: Impressions, Clicks, Conversions, ROAS
- Performance trends over time
- Health score indicating account optimization status

### 6.2 Recommendations Panel
- AI-powered optimization suggestions
- One-click action buttons for quick execution
- Estimated impact of each recommendation
- Undo functionality for recent actions

### 6.3 Account Connection Flow
1. User navigates to Settings > Connected Accounts
2. Clicks "Connect Google Ads"
3. Redirected to Google OAuth consent
4. Returns to AdOptimize with connected account

---

## 7. Technical Stack

| Component | Technology |
|-----------|------------|
| Frontend | Next.js 14, React, TypeScript |
| Backend | Python FastAPI |
| Database | PostgreSQL (Supabase) |
| Caching | Redis (Upstash) |
| Authentication | JWT + OAuth 2.0 |
| Hosting | Cloudflare Workers |

---

## 8. Compliance & Terms

### 8.1 Google Ads API Terms
- We comply with all Google Ads API Terms of Service
- We do not resell or redistribute Google Ads data
- We display required Google branding where applicable

### 8.2 User Agreement
- Users must accept our Terms of Service before connecting accounts
- Users acknowledge that AdOptimize will access their Google Ads data
- Users can revoke access at any time

---

## 9. Contact Information

**Technical Contact:**  
Email: acejou27@gmail.com

**Company:**  
1Way SEO  
Website: https://1wayseo.com

---

*Document Version: 1.0*  
*Last Updated: January 2026*
