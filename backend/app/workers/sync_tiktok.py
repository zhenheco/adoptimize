# -*- coding: utf-8 -*-
"""
TikTok Marketing API 數據同步 Worker

負責從 TikTok Marketing API 同步：
- Campaigns → campaigns 表
- Ad Groups → ad_sets 表
- Ads → ads 表
- Metrics → 成效指標

TikTok 階層對應到統一模型：
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
from app.services.tiktok_api_client import TikTokAPIClient

logger = logging.getLogger(__name__)


async def _get_tiktok_accounts() -> list[AdAccount]:
    """取得所有活躍的 TikTok Ads 帳戶"""
    worker_session_maker = create_worker_session_maker()
    async with worker_session_maker() as session:
        result = await session.execute(
            select(AdAccount).where(
                AdAccount.platform == "tiktok",
                AdAccount.status == "active",
            )
        )
        return list(result.scalars().all())


async def _sync_tiktok_account(account_id: str) -> dict:
    """
    執行 TikTok Ads 帳戶同步的核心邏輯

    Args:
        account_id: 帳戶 UUID

    Returns:
        同步結果
    """
    if is_mock_mode("tiktok"):
        logger.info(f"TikTok sync skipped for {account_id}: Mock mode enabled")
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
            logger.warning(f"Invalid token for TikTok account {account_id}")
            return {"status": "error", "error": "Invalid or empty token"}

        # 2. 初始化 API Client（強制使用真實 API）
        client = TikTokAPIClient(
            access_token=account.access_token,
            use_mock=False,
        )

        sync_results = {}
        total_api_calls = 0
        advertiser_id = account.external_id

        try:
            # 3. 同步 Campaigns
            logger.info(f"TikTok: syncing campaigns for {account_id}")
            campaigns_result = await _sync_campaigns(session, account, client, advertiser_id)
            sync_results["campaigns"] = campaigns_result
            total_api_calls += 1

            # 4. 同步 Ad Groups → ad_sets
            logger.info(f"TikTok: syncing ad groups for {account_id}")
            adgroups_result = await _sync_ad_groups(session, account, client, advertiser_id)
            sync_results["ad_groups"] = adgroups_result
            total_api_calls += 1

            # 5. 同步 Ads
            logger.info(f"TikTok: syncing ads for {account_id}")
            ads_result = await _sync_ads(session, account, client, advertiser_id)
            sync_results["ads"] = ads_result
            total_api_calls += 1

            # 6. 同步 Metrics
            logger.info(f"TikTok: syncing metrics for {account_id}")
            metrics_result = await _sync_metrics(session, account, client, advertiser_id)
            sync_results["metrics"] = metrics_result
            total_api_calls += 1

        except Exception as e:
            logger.error(f"TikTok sync error for {account_id}: {e}")
            sync_results["error"] = str(e)

        # 7. 更新 last_sync_at
        await session.execute(
            update(AdAccount)
            .where(AdAccount.id == account.id)
            .values(last_sync_at=datetime.now(timezone.utc))
        )
        await session.commit()

        logger.info(
            f"TikTok sync completed for {account_id}: "
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
    client: TikTokAPIClient,
    advertiser_id: str,
) -> dict[str, Any]:
    """同步 TikTok Campaigns → campaigns 表"""
    try:
        campaigns = await client.get_campaigns(advertiser_id)
        logger.info(f"Fetched {len(campaigns)} campaigns from TikTok")

        synced_count = 0
        for raw in campaigns:
            external_id = str(raw.get("campaign_id", raw.get("id", "")))
            if not external_id:
                continue

            result = await session.execute(
                select(Campaign).where(
                    Campaign.ad_account_id == account.id,
                    Campaign.external_id == external_id,
                )
            )
            existing = result.scalar_one_or_none()

            name = raw.get("campaign_name", raw.get("name", f"TikTok Campaign {external_id}"))
            status = raw.get("status", raw.get("operation_status", "ACTIVE"))
            budget_daily = None

            # TikTok budget 以分為單位（cents）
            raw_budget = raw.get("budget", 0)
            if raw_budget and raw.get("budget_mode") == "BUDGET_MODE_DAY":
                budget_daily = Decimal(str(raw_budget)) / 100

            if existing:
                existing.name = name
                existing.status = status
                if budget_daily is not None:
                    existing.budget_daily = budget_daily
                existing.updated_at = datetime.now(timezone.utc)
            else:
                campaign = Campaign(
                    id=uuid.uuid4(),
                    ad_account_id=account.id,
                    external_id=external_id,
                    name=name,
                    status=status,
                    budget_daily=budget_daily,
                )
                session.add(campaign)

            synced_count += 1

        await session.commit()
        return {"status": "completed", "synced": synced_count}

    except Exception as e:
        logger.error(f"Failed to sync TikTok campaigns: {e}")
        await session.rollback()
        return {"status": "error", "error": str(e)}


async def _sync_ad_groups(
    session: AsyncSession,
    account: AdAccount,
    client: TikTokAPIClient,
    advertiser_id: str,
) -> dict[str, Any]:
    """同步 TikTok Ad Groups → ad_sets 表"""
    try:
        adgroups = await client.get_adgroups(advertiser_id)
        logger.info(f"Fetched {len(adgroups)} ad groups from TikTok")

        # 建立 Campaign external_id → Campaign.id 對應表
        campaigns_result = await session.execute(
            select(Campaign).where(Campaign.ad_account_id == account.id)
        )
        campaign_map = {
            c.external_id: c.id for c in campaigns_result.scalars().all()
        }

        synced_count = 0
        skipped_count = 0

        for raw in adgroups:
            external_id = str(raw.get("adgroup_id", raw.get("id", "")))
            if not external_id:
                continue

            campaign_ext_id = str(raw.get("campaign_id", ""))
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

            name = raw.get("adgroup_name", raw.get("name", f"TikTok AdGroup {external_id}"))
            status = raw.get("status", raw.get("operation_status", "ACTIVE"))
            budget_daily = None

            raw_budget = raw.get("budget", 0)
            if raw_budget:
                budget_daily = Decimal(str(raw_budget)) / 100

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
        logger.error(f"Failed to sync TikTok ad groups: {e}")
        await session.rollback()
        return {"status": "error", "error": str(e)}


async def _sync_ads(
    session: AsyncSession,
    account: AdAccount,
    client: TikTokAPIClient,
    advertiser_id: str,
) -> dict[str, Any]:
    """同步 TikTok Ads → ads 表"""
    try:
        ads = await client.get_ads(advertiser_id)
        logger.info(f"Fetched {len(ads)} ads from TikTok")

        # 建立 AdGroup external_id → AdSet.id 對應表
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

        for raw in ads:
            external_id = str(raw.get("ad_id", raw.get("id", "")))
            if not external_id:
                continue

            adgroup_ext_id = str(raw.get("adgroup_id", ""))
            adset_id = adset_map.get(adgroup_ext_id)
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

            name = raw.get("ad_name", raw.get("name", f"TikTok Ad {external_id}"))
            status = raw.get("status", raw.get("operation_status", "ACTIVE"))

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
        logger.error(f"Failed to sync TikTok ads: {e}")
        await session.rollback()
        return {"status": "error", "error": str(e)}


async def _sync_metrics(
    session: AsyncSession,
    account: AdAccount,
    client: TikTokAPIClient,
    advertiser_id: str,
) -> dict[str, Any]:
    """同步 TikTok Ads 成效指標（最近 7 天）"""
    try:
        end_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        start_date = (datetime.now(timezone.utc) - timedelta(days=7)).strftime("%Y-%m-%d")

        metrics = await client.get_metrics(advertiser_id, start_date, end_date)
        logger.info(f"Fetched {len(metrics)} metric records from TikTok")

        return {"status": "completed", "metrics_count": len(metrics)}

    except Exception as e:
        logger.error(f"Failed to sync TikTok metrics: {e}")
        return {"status": "error", "error": str(e)}
