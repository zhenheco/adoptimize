# -*- coding: utf-8 -*-
"""
Google Ads API Client

支援 Mock 模式和真實 API 模式切換。

Google Ads API 特點：
- 使用 gRPC-based SDK (`google-ads` Python 套件)
- 使用 GAQL (Google Ads Query Language) 查詢
- 需要 Developer Token + OAuth refresh_token
- Customer ID 格式：123-456-7890（但 API 需要不帶 dash）
"""

import random
from datetime import datetime, timedelta
from typing import Any, Optional

from app.core.config import get_settings
from app.core.logger import get_logger
from app.core.mock_mode import is_mock_mode

logger = get_logger(__name__)
settings = get_settings()


class GoogleAdsAPIClient:
    """Google Ads API Client"""

    def __init__(
        self,
        refresh_token: str,
        customer_id: Optional[str] = None,
        use_mock: Optional[bool] = None,
    ):
        """
        初始化 Google Ads API Client

        Args:
            refresh_token: Google OAuth refresh token
            customer_id: Google Ads Customer ID（不帶 dash）
            use_mock: 是否使用 Mock 模式（None 時從環境變數讀取）
        """
        self.refresh_token = refresh_token
        self.customer_id = customer_id.replace("-", "") if customer_id else None

        if use_mock is None:
            self.use_mock = is_mock_mode("google")
        else:
            self.use_mock = use_mock

        self._client = None

    def _get_client(self):
        """取得 Google Ads SDK Client（延遲載入）"""
        if self._client is not None:
            return self._client

        from google.ads.googleads.client import GoogleAdsClient

        credentials = {
            "developer_token": settings.GOOGLE_ADS_DEVELOPER_TOKEN,
            "client_id": settings.GOOGLE_ADS_CLIENT_ID,
            "client_secret": settings.GOOGLE_ADS_CLIENT_SECRET,
            "refresh_token": self.refresh_token,
            "use_proto_plus": True,
        }
        self._client = GoogleAdsClient.load_from_dict(credentials)
        return self._client

    # ── Mock 數據生成 ──────────────────────────────────────

    def _generate_mock_customer_ids(self, count: int = 2) -> list[str]:
        """生成 Mock 客戶帳號 ID"""
        return [
            f"{random.randint(100, 999)}{random.randint(100, 999)}{random.randint(1000, 9999)}"
            for _ in range(count)
        ]

    def _generate_mock_campaigns(self, count: int = 3) -> list[dict]:
        """生成 Mock 廣告活動數據"""
        statuses = ["ENABLED", "PAUSED", "REMOVED"]
        types = ["SEARCH", "DISPLAY", "VIDEO", "SHOPPING", "PERFORMANCE_MAX"]

        return [
            {
                "id": str(random.randint(10000000, 99999999)),
                "name": f"Mock Google Campaign {i+1}",
                "status": random.choice(statuses[:2]),  # 排除 REMOVED
                "advertising_channel_type": random.choice(types),
                "budget_amount_micros": random.randint(5000000, 50000000),  # 5-50 USD
                "created_at": (datetime.now() - timedelta(days=random.randint(30, 365))).isoformat(),
            }
            for i in range(count)
        ]

    def _generate_mock_ad_groups(self, count: int = 4) -> list[dict]:
        """生成 Mock 廣告群組數據"""
        statuses = ["ENABLED", "PAUSED"]

        return [
            {
                "id": str(random.randint(10000000, 99999999)),
                "name": f"Mock Ad Group {i+1}",
                "status": random.choice(statuses),
                "campaign_id": str(random.randint(10000000, 99999999)),
                "cpc_bid_micros": random.randint(500000, 5000000),
                "created_at": (datetime.now() - timedelta(days=random.randint(1, 60))).isoformat(),
            }
            for i in range(count)
        ]

    def _generate_mock_ads(self, count: int = 5) -> list[dict]:
        """生成 Mock 廣告數據"""
        statuses = ["ENABLED", "PAUSED"]
        types = ["RESPONSIVE_SEARCH_AD", "RESPONSIVE_DISPLAY_AD", "VIDEO_AD"]

        return [
            {
                "id": str(random.randint(10000000, 99999999)),
                "name": f"Mock Ad {i+1}",
                "status": random.choice(statuses),
                "ad_group_id": str(random.randint(10000000, 99999999)),
                "type": random.choice(types),
                "created_at": (datetime.now() - timedelta(days=random.randint(1, 30))).isoformat(),
            }
            for i in range(count)
        ]

    def _generate_mock_metrics(self, count: int = 3) -> list[dict]:
        """生成 Mock 成效指標數據"""
        return [
            {
                "campaign_id": str(random.randint(10000000, 99999999)),
                "impressions": random.randint(5000, 100000),
                "clicks": random.randint(100, 5000),
                "cost_micros": random.randint(5000000, 50000000),
                "conversions": round(random.uniform(5, 200), 1),
                "ctr": round(random.uniform(1.0, 5.0), 2),
                "average_cpc_micros": random.randint(200000, 3000000),
            }
            for _ in range(count)
        ]

    # ── API 方法 ──────────────────────────────────────

    async def list_accessible_customers(self) -> list[str]:
        """
        取得 OAuth 使用者可存取的客戶帳號 ID 列表

        這是唯一不需要 customer_id 的 API。

        Returns:
            客戶帳號 ID 列表（不帶 dash）
        """
        if self.use_mock:
            return self._generate_mock_customer_ids()

        try:
            client = self._get_client()
            customer_service = client.get_service("CustomerService")
            response = customer_service.list_accessible_customers()

            # 格式：customers/1234567890 → 取最後一段
            customer_ids = [
                resource_name.split("/")[-1]
                for resource_name in response.resource_names
            ]
            logger.info(f"Found {len(customer_ids)} accessible Google Ads customers")
            return customer_ids

        except Exception as e:
            logger.error(f"Failed to list accessible customers: {e}")
            return []

    async def get_campaigns(self) -> list[dict[str, Any]]:
        """
        取得廣告活動列表

        Returns:
            廣告活動列表
        """
        if self.use_mock:
            return self._generate_mock_campaigns()

        if not self.customer_id:
            logger.warning("No customer_id set, cannot get campaigns")
            return []

        try:
            client = self._get_client()
            ga_service = client.get_service("GoogleAdsService")

            query = """
                SELECT
                    campaign.id,
                    campaign.name,
                    campaign.status,
                    campaign.advertising_channel_type,
                    campaign_budget.amount_micros
                FROM campaign
                WHERE campaign.status != 'REMOVED'
            """

            response = ga_service.search(
                customer_id=self.customer_id,
                query=query,
            )

            campaigns = []
            for row in response:
                campaigns.append({
                    "id": str(row.campaign.id),
                    "name": row.campaign.name,
                    "status": row.campaign.status.name,
                    "advertising_channel_type": row.campaign.advertising_channel_type.name,
                    "budget_amount_micros": row.campaign_budget.amount_micros,
                })

            logger.info(f"Fetched {len(campaigns)} campaigns from Google Ads")
            return campaigns

        except Exception as e:
            logger.error(f"Failed to get campaigns: {e}")
            return []

    async def get_ad_groups(self) -> list[dict[str, Any]]:
        """
        取得廣告群組列表（對應到 ad_sets 表）

        Returns:
            廣告群組列表
        """
        if self.use_mock:
            return self._generate_mock_ad_groups()

        if not self.customer_id:
            return []

        try:
            client = self._get_client()
            ga_service = client.get_service("GoogleAdsService")

            query = """
                SELECT
                    ad_group.id,
                    ad_group.name,
                    ad_group.status,
                    ad_group.campaign,
                    ad_group.cpc_bid_micros
                FROM ad_group
                WHERE ad_group.status != 'REMOVED'
            """

            response = ga_service.search(
                customer_id=self.customer_id,
                query=query,
            )

            ad_groups = []
            for row in response:
                # campaign resource name: customers/123/campaigns/456
                campaign_id = row.ad_group.campaign.split("/")[-1]
                ad_groups.append({
                    "id": str(row.ad_group.id),
                    "name": row.ad_group.name,
                    "status": row.ad_group.status.name,
                    "campaign_id": campaign_id,
                    "cpc_bid_micros": row.ad_group.cpc_bid_micros,
                })

            logger.info(f"Fetched {len(ad_groups)} ad groups from Google Ads")
            return ad_groups

        except Exception as e:
            logger.error(f"Failed to get ad groups: {e}")
            return []

    async def get_ads(self) -> list[dict[str, Any]]:
        """
        取得廣告列表

        Returns:
            廣告列表
        """
        if self.use_mock:
            return self._generate_mock_ads()

        if not self.customer_id:
            return []

        try:
            client = self._get_client()
            ga_service = client.get_service("GoogleAdsService")

            query = """
                SELECT
                    ad_group_ad.ad.id,
                    ad_group_ad.ad.name,
                    ad_group_ad.status,
                    ad_group_ad.ad.type,
                    ad_group_ad.ad_group
                FROM ad_group_ad
                WHERE ad_group_ad.status != 'REMOVED'
            """

            response = ga_service.search(
                customer_id=self.customer_id,
                query=query,
            )

            ads = []
            for row in response:
                ad_group_id = row.ad_group_ad.ad_group.split("/")[-1]
                ads.append({
                    "id": str(row.ad_group_ad.ad.id),
                    "name": row.ad_group_ad.ad.name or f"Ad {row.ad_group_ad.ad.id}",
                    "status": row.ad_group_ad.status.name,
                    "type": row.ad_group_ad.ad.type_.name,
                    "ad_group_id": ad_group_id,
                })

            logger.info(f"Fetched {len(ads)} ads from Google Ads")
            return ads

        except Exception as e:
            logger.error(f"Failed to get ads: {e}")
            return []

    async def get_metrics(
        self,
        start_date: str,
        end_date: str,
    ) -> list[dict[str, Any]]:
        """
        取得廣告成效數據

        Args:
            start_date: 開始日期 (YYYY-MM-DD)
            end_date: 結束日期 (YYYY-MM-DD)

        Returns:
            成效數據列表
        """
        if self.use_mock:
            return self._generate_mock_metrics()

        if not self.customer_id:
            return []

        try:
            client = self._get_client()
            ga_service = client.get_service("GoogleAdsService")

            query = f"""
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
                WHERE segments.date BETWEEN '{start_date}' AND '{end_date}'
                  AND campaign.status != 'REMOVED'
            """

            response = ga_service.search(
                customer_id=self.customer_id,
                query=query,
            )

            metrics = []
            for row in response:
                metrics.append({
                    "campaign_id": str(row.campaign.id),
                    "campaign_name": row.campaign.name,
                    "impressions": row.metrics.impressions,
                    "clicks": row.metrics.clicks,
                    "cost_micros": row.metrics.cost_micros,
                    "conversions": row.metrics.conversions,
                    "ctr": row.metrics.ctr,
                    "average_cpc_micros": row.metrics.average_cpc,
                })

            logger.info(f"Fetched {len(metrics)} metric records from Google Ads")
            return metrics

        except Exception as e:
            logger.error(f"Failed to get metrics: {e}")
            return []
