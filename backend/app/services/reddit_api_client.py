# -*- coding: utf-8 -*-
"""
Reddit Ads API Client

支援 Mock 模式和真實 API 模式切換。
"""

import os
import random
from datetime import datetime, timedelta
from typing import Optional
from uuid import uuid4

import httpx

from app.core.logger import get_logger

logger = get_logger(__name__)

# Reddit Ads API 端點
REDDIT_ADS_API_BASE = "https://ads-api.reddit.com/api/v2.0"


class RedditAPIClient:
    """Reddit Ads API Client"""

    def __init__(
        self,
        access_token: str,
        use_mock: Optional[bool] = None,
    ):
        """
        初始化 Reddit API Client

        Args:
            access_token: OAuth access token
            use_mock: 是否使用 Mock 模式（None 時從環境變數讀取）
        """
        self.access_token = access_token

        if use_mock is None:
            self.use_mock = os.getenv("USE_MOCK_ADS_API", "true").lower() == "true"
        else:
            self.use_mock = use_mock

    def _get_headers(self) -> dict:
        """取得 API 請求 headers"""
        return {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
            "User-Agent": "AdOptimize/1.0",
        }

    def _generate_mock_campaigns(self, count: int = 3) -> list[dict]:
        """生成 Mock 廣告活動數據"""
        statuses = ["ACTIVE", "PAUSED", "COMPLETED"]
        objectives = ["CONVERSIONS", "TRAFFIC", "AWARENESS", "VIDEO_VIEWS"]

        return [
            {
                "id": f"t3_camp_{uuid4().hex[:8]}",
                "name": f"Mock Reddit Campaign {i+1}",
                "status": random.choice(statuses),
                "objective": random.choice(objectives),
                "budget_cents": random.randint(1000, 100000),
                "created_at": (datetime.now() - timedelta(days=random.randint(1, 30))).isoformat(),
            }
            for i in range(count)
        ]

    def _generate_mock_ad_groups(self, count: int = 5) -> list[dict]:
        """生成 Mock 廣告組數據"""
        statuses = ["ACTIVE", "PAUSED"]
        bid_strategies = ["MAXIMIZE_CONVERSIONS", "TARGET_CPA", "MANUAL_CPC"]

        return [
            {
                "id": f"t3_ag_{uuid4().hex[:8]}",
                "name": f"Mock Ad Group {i+1}",
                "campaign_id": f"t3_camp_{uuid4().hex[:8]}",
                "status": random.choice(statuses),
                "bid_strategy": random.choice(bid_strategies),
                "bid_cents": random.randint(50, 500),
                "created_at": (datetime.now() - timedelta(days=random.randint(1, 20))).isoformat(),
            }
            for i in range(count)
        ]

    def _generate_mock_ads(self, count: int = 8) -> list[dict]:
        """生成 Mock 廣告數據"""
        statuses = ["ACTIVE", "PAUSED", "PENDING_REVIEW"]
        ad_types = ["LINK", "VIDEO", "CAROUSEL"]

        return [
            {
                "id": f"t3_ad_{uuid4().hex[:8]}",
                "name": f"Mock Reddit Ad {i+1}",
                "ad_group_id": f"t3_ag_{uuid4().hex[:8]}",
                "status": random.choice(statuses),
                "ad_type": random.choice(ad_types),
                "headline": f"Check out this amazing offer #{i+1}",
                "created_at": (datetime.now() - timedelta(days=random.randint(1, 15))).isoformat(),
            }
            for i in range(count)
        ]

    async def get_campaigns(self, account_id: str) -> list[dict]:
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
                f"{REDDIT_ADS_API_BASE}/accounts/{account_id}/campaigns",
                headers=self._get_headers(),
            )

            if response.status_code != 200:
                logger.error(f"Reddit get campaigns failed: {response.text}")
                return []

            data = response.json()
            return data.get("data", [])

    async def get_ad_groups(self, account_id: str) -> list[dict]:
        """
        取得廣告組列表

        Args:
            account_id: 廣告帳號 ID

        Returns:
            廣告組列表
        """
        if self.use_mock:
            return self._generate_mock_ad_groups()

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{REDDIT_ADS_API_BASE}/accounts/{account_id}/adgroups",
                headers=self._get_headers(),
            )

            if response.status_code != 200:
                return []

            data = response.json()
            return data.get("data", [])

    async def get_ads(self, account_id: str) -> list[dict]:
        """
        取得廣告列表

        Args:
            account_id: 廣告帳號 ID

        Returns:
            廣告列表
        """
        if self.use_mock:
            return self._generate_mock_ads()

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{REDDIT_ADS_API_BASE}/accounts/{account_id}/ads",
                headers=self._get_headers(),
            )

            if response.status_code != 200:
                return []

            data = response.json()
            return data.get("data", [])

    async def get_metrics(
        self,
        account_id: str,
        start_date: str,
        end_date: str,
    ) -> list[dict]:
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
            return [
                {
                    "date": start_date,
                    "impressions": random.randint(1000, 100000),
                    "clicks": random.randint(10, 1000),
                    "spend": random.randint(100, 10000) / 100,
                    "conversions": random.randint(0, 100),
                    "ctr": round(random.uniform(0.5, 5.0), 2),
                    "cpc": round(random.uniform(0.1, 2.0), 2),
                }
            ]

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{REDDIT_ADS_API_BASE}/accounts/{account_id}/reports",
                params={
                    "start_date": start_date,
                    "end_date": end_date,
                    "metrics": "impressions,clicks,spend,conversions",
                },
                headers=self._get_headers(),
            )

            if response.status_code != 200:
                return []

            data = response.json()
            return data.get("data", [])
