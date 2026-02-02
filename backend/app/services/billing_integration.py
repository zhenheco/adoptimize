# -*- coding: utf-8 -*-
"""
計費整合服務

提供高階的計費檢查與扣款方法，供其他服務使用：
- AI 服務使用前檢查
- 操作執行前檢查
- 統一的扣款入口
"""

import uuid
from dataclasses import dataclass
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.billing_service import BillingService
from app.services.billing_config import (
    get_plan_config,
    is_billable_action,
    calculate_commission,
)
from app.services.wallet_service import WalletService


@dataclass
class AIUsageResult:
    """AI 使用檢查結果"""
    can_use: bool
    uses_quota: bool
    estimated_cost: int
    message: str = ""


@dataclass
class ActionExecuteResult:
    """操作執行檢查結果"""
    can_execute: bool
    estimated_fee: int
    message: str = ""


class BillingIntegration:
    """計費整合服務（靜態方法）"""

    @staticmethod
    async def can_use_ai_copywriting(
        db: AsyncSession,
        user_id: uuid.UUID,
    ) -> AIUsageResult:
        """
        檢查是否可以使用 AI 文案生成

        Args:
            db: 資料庫 session
            user_id: 用戶 ID

        Returns:
            AIUsageResult: 檢查結果
        """
        # 取得配額狀態
        quota_status = await BillingService.get_ai_quota_status(db, user_id)
        copywriting_quota = quota_status["copywriting"]

        # 有配額剩餘，可以使用
        if copywriting_quota["remaining"] > 0 or copywriting_quota["quota"] == -1:
            return AIUsageResult(
                can_use=True,
                uses_quota=True,
                estimated_cost=0,
                message="使用配額"
            )

        # 無配額，需要付費
        subscription = await BillingService.get_or_create_subscription(db, user_id)
        plan_config = get_plan_config(subscription.plan)
        price = plan_config.get("excess_copywriting_price", plan_config["ai_copywriting_price"])

        # 檢查餘額
        balance = await WalletService.get_balance(db, user_id)
        if balance < price:
            return AIUsageResult(
                can_use=False,
                uses_quota=False,
                estimated_cost=price,
                message=f"餘額不足：目前餘額 NT${balance}，需要 NT${price}"
            )

        return AIUsageResult(
            can_use=True,
            uses_quota=False,
            estimated_cost=price,
            message="需付費使用"
        )

    @staticmethod
    async def can_use_ai_image(
        db: AsyncSession,
        user_id: uuid.UUID,
    ) -> AIUsageResult:
        """
        檢查是否可以使用 AI 圖片生成

        Args:
            db: 資料庫 session
            user_id: 用戶 ID

        Returns:
            AIUsageResult: 檢查結果
        """
        # 取得配額狀態
        quota_status = await BillingService.get_ai_quota_status(db, user_id)
        image_quota = quota_status["image"]

        # 有配額剩餘，可以使用
        if image_quota["remaining"] > 0 or image_quota["quota"] == -1:
            return AIUsageResult(
                can_use=True,
                uses_quota=True,
                estimated_cost=0,
                message="使用配額"
            )

        # 無配額，需要付費
        subscription = await BillingService.get_or_create_subscription(db, user_id)
        plan_config = get_plan_config(subscription.plan)
        price = plan_config.get("excess_image_price", plan_config["ai_image_price"])

        # 檢查餘額
        balance = await WalletService.get_balance(db, user_id)
        if balance < price:
            return AIUsageResult(
                can_use=False,
                uses_quota=False,
                estimated_cost=price,
                message=f"餘額不足：目前餘額 NT${balance}，需要 NT${price}"
            )

        return AIUsageResult(
            can_use=True,
            uses_quota=False,
            estimated_cost=price,
            message="需付費使用"
        )

    @staticmethod
    async def can_use_ai_audience(
        db: AsyncSession,
        user_id: uuid.UUID,
    ) -> AIUsageResult:
        """
        檢查是否可以使用 AI 受眾分析

        受眾分析無配額，總是需要付費

        Args:
            db: 資料庫 session
            user_id: 用戶 ID

        Returns:
            AIUsageResult: 檢查結果
        """
        # 取得方案定價
        subscription = await BillingService.get_or_create_subscription(db, user_id)
        plan_config = get_plan_config(subscription.plan)
        price = plan_config["ai_audience_price"]

        # 檢查餘額
        balance = await WalletService.get_balance(db, user_id)
        if balance < price:
            return AIUsageResult(
                can_use=False,
                uses_quota=False,
                estimated_cost=price,
                message=f"餘額不足：目前餘額 NT${balance}，需要 NT${price}"
            )

        return AIUsageResult(
            can_use=True,
            uses_quota=False,
            estimated_cost=price,
            message="需付費使用"
        )

    @staticmethod
    async def can_execute_action(
        db: AsyncSession,
        user_id: uuid.UUID,
        action_type: str,
        ad_spend: int = 0,
    ) -> ActionExecuteResult:
        """
        檢查是否可以執行操作

        Args:
            db: 資料庫 session
            user_id: 用戶 ID
            action_type: 操作類型
            ad_spend: 廣告花費金額

        Returns:
            ActionExecuteResult: 檢查結果
        """
        # 檢查是否為計費操作
        if not is_billable_action(action_type):
            return ActionExecuteResult(
                can_execute=True,
                estimated_fee=0,
                message="免費操作"
            )

        # 取得訂閱資訊，計算抽成
        subscription = await BillingService.get_or_create_subscription(db, user_id)
        commission = calculate_commission(ad_spend, subscription.commission_rate)

        # 檢查餘額
        balance = await WalletService.get_balance(db, user_id)
        if balance < commission:
            return ActionExecuteResult(
                can_execute=False,
                estimated_fee=commission,
                message=f"餘額不足：目前餘額 NT${balance}，需要 NT${commission}"
            )

        return ActionExecuteResult(
            can_execute=True,
            estimated_fee=commission,
            message="可以執行"
        )

    @staticmethod
    async def charge_ai_copywriting(
        db: AsyncSession,
        user_id: uuid.UUID,
        uses_quota: bool,
    ) -> bool:
        """
        對 AI 文案生成收費

        Args:
            db: 資料庫 session
            user_id: 用戶 ID
            uses_quota: 是否使用配額

        Returns:
            bool: 是否成功
        """
        return await BillingService.charge_ai_usage(db, user_id, "copywriting")

    @staticmethod
    async def charge_ai_image(
        db: AsyncSession,
        user_id: uuid.UUID,
        uses_quota: bool,
    ) -> bool:
        """
        對 AI 圖片生成收費

        Args:
            db: 資料庫 session
            user_id: 用戶 ID
            uses_quota: 是否使用配額

        Returns:
            bool: 是否成功
        """
        return await BillingService.charge_ai_usage(db, user_id, "image")

    @staticmethod
    async def charge_ai_audience(
        db: AsyncSession,
        user_id: uuid.UUID,
    ) -> bool:
        """
        對 AI 受眾分析收費

        Args:
            db: 資料庫 session
            user_id: 用戶 ID

        Returns:
            bool: 是否成功
        """
        return await BillingService.charge_ai_usage(db, user_id, "audience")

    @staticmethod
    async def charge_action(
        db: AsyncSession,
        user_id: uuid.UUID,
        action_type: str,
        platform: str,
        ad_spend: int,
        action_history_id: Optional[uuid.UUID] = None,
    ) -> bool:
        """
        對操作收取抽成

        Args:
            db: 資料庫 session
            user_id: 用戶 ID
            action_type: 操作類型
            platform: 廣告平台
            ad_spend: 廣告花費金額
            action_history_id: 操作歷史 ID

        Returns:
            bool: 是否成功
        """
        result = await BillingService.charge_action_commission(
            db, user_id, action_type, platform, ad_spend, action_history_id
        )
        # charge_action_commission 回傳 BillableAction 或 None
        # None 表示免費操作，也算成功
        return True
