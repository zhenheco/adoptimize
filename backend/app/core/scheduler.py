# -*- coding: utf-8 -*-
"""
APScheduler 定時任務管理

排程：
- 每 10 分鐘：Meta Ads 數據同步
- 每 15 分鐘：Google Ads 數據同步
- 每 15 分鐘：LinkedIn Ads 數據同步
- 每 15 分鐘：Pinterest Ads 數據同步
- 每 15 分鐘：TikTok Ads 數據同步
- 每 15 分鐘：Reddit Ads 數據同步
- 每 15 分鐘：自動駕駛規則檢查
- 每天 21:00：每日摘要
- 每週一 09:00：週報生成
- 每月 1 號 09:00：月報生成
"""

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

from app.core.logger import get_logger

logger = get_logger(__name__)
scheduler = AsyncIOScheduler()


async def meta_sync_job():
    """
    Meta Ads API 數據同步（每 10 分鐘）

    從不穩定的 Celery Worker 遷移到 APScheduler，
    確保同步任務隨 app process 穩定運行。
    """
    from app.workers.sync_meta import _get_meta_accounts, _sync_meta_account

    try:
        accounts = await _get_meta_accounts()
        logger.info(f"Meta sync: found {len(accounts)} accounts")
        total_calls = 0
        for account in accounts:
            try:
                result = await _sync_meta_account(str(account.id))
                calls = result.get("api_calls", 0)
                total_calls += calls
                logger.info(
                    f"Meta sync completed for account {account.id}: "
                    f"{calls} API calls, status={result.get('status')}"
                )
            except Exception as e:
                logger.error(f"Meta sync failed for account {account.id}: {e}")
        logger.info(f"Meta sync dispatch done: {total_calls} total API calls")
    except Exception as e:
        logger.error(f"Meta sync dispatch failed: {e}")


async def linkedin_sync_job():
    """
    LinkedIn Ads API 數據同步（每 15 分鐘）

    同步 LinkedIn Advertising API 數據到統一模型。
    使用 per-platform mock override（USE_MOCK_LINKEDIN_API）。
    """
    from app.workers.sync_linkedin import _get_linkedin_accounts, _sync_linkedin_account

    try:
        accounts = await _get_linkedin_accounts()
        logger.info(f"LinkedIn sync: found {len(accounts)} accounts")
        total_calls = 0
        for account in accounts:
            try:
                result = await _sync_linkedin_account(str(account.id))
                calls = result.get("api_calls", 0)
                total_calls += calls
                logger.info(
                    f"LinkedIn sync completed for account {account.id}: "
                    f"{calls} API calls, status={result.get('status')}"
                )
            except Exception as e:
                logger.error(f"LinkedIn sync failed for account {account.id}: {e}")
        logger.info(f"LinkedIn sync dispatch done: {total_calls} total API calls")
    except Exception as e:
        logger.error(f"LinkedIn sync dispatch failed: {e}")


async def google_sync_job():
    """
    Google Ads API 數據同步（每 15 分鐘）

    同步 Google Ads API 數據到統一模型。
    使用 per-platform mock override（USE_MOCK_GOOGLE_ADS_API）。
    """
    from app.workers.sync_google import _get_google_accounts, _sync_google_account

    try:
        accounts = await _get_google_accounts()
        logger.info(f"Google Ads sync: found {len(accounts)} accounts")
        total_calls = 0
        for account in accounts:
            try:
                result = await _sync_google_account(str(account.id))
                calls = result.get("api_calls", 0)
                total_calls += calls
                logger.info(
                    f"Google Ads sync completed for account {account.id}: "
                    f"{calls} API calls, status={result.get('status')}"
                )
            except Exception as e:
                logger.error(f"Google Ads sync failed for account {account.id}: {e}")
        logger.info(f"Google Ads sync dispatch done: {total_calls} total API calls")
    except Exception as e:
        logger.error(f"Google Ads sync dispatch failed: {e}")


async def pinterest_sync_job():
    """
    Pinterest Ads API 數據同步（每 15 分鐘）

    同步 Pinterest Ads API v5 數據到統一模型。
    使用 per-platform mock override（USE_MOCK_PINTEREST_API）。
    """
    from app.workers.sync_pinterest import _get_pinterest_accounts, _sync_pinterest_account

    try:
        accounts = await _get_pinterest_accounts()
        logger.info(f"Pinterest sync: found {len(accounts)} accounts")
        total_calls = 0
        for account in accounts:
            try:
                result = await _sync_pinterest_account(str(account.id))
                calls = result.get("api_calls", 0)
                total_calls += calls
                logger.info(
                    f"Pinterest sync completed for account {account.id}: "
                    f"{calls} API calls, status={result.get('status')}"
                )
            except Exception as e:
                logger.error(f"Pinterest sync failed for account {account.id}: {e}")
        logger.info(f"Pinterest sync dispatch done: {total_calls} total API calls")
    except Exception as e:
        logger.error(f"Pinterest sync dispatch failed: {e}")


async def tiktok_sync_job():
    """
    TikTok Ads API 數據同步（每 15 分鐘）

    同步 TikTok Marketing API 數據到統一模型。
    使用 per-platform mock override（USE_MOCK_TIKTOK_API）。
    """
    from app.workers.sync_tiktok import _get_tiktok_accounts, _sync_tiktok_account

    try:
        accounts = await _get_tiktok_accounts()
        logger.info(f"TikTok sync: found {len(accounts)} accounts")
        total_calls = 0
        for account in accounts:
            try:
                result = await _sync_tiktok_account(str(account.id))
                calls = result.get("api_calls", 0)
                total_calls += calls
                logger.info(
                    f"TikTok sync completed for account {account.id}: "
                    f"{calls} API calls, status={result.get('status')}"
                )
            except Exception as e:
                logger.error(f"TikTok sync failed for account {account.id}: {e}")
        logger.info(f"TikTok sync dispatch done: {total_calls} total API calls")
    except Exception as e:
        logger.error(f"TikTok sync dispatch failed: {e}")


async def reddit_sync_job():
    """
    Reddit Ads API 數據同步（每 15 分鐘）

    同步 Reddit Ads API 數據到統一模型。
    使用 per-platform mock override（USE_MOCK_REDDIT_API）。
    """
    from app.workers.sync_reddit import _get_reddit_accounts, _sync_reddit_account

    try:
        accounts = await _get_reddit_accounts()
        logger.info(f"Reddit sync: found {len(accounts)} accounts")
        total_calls = 0
        for account in accounts:
            try:
                result = await _sync_reddit_account(str(account.id))
                calls = result.get("api_calls", 0)
                total_calls += calls
                logger.info(
                    f"Reddit sync completed for account {account.id}: "
                    f"{calls} API calls, status={result.get('status')}"
                )
            except Exception as e:
                logger.error(f"Reddit sync failed for account {account.id}: {e}")
        logger.info(f"Reddit sync dispatch done: {total_calls} total API calls")
    except Exception as e:
        logger.error(f"Reddit sync dispatch failed: {e}")



async def autopilot_check_job():
    """
    自動駕駛規則檢查任務

    每 15 分鐘執行一次，檢查所有啟用自動駕駛的帳戶
    """
    from app.services.autopilot_engine import AutopilotEngine

    engine = AutopilotEngine()
    await engine.run_all_accounts()


async def daily_summary_job():
    """
    每日摘要任務

    每天 21:00 執行，生成當日摘要報告
    """
    from app.services.report_generator import ReportGenerator

    generator = ReportGenerator()
    await generator.generate_daily_summaries()


async def weekly_report_job():
    """
    週報生成任務

    每週一 09:00 執行，生成上週報告
    """
    from app.services.report_generator import ReportGenerator

    generator = ReportGenerator()
    await generator.generate_weekly_reports()


async def monthly_report_job():
    """
    月報生成任務

    每月 1 號 09:00 執行，生成上月報告
    """
    from app.services.report_generator import ReportGenerator

    generator = ReportGenerator()
    await generator.generate_monthly_reports()


def setup_scheduler():
    """
    設定並啟動排程器
    """
    # 每 15 分鐘執行自動駕駛檢查
    scheduler.add_job(
        autopilot_check_job,
        trigger=IntervalTrigger(minutes=15),
        id="autopilot_check",
        name="自動駕駛規則檢查",
        replace_existing=True,
    )

    # 每天 21:00 (UTC+8 = 13:00 UTC) 執行每日摘要
    scheduler.add_job(
        daily_summary_job,
        trigger=CronTrigger(hour=13, minute=0),  # UTC 時間
        id="daily_summary",
        name="每日摘要",
        replace_existing=True,
    )

    # 每週一 09:00 (UTC+8 = 01:00 UTC) 執行週報
    scheduler.add_job(
        weekly_report_job,
        trigger=CronTrigger(day_of_week="mon", hour=1, minute=0),
        id="weekly_report",
        name="週報生成",
        replace_existing=True,
    )

    # 每月 1 號 09:00 執行月報
    scheduler.add_job(
        monthly_report_job,
        trigger=CronTrigger(day=1, hour=1, minute=0),
        id="monthly_report",
        name="月報生成",
        replace_existing=True,
    )

    # 每 15 分鐘執行 Google Ads 數據同步
    scheduler.add_job(
        google_sync_job,
        trigger=IntervalTrigger(minutes=15),
        id="google_ads_sync",
        name="Google Ads 數據同步",
        replace_existing=True,
    )

    # 每 10 分鐘執行 Meta Ads 數據同步
    scheduler.add_job(
        meta_sync_job,
        trigger=IntervalTrigger(minutes=10),
        id="meta_ads_sync",
        name="Meta Ads 數據同步",
        replace_existing=True,
    )

    # 每 15 分鐘執行 LinkedIn Ads 數據同步
    scheduler.add_job(
        linkedin_sync_job,
        trigger=IntervalTrigger(minutes=15),
        id="linkedin_ads_sync",
        name="LinkedIn Ads 數據同步",
        replace_existing=True,
    )

    # 每 15 分鐘執行 Pinterest Ads 數據同步
    scheduler.add_job(
        pinterest_sync_job,
        trigger=IntervalTrigger(minutes=15),
        id="pinterest_ads_sync",
        name="Pinterest Ads 數據同步",
        replace_existing=True,
    )

    # 每 15 分鐘執行 TikTok Ads 數據同步
    scheduler.add_job(
        tiktok_sync_job,
        trigger=IntervalTrigger(minutes=15),
        id="tiktok_ads_sync",
        name="TikTok Ads 數據同步",
        replace_existing=True,
    )

    # 每 15 分鐘執行 Reddit Ads 數據同步
    scheduler.add_job(
        reddit_sync_job,
        trigger=IntervalTrigger(minutes=15),
        id="reddit_ads_sync",
        name="Reddit Ads 數據同步",
        replace_existing=True,
    )

    scheduler.start()
    logger.info("APScheduler started with jobs:")
    for job in scheduler.get_jobs():
        logger.info(f"  - {job.name} ({job.id})")


def shutdown_scheduler():
    """
    關閉排程器
    """
    scheduler.shutdown(wait=False)
    logger.info("APScheduler shutdown")
