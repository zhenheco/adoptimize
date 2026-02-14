# -*- coding: utf-8 -*-
"""
LinkedIn Marketing API 數據同步 Worker

負責從 LinkedIn Marketing API 同步：
- Campaign Groups（廣告組 → campaigns）
- Campaigns（廣告活動 → ad_sets）
- Creatives（素材）
- Metrics（指標）

LinkedIn 階層對應到統一模型：
- Campaign Group → Campaign (campaigns 表)
- Campaign → Ad Set (ad_sets 表)
- Creative → Ad (ads 表)
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
from app.services.linkedin_api_client import LinkedInAPIClient

logger = logging.getLogger(__name__)


async def _get_linkedin_accounts() -> list[AdAccount]:
    """取得所有活躍的 LinkedIn Ads 帳戶"""
    worker_session_maker = create_worker_session_maker()
    async with worker_session_maker() as session:
        result = await session.execute(
            select(AdAccount).where(
                AdAccount.platform == "linkedin",
                AdAccount.status == "active",
            )
        )
        return list(result.scalars().all())


async def _sync_linkedin_account(account_id: str) -> dict:
    """
    執行 LinkedIn Ads 帳戶同步的核心邏輯

    Args:
        account_id: 帳戶 UUID

    Returns:
        同步結果
    """
    if is_mock_mode("linkedin"):
        logger.info(f"LinkedIn sync skipped for {account_id}: Mock mode enabled")
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
            logger.warning(f"Invalid token for LinkedIn account {account_id}")
            return {"status": "error", "error": "Invalid or empty token"}

        # 2. 初始化 API Client（強制使用真實 API）
        client = LinkedInAPIClient(
            access_token=account.access_token,
            use_mock=False,
        )

        sync_results = {}
        total_api_calls = 0

        try:
            # 3. 同步 Campaign Groups → campaigns 表
            logger.info(f"LinkedIn: syncing campaign groups for {account_id}")
            groups_result = await _sync_campaign_groups(session, account, client)
            sync_results["campaign_groups"] = groups_result
            total_api_calls += 1

            # 4. 同步 Campaigns → ad_sets 表
            logger.info(f"LinkedIn: syncing campaigns for {account_id}")
            campaigns_result = await _sync_campaigns(session, account, client)
            sync_results["campaigns"] = campaigns_result
            total_api_calls += 1

            # 5. 同步 Creatives → ads 表
            logger.info(f"LinkedIn: syncing creatives for {account_id}")
            creatives_result = await _sync_creatives(session, account, client)
            sync_results["creatives"] = creatives_result
            total_api_calls += 1

            # 6. 同步 Metrics
            logger.info(f"LinkedIn: syncing metrics for {account_id}")
            metrics_result = await _sync_metrics(session, account, client)
            sync_results["metrics"] = metrics_result
            total_api_calls += 1

        except Exception as e:
            logger.error(f"LinkedIn sync error for {account_id}: {e}")
            sync_results["error"] = str(e)

        # 7. 更新 last_sync_at
        await session.execute(
            update(AdAccount)
            .where(AdAccount.id == account.id)
            .values(last_sync_at=datetime.now(timezone.utc))
        )
        await session.commit()

        logger.info(
            f"LinkedIn sync completed for {account_id}: "
            f"{total_api_calls} API calls"
        )

        return {
            "status": "completed",
            "account_id": account_id,
            "synced_at": datetime.now(timezone.utc).isoformat(),
            "api_calls": total_api_calls,
            "details": sync_results,
        }


async def _sync_campaign_groups(
    session: AsyncSession,
    account: AdAccount,
    client: LinkedInAPIClient,
) -> dict[str, Any]:
    """
    同步 LinkedIn Campaign Groups → campaigns 表

    LinkedIn Campaign Group = 我們的 Campaign
    """
    try:
        # LinkedIn API 用帳戶的 external_id 查詢
        # external_id 格式可能是 "linkedin_user_xxx" 或真正的 LinkedIn account ID
        account_ext_id = account.external_id
        groups = await client.get_campaign_groups(account_ext_id)
        logger.info(f"Fetched {len(groups)} campaign groups from LinkedIn")

        synced_count = 0
        for raw_group in groups:
            external_id = str(raw_group.get("id", ""))
            if not external_id:
                continue

            # 檢查是否已存在
            result = await session.execute(
                select(Campaign).where(
                    Campaign.ad_account_id == account.id,
                    Campaign.external_id == external_id,
                )
            )
            existing = result.scalar_one_or_none()

            name = raw_group.get("name", f"LinkedIn Group {external_id}")
            status = raw_group.get("status", "ACTIVE")
            budget_daily = None
            budget_lifetime = None

            if raw_group.get("total_budget"):
                budget_lifetime = Decimal(str(raw_group["total_budget"]))

            if existing:
                existing.name = name
                existing.status = status
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
        logger.error(f"Failed to sync campaign groups: {e}")
        await session.rollback()
        return {"status": "error", "error": str(e)}


async def _sync_campaigns(
    session: AsyncSession,
    account: AdAccount,
    client: LinkedInAPIClient,
) -> dict[str, Any]:
    """
    同步 LinkedIn Campaigns → ad_sets 表

    LinkedIn Campaign = 我們的 Ad Set
    """
    try:
        account_ext_id = account.external_id
        campaigns = await client.get_campaigns(account_ext_id)
        logger.info(f"Fetched {len(campaigns)} campaigns from LinkedIn")

        # 建立 Campaign Group external_id → Campaign.id 對應表
        campaigns_result = await session.execute(
            select(Campaign).where(Campaign.ad_account_id == account.id)
        )
        campaign_map = {
            c.external_id: c.id for c in campaigns_result.scalars().all()
        }

        synced_count = 0
        skipped_count = 0

        for raw_campaign in campaigns:
            external_id = str(raw_campaign.get("id", ""))
            if not external_id:
                continue

            # LinkedIn campaign 的 campaignGroup URN 對應到 Campaign Group
            # 格式: urn:li:sponsoredCampaignGroup:12345
            group_urn = raw_campaign.get("campaignGroup", "")
            group_ext_id = group_urn.split(":")[-1] if ":" in str(group_urn) else ""

            campaign_id = campaign_map.get(group_ext_id)
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

            name = raw_campaign.get("name", f"LinkedIn Campaign {external_id}")
            status = raw_campaign.get("status", "ACTIVE")
            budget_daily = None

            if raw_campaign.get("daily_budget"):
                budget_daily = Decimal(str(raw_campaign["daily_budget"]))

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
        logger.error(f"Failed to sync campaigns: {e}")
        await session.rollback()
        return {"status": "error", "error": str(e)}


async def _sync_creatives(
    session: AsyncSession,
    account: AdAccount,
    client: LinkedInAPIClient,
) -> dict[str, Any]:
    """
    同步 LinkedIn Creatives → ads 表

    LinkedIn Creative = 我們的 Ad
    """
    try:
        account_ext_id = account.external_id
        creatives = await client.get_creatives(account_ext_id)
        logger.info(f"Fetched {len(creatives)} creatives from LinkedIn")

        # 建立 LinkedIn Campaign external_id → AdSet.id 對應表
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

        for raw_creative in creatives:
            external_id = str(raw_creative.get("id", ""))
            if not external_id:
                continue

            # Creative 的 campaign URN
            campaign_urn = raw_creative.get("campaign_id", raw_creative.get("campaign", ""))
            campaign_ext_id = str(campaign_urn).split(":")[-1] if ":" in str(campaign_urn) else str(campaign_urn)

            adset_id = adset_map.get(campaign_ext_id)
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

            name = raw_creative.get("name", f"LinkedIn Creative {external_id}")
            status = raw_creative.get("status", "ACTIVE")

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
        logger.error(f"Failed to sync creatives: {e}")
        await session.rollback()
        return {"status": "error", "error": str(e)}


async def _sync_metrics(
    session: AsyncSession,
    account: AdAccount,
    client: LinkedInAPIClient,
) -> dict[str, Any]:
    """
    同步 LinkedIn Ads 成效指標

    LinkedIn Development Tier 有 rate limit，所以只取最近 7 天
    """
    try:
        account_ext_id = account.external_id
        end_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        start_date = (datetime.now(timezone.utc) - timedelta(days=7)).strftime("%Y-%m-%d")

        metrics = await client.get_metrics(account_ext_id, start_date, end_date)
        logger.info(f"Fetched {len(metrics)} metric records from LinkedIn")

        return {"status": "completed", "metrics_count": len(metrics)}

    except Exception as e:
        logger.error(f"Failed to sync metrics: {e}")
        return {"status": "error", "error": str(e)}
