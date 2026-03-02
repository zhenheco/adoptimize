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
from datetime import date, timedelta
from decimal import Decimal
from typing import Any, Optional

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import get_settings
from app.db.base import async_session_maker
from app.models.ad_account import AdAccount
from app.models.autopilot_log import AutopilotLog
from app.models.creative import Creative
from app.models.creative_metrics import CreativeMetrics

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
        "reason_template": "成本 ${cpa:.0f} 超過目標 ${target_cpa:.0f} 的 20%，連續 {days_high_cpa} 天",
    },
    {
        "name": "creative_fatigue",
        "description": "素材疲勞（點擊率連續下降 7 天）",
        "check": lambda metrics, settings: (
            metrics.get("ctr_trend", 0) < -0.2
            and metrics.get("days_declining", 0) >= 7
        ),
        "action": "pause_creative",
        "reason_template": "點擊率連續下降 {days_declining} 天，疲勞度過高",
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
        "reason_template": "點擊率僅 {ctr:.2%}，低於 0.5% 標準，連續 {days_low_ctr} 天",
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
            stmt = select(AdAccount).where(AdAccount.autopilot_enabled == True)  # noqa: E712
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
        ads_metrics = await self._get_ads_metrics(session, account)

        for ad_metrics in ads_metrics:
            # 注入 target_cpa 供 reason_template 使用
            ad_metrics["target_cpa"] = settings.get("target_cpa", 0)

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
        取得帳戶下所有 active creative 的聚合 metrics

        查詢最近 14 天的 CreativeMetrics，計算：
        - 聚合指標：impressions, clicks, ctr, cpa, roas, spend
        - 趨勢指標：days_high_cpa, days_declining, days_low_ctr, ctr_trend
        """
        today = date.today()
        since = today - timedelta(days=14)

        # 查詢帳戶下所有 active creative 及其最近 14 天 metrics
        stmt = (
            select(Creative)
            .options(selectinload(Creative.metrics))
            .where(
                Creative.ad_account_id == account.id,
                Creative.status == "ACTIVE",
            )
        )
        result = await session.execute(stmt)
        creatives = result.scalars().all()

        ads_metrics: list[dict[str, Any]] = []
        target_cpa = (account.autopilot_settings or {}).get("target_cpa", 0)

        for creative in creatives:
            # 過濾最近 14 天的 metrics
            recent_metrics = sorted(
                [m for m in creative.metrics if m.date >= since],
                key=lambda m: m.date,
            )

            if not recent_metrics:
                continue

            # 聚合指標
            total_impressions = sum(m.impressions for m in recent_metrics)
            total_clicks = sum(m.clicks for m in recent_metrics)
            total_spend = sum(float(m.spend) for m in recent_metrics)
            total_conversions = sum(m.conversions for m in recent_metrics)
            total_revenue = sum(float(m.revenue) for m in recent_metrics)

            avg_ctr = (total_clicks / total_impressions) if total_impressions > 0 else 0
            avg_cpa = (total_spend / total_conversions) if total_conversions > 0 else 0
            avg_roas = (total_revenue / total_spend) if total_spend > 0 else 0

            # 計算趨勢指標
            days_high_cpa = _count_consecutive_days_high_cpa(recent_metrics, target_cpa)
            days_declining = _count_consecutive_ctr_decline(recent_metrics)
            days_low_ctr = _count_consecutive_days_low_ctr(recent_metrics, threshold=0.005)
            ctr_trend = _calculate_ctr_trend(recent_metrics)

            ads_metrics.append({
                "id": creative.external_id or str(creative.id),
                "name": creative.name or f"Creative {str(creative.id)[:8]}",
                "type": "creative",
                "status": creative.status,
                "impressions": total_impressions,
                "clicks": total_clicks,
                "ctr": avg_ctr,
                "cpa": avg_cpa,
                "roas": avg_roas,
                "spend": total_spend,
                "conversions": total_conversions,
                "days_high_cpa": days_high_cpa,
                "days_declining": days_declining,
                "days_low_ctr": days_low_ctr,
                "ctr_trend": ctr_trend,
                "estimated_savings": avg_cpa * 3 if avg_cpa > 0 else 0,
            })

        return ads_metrics

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
                status="pending",
            )

            # 實際呼叫平台 API
            api_success = await self._call_platform_api(account, rule["action"], metrics)
            log.status = "executed" if api_success else "failed"

            session.add(log)
            logger.info(
                f"Autopilot action: {rule['action']} on {metrics.get('name')} "
                f"- {'success' if api_success else 'failed'}"
            )
            return log

        except Exception as e:
            logger.error(f"Failed to execute autopilot action: {e}")
            return None

    async def _call_platform_api(
        self,
        account: AdAccount,
        action: str,
        metrics: dict[str, Any],
    ) -> bool:
        """
        呼叫廣告平台 API 執行動作

        Args:
            account: 廣告帳戶
            action: 動作類型 (pause_ad, pause_creative, increase_budget_20)
            metrics: 目標廣告的 metrics

        Returns:
            是否成功
        """
        if not account.access_token:
            logger.warning(f"Account {account.id} has no access token, skipping API call")
            return False

        target_id = metrics.get("id", "")
        if not target_id or target_id == "unknown":
            logger.warning(f"No valid target_id for action {action}")
            return False

        try:
            if account.platform == "meta":
                return await self._call_meta_api(account, action, target_id, metrics)
            else:
                logger.info(f"Platform {account.platform} not yet supported for autopilot actions")
                return False
        except Exception as e:
            logger.error(f"Platform API call failed: {e}")
            return False

    async def _call_meta_api(
        self,
        account: AdAccount,
        action: str,
        target_id: str,
        metrics: dict[str, Any],
    ) -> bool:
        """
        呼叫 Meta API 執行動作

        支援：
        - pause_ad / pause_creative: 暫停廣告
        - increase_budget_20: 增加 adset 預算 20%
        """
        from app.services.meta_api_client import MetaAPIClient

        client = MetaAPIClient(
            access_token=account.access_token,
            ad_account_id=account.external_id,
        )

        if action in ("pause_ad", "pause_creative"):
            result = await client.update_ad_status(target_id, "PAUSED")
            return result.get("success", True)  # Meta API 回傳 {"success": true}

        elif action == "increase_budget_20":
            return await self._update_adset_budget(client, target_id, increase_pct=0.2)

        return False

    async def _update_adset_budget(
        self,
        client: Any,
        target_id: str,
        increase_pct: float = 0.2,
    ) -> bool:
        """
        增加 adset 的 daily_budget

        先 GET 目前 budget，再 POST 更新後的值。
        Meta budget 單位為分（cents），如 10000 = 100 元。
        """
        settings = get_settings()
        base_url = "https://graph.facebook.com/v24.0"

        # 計算 appsecret_proof
        import hashlib
        import hmac
        appsecret_proof = hmac.new(
            settings.META_APP_SECRET.encode(),
            client.access_token.encode(),
            hashlib.sha256,
        ).hexdigest()

        async with httpx.AsyncClient(timeout=30.0) as http_client:
            # Step 1: GET 目前 budget
            get_resp = await http_client.get(
                f"{base_url}/{target_id}",
                params={
                    "fields": "daily_budget",
                    "access_token": client.access_token,
                    "appsecret_proof": appsecret_proof,
                },
            )
            get_data = get_resp.json()

            if "error" in get_data:
                logger.error(f"Failed to get adset budget: {get_data['error']}")
                return False

            current_budget = int(get_data.get("daily_budget", 0))
            if current_budget <= 0:
                logger.warning(f"Adset {target_id} has no daily_budget set")
                return False

            new_budget = int(current_budget * (1 + increase_pct))

            # Step 2: POST 更新 budget
            post_resp = await http_client.post(
                f"{base_url}/{target_id}",
                data={
                    "daily_budget": str(new_budget),
                    "access_token": client.access_token,
                    "appsecret_proof": appsecret_proof,
                },
            )
            post_data = post_resp.json()

            if "error" in post_data:
                logger.error(f"Failed to update adset budget: {post_data['error']}")
                return False

            logger.info(
                f"Updated adset {target_id} budget: {current_budget} → {new_budget} "
                f"(+{increase_pct:.0%})"
            )
            return True


# ============================================================
# 趨勢計算輔助函數
# ============================================================


def _count_consecutive_days_high_cpa(
    metrics: list[CreativeMetrics],
    target_cpa: float,
) -> int:
    """從最近一天往回數，連續幾天 CPA > target_cpa * 1.2"""
    if not target_cpa or target_cpa <= 0:
        return 0

    threshold = target_cpa * 1.2
    count = 0
    for m in reversed(metrics):
        daily_cpa = (float(m.spend) / m.conversions) if m.conversions > 0 else float("inf")
        if daily_cpa > threshold:
            count += 1
        else:
            break
    return count


def _count_consecutive_ctr_decline(metrics: list[CreativeMetrics]) -> int:
    """從最近一天往回數，連續幾天 CTR 下降"""
    if len(metrics) < 2:
        return 0

    count = 0
    for i in range(len(metrics) - 1, 0, -1):
        current_ctr = float(metrics[i].ctr or 0)
        prev_ctr = float(metrics[i - 1].ctr or 0)
        if current_ctr < prev_ctr:
            count += 1
        else:
            break
    return count


def _count_consecutive_days_low_ctr(
    metrics: list[CreativeMetrics],
    threshold: float = 0.005,
) -> int:
    """從最近一天往回數，連續幾天 CTR < threshold"""
    count = 0
    for m in reversed(metrics):
        if float(m.ctr or 0) < threshold and m.impressions > 100:
            count += 1
        else:
            break
    return count


def _calculate_ctr_trend(metrics: list[CreativeMetrics]) -> float:
    """
    計算最近 7 天的 CTR 變化率

    Returns:
        變化率（正數=上升, 負數=下降）
        例：-0.3 表示 CTR 下降了 30%
    """
    recent_7 = metrics[-7:] if len(metrics) >= 7 else metrics
    if len(recent_7) < 2:
        return 0.0

    first_half = recent_7[: len(recent_7) // 2]
    second_half = recent_7[len(recent_7) // 2 :]

    avg_first = sum(float(m.ctr or 0) for m in first_half) / len(first_half)
    avg_second = sum(float(m.ctr or 0) for m in second_half) / len(second_half)

    if avg_first <= 0:
        return 0.0

    return (avg_second - avg_first) / avg_first
