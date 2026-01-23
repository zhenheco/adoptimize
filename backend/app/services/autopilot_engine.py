# -*- coding: utf-8 -*-
"""
自動駕駛引擎

負責執行自動優化規則：
- 暫停成本過高的廣告
- 暫停疲勞的素材
- 調整預算分配
- 加碼表現好的廣告
"""

import logging
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Any, Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import async_session_maker
from app.models.ad_account import AdAccount
from app.models.autopilot_log import AutopilotLog

logger = logging.getLogger(__name__)


# 自動駕駛規則定義
PAUSE_RULES = [
    {
        "name": "high_cpa",
        "description": "成本超標 20% 連續 3 天",
        "check": lambda metrics, settings: (
            settings.get("target_cpa")
            and metrics.get("cpa", 0) > settings["target_cpa"] * 1.2
            and metrics.get("days_high_cpa", 0) >= 3
        ),
        "action": "pause_ad",
        "reason_template": "成本 ${cpa:.0f} 超過目標 ${target_cpa:.0f} 的 20%，連續 {days} 天",
    },
    {
        "name": "creative_fatigue",
        "description": "素材疲勞（點擊率連續下降 7 天）",
        "check": lambda metrics, settings: (
            metrics.get("ctr_trend", 0) < -0.2
            and metrics.get("days_declining", 0) >= 7
        ),
        "action": "pause_creative",
        "reason_template": "點擊率連續下降 {days} 天，疲勞度過高",
    },
    {
        "name": "low_ctr",
        "description": "點擊率過低",
        "check": lambda metrics, settings: (
            metrics.get("ctr", 0) < 0.005
            and metrics.get("impressions", 0) > 1000
            and metrics.get("days_low_ctr", 0) >= 7
        ),
        "action": "pause_ad",
        "reason_template": "點擊率僅 {ctr:.2%}，低於 0.5% 標準，連續 {days} 天",
    },
]

BOOST_RULES = [
    {
        "name": "high_roas",
        "description": "表現優異（投報率超過 4 倍）",
        "check": lambda metrics, settings: (
            settings.get("auto_boost_enabled", False)
            and metrics.get("roas", 0) > 4
            and metrics.get("spend", 0) > 1000
        ),
        "action": "increase_budget_20",
        "reason_template": "投報率達 {roas:.1f} 倍，表現優異，自動加碼 20%",
    },
]


class AutopilotEngine:
    """
    自動駕駛引擎

    負責評估和執行自動優化規則
    """

    async def run_all_accounts(self) -> dict[str, Any]:
        """
        執行所有啟用自動駕駛的帳戶

        Returns:
            執行結果統計
        """
        async with async_session_maker() as session:
            # 查詢所有啟用自動駕駛的帳戶
            stmt = select(AdAccount).where(AdAccount.autopilot_enabled == True)
            result = await session.execute(stmt)
            accounts = result.scalars().all()

            stats = {
                "total_accounts": len(accounts),
                "actions_taken": 0,
                "errors": 0,
            }

            for account in accounts:
                try:
                    actions = await self.evaluate_account(session, account)
                    stats["actions_taken"] += len(actions)
                except Exception as e:
                    logger.error(f"Error processing account {account.id}: {e}")
                    stats["errors"] += 1

            await session.commit()
            logger.info(f"Autopilot run complete: {stats}")
            return stats

    async def evaluate_account(
        self, session: AsyncSession, account: AdAccount
    ) -> list[AutopilotLog]:
        """
        評估單一帳戶的所有規則

        Args:
            session: 資料庫 session
            account: 廣告帳戶

        Returns:
            執行的動作列表
        """
        actions = []
        settings = account.autopilot_settings or {}

        # 取得帳戶的廣告數據
        # TODO: 實作從 campaigns/ads 取得 metrics
        ads_metrics = await self._get_ads_metrics(session, account)

        for ad_metrics in ads_metrics:
            # 檢查暫停規則
            if settings.get("auto_pause_enabled", True):
                for rule in PAUSE_RULES:
                    if rule["check"](ad_metrics, settings):
                        action = await self._execute_action(
                            session, account, ad_metrics, rule
                        )
                        if action:
                            actions.append(action)
                        break  # 一個廣告只執行一個暫停動作

            # 檢查加碼規則
            if settings.get("auto_boost_enabled", False):
                for rule in BOOST_RULES:
                    if rule["check"](ad_metrics, settings):
                        action = await self._execute_action(
                            session, account, ad_metrics, rule
                        )
                        if action:
                            actions.append(action)

        return actions

    async def _get_ads_metrics(
        self, session: AsyncSession, account: AdAccount
    ) -> list[dict[str, Any]]:
        """
        取得帳戶下所有廣告的 metrics

        TODO: 實作實際的數據查詢邏輯
        """
        # Placeholder: 實際需要從 campaigns/ad_sets/ads 表取得數據
        return []

    async def _execute_action(
        self,
        session: AsyncSession,
        account: AdAccount,
        metrics: dict[str, Any],
        rule: dict[str, Any],
    ) -> Optional[AutopilotLog]:
        """
        執行自動駕駛動作

        Args:
            session: 資料庫 session
            account: 廣告帳戶
            metrics: 廣告 metrics
            rule: 觸發的規則

        Returns:
            執行記錄
        """
        try:
            # 格式化原因
            reason = rule["reason_template"].format(**metrics)

            # 建立執行記錄
            log = AutopilotLog(
                ad_account_id=account.id,
                action_type=rule["action"],
                target_type=metrics.get("type", "ad"),
                target_id=metrics.get("id", "unknown"),
                target_name=metrics.get("name"),
                reason=reason,
                before_state={"status": metrics.get("status")},
                after_state={"status": "paused" if "pause" in rule["action"] else "active"},
                estimated_savings=Decimal(str(metrics.get("estimated_savings", 0))),
                status="executed",
            )

            # TODO: 實際呼叫 Google/Meta API 執行動作
            # await self._call_platform_api(account, rule["action"], metrics)

            session.add(log)
            logger.info(f"Autopilot action: {rule['action']} on {metrics.get('name')}")
            return log

        except Exception as e:
            logger.error(f"Failed to execute autopilot action: {e}")
            return None
