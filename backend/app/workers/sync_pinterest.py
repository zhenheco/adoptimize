# -*- coding: utf-8 -*-
"""
Pinterest Ads API 數據同步 Worker

負責從 Pinterest Ads API v5 同步：
- Campaigns（廣告活動 → campaigns 表）
- Ad Groups（廣告群組 → ad_sets 表）
- Ads（廣告 → ads 表）
- Metrics（指標）

Pinterest 階層對應到統一模型：
- Campaign → Campaign (campaigns 表)
- Ad Group → Ad Set (ad_sets 表)
- Ad → Ad (ads 表)
"""

import logging
import uuid
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from typing import Any

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.mock_mode import is_mock_mode
from app.db.base import create_worker_session_maker
from app.models.ad_account import AdAccount
from app.models.campaign import Campaign
from app.models.ad_set import AdSet
from app.models.ad import Ad
from app.services.pinterest_api_client import PinterestAPIClient

logger = logging.getLogger(__name__)


async def _get_pinterest_accounts() -> list[AdAccount]:
    """取得所有活躍的 Pinterest Ads 帳戶"""
    worker_session_maker = create_worker_session_maker()
    async with worker_session_maker() as session:
        result = await session.execute(
            select(AdAccount).where(
                AdAccount.platform == "pinterest",
                AdAccount.status == "active",
            )
        )
        return list(result.scalars().all())


async def _sync_pinterest_account(account_id: str) -> dict:
    """
    執行 Pinterest Ads 帳戶同步的核心邏輯

    Args:
        account_id: 帳戶 UUID

    Returns:
        同步結果
    """
    if is_mock_mode("pinterest"):
        logger.info(f"Pinterest sync skipped for {account_id}: Mock mode enabled")
        return {"status": "skipped", "reason": "mock_mode"}

    worker_session_maker = create_worker_session_maker()
    async with worker_session_maker() as session:
        # 1. 取得帳戶資訊
        result = await session.execute(
            select(AdAccount).where(AdAccount.id == uuid.UUID(account_id))
        )
        account = result.scalar_one_or_none()

        if not account:
            return {"status": "error", "error": "Account not found"}

        if not account.access_token or not account.access_token.strip():
            logger.warning(f"Invalid token for Pinterest account {account_id}")
            return {"status": "error", "error": "Invalid or empty token"}

        # 2. 初始化 API Client（強制使用真實 API）
        client = PinterestAPIClient(
            access_token=account.access_token,
            use_mock=False,
        )

        sync_results = {}
        total_api_calls = 0

        try:
            # Pinterest 用 external_id 作為 ad_account_id
            ad_account_ext_id = account.external_id

            # 3. 同步 Campaigns → campaigns 表
            logger.info(f"Pinterest: syncing campaigns for {account_id}")
            campaigns_result = await _sync_campaigns(session, account, client, ad_account_ext_id)
            sync_results["campaigns"] = campaigns_result
            total_api_calls += 1

            # 4. 同步 Ad Groups → ad_sets 表
            logger.info(f"Pinterest: syncing ad groups for {account_id}")
            ad_groups_result = await _sync_ad_groups(session, account, client, ad_account_ext_id)
            sync_results["ad_groups"] = ad_groups_result
            total_api_calls += 1

            # 5. 同步 Ads → ads 表
            logger.info(f"Pinterest: syncing ads for {account_id}")
            ads_result = await _sync_ads(session, account, client, ad_account_ext_id)
            sync_results["ads"] = ads_result
            total_api_calls += 1

            # 6. 同步 Metrics
            logger.info(f"Pinterest: syncing metrics for {account_id}")
            metrics_result = await _sync_metrics(session, account, client, ad_account_ext_id)
            sync_results["metrics"] = metrics_result
            total_api_calls += 1

        except Exception as e:
            logger.error(f"Pinterest sync error for {account_id}: {e}")
            sync_results["error"] = str(e)

        # 7. 更新 last_sync_at
        await session.execute(
            update(AdAccount)
            .where(AdAccount.id == account.id)
            .values(last_sync_at=datetime.now(timezone.utc))
        )
        await session.commit()

        logger.info(
            f"Pinterest sync completed for {account_id}: "
            f"{total_api_calls} API calls"
        )

        return {
            "status": "completed",
            "account_id": account_id,
            "synced_at": datetime.now(timezone.utc).isoformat(),
            "api_calls": total_api_calls,
            "details": sync_results,
        }


async def _sync_campaigns(
    session: AsyncSession,
    account: AdAccount,
    client: PinterestAPIClient,
    ad_account_ext_id: str,
) -> dict[str, Any]:
    """同步 Pinterest Campaigns → campaigns 表"""
    try:
        campaigns = await client.get_campaigns(ad_account_ext_id)
        logger.info(f"Fetched {len(campaigns)} campaigns from Pinterest")

        synced_count = 0
        for raw_campaign in campaigns:
            external_id = str(raw_campaign.get("id", ""))
            if not external_id:
                continue

            result = await session.execute(
                select(Campaign).where(
                    Campaign.ad_account_id == account.id,
                    Campaign.external_id == external_id,
                )
            )
            existing = result.scalar_one_or_none()

            name = raw_campaign.get("name", f"Pinterest Campaign {external_id}")
            status = raw_campaign.get("status", "ACTIVE")

            # Pinterest budget 使用 micro currency（1 USD = 1,000,000 micros）
            daily_cap = raw_campaign.get("daily_spend_cap")
            lifetime_cap = raw_campaign.get("lifetime_spend_cap")
            budget_daily = Decimal(str(daily_cap / 1_000_000)) if daily_cap else None
            budget_lifetime = Decimal(str(lifetime_cap / 1_000_000)) if lifetime_cap else None

            if existing:
                existing.name = name
                existing.status = status
                if budget_daily is not None:
                    existing.budget_daily = budget_daily
                if budget_lifetime is not None:
                    existing.budget_lifetime = budget_lifetime
                existing.updated_at = datetime.now(timezone.utc)
            else:
                campaign = Campaign(
                    id=uuid.uuid4(),
                    ad_account_id=account.id,
                    external_id=external_id,
                    name=name,
                    status=status,
                    budget_daily=budget_daily,
                    budget_lifetime=budget_lifetime,
                )
                session.add(campaign)

            synced_count += 1

        await session.commit()
        return {"status": "completed", "synced": synced_count}

    except Exception as e:
        logger.error(f"Failed to sync Pinterest campaigns: {e}")
        await session.rollback()
        return {"status": "error", "error": str(e)}


async def _sync_ad_groups(
    session: AsyncSession,
    account: AdAccount,
    client: PinterestAPIClient,
    ad_account_ext_id: str,
) -> dict[str, Any]:
    """同步 Pinterest Ad Groups → ad_sets 表"""
    try:
        ad_groups = await client.get_ad_groups(ad_account_ext_id)
        logger.info(f"Fetched {len(ad_groups)} ad groups from Pinterest")

        # 建立 Campaign external_id → Campaign.id 對應表
        campaigns_result = await session.execute(
            select(Campaign).where(Campaign.ad_account_id == account.id)
        )
        campaign_map = {
            c.external_id: c.id for c in campaigns_result.scalars().all()
        }

        synced_count = 0
        skipped_count = 0

        for raw_group in ad_groups:
            external_id = str(raw_group.get("id", ""))
            if not external_id:
                continue

            campaign_ext_id = str(raw_group.get("campaign_id", ""))
            campaign_id = campaign_map.get(campaign_ext_id)
            if not campaign_id:
                skipped_count += 1
                continue

            result = await session.execute(
                select(AdSet).where(
                    AdSet.campaign_id == campaign_id,
                    AdSet.external_id == external_id,
                )
            )
            existing = result.scalar_one_or_none()

            name = raw_group.get("name", f"Pinterest Ad Group {external_id}")
            status = raw_group.get("status", "ACTIVE")

            # Budget 使用 micro currency
            budget_micros = raw_group.get("budget_in_micro_currency", 0)
            budget_daily = Decimal(str(budget_micros / 1_000_000)) if budget_micros else None

            if existing:
                existing.name = name
                existing.status = status
                if budget_daily is not None:
                    existing.budget_daily = budget_daily
                existing.updated_at = datetime.now(timezone.utc)
            else:
                adset = AdSet(
                    id=uuid.uuid4(),
                    campaign_id=campaign_id,
                    external_id=external_id,
                    name=name,
                    status=status,
                    budget_daily=budget_daily,
                )
                session.add(adset)

            synced_count += 1

        await session.commit()
        return {"status": "completed", "synced": synced_count, "skipped": skipped_count}

    except Exception as e:
        logger.error(f"Failed to sync Pinterest ad groups: {e}")
        await session.rollback()
        return {"status": "error", "error": str(e)}


async def _sync_ads(
    session: AsyncSession,
    account: AdAccount,
    client: PinterestAPIClient,
    ad_account_ext_id: str,
) -> dict[str, Any]:
    """同步 Pinterest Ads → ads 表"""
    try:
        ads = await client.get_ads(ad_account_ext_id)
        logger.info(f"Fetched {len(ads)} ads from Pinterest")

        # 建立 Ad Group external_id → AdSet.id 對應表
        campaigns_result = await session.execute(
            select(Campaign).where(Campaign.ad_account_id == account.id)
        )
        campaign_ids = [c.id for c in campaigns_result.scalars().all()]

        adsets_result = await session.execute(
            select(AdSet).where(AdSet.campaign_id.in_(campaign_ids))
        )
        adset_map = {
            a.external_id: a.id for a in adsets_result.scalars().all()
        }

        synced_count = 0
        skipped_count = 0

        for raw_ad in ads:
            external_id = str(raw_ad.get("id", ""))
            if not external_id:
                continue

            ad_group_ext_id = str(raw_ad.get("ad_group_id", ""))
            adset_id = adset_map.get(ad_group_ext_id)
            if not adset_id:
                skipped_count += 1
                continue

            result = await session.execute(
                select(Ad).where(
                    Ad.ad_set_id == adset_id,
                    Ad.external_id == external_id,
                )
            )
            existing = result.scalar_one_or_none()

            name = raw_ad.get("name", f"Pinterest Ad {external_id}")
            status = raw_ad.get("status", "ACTIVE")

            if existing:
                existing.name = name
                existing.status = status
                existing.updated_at = datetime.now(timezone.utc)
            else:
                ad = Ad(
                    id=uuid.uuid4(),
                    ad_set_id=adset_id,
                    external_id=external_id,
                    name=name,
                    status=status,
                )
                session.add(ad)

            synced_count += 1

        await session.commit()
        return {"status": "completed", "synced": synced_count, "skipped": skipped_count}

    except Exception as e:
        logger.error(f"Failed to sync Pinterest ads: {e}")
        await session.rollback()
        return {"status": "error", "error": str(e)}


async def _sync_metrics(
    session: AsyncSession,
    account: AdAccount,
    client: PinterestAPIClient,
    ad_account_ext_id: str,
) -> dict[str, Any]:
    """同步 Pinterest Ads 成效指標，取最近 7 天"""
    try:
        end_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        start_date = (datetime.now(timezone.utc) - timedelta(days=7)).strftime("%Y-%m-%d")

        metrics = await client.get_metrics(ad_account_ext_id, start_date, end_date)
        logger.info(f"Fetched {len(metrics)} metric records from Pinterest")

        return {"status": "completed", "metrics_count": len(metrics)}

    except Exception as e:
        logger.error(f"Failed to sync Pinterest metrics: {e}")
        return {"status": "error", "error": str(e)}
