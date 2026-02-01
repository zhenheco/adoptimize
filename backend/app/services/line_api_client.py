# -*- coding: utf-8 -*-
"""
LINE Ads API Client

支援 Mock 模式和真實 API 模式切換。
"""

import os
import random
from datetime import datetime, timedelta
from typing import Optional
from uuid import uuid4

import httpx

from app.core.logger import get_logger
from app.services.line_jws_signer import LineJWSSigner

logger = get_logger(__name__)

# LINE Ads API 端點
LINE_ADS_API_BASE = "https://ads.line.me/api/v3"


class LineAPIClient:
    """LINE Ads API Client"""

    def __init__(
        self,
        access_key: str,
        secret_key: str,
        use_mock: Optional[bool] = None,
    ):
        """
        初始化 LINE API Client

        Args:
            access_key: LINE Ads Access Key
            secret_key: LINE Ads Secret Key
            use_mock: 是否使用 Mock 模式（None 時從環境變數讀取）
        """
        self.access_key = access_key
        self.secret_key = secret_key
        self.signer = LineJWSSigner(access_key, secret_key)

        if use_mock is None:
            self.use_mock = os.getenv("USE_MOCK_ADS_API", "true").lower() == "true"
        else:
            self.use_mock = use_mock

    def _get_headers(self, method: str, path: str, body: Optional[str] = None) -> dict:
        """
        取得 API 請求 headers

        Args:
            method: HTTP 方法 (GET, POST, etc.)
            path: API 路徑
            body: 請求 body (JSON 字串)

        Returns:
            headers 字典
        """
        return {
            "Authorization": self.signer.get_authorization_header(method, path, body),
            "Content-Type": "application/json",
        }

    def _generate_mock_campaigns(self, count: int = 3) -> list[dict]:
        """生成 Mock 廣告活動數據"""
        statuses = ["ACTIVE", "PAUSED", "ENDED"]
        objectives = ["WEBSITE_TRAFFIC", "CONVERSIONS", "APP_INSTALLS", "VIDEO_VIEWS"]

        return [
            {
                "id": f"line_camp_{uuid4().hex[:8]}",
                "name": f"Mock LINE Campaign {i+1}",
                "status": random.choice(statuses),
                "objective": random.choice(objectives),
                "budget": random.randint(1000, 100000),
                "budgetType": "DAILY",
                "createdAt": (datetime.now() - timedelta(days=random.randint(1, 30))).isoformat(),
            }
            for i in range(count)
        ]

    def _generate_mock_ad_groups(self, count: int = 5) -> list[dict]:
        """生成 Mock 廣告組數據"""
        statuses = ["ACTIVE", "PAUSED"]
        bid_types = ["CPC", "CPM", "CPA"]

        return [
            {
                "id": f"line_adgroup_{uuid4().hex[:8]}",
                "name": f"Mock Ad Group {i+1}",
                "campaignId": f"line_camp_{uuid4().hex[:8]}",
                "status": random.choice(statuses),
                "bidType": random.choice(bid_types),
                "bidAmount": random.randint(10, 500),
                "createdAt": (datetime.now() - timedelta(days=random.randint(1, 20))).isoformat(),
            }
            for i in range(count)
        ]

    def _generate_mock_ads(self, count: int = 8) -> list[dict]:
        """生成 Mock 廣告數據"""
        statuses = ["ACTIVE", "PAUSED", "IN_REVIEW", "REJECTED"]
        ad_formats = ["IMAGE", "VIDEO", "CAROUSEL"]

        return [
            {
                "id": f"line_ad_{uuid4().hex[:8]}",
                "name": f"Mock LINE Ad {i+1}",
                "adGroupId": f"line_adgroup_{uuid4().hex[:8]}",
                "status": random.choice(statuses),
                "format": random.choice(ad_formats),
                "headline": f"Amazing LINE Ad #{i+1}",
                "createdAt": (datetime.now() - timedelta(days=random.randint(1, 15))).isoformat(),
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

        path = f"/api/v3/adaccounts/{account_id}/campaigns"
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{LINE_ADS_API_BASE}/adaccounts/{account_id}/campaigns",
                headers=self._get_headers("GET", path),
            )

            if response.status_code != 200:
                logger.error(f"LINE get campaigns failed: {response.text}")
                return []

            data = response.json()
            return data.get("campaigns", [])

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

        path = f"/api/v3/adaccounts/{account_id}/adgroups"
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{LINE_ADS_API_BASE}/adaccounts/{account_id}/adgroups",
                headers=self._get_headers("GET", path),
            )

            if response.status_code != 200:
                logger.error(f"LINE get ad groups failed: {response.text}")
                return []

            data = response.json()
            return data.get("adGroups", [])

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

        path = f"/api/v3/adaccounts/{account_id}/ads"
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{LINE_ADS_API_BASE}/adaccounts/{account_id}/ads",
                headers=self._get_headers("GET", path),
            )

            if response.status_code != 200:
                logger.error(f"LINE get ads failed: {response.text}")
                return []

            data = response.json()
            return data.get("ads", [])

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
                    "spend": random.randint(100, 10000),
                    "conversions": random.randint(0, 100),
                    "ctr": round(random.uniform(0.5, 5.0), 2),
                    "cpc": round(random.uniform(10, 200), 2),
                }
            ]

        path = f"/api/v3/adaccounts/{account_id}/stats"
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{LINE_ADS_API_BASE}/adaccounts/{account_id}/stats",
                params={
                    "startDate": start_date,
                    "endDate": end_date,
                },
                headers=self._get_headers("GET", path),
            )

            if response.status_code != 200:
                logger.error(f"LINE get metrics failed: {response.text}")
                return []

            data = response.json()
            return data.get("stats", [])
