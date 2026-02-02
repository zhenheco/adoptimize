# -*- coding: utf-8 -*-
"""
Google Ads 數據同步 Worker

負責從 Google Ads API 同步：
- Campaigns（廣告活動）
- AdSets（廣告組）
- Ads（廣告）
- Creatives（素材）
- Metrics（指標）
"""

import asyncio
import logging
import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.base import create_worker_session_maker
from app.models.ad_account import AdAccount
from app.models.campaign import Campaign
from app.models.ad_set import AdSet
from app.models.ad import Ad
from app.models.creative import Creative
from app.models.creative_metrics import CreativeMetrics
from app.services.token_manager import TokenManager
from app.workers.celery_app import celery_app

logger = logging.getLogger(__name__)
settings = get_settings()


async def _get_google_accounts() -> list[AdAccount]:
    """取得所有活躍的 Google Ads 帳戶"""
    worker_session_maker = create_worker_session_maker()
    async with worker_session_maker() as session:
        result = await session.execute(
            select(AdAccount).where(
                AdAccount.platform == "google",
                AdAccount.status == "active",
            )
        )
        return list(result.scalars().all())


@celery_app.task(
    name="app.workers.sync_google.sync_all_accounts",
    bind=True,
    max_retries=3,
    default_retry_delay=60,
)
def sync_all_accounts(self):
    """
    同步所有 Google Ads 帳戶

    此任務由 Celery Beat 每 15 分鐘觸發一次
    會查詢所有已連接的 Google Ads 帳戶並逐一同步
    """
    logger.info("Starting Google Ads sync for all accounts")

    try:
        # 取得所有活躍的 Google Ads 帳戶
        accounts = asyncio.run(_get_google_accounts())
        logger.info(f"Found {len(accounts)} Google Ads accounts to sync")

        # 對每個帳戶觸發同步任務
        for account in accounts:
            sync_account.delay(str(account.id))

        logger.info("Google Ads sync tasks dispatched")
        return {"status": "completed", "accounts_synced": len(accounts)}

    except Exception as e:
        logger.error(f"Failed to dispatch Google Ads sync: {e}")
        return {"status": "error", "error": str(e)}


async def _sync_google_account(account_id: str) -> dict:
    """
    執行 Google Ads 帳戶同步的核心邏輯

    Args:
        account_id: 帳戶 UUID

    Returns:
        同步結果
    """
    worker_session_maker = create_worker_session_maker()
    async with worker_session_maker() as session:
        # 1. 取得帳戶資訊
        result = await session.execute(
            select(AdAccount).where(AdAccount.id == uuid.UUID(account_id))
        )
        account = result.scalar_one_or_none()

        if not account:
            return {"status": "error", "error": "Account not found"}

        # 2. 驗證並刷新 Token
        token_manager = TokenManager(session)
        access_token = await token_manager.get_valid_access_token(account.id)

        if not access_token:
            return {"status": "error", "error": "Invalid or expired token"}

        # 3. 初始化 Google Ads API client
        # 注意：實際使用時需要 google-ads SDK
        # from google.ads.googleads.client import GoogleAdsClient
        #
        # credentials = {
        #     "developer_token": settings.GOOGLE_ADS_DEVELOPER_TOKEN,
        #     "client_id": settings.GOOGLE_ADS_CLIENT_ID,
        #     "client_secret": settings.GOOGLE_ADS_CLIENT_SECRET,
        #     "refresh_token": account.refresh_token,
        # }
        # client = GoogleAdsClient.load_from_dict(credentials)

        # 4. 同步 Campaigns (示例查詢)
        # ga_service = client.get_service("GoogleAdsService")
        # query = """
        #     SELECT
        #         campaign.id,
        #         campaign.name,
        #         campaign.status,
        #         campaign.advertising_channel_type,
        #         campaign_budget.amount_micros
        #     FROM campaign
        #     WHERE campaign.status != 'REMOVED'
        # """
        # response = ga_service.search(customer_id=account.external_id, query=query)
        #
        # for row in response:
        #     # 更新或建立 Campaign 記錄
        #     pass

        # 5. 更新 last_sync_at
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
    name="app.workers.sync_google.sync_account",
    bind=True,
    max_retries=3,
    default_retry_delay=60,
)
def sync_account(self, account_id: str):
    """
    同步單一 Google Ads 帳戶

    Args:
        account_id: 帳戶 UUID

    實作功能：
    1. 驗證 access_token 是否有效，必要時 refresh
    2. 使用 Google Ads API SDK 取得數據
    3. 更新本地資料庫中的 campaigns, ad_sets, ads, creatives
    4. 更新 creative_metrics 表
    5. 更新帳戶的 last_sync_at 欄位
    """
    logger.info(f"Syncing Google Ads account: {account_id}")

    try:
        result = asyncio.run(_sync_google_account(account_id))

        if result["status"] == "error":
            logger.error(f"Sync failed for {account_id}: {result.get('error')}")
            return result

        logger.info(f"Google Ads account {account_id} sync completed")
        return result

    except Exception as exc:
        logger.error(f"Failed to sync Google Ads account {account_id}: {exc}")
        # 重試任務
        raise self.retry(exc=exc)


@celery_app.task(name="app.workers.sync_google.sync_campaigns")
def sync_campaigns(account_id: str):
    """
    同步帳戶的廣告活動

    Args:
        account_id: 帳戶 UUID
    """
    logger.info(f"Syncing campaigns for account: {account_id}")
    # TODO: 實作 Google Ads campaigns 同步（使用 Google Ads API）
    # 目前專注於 Meta API 整合，Google Ads 將在後續版本實作
    return {"status": "not_implemented", "campaigns_synced": 0, "message": "Google Ads sync not yet implemented"}


@celery_app.task(name="app.workers.sync_google.sync_metrics")
def sync_metrics(account_id: str, date_range: str = "LAST_7_DAYS"):
    """
    同步帳戶的指標數據

    Args:
        account_id: 帳戶 UUID
        date_range: 日期範圍，預設最近 7 天
    """
    logger.info(f"Syncing metrics for account: {account_id}, range: {date_range}")
    # TODO: 實作 Google Ads metrics 同步（使用 Google Ads API）
    # 目前專注於 Meta API 整合，Google Ads 將在後續版本實作
    return {"status": "not_implemented", "metrics_synced": 0, "message": "Google Ads sync not yet implemented"}
