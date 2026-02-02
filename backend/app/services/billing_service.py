# -*- coding: utf-8 -*-
"""
計費服務

處理計費相關業務邏輯：
- 訂閱管理
- 月費扣款
- 操作抽成
- AI 計費
- 方案升級
"""

import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.subscription import Subscription
from app.models.billable_action import BillableAction
from app.services.billing_config import (
    PRICING_PLANS,
    get_plan_config,
    is_billable_action,
    calculate_commission,
)
from app.services.wallet_service import WalletService


class BillingService:
    """計費服務類別（靜態方法）"""

    @staticmethod
    async def get_or_create_subscription(
        db: AsyncSession, user_id: uuid.UUID
    ) -> Subscription:
        """
        取得或建立用戶訂閱

        Args:
            db: 資料庫 session
            user_id: 用戶 ID

        Returns:
            Subscription: 訂閱物件
        """
        result = await db.execute(
            select(Subscription).where(Subscription.user_id == user_id)
        )
        subscription = result.scalar_one_or_none()

        if subscription is None:
            # 建立免費方案訂閱
            free_plan = get_plan_config("free")
            subscription = Subscription(
                user_id=user_id,
                plan="free",
                monthly_fee=free_plan["monthly_fee"],
                commission_rate=free_plan["commission_rate"],
                monthly_copywriting_quota=free_plan["monthly_copywriting_quota"],
                monthly_image_quota=free_plan["monthly_image_quota"],
            )
            db.add(subscription)
            await db.flush()

        return subscription

    @staticmethod
    async def charge_subscription_fee(db: AsyncSession, user_id: uuid.UUID) -> bool:
        """
        扣除訂閱月費

        Args:
            db: 資料庫 session
            user_id: 用戶 ID

        Returns:
            bool: 是否成功
        """
        subscription = await BillingService.get_or_create_subscription(db, user_id)

        # 免費方案不扣月費
        if subscription.monthly_fee == 0:
            return True

        # 檢查餘額
        has_balance = await WalletService.check_sufficient_balance(
            db, user_id, subscription.monthly_fee
        )
        if not has_balance:
            return False

        # 扣款
        await WalletService.deduct(
            db,
            user_id,
            subscription.monthly_fee,
            "subscription_fee",
            f"{subscription.plan.upper()} 方案月費",
            reference_id=str(subscription.id),
            reference_type="subscription",
        )

        return True

    @staticmethod
    async def charge_action_commission(
        db: AsyncSession,
        user_id: uuid.UUID,
        action_type: str,
        platform: str,
        ad_spend_amount: int,
        action_history_id: Optional[uuid.UUID] = None,
    ) -> Optional[BillableAction]:
        """
        計算並扣除操作抽成

        Args:
            db: 資料庫 session
            user_id: 用戶 ID
            action_type: 操作類型
            platform: 廣告平台
            ad_spend_amount: 廣告花費金額
            action_history_id: 操作歷史 ID（可選）

        Returns:
            BillableAction: 計費操作記錄，若為免費操作則回傳 None
        """
        # 檢查是否為計費操作
        if not is_billable_action(action_type):
            return None

        # 取得訂閱資訊
        subscription = await BillingService.get_or_create_subscription(db, user_id)

        # 計算抽成
        commission_amount = calculate_commission(ad_spend_amount, subscription.commission_rate)

        # 扣款
        transaction = await WalletService.deduct(
            db,
            user_id,
            commission_amount,
            "action_fee",
            f"{action_type} 操作抽成 ({subscription.commission_rate/100:.1f}%)",
        )

        # 建立計費操作記錄
        billable_action = BillableAction(
            user_id=user_id,
            action_history_id=action_history_id,
            action_type=action_type,
            platform=platform,
            ad_spend_amount=ad_spend_amount,
            commission_rate=subscription.commission_rate,
            commission_amount=commission_amount,
            is_billed=True,
            billed_at=datetime.now(timezone.utc),
            transaction_id=transaction.id,
        )
        db.add(billable_action)
        await db.flush()

        return billable_action

    @staticmethod
    async def charge_ai_usage(
        db: AsyncSession,
        user_id: uuid.UUID,
        ai_type: str,
    ) -> bool:
        """
        計算 AI 使用費用

        Args:
            db: 資料庫 session
            user_id: 用戶 ID
            ai_type: AI 類型（audience, copywriting, image）

        Returns:
            bool: 是否成功
        """
        subscription = await BillingService.get_or_create_subscription(db, user_id)
        plan_config = get_plan_config(subscription.plan)

        if ai_type == "audience":
            # AI 受眾分析總是收費
            price = plan_config["ai_audience_price"]
            has_balance = await WalletService.check_sufficient_balance(db, user_id, price)
            if not has_balance:
                return False

            await WalletService.deduct(
                db, user_id, price, "ai_audience", "AI 受眾分析"
            )
            return True

        elif ai_type == "copywriting":
            # 檢查配額（-1 代表無限）
            quota = subscription.monthly_copywriting_quota
            used = subscription.monthly_copywriting_used

            if quota == -1 or used < quota:
                # 使用配額
                subscription.monthly_copywriting_used += 1
                await db.flush()
                return True
            else:
                # 超額收費
                price = plan_config.get("excess_copywriting_price", plan_config["ai_copywriting_price"])
                has_balance = await WalletService.check_sufficient_balance(db, user_id, price)
                if not has_balance:
                    return False

                await WalletService.deduct(
                    db, user_id, price, "ai_copywriting", "AI 文案生成（超額）"
                )
                return True

        elif ai_type == "image":
            # 檢查配額
            quota = subscription.monthly_image_quota
            used = subscription.monthly_image_used

            if quota == -1 or used < quota:
                # 使用配額
                subscription.monthly_image_used += 1
                await db.flush()
                return True
            else:
                # 超額收費
                price = plan_config.get("excess_image_price", plan_config["ai_image_price"])
                has_balance = await WalletService.check_sufficient_balance(db, user_id, price)
                if not has_balance:
                    return False

                await WalletService.deduct(
                    db, user_id, price, "ai_image", "AI 圖片生成（超額）"
                )
                return True

        return False

    @staticmethod
    async def can_perform_action(
        db: AsyncSession,
        user_id: uuid.UUID,
        estimated_cost: int,
    ) -> tuple[bool, str]:
        """
        檢查是否可以執行操作

        Args:
            db: 資料庫 session
            user_id: 用戶 ID
            estimated_cost: 預估費用

        Returns:
            tuple[bool, str]: (是否可執行, 訊息)
        """
        balance = await WalletService.get_balance(db, user_id)

        if balance < estimated_cost:
            return False, f"餘額不足：目前餘額 NT${balance}，需要 NT${estimated_cost}"

        return True, "可以執行操作"

    @staticmethod
    async def get_ai_quota_status(
        db: AsyncSession,
        user_id: uuid.UUID,
    ) -> dict:
        """
        取得 AI 配額狀態

        Args:
            db: 資料庫 session
            user_id: 用戶 ID

        Returns:
            dict: 配額狀態
        """
        subscription = await BillingService.get_or_create_subscription(db, user_id)

        return {
            "copywriting": {
                "quota": subscription.monthly_copywriting_quota,
                "used": subscription.monthly_copywriting_used,
                "remaining": max(0, subscription.monthly_copywriting_quota - subscription.monthly_copywriting_used)
                if subscription.monthly_copywriting_quota >= 0 else -1,
            },
            "image": {
                "quota": subscription.monthly_image_quota,
                "used": subscription.monthly_image_used,
                "remaining": max(0, subscription.monthly_image_quota - subscription.monthly_image_used)
                if subscription.monthly_image_quota >= 0 else -1,
            },
        }

    @staticmethod
    async def upgrade_plan(
        db: AsyncSession,
        user_id: uuid.UUID,
        new_plan: str,
    ) -> Subscription:
        """
        升級訂閱方案

        Args:
            db: 資料庫 session
            user_id: 用戶 ID
            new_plan: 新方案名稱

        Returns:
            Subscription: 更新後的訂閱
        """
        if new_plan not in PRICING_PLANS:
            raise ValueError(f"無效的方案：{new_plan}")

        subscription = await BillingService.get_or_create_subscription(db, user_id)
        plan_config = get_plan_config(new_plan)

        # 更新訂閱資訊
        subscription.plan = new_plan
        subscription.monthly_fee = plan_config["monthly_fee"]
        subscription.commission_rate = plan_config["commission_rate"]
        subscription.monthly_copywriting_quota = plan_config["monthly_copywriting_quota"]
        subscription.monthly_image_quota = plan_config["monthly_image_quota"]

        await db.flush()
        return subscription

    @staticmethod
    async def reset_monthly_quotas(db: AsyncSession, user_id: uuid.UUID) -> None:
        """
        重置月度配額

        Args:
            db: 資料庫 session
            user_id: 用戶 ID
        """
        subscription = await BillingService.get_or_create_subscription(db, user_id)
        subscription.monthly_copywriting_used = 0
        subscription.monthly_image_used = 0
        await db.flush()
