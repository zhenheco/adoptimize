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

from typing import Callable, Coroutine

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

from app.core.logger import get_logger

logger = get_logger(__name__)
scheduler = AsyncIOScheduler()


def _create_platform_sync_job(
    platform_name: str,
    module_path: str,
    get_accounts_fn: str,
    sync_account_fn: str,
) -> Callable[[], Coroutine]:
    """
    建立平台同步任務的工廠函數

    所有平台的同步任務邏輯相同：取得帳戶列表 -> 逐一同步 -> 記錄結果。
    使用此工廠避免重複程式碼。

    Args:
        platform_name: 平台顯示名稱 (e.g., "Meta", "Google Ads")
        module_path: worker 模組路徑 (e.g., "app.workers.sync_meta")
        get_accounts_fn: 取得帳戶函數名稱 (e.g., "_get_meta_accounts")
        sync_account_fn: 同步帳戶函數名稱 (e.g., "_sync_meta_account")

    Returns:
        async 同步任務函數
    """
    async def sync_job():
        import importlib
        module = importlib.import_module(module_path)
        get_accounts = getattr(module, get_accounts_fn)
        sync_account = getattr(module, sync_account_fn)

        try:
            accounts = await get_accounts()
            logger.info(f"{platform_name} sync: found {len(accounts)} accounts")
            total_calls = 0
            for account in accounts:
                try:
                    result = await sync_account(str(account.id))
                    calls = result.get("api_calls", 0)
                    total_calls += calls
                    logger.info(
                        f"{platform_name} sync completed for account {account.id}: "
                        f"{calls} API calls, status={result.get('status')}"
                    )
                except Exception as e:
                    logger.error(f"{platform_name} sync failed for account {account.id}: {e}")
            logger.info(f"{platform_name} sync dispatch done: {total_calls} total API calls")
        except Exception as e:
            logger.error(f"{platform_name} sync dispatch failed: {e}")

    sync_job.__doc__ = f"{platform_name} 數據同步任務"
    return sync_job


# 平台同步任務 - 使用工廠函數建立，避免 6 份幾乎相同的程式碼
meta_sync_job = _create_platform_sync_job(
    "Meta", "app.workers.sync_meta", "_get_meta_accounts", "_sync_meta_account",
)
google_sync_job = _create_platform_sync_job(
    "Google Ads", "app.workers.sync_google", "_get_google_accounts", "_sync_google_account",
)
linkedin_sync_job = _create_platform_sync_job(
    "LinkedIn", "app.workers.sync_linkedin", "_get_linkedin_accounts", "_sync_linkedin_account",
)
pinterest_sync_job = _create_platform_sync_job(
    "Pinterest", "app.workers.sync_pinterest", "_get_pinterest_accounts", "_sync_pinterest_account",
)
tiktok_sync_job = _create_platform_sync_job(
    "TikTok", "app.workers.sync_tiktok", "_get_tiktok_accounts", "_sync_tiktok_account",
)
reddit_sync_job = _create_platform_sync_job(
    "Reddit", "app.workers.sync_reddit", "_get_reddit_accounts", "_sync_reddit_account",
)


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
