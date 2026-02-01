# -*- coding: utf-8 -*-
"""
LinkedIn Marketing API Client

支援 Mock 模式和真實 API 模式切換。

LinkedIn Marketing API 特點：
- API Base: https://api.linkedin.com/rest
- 必須包含特殊 Headers:
  - Authorization: Bearer {access_token}
  - X-Restli-Protocol-Version: 2.0.0
  - Linkedin-Version: yyyymm (年月格式)
"""

import os
import random
from datetime import datetime, timedelta
from typing import Any, Optional
from uuid import uuid4

import httpx

from app.core.logger import get_logger

logger = get_logger(__name__)

# LinkedIn Marketing API 端點
LINKEDIN_API_BASE = "https://api.linkedin.com/rest"


def get_linkedin_version() -> str:
    """取得 LinkedIn API 版本 (yyyymm 格式)"""
    return datetime.now().strftime("%Y%m")


class LinkedInAPIClient:
    """LinkedIn Marketing API Client"""

    def __init__(
        self,
        access_token: str,
        use_mock: Optional[bool] = None,
    ):
        """
        初始化 LinkedIn API Client

        Args:
            access_token: LinkedIn OAuth access token
            use_mock: 是否使用 Mock 模式（None 時從環境變數讀取）
        """
        self.access_token = access_token

        if use_mock is None:
            self.use_mock = os.getenv("USE_MOCK_ADS_API", "true").lower() == "true"
        else:
            self.use_mock = use_mock

    def _get_headers(self) -> dict:
        """
        取得 API 請求 headers

        LinkedIn API 必須包含以下 headers:
        - Authorization: Bearer token
        - X-Restli-Protocol-Version: 2.0.0
        - Linkedin-Version: yyyymm 格式

        Returns:
            headers 字典
        """
        return {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
            "X-Restli-Protocol-Version": "2.0.0",
            "Linkedin-Version": get_linkedin_version(),
        }

    def _generate_mock_ad_accounts(self, count: int = 2) -> list[dict]:
        """生成 Mock 廣告帳戶數據"""
        statuses = ["ACTIVE", "PENDING", "CANCELLED"]

        return [
            {
                "id": f"li_account_{uuid4().hex[:8]}",
                "name": f"Mock LinkedIn Account {i+1}",
                "status": random.choice(statuses),
                "currency": "USD",
                "created_at": (datetime.now() - timedelta(days=random.randint(30, 365))).isoformat(),
            }
            for i in range(count)
        ]

    def _generate_mock_campaigns(self, count: int = 3) -> list[dict]:
        """生成 Mock 廣告活動數據"""
        statuses = ["ACTIVE", "PAUSED", "ARCHIVED", "DRAFT"]
        objectives = [
            "BRAND_AWARENESS",
            "WEBSITE_VISITS",
            "ENGAGEMENT",
            "VIDEO_VIEWS",
            "LEAD_GENERATION",
            "WEBSITE_CONVERSIONS",
        ]
        types = ["SPONSORED_CONTENT", "TEXT_AD", "DYNAMIC", "MESSAGE"]

        return [
            {
                "id": f"li_campaign_{uuid4().hex[:8]}",
                "name": f"Mock LinkedIn Campaign {i+1}",
                "status": random.choice(statuses),
                "objective": random.choice(objectives),
                "type": random.choice(types),
                "daily_budget": random.randint(50, 500),
                "created_at": (datetime.now() - timedelta(days=random.randint(1, 60))).isoformat(),
            }
            for i in range(count)
        ]

    def _generate_mock_campaign_groups(self, count: int = 2) -> list[dict]:
        """生成 Mock 廣告組數據"""
        statuses = ["ACTIVE", "ARCHIVED", "DRAFT"]

        return [
            {
                "id": f"li_group_{uuid4().hex[:8]}",
                "name": f"Mock Campaign Group {i+1}",
                "status": random.choice(statuses),
                "total_budget": random.randint(1000, 10000),
                "created_at": (datetime.now() - timedelta(days=random.randint(1, 90))).isoformat(),
            }
            for i in range(count)
        ]

    def _generate_mock_creatives(self, count: int = 4) -> list[dict]:
        """生成 Mock 素材數據"""
        statuses = ["ACTIVE", "PENDING_REVIEW", "REJECTED", "DRAFT"]
        types = ["SINGLE_IMAGE", "CAROUSEL", "VIDEO", "TEXT"]

        return [
            {
                "id": f"li_creative_{uuid4().hex[:8]}",
                "name": f"Mock Creative {i+1}",
                "status": random.choice(statuses),
                "type": random.choice(types),
                "campaign_id": f"li_campaign_{uuid4().hex[:8]}",
                "created_at": (datetime.now() - timedelta(days=random.randint(1, 30))).isoformat(),
            }
            for i in range(count)
        ]

    def _generate_mock_metrics(self, count: int = 2) -> list[dict]:
        """生成 Mock 成效指標數據"""
        return [
            {
                "campaign_id": f"li_campaign_{uuid4().hex[:8]}",
                "impressions": random.randint(5000, 50000),
                "clicks": random.randint(50, 1000),
                "spend": round(random.uniform(100, 2000), 2),
                "conversions": random.randint(5, 100),
                "ctr": round(random.uniform(0.5, 3.0), 2),
                "cpc": round(random.uniform(0.5, 5.0), 2),
                "engagement_rate": round(random.uniform(1.0, 5.0), 2),
            }
            for _ in range(count)
        ]

    async def get_ad_accounts(self) -> list[dict[str, Any]]:
        """
        取得廣告帳戶列表

        Returns:
            廣告帳戶列表
        """
        if self.use_mock:
            return self._generate_mock_ad_accounts()

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{LINKEDIN_API_BASE}/adAccounts",
                headers=self._get_headers(),
                params={"q": "search"},
            )

            if response.status_code != 200:
                logger.error(f"LinkedIn get ad accounts failed: {response.text}")
                return []

            data = response.json()
            return data.get("elements", [])

    async def get_campaigns(self, account_id: str) -> list[dict[str, Any]]:
        """
        取得廣告活動列表

        Args:
            account_id: 廣告帳號 ID

        Returns:
            廣告活動列表
        """
        if self.use_mock:
            return self._generate_mock_campaigns()

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{LINKEDIN_API_BASE}/adCampaigns",
                headers=self._get_headers(),
                params={
                    "q": "search",
                    "search": f"(account:(values:List(urn:li:sponsoredAccount:{account_id})))",
                },
            )

            if response.status_code != 200:
                logger.error(f"LinkedIn get campaigns failed: {response.text}")
                return []

            data = response.json()
            return data.get("elements", [])

    async def get_campaign_groups(self, account_id: str) -> list[dict[str, Any]]:
        """
        取得廣告組列表

        Args:
            account_id: 廣告帳號 ID

        Returns:
            廣告組列表
        """
        if self.use_mock:
            return self._generate_mock_campaign_groups()

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{LINKEDIN_API_BASE}/adCampaignGroups",
                headers=self._get_headers(),
                params={
                    "q": "search",
                    "search": f"(account:(values:List(urn:li:sponsoredAccount:{account_id})))",
                },
            )

            if response.status_code != 200:
                logger.error(f"LinkedIn get campaign groups failed: {response.text}")
                return []

            data = response.json()
            return data.get("elements", [])

    async def get_creatives(self, account_id: str) -> list[dict[str, Any]]:
        """
        取得素材列表

        Args:
            account_id: 廣告帳號 ID

        Returns:
            素材列表
        """
        if self.use_mock:
            return self._generate_mock_creatives()

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{LINKEDIN_API_BASE}/creatives",
                headers=self._get_headers(),
                params={
                    "q": "search",
                    "search": f"(account:(values:List(urn:li:sponsoredAccount:{account_id})))",
                },
            )

            if response.status_code != 200:
                logger.error(f"LinkedIn get creatives failed: {response.text}")
                return []

            data = response.json()
            return data.get("elements", [])

    async def get_metrics(
        self,
        account_id: str,
        start_date: str,
        end_date: str,
    ) -> list[dict[str, Any]]:
        """
        取得廣告成效數據

        Args:
            account_id: 廣告帳號 ID
            start_date: 開始日期 (YYYY-MM-DD)
            end_date: 結束日期 (YYYY-MM-DD)

        Returns:
            成效數據列表
        """
        if self.use_mock:
            return self._generate_mock_metrics()

        # 解析日期
        start_parts = start_date.split("-")
        end_parts = end_date.split("-")

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{LINKEDIN_API_BASE}/adAnalytics",
                headers=self._get_headers(),
                params={
                    "q": "analytics",
                    "pivot": "CAMPAIGN",
                    "dateRange.start.day": int(start_parts[2]),
                    "dateRange.start.month": int(start_parts[1]),
                    "dateRange.start.year": int(start_parts[0]),
                    "dateRange.end.day": int(end_parts[2]),
                    "dateRange.end.month": int(end_parts[1]),
                    "dateRange.end.year": int(end_parts[0]),
                    "accounts": f"urn:li:sponsoredAccount:{account_id}",
                    "fields": "impressions,clicks,costInLocalCurrency,externalWebsiteConversions",
                },
            )

            if response.status_code != 200:
                logger.error(f"LinkedIn get metrics failed: {response.text}")
                return []

            data = response.json()
            return data.get("elements", [])
