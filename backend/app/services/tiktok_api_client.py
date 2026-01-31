# -*- coding: utf-8 -*-
"""
TikTok Ads API Client

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

# TikTok API 端點
TIKTOK_API_BASE = "https://business-api.tiktok.com/open_api/v1.3"


class TikTokAPIClient:
    """TikTok Ads API Client"""

    def __init__(
        self,
        access_token: str,
        use_mock: Optional[bool] = None,
    ):
        """
        初始化 TikTok API Client

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
            "Access-Token": self.access_token,
            "Content-Type": "application/json",
        }

    def _generate_mock_campaigns(self, count: int = 3) -> list[dict]:
        """生成 Mock 廣告活動數據"""
        statuses = ["CAMPAIGN_STATUS_ENABLE", "CAMPAIGN_STATUS_DISABLE"]
        objectives = ["TRAFFIC", "CONVERSIONS", "APP_INSTALL", "REACH"]

        return [
            {
                "id": f"mock_camp_{uuid4().hex[:8]}",
                "name": f"Mock TikTok Campaign {i+1}",
                "status": random.choice(statuses),
                "objective": random.choice(objectives),
                "budget": random.randint(100, 10000) * 100,
                "budget_mode": "BUDGET_MODE_DAY",
                "created_at": (datetime.now() - timedelta(days=random.randint(1, 30))).isoformat(),
            }
            for i in range(count)
        ]

    def _generate_mock_adgroups(self, count: int = 5) -> list[dict]:
        """生成 Mock 廣告組數據"""
        statuses = ["ADGROUP_STATUS_DELIVERY_OK", "ADGROUP_STATUS_NOT_DELIVER"]
        placements = ["PLACEMENT_TIKTOK", "PLACEMENT_PANGLE"]

        return [
            {
                "id": f"mock_adgroup_{uuid4().hex[:8]}",
                "name": f"Mock AdGroup {i+1}",
                "campaign_id": f"mock_camp_{uuid4().hex[:8]}",
                "status": random.choice(statuses),
                "placement": random.choice(placements),
                "budget": random.randint(50, 5000) * 100,
                "created_at": (datetime.now() - timedelta(days=random.randint(1, 20))).isoformat(),
            }
            for i in range(count)
        ]

    def _generate_mock_ads(self, count: int = 8) -> list[dict]:
        """生成 Mock 廣告數據"""
        statuses = ["AD_STATUS_DELIVERY_OK", "AD_STATUS_NOT_DELIVER"]

        return [
            {
                "id": f"mock_ad_{uuid4().hex[:8]}",
                "name": f"Mock Ad {i+1}",
                "adgroup_id": f"mock_adgroup_{uuid4().hex[:8]}",
                "status": random.choice(statuses),
                "call_to_action": random.choice(["LEARN_MORE", "SHOP_NOW", "DOWNLOAD"]),
                "created_at": (datetime.now() - timedelta(days=random.randint(1, 15))).isoformat(),
            }
            for i in range(count)
        ]

    async def get_campaigns(self, advertiser_id: str) -> list[dict]:
        """
        取得廣告活動列表

        Args:
            advertiser_id: 廣告主 ID

        Returns:
            廣告活動列表
        """
        if self.use_mock:
            return self._generate_mock_campaigns()

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{TIKTOK_API_BASE}/campaign/get/",
                params={"advertiser_id": advertiser_id},
                headers=self._get_headers(),
            )

            if response.status_code != 200:
                logger.error(f"TikTok get campaigns failed: {response.text}")
                return []

            data = response.json()
            if data.get("code") != 0:
                logger.error(f"TikTok API error: {data.get('message')}")
                return []

            return data.get("data", {}).get("list", [])

    async def get_adgroups(self, advertiser_id: str) -> list[dict]:
        """
        取得廣告組列表

        Args:
            advertiser_id: 廣告主 ID

        Returns:
            廣告組列表
        """
        if self.use_mock:
            return self._generate_mock_adgroups()

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{TIKTOK_API_BASE}/adgroup/get/",
                params={"advertiser_id": advertiser_id},
                headers=self._get_headers(),
            )

            if response.status_code != 200:
                return []

            data = response.json()
            if data.get("code") != 0:
                return []

            return data.get("data", {}).get("list", [])

    async def get_ads(self, advertiser_id: str) -> list[dict]:
        """
        取得廣告列表

        Args:
            advertiser_id: 廣告主 ID

        Returns:
            廣告列表
        """
        if self.use_mock:
            return self._generate_mock_ads()

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{TIKTOK_API_BASE}/ad/get/",
                params={"advertiser_id": advertiser_id},
                headers=self._get_headers(),
            )

            if response.status_code != 200:
                return []

            data = response.json()
            if data.get("code") != 0:
                return []

            return data.get("data", {}).get("list", [])

    async def get_metrics(
        self,
        advertiser_id: str,
        start_date: str,
        end_date: str,
    ) -> list[dict]:
        """
        取得廣告成效數據

        Args:
            advertiser_id: 廣告主 ID
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
                f"{TIKTOK_API_BASE}/report/integrated/get/",
                params={
                    "advertiser_id": advertiser_id,
                    "report_type": "BASIC",
                    "dimensions": '["stat_time_day"]',
                    "metrics": '["impressions","clicks","spend","conversions"]',
                    "start_date": start_date,
                    "end_date": end_date,
                },
                headers=self._get_headers(),
            )

            if response.status_code != 200:
                return []

            data = response.json()
            if data.get("code") != 0:
                return []

            return data.get("data", {}).get("list", [])
