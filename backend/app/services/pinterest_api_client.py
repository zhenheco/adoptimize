# -*- coding: utf-8 -*-
"""
Pinterest Ads API Client

支援 Mock 模式和真實 API 模式切換。

Pinterest Ads API v5 特點：
- API Base: https://api.pinterest.com/v5
- 使用 Bearer Token 認證
- 廣告階層：Ad Account → Campaign → Ad Group → Ad
- Analytics 端點：/ad_accounts/{id}/analytics
"""

import random
from datetime import datetime, timedelta
from typing import Any, Optional
from uuid import uuid4

import httpx

from app.core.logger import get_logger
from app.core.mock_mode import is_mock_mode

logger = get_logger(__name__)

# Pinterest Ads API v5 端點
PINTEREST_API_BASE = "https://api.pinterest.com/v5"


class PinterestAPIClient:
    """Pinterest Ads API v5 Client"""

    def __init__(
        self,
        access_token: str,
        use_mock: Optional[bool] = None,
    ):
        """
        初始化 Pinterest API Client

        Args:
            access_token: Pinterest OAuth access token
            use_mock: 是否使用 Mock 模式（None 時從環境變數讀取）
        """
        self.access_token = access_token

        if use_mock is None:
            self.use_mock = is_mock_mode("pinterest")
        else:
            self.use_mock = use_mock

    def _get_headers(self) -> dict:
        """取得 API 請求 headers"""
        return {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
        }

    # ── Mock 數據生成 ──────────────────────────────────────

    def _generate_mock_ad_accounts(self, count: int = 2) -> list[dict]:
        """生成 Mock 廣告帳戶數據"""
        return [
            {
                "id": f"pin_account_{uuid4().hex[:8]}",
                "name": f"Mock Pinterest Account {i+1}",
                "status": "ACTIVE",
                "currency": "USD",
                "created_at": (datetime.now() - timedelta(days=random.randint(30, 365))).isoformat(),
            }
            for i in range(count)
        ]

    def _generate_mock_campaigns(self, count: int = 3) -> list[dict]:
        """生成 Mock 廣告活動數據"""
        statuses = ["ACTIVE", "PAUSED", "ARCHIVED"]
        objectives = [
            "AWARENESS", "CONSIDERATION", "VIDEO_VIEW",
            "WEB_CONVERSION", "CATALOG_SALES", "WEB_SESSIONS",
        ]

        return [
            {
                "id": f"pin_campaign_{uuid4().hex[:8]}",
                "name": f"Mock Pinterest Campaign {i+1}",
                "status": random.choice(statuses[:2]),
                "objective_type": random.choice(objectives),
                "daily_spend_cap": random.randint(500, 5000),
                "lifetime_spend_cap": random.randint(5000, 50000),
                "created_time": (datetime.now() - timedelta(days=random.randint(1, 60))).isoformat(),
            }
            for i in range(count)
        ]

    def _generate_mock_ad_groups(self, count: int = 4) -> list[dict]:
        """生成 Mock 廣告群組數據"""
        statuses = ["ACTIVE", "PAUSED"]

        return [
            {
                "id": f"pin_adgroup_{uuid4().hex[:8]}",
                "name": f"Mock Pinterest Ad Group {i+1}",
                "status": random.choice(statuses),
                "campaign_id": f"pin_campaign_{uuid4().hex[:8]}",
                "budget_in_micro_currency": random.randint(5000000, 50000000),
                "created_time": (datetime.now() - timedelta(days=random.randint(1, 30))).isoformat(),
            }
            for i in range(count)
        ]

    def _generate_mock_ads(self, count: int = 5) -> list[dict]:
        """生成 Mock 廣告數據"""
        statuses = ["ACTIVE", "PAUSED", "DISAPPROVED"]

        return [
            {
                "id": f"pin_ad_{uuid4().hex[:8]}",
                "name": f"Mock Pinterest Ad {i+1}",
                "status": random.choice(statuses[:2]),
                "ad_group_id": f"pin_adgroup_{uuid4().hex[:8]}",
                "pin_id": f"pin_{uuid4().hex[:12]}",
                "created_time": (datetime.now() - timedelta(days=random.randint(1, 30))).isoformat(),
            }
            for i in range(count)
        ]

    def _generate_mock_metrics(self, count: int = 3) -> list[dict]:
        """生成 Mock 成效指標數據"""
        return [
            {
                "campaign_id": f"pin_campaign_{uuid4().hex[:8]}",
                "IMPRESSION": random.randint(5000, 100000),
                "PIN_CLICK": random.randint(100, 5000),
                "OUTBOUND_CLICK": random.randint(50, 2000),
                "SPEND_IN_MICRO_DOLLAR": random.randint(5000000, 50000000),
                "TOTAL_CONVERSIONS": random.randint(5, 200),
                "CTR": round(random.uniform(0.5, 3.0), 4),
                "ECPC_IN_MICRO_DOLLAR": random.randint(200000, 3000000),
            }
            for _ in range(count)
        ]

    # ── API 方法 ──────────────────────────────────────

    async def get_ad_accounts(self) -> list[dict[str, Any]]:
        """
        取得廣告帳戶列表

        GET /ad_accounts

        Returns:
            廣告帳戶列表
        """
        if self.use_mock:
            return self._generate_mock_ad_accounts()

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{PINTEREST_API_BASE}/ad_accounts",
                headers=self._get_headers(),
            )

            if response.status_code != 200:
                logger.error(f"Pinterest get ad accounts failed: {response.text}")
                return []

            data = response.json()
            return data.get("items", [])

    async def get_campaigns(self, ad_account_id: str) -> list[dict[str, Any]]:
        """
        取得廣告活動列表

        GET /ad_accounts/{ad_account_id}/campaigns

        Args:
            ad_account_id: 廣告帳號 ID

        Returns:
            廣告活動列表
        """
        if self.use_mock:
            return self._generate_mock_campaigns()

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{PINTEREST_API_BASE}/ad_accounts/{ad_account_id}/campaigns",
                headers=self._get_headers(),
            )

            if response.status_code != 200:
                logger.error(f"Pinterest get campaigns failed: {response.text}")
                return []

            data = response.json()
            return data.get("items", [])

    async def get_ad_groups(self, ad_account_id: str) -> list[dict[str, Any]]:
        """
        取得廣告群組列表

        GET /ad_accounts/{ad_account_id}/ad_groups

        Args:
            ad_account_id: 廣告帳號 ID

        Returns:
            廣告群組列表
        """
        if self.use_mock:
            return self._generate_mock_ad_groups()

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{PINTEREST_API_BASE}/ad_accounts/{ad_account_id}/ad_groups",
                headers=self._get_headers(),
            )

            if response.status_code != 200:
                logger.error(f"Pinterest get ad groups failed: {response.text}")
                return []

            data = response.json()
            return data.get("items", [])

    async def get_ads(self, ad_account_id: str) -> list[dict[str, Any]]:
        """
        取得廣告列表

        GET /ad_accounts/{ad_account_id}/ads

        Args:
            ad_account_id: 廣告帳號 ID

        Returns:
            廣告列表
        """
        if self.use_mock:
            return self._generate_mock_ads()

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{PINTEREST_API_BASE}/ad_accounts/{ad_account_id}/ads",
                headers=self._get_headers(),
            )

            if response.status_code != 200:
                logger.error(f"Pinterest get ads failed: {response.text}")
                return []

            data = response.json()
            return data.get("items", [])

    async def get_metrics(
        self,
        ad_account_id: str,
        start_date: str,
        end_date: str,
    ) -> list[dict[str, Any]]:
        """
        取得廣告成效數據

        GET /ad_accounts/{ad_account_id}/analytics

        Args:
            ad_account_id: 廣告帳號 ID
            start_date: 開始日期 (YYYY-MM-DD)
            end_date: 結束日期 (YYYY-MM-DD)

        Returns:
            成效數據列表
        """
        if self.use_mock:
            return self._generate_mock_metrics()

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{PINTEREST_API_BASE}/ad_accounts/{ad_account_id}/analytics",
                headers=self._get_headers(),
                params={
                    "start_date": start_date,
                    "end_date": end_date,
                    "columns": "IMPRESSION,PIN_CLICK,OUTBOUND_CLICK,SPEND_IN_MICRO_DOLLAR,TOTAL_CONVERSIONS,CTR,ECPC_IN_MICRO_DOLLAR",
                    "granularity": "TOTAL",
                },
            )

            if response.status_code != 200:
                logger.error(f"Pinterest get metrics failed: {response.text}")
                return []

            data = response.json()
            # Pinterest analytics 回應格式不同，直接返回
            return data if isinstance(data, list) else [data]
