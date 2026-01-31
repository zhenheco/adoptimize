# -*- coding: utf-8 -*-
"""
Reddit 數據同步服務

同步 Reddit Ads 數據到本地資料庫。
"""

from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logger import get_logger
from app.models.ad_account import AdAccount
from app.models.campaign import Campaign
from app.models.ad_set import AdSet
from app.models.ad import Ad
from app.services.reddit_api_client import RedditAPIClient

logger = get_logger(__name__)


class SyncRedditService:
    """Reddit 數據同步服務"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def _get_account(self, account_id: UUID) -> Optional[AdAccount]:
        """取得廣告帳戶"""
        result = await self.db.execute(
            select(AdAccount).where(AdAccount.id == account_id)
        )
        return result.scalar_one_or_none()

    def _map_campaign_status(self, reddit_status: str) -> str:
        """映射 Reddit 廣告活動狀態到統一狀態"""
        status_map = {
            "ACTIVE": "active",
            "PAUSED": "paused",
            "COMPLETED": "removed",
            "DELETED": "removed",
        }
        return status_map.get(reddit_status, "unknown")

    def _map_ad_group_status(self, reddit_status: str) -> str:
        """映射 Reddit 廣告組狀態到統一狀態"""
        status_map = {
            "ACTIVE": "active",
            "PAUSED": "paused",
            "DELETED": "removed",
        }
        return status_map.get(reddit_status, "unknown")

    def _map_ad_status(self, reddit_status: str) -> str:
        """映射 Reddit 廣告狀態到統一狀態"""
        status_map = {
            "ACTIVE": "active",
            "PAUSED": "paused",
            "PENDING_REVIEW": "pending",
            "REJECTED": "rejected",
            "DELETED": "removed",
        }
        return status_map.get(reddit_status, "unknown")

    async def sync_campaigns(self, account_id: UUID) -> list[Campaign]:
        """
        同步廣告活動

        Args:
            account_id: 帳戶 ID

        Returns:
            同步的廣告活動列表
        """
        account = await self._get_account(account_id)
        if not account:
            logger.error(f"Account {account_id} not found")
            return []

        client = RedditAPIClient(access_token=account.access_token or "")
        reddit_campaigns = await client.get_campaigns(account.external_id)

        synced = []
        for camp_data in reddit_campaigns:
            external_id = camp_data.get("id")

            # 查找或創建
            result = await self.db.execute(
                select(Campaign).where(
                    Campaign.account_id == account_id,
                    Campaign.external_id == external_id,
                )
            )
            campaign = result.scalar_one_or_none()

            if campaign:
                # 更新
                campaign.name = camp_data.get("name", campaign.name)
                campaign.status = self._map_campaign_status(camp_data.get("status", ""))
                campaign.updated_at = datetime.now(timezone.utc)
            else:
                # 創建
                campaign = Campaign(
                    account_id=account_id,
                    external_id=external_id,
                    name=camp_data.get("name", "Unknown Campaign"),
                    status=self._map_campaign_status(camp_data.get("status", "")),
                )
                self.db.add(campaign)

            synced.append(campaign)

        await self.db.commit()
        return synced

    async def sync_ad_sets(self, account_id: UUID) -> list[AdSet]:
        """
        同步廣告組（映射到 ad_sets 表）

        Args:
            account_id: 帳戶 ID

        Returns:
            同步的廣告組列表
        """
        account = await self._get_account(account_id)
        if not account:
            return []

        client = RedditAPIClient(access_token=account.access_token or "")
        reddit_ad_groups = await client.get_ad_groups(account.external_id)

        synced = []
        for ag_data in reddit_ad_groups:
            external_id = ag_data.get("id")
            campaign_external_id = ag_data.get("campaign_id")

            # 找到對應的 campaign
            result = await self.db.execute(
                select(Campaign).where(
                    Campaign.account_id == account_id,
                    Campaign.external_id == campaign_external_id,
                )
            )
            campaign = result.scalar_one_or_none()

            if not campaign:
                logger.warning(
                    f"Campaign {campaign_external_id} not found for ad group {external_id}"
                )
                continue

            # 查找或創建 ad_set
            result = await self.db.execute(
                select(AdSet).where(
                    AdSet.campaign_id == campaign.id,
                    AdSet.external_id == external_id,
                )
            )
            ad_set = result.scalar_one_or_none()

            if ad_set:
                ad_set.name = ag_data.get("name", ad_set.name)
                ad_set.status = self._map_ad_group_status(ag_data.get("status", ""))
                ad_set.updated_at = datetime.now(timezone.utc)
            else:
                ad_set = AdSet(
                    campaign_id=campaign.id,
                    external_id=external_id,
                    name=ag_data.get("name", "Unknown Ad Group"),
                    status=self._map_ad_group_status(ag_data.get("status", "")),
                )
                self.db.add(ad_set)

            synced.append(ad_set)

        await self.db.commit()
        return synced

    async def sync_ads(self, account_id: UUID) -> list[Ad]:
        """
        同步廣告

        Args:
            account_id: 帳戶 ID

        Returns:
            同步的廣告列表
        """
        account = await self._get_account(account_id)
        if not account:
            return []

        client = RedditAPIClient(access_token=account.access_token or "")
        reddit_ads = await client.get_ads(account.external_id)

        synced = []
        for ad_data in reddit_ads:
            external_id = ad_data.get("id")
            ad_group_external_id = ad_data.get("ad_group_id")

            # 找到對應的 ad_set
            result = await self.db.execute(
                select(AdSet).where(AdSet.external_id == ad_group_external_id)
            )
            ad_set = result.scalar_one_or_none()

            if not ad_set:
                logger.warning(
                    f"AdSet {ad_group_external_id} not found for ad {external_id}"
                )
                continue

            # 查找或創建 ad
            result = await self.db.execute(
                select(Ad).where(
                    Ad.ad_set_id == ad_set.id,
                    Ad.external_id == external_id,
                )
            )
            ad = result.scalar_one_or_none()

            if ad:
                ad.name = ad_data.get("name", ad.name)
                ad.status = self._map_ad_status(ad_data.get("status", ""))
                ad.updated_at = datetime.now(timezone.utc)
            else:
                ad = Ad(
                    ad_set_id=ad_set.id,
                    external_id=external_id,
                    name=ad_data.get("name", "Unknown Ad"),
                    status=self._map_ad_status(ad_data.get("status", "")),
                )
                self.db.add(ad)

            synced.append(ad)

        await self.db.commit()
        return synced

    async def sync_all(self, account_id: UUID) -> dict:
        """
        同步所有數據

        Args:
            account_id: 帳戶 ID

        Returns:
            同步結果統計
        """
        campaigns = await self.sync_campaigns(account_id)
        ad_sets = await self.sync_ad_sets(account_id)
        ads = await self.sync_ads(account_id)

        # 更新帳戶最後同步時間
        account = await self._get_account(account_id)
        if account:
            account.last_sync_at = datetime.now(timezone.utc)
            await self.db.commit()

        return {
            "campaigns": len(campaigns),
            "ad_sets": len(ad_sets),
            "ads": len(ads),
        }
