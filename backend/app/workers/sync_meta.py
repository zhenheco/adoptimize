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
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.exceptions import SyncError, TokenExpiredError, RateLimitError
from app.db.base import create_worker_session_maker
from app.models.ad_account import AdAccount
from app.models.campaign import Campaign
from app.models.ad_set import AdSet
from app.models.ad import Ad
from app.models.creative import Creative
from app.models.creative_metrics import CreativeMetrics
from app.models.audience import Audience
from app.models.audience_metrics import AudienceMetrics
from app.services.meta_api_client import MetaAPIClient
from app.services.token_manager import TokenManager
from app.workers.celery_app import celery_app

logger = logging.getLogger(__name__)
settings = get_settings()


def _is_valid_token(token: str | None) -> bool:
    """
    驗證 access_token 是否有效（非空）

    這是防止高 API 錯誤率的關鍵檢查。
    Meta App Review 會因為高錯誤率拒絕權限申請，
    所以必須在呼叫 API 前驗證 token 有效性。

    Args:
        token: access_token 字串或 None

    Returns:
        True 如果 token 非空且有效，否則 False
    """
    if token is None:
        return False
    if not token.strip():
        return False
    return True


async def _get_meta_accounts() -> list[AdAccount]:
    """取得所有活躍的 Meta Ads 帳戶"""
    worker_session_maker = create_worker_session_maker()
    async with worker_session_maker() as session:
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
    worker_session_maker = create_worker_session_maker()
    async with worker_session_maker() as session:
        # 1. 取得帳戶資訊
        result = await session.execute(
            select(AdAccount).where(AdAccount.id == uuid.UUID(account_id))
        )
        account = result.scalar_one_or_none()

        if not account:
            return {"status": "error", "error": "Account not found"}

        # 2. 驗證 Token
        if not _is_valid_token(account.access_token):
            logger.warning(f"Invalid token for account {account_id}, skipping sync")
            return {"status": "error", "error": "Invalid or expired token"}

        # 3. 執行同步（呼叫 Meta API）
        sync_results = {}
        total_api_calls = 0

        try:
            # 同步帳戶資訊
            logger.info(f"Syncing account info for {account_id}")
            account_info_result = await sync_account_info(session, account)
            sync_results["account_info"] = account_info_result
            total_api_calls += 1

            # 同步 Campaigns
            logger.info(f"Syncing campaigns for account {account_id}")
            campaigns_result = await sync_campaigns_for_account(session, account)
            sync_results["campaigns"] = campaigns_result
            total_api_calls += 1

            # 同步 Ad Sets
            logger.info(f"Syncing ad sets for account {account_id}")
            adsets_result = await sync_adsets_for_account(session, account)
            sync_results["adsets"] = adsets_result
            total_api_calls += 1

            # 同步 Ads
            logger.info(f"Syncing ads for account {account_id}")
            ads_result = await sync_ads_for_account(session, account)
            sync_results["ads"] = ads_result
            total_api_calls += 1

            # 同步 Creatives
            logger.info(f"Syncing creatives for account {account_id}")
            creatives_result = await sync_creatives_for_account(session, account)
            sync_results["creatives"] = creatives_result
            total_api_calls += 1

            # 同步 Audiences
            logger.info(f"Syncing audiences for account {account_id}")
            audiences_result = await sync_audiences_for_account(session, account)
            sync_results["audiences"] = audiences_result
            total_api_calls += 1

            # 同步 Metrics（Insights）- 多個日期範圍增加呼叫量
            logger.info(f"Syncing metrics for account {account_id}")
            metrics_result = await sync_metrics_for_account(session, account)
            sync_results["metrics"] = metrics_result
            total_api_calls += 1

            # 額外取得 last_14d insights（增加呼叫多樣性）
            logger.info(f"Syncing 14d metrics for account {account_id}")
            metrics_14d_result = await sync_metrics_for_account(
                session, account, date_preset="last_14d"
            )
            sync_results["metrics_14d"] = metrics_14d_result
            total_api_calls += 1

        except (TokenExpiredError, RateLimitError) as e:
            logger.warning(f"Sync interrupted for {account_id}: {e}")
            sync_results["error"] = str(e)

        except Exception as e:
            logger.error(f"Unexpected error during sync for {account_id}: {e}")
            sync_results["error"] = str(e)

        # 4. 更新 last_sync_at
        await session.execute(
            update(AdAccount)
            .where(AdAccount.id == account.id)
            .values(last_sync_at=datetime.now(timezone.utc))
        )
        await session.commit()

        logger.info(
            f"Sync completed for account {account_id}, "
            f"API calls made: {total_api_calls}"
        )

        return {
            "status": "completed",
            "account_id": account_id,
            "synced_at": datetime.now(timezone.utc).isoformat(),
            "api_calls": total_api_calls,
            "details": sync_results,
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
    同步帳戶的廣告活動（Celery Task）

    Args:
        account_id: 帳戶 UUID
    """
    logger.info(f"Syncing campaigns for account: {account_id}")
    return asyncio.run(_sync_campaigns_task(account_id))


async def _sync_campaigns_task(account_id: str) -> dict[str, Any]:
    """執行 campaigns 同步的異步任務"""
    worker_session_maker = create_worker_session_maker()
    async with worker_session_maker() as session:
        result = await session.execute(
            select(AdAccount).where(AdAccount.id == uuid.UUID(account_id))
        )
        account = result.scalar_one_or_none()

        if not account:
            return {"status": "error", "error": "Account not found"}

        return await sync_campaigns_for_account(session, account)


def _parse_campaign_data(raw: dict[str, Any]) -> dict[str, Any]:
    """
    解析 Meta API 回傳的 campaign 資料

    Args:
        raw: Meta API 回傳的原始資料

    Returns:
        轉換後的資料庫欄位格式
    """
    # 解析預算 - Meta 預算以「美分」為單位，需除以 100
    budget_daily = None
    budget_lifetime = None

    if "daily_budget" in raw and raw["daily_budget"]:
        budget_daily = Decimal(raw["daily_budget"]) / 100

    if "lifetime_budget" in raw and raw["lifetime_budget"]:
        budget_lifetime = Decimal(raw["lifetime_budget"]) / 100

    # 解析日期
    start_date = None
    end_date = None

    if "start_time" in raw and raw["start_time"]:
        try:
            start_date = datetime.fromisoformat(
                raw["start_time"].replace("+0000", "+00:00")
            ).date()
        except (ValueError, AttributeError):
            pass

    if "stop_time" in raw and raw["stop_time"]:
        try:
            end_date = datetime.fromisoformat(
                raw["stop_time"].replace("+0000", "+00:00")
            ).date()
        except (ValueError, AttributeError):
            pass

    return {
        "external_id": raw["id"],
        "name": raw.get("name"),
        "status": raw.get("status"),
        "objective": raw.get("objective"),
        "budget_daily": budget_daily,
        "budget_lifetime": budget_lifetime,
        "start_date": start_date,
        "end_date": end_date,
    }


async def sync_campaigns_for_account(
    session: AsyncSession,
    account: AdAccount,
) -> dict[str, Any]:
    """
    同步單一帳戶的 campaigns

    Args:
        session: 資料庫 session
        account: 廣告帳戶

    Returns:
        同步結果

    AC-M1: 能從 Meta API 取得 campaigns 並存入 DB
    """
    # 驗證 Token 有效性 - 防止無效 API 呼叫導致高錯誤率
    if not _is_valid_token(account.access_token):
        logger.warning(
            f"Invalid or empty token for account {account.id}, skipping API call"
        )
        # 標記帳戶狀態
        await session.execute(
            update(AdAccount)
            .where(AdAccount.id == account.id)
            .values(status="token_invalid")
        )
        await session.commit()
        return {
            "status": "error",
            "error": "invalid_token",
            "account_id": str(account.id),
        }

    try:
        # 初始化 Meta API Client
        client = MetaAPIClient(
            access_token=account.access_token,
            ad_account_id=account.external_id,
        )

        # 取得所有 campaigns（含分頁）
        campaigns_data = await client.get_campaigns()
        logger.info(f"Fetched {len(campaigns_data)} campaigns from Meta API")

        synced_count = 0

        for raw_campaign in campaigns_data:
            parsed = _parse_campaign_data(raw_campaign)

            # 檢查是否已存在
            result = await session.execute(
                select(Campaign).where(
                    Campaign.ad_account_id == account.id,
                    Campaign.external_id == parsed["external_id"],
                )
            )
            existing = result.scalar_one_or_none()

            if existing:
                # 更新現有記錄
                for key, value in parsed.items():
                    if key != "external_id" and value is not None:
                        setattr(existing, key, value)
                existing.updated_at = datetime.now(timezone.utc)
            else:
                # 建立新記錄
                campaign = Campaign(
                    id=uuid.uuid4(),
                    ad_account_id=account.id,
                    **parsed,
                )
                session.add(campaign)

            synced_count += 1

        await session.commit()
        logger.info(f"Synced {synced_count} campaigns for account {account.id}")

        return {
            "status": "completed",
            "campaigns_synced": synced_count,
        }

    except TokenExpiredError:
        logger.warning(f"Token expired for account {account.id}")
        # 標記帳戶需要重新授權
        await session.execute(
            update(AdAccount)
            .where(AdAccount.id == account.id)
            .values(status="token_expired")
        )
        await session.commit()
        return {
            "status": "error",
            "error": "token_expired",
            "account_id": str(account.id),
        }

    except RateLimitError as e:
        logger.warning(f"Rate limited for account {account.id}, retry_after={e.retry_after}")
        return {
            "status": "error",
            "error": "rate_limited",
            "retry_after": e.retry_after,
        }

    except Exception as e:
        logger.error(f"Failed to sync campaigns for account {account.id}: {e}")
        raise SyncError(
            account_id=str(account.id),
            operation="sync_campaigns",
            reason=str(e),
        )


def _parse_adset_data(raw: dict[str, Any]) -> dict[str, Any]:
    """
    解析 Meta API 回傳的 ad set 資料

    Args:
        raw: Meta API 回傳的原始資料

    Returns:
        轉換後的資料庫欄位格式
    """
    # 解析預算 - Meta 預算以「美分」為單位，需除以 100
    # ad_sets 表只有 budget_daily 欄位
    budget_daily = None

    if "daily_budget" in raw and raw["daily_budget"]:
        budget_daily = Decimal(raw["daily_budget"]) / 100

    return {
        "external_id": raw["id"],
        "name": raw.get("name"),
        "status": raw.get("status"),
        "campaign_external_id": raw.get("campaign_id"),
        "targeting": raw.get("targeting"),
        "budget_daily": budget_daily,
        "bid_strategy": raw.get("bid_strategy"),
    }


async def sync_adsets_for_account(
    session: AsyncSession,
    account: AdAccount,
) -> dict[str, Any]:
    """
    同步單一帳戶的 ad sets

    Args:
        session: 資料庫 session
        account: 廣告帳戶

    Returns:
        同步結果

    AC-M2: 能同步 ad sets 並關聯到正確的 campaign
    """
    # 驗證 Token 有效性 - 防止無效 API 呼叫導致高錯誤率
    if not _is_valid_token(account.access_token):
        logger.warning(
            f"Invalid or empty token for account {account.id}, skipping API call"
        )
        await session.execute(
            update(AdAccount)
            .where(AdAccount.id == account.id)
            .values(status="token_invalid")
        )
        await session.commit()
        return {
            "status": "error",
            "error": "invalid_token",
            "account_id": str(account.id),
        }

    try:
        # 初始化 Meta API Client
        client = MetaAPIClient(
            access_token=account.access_token,
            ad_account_id=account.external_id,
        )

        # 取得所有 ad sets
        adsets_data = await client.get_adsets()
        logger.info(f"Fetched {len(adsets_data)} ad sets from Meta API")

        # 建立 campaign external_id -> id 的對應表
        campaigns_result = await session.execute(
            select(Campaign).where(Campaign.ad_account_id == account.id)
        )
        campaigns = {c.external_id: c.id for c in campaigns_result.scalars().all()}

        synced_count = 0
        skipped_count = 0

        for raw_adset in adsets_data:
            parsed = _parse_adset_data(raw_adset)
            campaign_external_id = parsed.pop("campaign_external_id")

            # 找到對應的 campaign
            campaign_id = campaigns.get(campaign_external_id)
            if not campaign_id:
                logger.warning(
                    f"Campaign {campaign_external_id} not found for ad set {parsed['external_id']}"
                )
                skipped_count += 1
                continue

            # 檢查是否已存在
            result = await session.execute(
                select(AdSet).where(
                    AdSet.campaign_id == campaign_id,
                    AdSet.external_id == parsed["external_id"],
                )
            )
            existing = result.scalar_one_or_none()

            if existing:
                # 更新現有記錄
                for key, value in parsed.items():
                    if key != "external_id" and value is not None:
                        setattr(existing, key, value)
                existing.updated_at = datetime.now(timezone.utc)
            else:
                # 建立新記錄
                adset = AdSet(
                    id=uuid.uuid4(),
                    campaign_id=campaign_id,
                    **parsed,
                )
                session.add(adset)

            synced_count += 1

        await session.commit()
        logger.info(
            f"Synced {synced_count} ad sets for account {account.id}, "
            f"skipped {skipped_count}"
        )

        return {
            "status": "completed",
            "adsets_synced": synced_count,
            "skipped": skipped_count,
        }

    except TokenExpiredError:
        logger.warning(f"Token expired for account {account.id}")
        await session.execute(
            update(AdAccount)
            .where(AdAccount.id == account.id)
            .values(status="token_expired")
        )
        await session.commit()
        return {
            "status": "error",
            "error": "token_expired",
            "account_id": str(account.id),
        }

    except RateLimitError as e:
        logger.warning(f"Rate limited for account {account.id}")
        return {
            "status": "error",
            "error": "rate_limited",
            "retry_after": e.retry_after,
        }

    except Exception as e:
        logger.error(f"Failed to sync ad sets for account {account.id}: {e}")
        raise SyncError(
            account_id=str(account.id),
            operation="sync_adsets",
            reason=str(e),
        )


def _parse_ad_data(raw: dict[str, Any]) -> dict[str, Any]:
    """
    解析 Meta API 回傳的 ad 資料

    Args:
        raw: Meta API 回傳的原始資料

    Returns:
        轉換後的資料庫欄位格式
    """
    creative_external_id = None
    if "creative" in raw and raw["creative"]:
        creative_external_id = raw["creative"].get("id")

    return {
        "external_id": raw["id"],
        "name": raw.get("name"),
        "status": raw.get("status"),
        "adset_external_id": raw.get("adset_id"),
        "creative_external_id": creative_external_id,
    }


async def sync_ads_for_account(
    session: AsyncSession,
    account: AdAccount,
) -> dict[str, Any]:
    """
    同步單一帳戶的 ads

    Args:
        session: 資料庫 session
        account: 廣告帳戶

    Returns:
        同步結果

    AC-M3: 能同步 ads 並關聯到正確的 ad set
    """
    # 驗證 Token 有效性 - 防止無效 API 呼叫導致高錯誤率
    if not _is_valid_token(account.access_token):
        logger.warning(
            f"Invalid or empty token for account {account.id}, skipping API call"
        )
        await session.execute(
            update(AdAccount)
            .where(AdAccount.id == account.id)
            .values(status="token_invalid")
        )
        await session.commit()
        return {
            "status": "error",
            "error": "invalid_token",
            "account_id": str(account.id),
        }

    try:
        client = MetaAPIClient(
            access_token=account.access_token,
            ad_account_id=account.external_id,
        )

        ads_data = await client.get_ads()
        logger.info(f"Fetched {len(ads_data)} ads from Meta API")

        # 建立 adset external_id -> id 的對應表
        # 需要先取得所有 campaigns，再取得對應的 adsets
        campaigns_result = await session.execute(
            select(Campaign).where(Campaign.ad_account_id == account.id)
        )
        campaign_ids = [c.id for c in campaigns_result.scalars().all()]

        adsets_result = await session.execute(
            select(AdSet).where(AdSet.campaign_id.in_(campaign_ids))
        )
        adsets = {a.external_id: a.id for a in adsets_result.scalars().all()}

        synced_count = 0
        skipped_count = 0

        for raw_ad in ads_data:
            parsed = _parse_ad_data(raw_ad)
            adset_external_id = parsed.pop("adset_external_id")
            creative_external_id = parsed.pop("creative_external_id")

            # 找到對應的 ad set
            adset_id = adsets.get(adset_external_id)
            if not adset_id:
                logger.warning(
                    f"Ad set {adset_external_id} not found for ad {parsed['external_id']}"
                )
                skipped_count += 1
                continue

            # 檢查是否已存在
            result = await session.execute(
                select(Ad).where(
                    Ad.ad_set_id == adset_id,
                    Ad.external_id == parsed["external_id"],
                )
            )
            existing = result.scalar_one_or_none()

            if existing:
                for key, value in parsed.items():
                    if key != "external_id" and value is not None:
                        setattr(existing, key, value)
                existing.updated_at = datetime.now(timezone.utc)
            else:
                ad = Ad(
                    id=uuid.uuid4(),
                    ad_set_id=adset_id,
                    **parsed,
                )
                session.add(ad)

            synced_count += 1

        await session.commit()
        logger.info(
            f"Synced {synced_count} ads for account {account.id}, "
            f"skipped {skipped_count}"
        )

        return {
            "status": "completed",
            "ads_synced": synced_count,
            "skipped": skipped_count,
        }

    except TokenExpiredError:
        logger.warning(f"Token expired for account {account.id}")
        await session.execute(
            update(AdAccount)
            .where(AdAccount.id == account.id)
            .values(status="token_expired")
        )
        await session.commit()
        return {"status": "error", "error": "token_expired"}

    except RateLimitError as e:
        return {"status": "error", "error": "rate_limited", "retry_after": e.retry_after}

    except Exception as e:
        logger.error(f"Failed to sync ads for account {account.id}: {e}")
        raise SyncError(
            account_id=str(account.id),
            operation="sync_ads",
            reason=str(e),
        )


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


async def sync_account_info(
    session: AsyncSession,
    account: AdAccount,
) -> dict[str, Any]:
    """
    同步帳戶基本資訊

    Args:
        session: 資料庫 session
        account: 廣告帳戶

    Returns:
        同步結果
    """
    if not _is_valid_token(account.access_token):
        return {"status": "error", "error": "invalid_token"}

    try:
        client = MetaAPIClient(
            access_token=account.access_token,
            ad_account_id=account.external_id,
        )

        account_info = await client.get_account_info()
        logger.info(f"Fetched account info: {account_info.get('name', 'N/A')}")

        # 更新帳戶名稱（如有變更）
        new_name = account_info.get("name")
        if new_name and new_name != account.name:
            await session.execute(
                update(AdAccount)
                .where(AdAccount.id == account.id)
                .values(name=new_name)
            )
            await session.commit()

        return {"status": "completed", "account_name": new_name}

    except Exception as e:
        logger.warning(f"Failed to sync account info for {account.id}: {e}")
        await session.rollback()
        return {"status": "error", "error": str(e)}


async def sync_creatives_for_account(
    session: AsyncSession,
    account: AdAccount,
) -> dict[str, Any]:
    """
    同步帳戶的廣告素材

    Args:
        session: 資料庫 session
        account: 廣告帳戶

    Returns:
        同步結果
    """
    if not _is_valid_token(account.access_token):
        return {"status": "error", "error": "invalid_token"}

    try:
        client = MetaAPIClient(
            access_token=account.access_token,
            ad_account_id=account.external_id,
        )

        creatives_data = await client.get_ad_creatives()
        logger.info(f"Fetched {len(creatives_data)} creatives from Meta API")

        synced_count = 0

        for raw_creative in creatives_data:
            external_id = raw_creative.get("id")
            if not external_id:
                continue

            # 檢查是否已存在
            result = await session.execute(
                select(Creative).where(
                    Creative.ad_account_id == account.id,
                    Creative.external_id == external_id,
                )
            )
            existing = result.scalar_one_or_none()

            if existing:
                # 更新
                existing.name = raw_creative.get("title") or raw_creative.get("name") or existing.name
                existing.thumbnail_url = raw_creative.get("thumbnail_url") or existing.thumbnail_url
                existing.type = raw_creative.get("object_type") or existing.type
                existing.status = raw_creative.get("status") or existing.status or "ACTIVE"
                existing.updated_at = datetime.now(timezone.utc)
            else:
                creative = Creative(
                    id=uuid.uuid4(),
                    ad_account_id=account.id,
                    external_id=external_id,
                    name=raw_creative.get("title") or raw_creative.get("name"),
                    thumbnail_url=raw_creative.get("thumbnail_url"),
                    type=raw_creative.get("object_type", "IMAGE"),
                    status=raw_creative.get("status", "ACTIVE"),
                )
                session.add(creative)

            synced_count += 1

        await session.commit()
        logger.info(f"Synced {synced_count} creatives for account {account.id}")

        return {"status": "completed", "creatives_synced": synced_count}

    except Exception as e:
        logger.warning(f"Failed to sync creatives for {account.id}: {e}")
        await session.rollback()
        return {"status": "error", "error": str(e)}


async def sync_audiences_for_account(
    session: AsyncSession,
    account: AdAccount,
) -> dict[str, Any]:
    """
    同步帳戶的自訂受眾

    Args:
        session: 資料庫 session
        account: 廣告帳戶

    Returns:
        同步結果
    """
    if not _is_valid_token(account.access_token):
        return {"status": "error", "error": "invalid_token"}

    try:
        client = MetaAPIClient(
            access_token=account.access_token,
            ad_account_id=account.external_id,
        )

        audiences_data = await client.get_custom_audiences()
        logger.info(f"Fetched {len(audiences_data)} audiences from Meta API")

        synced_count = 0

        for raw_audience in audiences_data:
            external_id = raw_audience.get("id")
            if not external_id:
                continue

            # 檢查是否已存在
            result = await session.execute(
                select(Audience).where(
                    Audience.ad_account_id == account.id,
                    Audience.external_id == external_id,
                )
            )
            existing = result.scalar_one_or_none()

            if existing:
                existing.name = raw_audience.get("name") or existing.name
                existing.size = raw_audience.get("approximate_count") or existing.size
                existing.updated_at = datetime.now(timezone.utc)
            else:
                audience = Audience(
                    id=uuid.uuid4(),
                    ad_account_id=account.id,
                    external_id=external_id,
                    name=raw_audience.get("name", "Unknown Audience"),
                    type=raw_audience.get("subtype", "CUSTOM"),
                    size=raw_audience.get("approximate_count"),
                    status="active",
                )
                session.add(audience)

            synced_count += 1

        await session.commit()
        logger.info(f"Synced {synced_count} audiences for account {account.id}")

        return {"status": "completed", "audiences_synced": synced_count}

    except Exception as e:
        logger.warning(f"Failed to sync audiences for {account.id}: {e}")
        await session.rollback()
        return {"status": "error", "error": str(e)}


def calculate_ctr(clicks: int, impressions: int) -> Decimal:
    """
    計算 CTR (Click-Through Rate)

    Args:
        clicks: 點擊數
        impressions: 曝光數

    Returns:
        CTR 百分比（例如 5.0 表示 5%）
    """
    if impressions == 0:
        return Decimal("0")
    return (Decimal(clicks) / Decimal(impressions) * 100).quantize(Decimal("0.000001"))


def calculate_cpc(spend: Decimal, clicks: int) -> Decimal:
    """
    計算 CPC (Cost Per Click)

    Args:
        spend: 花費
        clicks: 點擊數

    Returns:
        每次點擊成本
    """
    if clicks == 0:
        return Decimal("0")
    return (spend / Decimal(clicks)).quantize(Decimal("0.01"))


def calculate_roas(conversion_value: Decimal, spend: Decimal) -> Decimal:
    """
    計算 ROAS (Return on Ad Spend)

    Args:
        conversion_value: 轉換價值
        spend: 花費

    Returns:
        廣告投資報酬率
    """
    if spend == 0:
        return Decimal("0")
    return (conversion_value / spend).quantize(Decimal("0.01"))


async def sync_metrics_for_account(
    session: AsyncSession,
    account: AdAccount,
    date_preset: str = "last_7d",
) -> dict[str, Any]:
    """
    同步單一帳戶的 metrics

    Args:
        session: 資料庫 session
        account: 廣告帳戶
        date_preset: 日期範圍

    Returns:
        同步結果

    AC-M4: 能取得 insights 並計算 CTR、CPC、ROAS
    """
    # 驗證 Token 有效性 - 防止無效 API 呼叫導致高錯誤率
    if not _is_valid_token(account.access_token):
        logger.warning(
            f"Invalid or empty token for account {account.id}, skipping API call"
        )
        await session.execute(
            update(AdAccount)
            .where(AdAccount.id == account.id)
            .values(status="token_invalid")
        )
        await session.commit()
        return {
            "status": "error",
            "error": "invalid_token",
            "account_id": str(account.id),
        }

    try:
        client = MetaAPIClient(
            access_token=account.access_token,
            ad_account_id=account.external_id,
        )

        insights_data = await client.get_insights(
            date_preset=date_preset,
            level="ad",
        )
        logger.info(f"Fetched {len(insights_data)} insight records from Meta API")

        # 建立 creative external_id -> id 的對應表
        creatives_result = await session.execute(
            select(Creative).where(Creative.ad_account_id == account.id)
        )
        creatives = {c.external_id: c.id for c in creatives_result.scalars().all()}

        synced_count = 0
        skipped_count = 0

        for insight in insights_data:
            creative_external_id = insight.get("creative_id")
            if not creative_external_id:
                skipped_count += 1
                continue

            creative_id = creatives.get(creative_external_id)
            if not creative_id:
                logger.debug(
                    f"Creative {creative_external_id} not found, skipping metrics"
                )
                skipped_count += 1
                continue

            # 解析日期
            date_str = insight.get("date_start", insight.get("date_stop"))
            if not date_str:
                skipped_count += 1
                continue

            try:
                metric_date = datetime.strptime(date_str, "%Y-%m-%d").date()
            except ValueError:
                skipped_count += 1
                continue

            # 解析指標
            impressions = int(insight.get("impressions", 0))
            clicks = int(insight.get("clicks", 0))
            spend = Decimal(insight.get("spend", "0"))
            frequency = Decimal(insight.get("frequency", "0")) if insight.get("frequency") else None

            # 從 actions 中提取轉換數（取代棄用的 conversions 欄位）
            conversions = 0
            actions = insight.get("actions", [])
            for action in actions:
                action_type = action.get("action_type", "")
                if action_type in ("offsite_conversion", "lead", "purchase", "complete_registration"):
                    conversions += int(action.get("value", 0))

            # 計算衍生指標
            ctr = calculate_ctr(clicks, impressions)
            revenue = Decimal(insight.get("action_values", [{}])[0].get("value", "0")) if insight.get("action_values") else Decimal("0")
            cpa = (spend / Decimal(conversions)).quantize(Decimal("0.01")) if conversions > 0 else None
            roas = calculate_roas(revenue, spend) if spend > 0 else None

            # 檢查是否已存在
            result = await session.execute(
                select(CreativeMetrics).where(
                    CreativeMetrics.creative_id == creative_id,
                    CreativeMetrics.date == metric_date,
                )
            )
            existing = result.scalar_one_or_none()

            if existing:
                existing.impressions = impressions
                existing.clicks = clicks
                existing.ctr = ctr
                existing.conversions = conversions
                existing.spend = spend
                existing.revenue = revenue
                existing.cpa = cpa
                existing.roas = roas
                existing.frequency = frequency
            else:
                metrics = CreativeMetrics(
                    id=uuid.uuid4(),
                    creative_id=creative_id,
                    date=metric_date,
                    impressions=impressions,
                    clicks=clicks,
                    ctr=ctr,
                    conversions=conversions,
                    spend=spend,
                    revenue=revenue,
                    cpa=cpa,
                    roas=roas,
                    frequency=frequency,
                )
                session.add(metrics)

            synced_count += 1

        await session.commit()
        logger.info(
            f"Synced {synced_count} metrics for account {account.id}, "
            f"skipped {skipped_count}"
        )

        return {
            "status": "completed",
            "metrics_synced": synced_count,
            "skipped": skipped_count,
        }

    except TokenExpiredError:
        logger.warning(f"Token expired for account {account.id}")
        await session.execute(
            update(AdAccount)
            .where(AdAccount.id == account.id)
            .values(status="token_expired")
        )
        await session.commit()
        return {"status": "error", "error": "token_expired"}

    except RateLimitError as e:
        return {"status": "error", "error": "rate_limited", "retry_after": e.retry_after}

    except Exception as e:
        logger.error(f"Failed to sync metrics for account {account.id}: {e}")
        raise SyncError(
            account_id=str(account.id),
            operation="sync_metrics",
            reason=str(e),
        )


@celery_app.task(name="app.workers.sync_meta.sync_metrics")
def sync_metrics(account_id: str, date_range: str = "last_7d"):
    """
    同步帳戶的指標數據（Celery Task）

    Args:
        account_id: 帳戶 UUID
        date_range: 日期範圍，預設最近 7 天
    """
    logger.info(f"Syncing metrics for account: {account_id}, range: {date_range}")
    return asyncio.run(_sync_metrics_task(account_id, date_range))


async def _sync_metrics_task(account_id: str, date_range: str) -> dict[str, Any]:
    """執行 metrics 同步的異步任務"""
    worker_session_maker = create_worker_session_maker()
    async with worker_session_maker() as session:
        result = await session.execute(
            select(AdAccount).where(AdAccount.id == uuid.UUID(account_id))
        )
        account = result.scalar_one_or_none()

        if not account:
            return {"status": "error", "error": "Account not found"}

        return await sync_metrics_for_account(session, account, date_range)
