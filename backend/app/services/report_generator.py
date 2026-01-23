# -*- coding: utf-8 -*-
"""
報告生成服務

負責生成每日摘要、週報、月報
"""

import logging
from datetime import date, datetime, timedelta
from typing import Any, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import async_session_maker
from app.models.report import Report
from app.models.user import User

logger = logging.getLogger(__name__)


class ReportGenerator:
    """
    報告生成器

    生成白話版的廣告報告，讓老闆一看就懂
    """

    async def generate_daily_summaries(self) -> int:
        """
        生成所有用戶的每日摘要

        Returns:
            生成的報告數量
        """
        async with async_session_maker() as session:
            # 查詢所有活躍用戶
            stmt = select(User).where(User.is_active == True)
            result = await session.execute(stmt)
            users = result.scalars().all()

            count = 0
            today = date.today()

            for user in users:
                try:
                    report = await self._generate_daily_report(session, user, today)
                    if report:
                        session.add(report)
                        count += 1
                except Exception as e:
                    logger.error(f"Error generating daily report for user {user.id}: {e}")

            await session.commit()
            logger.info(f"Generated {count} daily summaries")
            return count

    async def generate_weekly_reports(self) -> int:
        """
        生成所有用戶的週報

        Returns:
            生成的報告數量
        """
        async with async_session_maker() as session:
            stmt = select(User).where(User.is_active == True)
            result = await session.execute(stmt)
            users = result.scalars().all()

            count = 0
            # 上週的日期範圍
            today = date.today()
            week_end = today - timedelta(days=today.weekday() + 1)  # 上週日
            week_start = week_end - timedelta(days=6)  # 上週一

            for user in users:
                try:
                    report = await self._generate_period_report(
                        session, user, "weekly", week_start, week_end
                    )
                    if report:
                        session.add(report)
                        count += 1
                except Exception as e:
                    logger.error(f"Error generating weekly report for user {user.id}: {e}")

            await session.commit()
            logger.info(f"Generated {count} weekly reports")
            return count

    async def generate_monthly_reports(self) -> int:
        """
        生成所有用戶的月報

        Returns:
            生成的報告數量
        """
        async with async_session_maker() as session:
            stmt = select(User).where(User.is_active == True)
            result = await session.execute(stmt)
            users = result.scalars().all()

            count = 0
            # 上月的日期範圍
            today = date.today()
            month_end = today.replace(day=1) - timedelta(days=1)
            month_start = month_end.replace(day=1)

            for user in users:
                try:
                    report = await self._generate_period_report(
                        session, user, "monthly", month_start, month_end
                    )
                    if report:
                        session.add(report)
                        count += 1
                except Exception as e:
                    logger.error(f"Error generating monthly report for user {user.id}: {e}")

            await session.commit()
            logger.info(f"Generated {count} monthly reports")
            return count

    async def _generate_daily_report(
        self, session: AsyncSession, user: User, report_date: date
    ) -> Optional[Report]:
        """
        生成單一用戶的每日摘要

        TODO: 實作實際的數據匯總和 AI 文案生成
        """
        # 收集數據
        content = await self._collect_daily_metrics(session, user, report_date)
        if not content.get("has_data"):
            return None

        # 生成白話文字
        content_text = await self._generate_plain_text(content, "daily")

        return Report(
            user_id=user.id,
            report_type="daily",
            period_start=report_date,
            period_end=report_date,
            content=content,
            content_text=content_text,
        )

    async def _generate_period_report(
        self,
        session: AsyncSession,
        user: User,
        report_type: str,
        start_date: date,
        end_date: date,
    ) -> Optional[Report]:
        """
        生成週報/月報
        """
        content = await self._collect_period_metrics(session, user, start_date, end_date)
        if not content.get("has_data"):
            return None

        content_text = await self._generate_plain_text(content, report_type)

        return Report(
            user_id=user.id,
            report_type=report_type,
            period_start=start_date,
            period_end=end_date,
            content=content,
            content_text=content_text,
        )

    async def _collect_daily_metrics(
        self, session: AsyncSession, user: User, report_date: date
    ) -> dict[str, Any]:
        """
        收集每日 metrics

        TODO: 實作實際的數據查詢
        """
        # Placeholder
        return {
            "has_data": False,
            "spend": 0,
            "conversions": 0,
            "revenue": 0,
            "roas": 0,
        }

    async def _collect_period_metrics(
        self, session: AsyncSession, user: User, start_date: date, end_date: date
    ) -> dict[str, Any]:
        """
        收集期間 metrics

        TODO: 實作實際的數據查詢
        """
        # Placeholder
        return {
            "has_data": False,
            "spend": 0,
            "conversions": 0,
            "revenue": 0,
            "roas": 0,
        }

    async def _generate_plain_text(
        self, content: dict[str, Any], report_type: str
    ) -> str:
        """
        使用 AI 生成白話報告文字

        TODO: 整合 OpenAI API
        """
        # Placeholder
        spend = content.get("spend", 0)
        conversions = content.get("conversions", 0)
        roas = content.get("roas", 0)

        if report_type == "daily":
            return f"今日花費 ${spend:,.0f}，帶來 {conversions} 筆訂單，投報率 {roas:.1f} 倍。"
        elif report_type == "weekly":
            return f"本週花費 ${spend:,.0f}，帶來 {conversions} 筆訂單，投報率 {roas:.1f} 倍。"
        else:
            return f"本月花費 ${spend:,.0f}，帶來 {conversions} 筆訂單，投報率 {roas:.1f} 倍。"
