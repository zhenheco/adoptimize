#!/usr/bin/env python3
"""Generate Google Ads API Basic Access Design Document PDF"""

from fpdf import FPDF


class DesignDoc(FPDF):
    def header(self):
        self.set_font("Helvetica", "B", 10)
        self.set_text_color(100, 100, 100)
        self.cell(0, 8, "AdOptimize - Google Ads API Design Document", align="R")
        self.ln(12)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(150, 150, 150)
        self.cell(0, 10, f"Page {self.page_no()}/{{nb}}", align="C")

    def section_title(self, title):
        self.set_font("Helvetica", "B", 14)
        self.set_text_color(26, 115, 232)
        self.cell(0, 10, title, new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(26, 115, 232)
        self.line(self.l_margin, self.get_y(), self.w - self.r_margin, self.get_y())
        self.ln(4)

    def subsection_title(self, title):
        self.set_font("Helvetica", "B", 11)
        self.set_text_color(60, 60, 60)
        self.cell(0, 8, title, new_x="LMARGIN", new_y="NEXT")
        self.ln(2)

    def body_text(self, text):
        self.set_font("Helvetica", "", 10)
        self.set_text_color(40, 40, 40)
        self.multi_cell(0, 5.5, text)
        self.ln(3)

    def bullet(self, text):
        self.set_font("Helvetica", "", 10)
        self.set_text_color(40, 40, 40)
        x = self.get_x()
        self.cell(8, 5.5, "-")
        self.multi_cell(0, 5.5, text)
        self.ln(1)


def main():
    pdf = DesignDoc()
    pdf.alias_nb_pages()
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.add_page()

    # Title
    pdf.set_font("Helvetica", "B", 22)
    pdf.set_text_color(26, 115, 232)
    pdf.cell(0, 15, "AdOptimize", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 14)
    pdf.set_text_color(80, 80, 80)
    pdf.cell(0, 8, "Google Ads API Tool Design Document", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(3)
    pdf.set_font("Helvetica", "I", 10)
    pdf.set_text_color(120, 120, 120)
    pdf.cell(0, 6, "Prepared by: Zhenhe Digital Co., Ltd.", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 6, "Date: February 2026", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 6, "Website: https://adoptimize.1wayseo.com", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 6, "MCC ID: 631-830-3158", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(10)

    # 1. Executive Summary
    pdf.section_title("1. Executive Summary")
    pdf.body_text(
        "AdOptimize is a multi-platform advertising management SaaS tool developed by "
        "Zhenhe Digital Co., Ltd. (Taiwan). It provides advertisers with a unified dashboard "
        "to manage, monitor, and optimize advertising campaigns across multiple platforms "
        "including Google Ads, Meta Ads, LinkedIn Ads, Pinterest Ads, TikTok Ads, and Reddit Ads."
    )
    pdf.body_text(
        "We are applying for Google Ads API Basic Access to enable our platform to sync "
        "campaign data, retrieve performance metrics, and provide cross-platform reporting "
        "for our users' Google Ads accounts. Our tool does NOT create or modify campaigns "
        "through the API - it is primarily used for reporting, monitoring, and analytics."
    )

    # 2. Company Overview
    pdf.section_title("2. Company Overview")
    pdf.bullet("Company: Zhenhe Digital Co., Ltd. (Registration No: 96060917)")
    pdf.bullet("Location: Taiwan")
    pdf.bullet("Industry: Digital Advertising Technology (AdTech)")
    pdf.bullet("Website: https://adoptimize.1wayseo.com")
    pdf.bullet("Primary Service: Multi-platform ad campaign management and optimization")
    pdf.bullet("Target Users: Small-to-medium businesses and marketing agencies in Taiwan")

    # 3. Tool Overview
    pdf.section_title("3. Tool Overview")
    pdf.subsection_title("3.1 Purpose")
    pdf.body_text(
        "AdOptimize aggregates advertising data from multiple platforms into a single "
        "dashboard. This eliminates the need for advertisers to log into multiple platforms "
        "separately, saving time and enabling cross-platform performance comparison."
    )

    pdf.subsection_title("3.2 Key Features")
    pdf.bullet("Cross-platform dashboard: View all ad accounts in one place")
    pdf.bullet("Performance reporting: Daily, weekly, and monthly reports with key metrics")
    pdf.bullet("Budget monitoring: Track spending across platforms in real-time")
    pdf.bullet("Autopilot rules: Automated alerts when KPIs exceed thresholds")
    pdf.bullet("Unified metrics: Standardized metrics (impressions, clicks, CTR, CPC, conversions, ROAS) across platforms")

    pdf.subsection_title("3.3 Supported Platforms")
    pdf.bullet("Google Ads (this application)")
    pdf.bullet("Meta Ads (Facebook/Instagram)")
    pdf.bullet("LinkedIn Ads")
    pdf.bullet("Pinterest Ads")
    pdf.bullet("TikTok Ads")
    pdf.bullet("Reddit Ads")

    # 4. Google Ads API Usage
    pdf.add_page()
    pdf.section_title("4. Google Ads API Usage")

    pdf.subsection_title("4.1 API Endpoints Used")
    pdf.body_text("Our tool uses the following Google Ads API resources:")
    pdf.bullet("GoogleAdsService.Search / SearchStream - For retrieving campaign, ad group, ad, and keyword data")
    pdf.bullet("CustomerService - For reading account information")
    pdf.bullet("CampaignService - For reading campaign configurations (read-only)")
    pdf.bullet("AdGroupService - For reading ad group data (read-only)")
    pdf.bullet("AdGroupAdService - For reading ad creative data (read-only)")
    pdf.bullet("Metrics resources - For retrieving performance metrics (impressions, clicks, cost, conversions)")

    pdf.subsection_title("4.2 Operations Performed")
    pdf.body_text("Our tool performs ONLY read operations on Google Ads accounts:")
    pdf.bullet("Read campaign structure (campaigns, ad groups, ads)")
    pdf.bullet("Read performance metrics (last 7 days, 14 days, 30 days)")
    pdf.bullet("Read account-level settings and budget information")
    pdf.bullet("Read conversion tracking data")
    pdf.ln(2)
    pdf.set_font("Helvetica", "B", 10)
    pdf.set_text_color(200, 50, 50)
    pdf.cell(0, 6, "IMPORTANT: Our tool does NOT create, modify, or delete any campaigns, ", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 6, "ad groups, ads, or any other resources through the API.", new_x="LMARGIN", new_y="NEXT")
    pdf.set_text_color(40, 40, 40)
    pdf.ln(3)

    pdf.subsection_title("4.3 Data Sync Schedule")
    pdf.bullet("Every 15 minutes: Sync campaign structure and metrics from Google Ads API")
    pdf.bullet("Daily at 21:00 (UTC+8): Generate daily performance summary")
    pdf.bullet("Weekly on Monday 09:00 (UTC+8): Generate weekly report")
    pdf.bullet("Monthly on 1st 09:00 (UTC+8): Generate monthly report")

    pdf.subsection_title("4.4 Estimated API Usage")
    pdf.body_text(
        "Per account sync cycle (every 15 minutes): approximately 4-8 API calls. "
        "With an estimated 10-50 managed accounts, daily API usage would be "
        "approximately 3,840 - 19,200 operations per day, well within Basic Access limits "
        "of 15,000 operations/day for initial launch."
    )

    # 5. Technical Architecture
    pdf.add_page()
    pdf.section_title("5. Technical Architecture")

    pdf.subsection_title("5.1 System Components")
    pdf.bullet("Frontend: Next.js 16 application hosted on Vercel (https://adoptimize.1wayseo.com)")
    pdf.bullet("Backend: Python FastAPI application hosted on Fly.io (https://adoptimize-api.fly.dev)")
    pdf.bullet("Database: PostgreSQL on Supabase (async via SQLAlchemy + asyncpg)")
    pdf.bullet("Scheduler: APScheduler for periodic data sync jobs")
    pdf.bullet("Cache: Redis (Upstash) for session management and rate limiting")

    pdf.subsection_title("5.2 Data Flow")
    pdf.body_text(
        "1. User connects their Google Ads account via OAuth 2.0 (Authorization Code flow)\n"
        "2. Backend stores encrypted OAuth tokens in PostgreSQL\n"
        "3. APScheduler triggers sync jobs every 15 minutes\n"
        "4. Sync worker retrieves data from Google Ads API using stored credentials\n"
        "5. Data is normalized into unified models (Campaign, AdSet, Ad, Metrics)\n"
        "6. Frontend displays aggregated data via REST API endpoints\n"
        "7. Token refresh is handled automatically when access tokens expire"
    )

    pdf.subsection_title("5.3 OAuth 2.0 Implementation")
    pdf.body_text(
        "We use the standard OAuth 2.0 Authorization Code flow for Google Ads:\n"
        "- OAuth Consent Screen: Configured in Google Cloud Console\n"
        "- Scopes requested: https://www.googleapis.com/auth/adwords (Google Ads API)\n"
        "- Redirect URI: https://adoptimize.1wayseo.com/api/v1/accounts/callback/google\n"
        "- Token storage: Encrypted in PostgreSQL database\n"
        "- Token refresh: Automatic refresh using refresh_token before expiry"
    )

    # 6. Security & Data Handling
    pdf.section_title("6. Security & Data Handling")
    pdf.bullet("All API credentials stored in encrypted environment variables (Fly.io Secrets)")
    pdf.bullet("OAuth tokens stored in PostgreSQL with application-level encryption")
    pdf.bullet("All communications use HTTPS/TLS")
    pdf.bullet("Database access via connection pooling (Supabase pgBouncer)")
    pdf.bullet("No Google Ads data is shared with third parties")
    pdf.bullet("Users can disconnect their accounts at any time, which deletes all stored tokens")
    pdf.bullet("Rate limiting implemented to prevent API abuse")
    pdf.bullet("appsecret_proof pattern used for API call attribution (where applicable)")

    # 7. User Interface
    pdf.add_page()
    pdf.section_title("7. User Interface")

    pdf.subsection_title("7.1 Account Connection Flow")
    pdf.body_text(
        "1. User logs into AdOptimize dashboard\n"
        "2. Navigates to Accounts page\n"
        "3. Clicks 'Connect Google Ads' button\n"
        "4. Redirected to Google OAuth consent screen\n"
        "5. User grants permission to read their Google Ads data\n"
        "6. Redirected back to AdOptimize with authorization code\n"
        "7. Backend exchanges code for tokens and stores them\n"
        "8. Account appears as 'Connected' in the dashboard"
    )

    pdf.subsection_title("7.2 Dashboard Views")
    pdf.bullet("Overview: Cross-platform summary with key KPIs")
    pdf.bullet("Campaigns: List of all campaigns with performance metrics")
    pdf.bullet("Reports: Daily/Weekly/Monthly performance reports")
    pdf.bullet("Autopilot: Automated monitoring rules and alerts")
    pdf.bullet("Accounts: Manage connected ad platform accounts")

    # 8. Campaign Types Supported
    pdf.section_title("8. Campaign Types Supported")
    pdf.body_text("Our reporting tool supports reading data from all Google Ads campaign types:")
    pdf.bullet("Search campaigns")
    pdf.bullet("Display campaigns")
    pdf.bullet("Shopping campaigns")
    pdf.bullet("Video campaigns (YouTube)")
    pdf.bullet("Performance Max campaigns")
    pdf.bullet("App campaigns")
    pdf.bullet("Demand Gen campaigns")

    # 9. Compliance
    pdf.section_title("9. Compliance & Terms")
    pdf.bullet("We comply with Google Ads API Terms and Conditions")
    pdf.bullet("We comply with Google API Services User Data Policy")
    pdf.bullet("We do not store unnecessary user data beyond what is needed for reporting")
    pdf.bullet("Our privacy policy is publicly available at https://adoptimize.1wayseo.com/privacy")
    pdf.bullet("Users must explicitly consent before connecting their Google Ads accounts")

    # 10. Contact
    pdf.section_title("10. Contact Information")
    pdf.bullet("Company: Zhenhe Digital Co., Ltd.")
    pdf.bullet("API Contact Email: acejou27@gmail.com")
    pdf.bullet("Website: https://adoptimize.1wayseo.com")
    pdf.bullet("MCC Account ID: 631-830-3158")

    output_path = "/Volumes/500G/Claudecode/adoptimize/docs/AdOptimize-Google-Ads-API-Design-Document.pdf"
    pdf.output(output_path)
    print(f"PDF generated: {output_path}")


if __name__ == "__main__":
    main()
