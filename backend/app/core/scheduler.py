# -*- coding: utf-8 -*-
"""
APScheduler 定時任務管理

排程：
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
