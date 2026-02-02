# -*- coding: utf-8 -*-
"""
計費 API 路由

提供錢包、訂閱、交易紀錄、定價、配額等功能
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import get_db
from app.middleware.auth import get_current_user
from app.models.user import User
from app.services.wallet_service import WalletService
from app.services.billing_service import BillingService
from app.services.billing_config import PRICING_PLANS

router = APIRouter(prefix="/billing", tags=["billing"])


# ============================================================
# Pydantic Schemas
# ============================================================


class WalletResponse(BaseModel):
    """錢包回應"""

    balance: int = Field(..., description="餘額 (TWD)")
    user_id: str


class TransactionResponse(BaseModel):
    """交易回應"""

    id: str
    type: str = Field(..., description="交易類型")
    amount: int = Field(..., description="金額")
    balance_after: int = Field(..., description="交易後餘額")
    description: str
    reference_id: Optional[str] = None
    reference_type: Optional[str] = None
    created_at: datetime


class TransactionListResponse(BaseModel):
    """交易列表回應"""

    transactions: list[TransactionResponse]
    total: int


class SubscriptionResponse(BaseModel):
    """訂閱回應"""

    id: str
    plan: str = Field(..., description="方案: free, pro, agency")
    monthly_fee: int = Field(..., description="月費 (TWD)")
    commission_rate: int = Field(..., description="抽成費率 (千分比)")
    commission_percent: float = Field(..., description="抽成百分比")
    is_active: bool
    monthly_copywriting_quota: int
    monthly_copywriting_used: int
    monthly_image_quota: int
    monthly_image_used: int


class PlanConfigResponse(BaseModel):
    """方案配置回應"""

    monthly_fee: int
    commission_rate: int
    commission_percent: float
    ai_audience_price: int
    ai_copywriting_price: int
    ai_image_price: int
    monthly_copywriting_quota: int
    monthly_image_quota: int


class PricingResponse(BaseModel):
    """定價回應"""

    plans: dict[str, PlanConfigResponse]


class AIQuotaResponse(BaseModel):
    """AI 配額回應"""

    copywriting: dict = Field(..., description="文案配額")
    image: dict = Field(..., description="圖片配額")


class UpgradePlanRequest(BaseModel):
    """升級方案請求"""

    plan: str = Field(..., description="新方案: pro, agency")


class DepositRequest(BaseModel):
    """儲值請求"""

    amount: int = Field(..., gt=0, description="儲值金額 (TWD)")


class EstimateRequest(BaseModel):
    """預估費用請求"""

    action_type: str = Field(..., description="操作類型")
    ad_spend_amount: int = Field(..., description="廣告花費金額")


class EstimateResponse(BaseModel):
    """預估費用回應"""

    commission_rate: int = Field(..., description="抽成費率")
    commission_percent: float
    estimated_fee: int = Field(..., description="預估費用")
    current_balance: int = Field(..., description="目前餘額")
    sufficient_balance: bool = Field(..., description="餘額是否足夠")


# ============================================================
# API 端點
# ============================================================


@router.get("/wallet", response_model=WalletResponse)
async def get_wallet(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """取得錢包資訊"""
    wallet = await WalletService.get_or_create_wallet(db, current_user.id)
    return WalletResponse(
        balance=wallet.balance,
        user_id=str(wallet.user_id),
    )


@router.get("/wallet/transactions", response_model=TransactionListResponse)
async def get_wallet_transactions(
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """取得交易紀錄"""
    transactions = await WalletService.get_transaction_history(db, current_user.id, limit)

    tx_list = [
        TransactionResponse(
            id=str(tx.id),
            type=tx.type,
            amount=tx.amount,
            balance_after=tx.balance_after,
            description=tx.description,
            reference_id=tx.reference_id,
            reference_type=tx.reference_type,
            created_at=tx.created_at,
        )
        for tx in transactions
    ]

    return TransactionListResponse(
        transactions=tx_list,
        total=len(tx_list),
    )


@router.post("/wallet/deposit")
async def create_deposit(
    request: DepositRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    建立儲值請求

    注意：實際儲值需要整合第三方支付（如 ECPay、NewebPay）
    這裡先回傳儲值資訊，後續實作支付整合
    """
    # TODO: 整合第三方支付 API
    # 目前先直接儲值（測試用）
    transaction = await WalletService.deposit(
        db, current_user.id, request.amount, f"儲值 NT${request.amount}"
    )
    await db.commit()

    return {
        "success": True,
        "message": f"成功儲值 NT${request.amount}",
        "transaction_id": str(transaction.id),
        "new_balance": transaction.balance_after,
    }


@router.get("/subscription", response_model=SubscriptionResponse)
async def get_subscription(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """取得訂閱資訊"""
    subscription = await BillingService.get_or_create_subscription(db, current_user.id)

    return SubscriptionResponse(
        id=str(subscription.id),
        plan=subscription.plan,
        monthly_fee=subscription.monthly_fee,
        commission_rate=subscription.commission_rate,
        commission_percent=subscription.commission_rate / 100,
        is_active=subscription.is_active,
        monthly_copywriting_quota=subscription.monthly_copywriting_quota,
        monthly_copywriting_used=subscription.monthly_copywriting_used,
        monthly_image_quota=subscription.monthly_image_quota,
        monthly_image_used=subscription.monthly_image_used,
    )


@router.post("/subscription/upgrade", response_model=SubscriptionResponse)
async def upgrade_subscription(
    request: UpgradePlanRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """升級訂閱方案"""
    if request.plan not in PRICING_PLANS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"無效的方案：{request.plan}",
        )

    subscription = await BillingService.upgrade_plan(db, current_user.id, request.plan)
    await db.commit()

    return SubscriptionResponse(
        id=str(subscription.id),
        plan=subscription.plan,
        monthly_fee=subscription.monthly_fee,
        commission_rate=subscription.commission_rate,
        commission_percent=subscription.commission_rate / 100,
        is_active=subscription.is_active,
        monthly_copywriting_quota=subscription.monthly_copywriting_quota,
        monthly_copywriting_used=subscription.monthly_copywriting_used,
        monthly_image_quota=subscription.monthly_image_quota,
        monthly_image_used=subscription.monthly_image_used,
    )


@router.get("/pricing", response_model=PricingResponse)
async def get_pricing(
    current_user: User = Depends(get_current_user),
):
    """取得定價方案"""
    plans = {}
    for plan_name, config in PRICING_PLANS.items():
        plans[plan_name] = PlanConfigResponse(
            monthly_fee=config["monthly_fee"],
            commission_rate=config["commission_rate"],
            commission_percent=config["commission_rate"] / 100,
            ai_audience_price=config["ai_audience_price"],
            ai_copywriting_price=config["ai_copywriting_price"],
            ai_image_price=config["ai_image_price"],
            monthly_copywriting_quota=config["monthly_copywriting_quota"],
            monthly_image_quota=config["monthly_image_quota"],
        )

    return PricingResponse(plans=plans)


@router.get("/ai-quota", response_model=AIQuotaResponse)
async def get_ai_quota(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """取得 AI 配額狀態"""
    quota_status = await BillingService.get_ai_quota_status(db, current_user.id)
    return AIQuotaResponse(**quota_status)


@router.post("/estimate", response_model=EstimateResponse)
async def estimate_fee(
    request: EstimateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """預估操作費用"""
    subscription = await BillingService.get_or_create_subscription(db, current_user.id)
    balance = await WalletService.get_balance(db, current_user.id)

    # 計算抽成
    from app.services.billing_config import calculate_commission, is_billable_action

    if not is_billable_action(request.action_type):
        # 免費操作
        return EstimateResponse(
            commission_rate=0,
            commission_percent=0,
            estimated_fee=0,
            current_balance=balance,
            sufficient_balance=True,
        )

    estimated_fee = calculate_commission(request.ad_spend_amount, subscription.commission_rate)

    return EstimateResponse(
        commission_rate=subscription.commission_rate,
        commission_percent=subscription.commission_rate / 100,
        estimated_fee=estimated_fee,
        current_balance=balance,
        sufficient_balance=balance >= estimated_fee,
    )
