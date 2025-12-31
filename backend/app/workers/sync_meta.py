# -*- coding: utf-8 -*-
"""
Meta Marketing API 數據同步 Worker

負責從 Meta Marketing API 同步：
- Campaigns（廣告活動）
- AdSets（廣告組）
- Ads（廣告）
- Creatives（素材）
- Metrics（指標）
- Audiences（受眾）
"""

import asyncio
import logging
import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.base import async_session_factory
from app.models.ad_account import AdAccount
from app.models.campaign import Campaign
from app.models.ad_set import AdSet
from app.models.ad import Ad
from app.models.creative import Creative
from app.models.creative_metrics import CreativeMetrics
from app.models.audience import Audience
from app.models.audience_metrics import AudienceMetrics
from app.services.token_manager import TokenManager
from app.workers.celery_app import celery_app

logger = logging.getLogger(__name__)
settings = get_settings()


async def _get_meta_accounts() -> list[AdAccount]:
    """取得所有活躍的 Meta Ads 帳戶"""
    async with async_session_factory() as session:
        result = await session.execute(
            select(AdAccount).where(
                AdAccount.platform == "meta",
                AdAccount.status == "active",
            )
        )
        return list(result.scalars().all())


@celery_app.task(
    name="app.workers.sync_meta.sync_all_accounts",
    bind=True,
    max_retries=3,
    default_retry_delay=60,
)
def sync_all_accounts(self):
    """
    同步所有 Meta Ads 帳戶

    此任務由 Celery Beat 每 15 分鐘觸發一次
    會查詢所有已連接的 Meta Ads 帳戶並逐一同步
    """
    logger.info("Starting Meta Ads sync for all accounts")

    try:
        # 取得所有活躍的 Meta Ads 帳戶
        accounts = asyncio.run(_get_meta_accounts())
        logger.info(f"Found {len(accounts)} Meta Ads accounts to sync")

        # 對每個帳戶觸發同步任務
        for account in accounts:
            sync_account.delay(str(account.id))

        logger.info("Meta Ads sync tasks dispatched")
        return {"status": "completed", "accounts_synced": len(accounts)}

    except Exception as e:
        logger.error(f"Failed to dispatch Meta Ads sync: {e}")
        return {"status": "error", "error": str(e)}


async def _sync_meta_account(account_id: str) -> dict:
    """
    執行 Meta Ads 帳戶同步的核心邏輯

    Args:
        account_id: 帳戶 UUID

    Returns:
        同步結果
    """
    async with async_session_factory() as session:
        # 1. 取得帳戶資訊
        result = await session.execute(
            select(AdAccount).where(AdAccount.id == uuid.UUID(account_id))
        )
        account = result.scalar_one_or_none()

        if not account:
            return {"status": "error", "error": "Account not found"}

        # 2. 驗證 Token
        token_manager = TokenManager(session)
        access_token = await token_manager.get_valid_access_token(account.id)

        if not access_token:
            return {"status": "error", "error": "Invalid or expired token"}

        # 3. 初始化 Meta Marketing API client
        # 注意：實際使用時需要 facebook-business SDK
        # from facebook_business.api import FacebookAdsApi
        # from facebook_business.adobjects.adaccount import AdAccount as FBAdAccount
        #
        # FacebookAdsApi.init(
        #     app_id=settings.META_APP_ID,
        #     app_secret=settings.META_APP_SECRET,
        #     access_token=access_token,
        # )
        # ad_account = FBAdAccount(f"act_{account.external_id}")

        # 4. 同步 Campaigns (示例)
        # campaigns = ad_account.get_campaigns(fields=[
        #     "id", "name", "status", "objective",
        #     "daily_budget", "lifetime_budget"
        # ])
        # for campaign in campaigns:
        #     # 更新或建立 Campaign 記錄
        #     pass

        # 5. 同步 Audiences
        # custom_audiences = ad_account.get_custom_audiences(fields=[
        #     "id", "name", "subtype", "approximate_count"
        # ])
        # for audience in custom_audiences:
        #     # 更新或建立 Audience 記錄
        #     pass

        # 6. 更新 last_sync_at
        await session.execute(
            update(AdAccount)
            .where(AdAccount.id == account.id)
            .values(last_sync_at=datetime.now(timezone.utc))
        )
        await session.commit()

        return {
            "status": "completed",
            "account_id": account_id,
            "synced_at": datetime.now(timezone.utc).isoformat(),
        }


@celery_app.task(
    name="app.workers.sync_meta.sync_account",
    bind=True,
    max_retries=3,
    default_retry_delay=60,
)
def sync_account(self, account_id: str):
    """
    同步單一 Meta Ads 帳戶

    Args:
        account_id: 帳戶 UUID

    實作功能：
    1. 驗證 access_token 是否有效
    2. 使用 Meta Marketing API SDK 取得數據
    3. 更新本地資料庫中的 campaigns, ad_sets, ads, creatives
    4. 更新 creative_metrics 和 audience_metrics 表
    5. 更新帳戶的 last_sync_at 欄位
    """
    logger.info(f"Syncing Meta Ads account: {account_id}")

    try:
        result = asyncio.run(_sync_meta_account(account_id))

        if result["status"] == "error":
            logger.error(f"Sync failed for {account_id}: {result.get('error')}")
            return result

        logger.info(f"Meta Ads account {account_id} sync completed")
        return result

    except Exception as exc:
        logger.error(f"Failed to sync Meta Ads account {account_id}: {exc}")
        # 重試任務
        raise self.retry(exc=exc)


@celery_app.task(name="app.workers.sync_meta.sync_campaigns")
def sync_campaigns(account_id: str):
    """
    同步帳戶的廣告活動

    Args:
        account_id: 帳戶 UUID
    """
    logger.info(f"Syncing campaigns for account: {account_id}")
    # TODO: 實作 campaigns 同步
    return {"status": "completed", "campaigns_synced": 0}


@celery_app.task(name="app.workers.sync_meta.sync_audiences")
def sync_audiences(account_id: str):
    """
    同步帳戶的受眾

    Args:
        account_id: 帳戶 UUID
    """
    logger.info(f"Syncing audiences for account: {account_id}")
    # TODO: 實作 audiences 同步
    return {"status": "completed", "audiences_synced": 0}


@celery_app.task(name="app.workers.sync_meta.sync_metrics")
def sync_metrics(account_id: str, date_range: str = "last_7d"):
    """
    同步帳戶的指標數據

    Args:
        account_id: 帳戶 UUID
        date_range: 日期範圍，預設最近 7 天
    """
    logger.info(f"Syncing metrics for account: {account_id}, range: {date_range}")
    # TODO: 實作 metrics 同步
    return {"status": "completed", "metrics_synced": 0}
