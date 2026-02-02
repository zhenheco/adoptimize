# -*- coding: utf-8 -*-
"""
AI 文案生成 API 路由

支援 Google Ads 和 Meta Ads 的文案生成
"""

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import get_db
from app.middleware.auth import get_current_user
from app.models.user import User
from app.services.ai_copywriting_service import AICopywritingService
from app.services.billing_service import BillingService
from app.services.wallet_service import WalletService

router = APIRouter()


class CopywritingRequest(BaseModel):
    """文案生成請求"""
    product_description: str
    style: str = "professional"  # professional, casual, urgent, friendly, luxury, playful
    platform: Literal["google", "meta", "all"] = "all"


class GoogleAdsResponse(BaseModel):
    """Google Ads 文案回應"""
    headlines: list[str]  # 最多 15 個，每個 30 字元
    descriptions: list[str]  # 最多 4 個，每個 90 字元


class MetaAdsResponse(BaseModel):
    """Meta Ads 文案回應"""
    primary_texts: list[str]  # 主要文案，125 字元
    headlines: list[str]  # 標題，27 字元
    descriptions: list[str]  # 描述，30 字元


class CopywritingResponse(BaseModel):
    """文案生成回應 - 單平台模式"""
    headlines: list[str]
    descriptions: list[str]
    primary_texts: list[str] | None = None  # Meta 專用


class AllPlatformResponse(BaseModel):
    """文案生成回應 - 全平台模式"""
    google: GoogleAdsResponse
    meta: MetaAdsResponse


@router.post("/copywriting")
async def generate_copywriting(
    request: CopywritingRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """
    生成廣告文案

    - **platform=google**: 生成 Google Ads RSA 文案（10 個標題 + 4 個描述）
    - **platform=meta**: 生成 Meta Ads 文案（3 個 Primary Text + 5 個標題 + 3 個描述）
    - **platform=all**: 同時生成兩個平台的文案

    計費規則：
    - 有配額時消耗配額，不收費
    - 配額用完後按方案收費（Free: NT$5/次，Pro: NT$5/次超額，Agency: NT$3/次超額）
    """
    if not request.product_description.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="請提供商品描述",
        )

    # 檢查並扣除 AI 文案生成費用（配額或餘額）
    charged = await BillingService.charge_ai_usage(db, current_user.id, "copywriting")
    if not charged:
        # 檢查是配額用完還是餘額不足
        quota_status = await BillingService.get_ai_quota_status(db, current_user.id)
        copywriting_remaining = quota_status["copywriting"]["remaining"]

        if copywriting_remaining == 0:
            # 配額用完，餘額也不足
            balance = await WalletService.get_balance(db, current_user.id)
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=f"文案配額已用完，錢包餘額不足。目前餘額: NT${balance}，請儲值後再試。",
            )
        else:
            # 其他錯誤
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="計費系統錯誤，請稍後再試",
            )

    # 生成文案
    service = AICopywritingService()
    result = await service.generate_copy(
        product_description=request.product_description,
        style=request.style,
        platform=request.platform,
    )

    # 提交交易
    await db.commit()

    # 根據平台返回不同格式
    if request.platform == "all":
        return {
            "google": result.get("google", {"headlines": [], "descriptions": []}),
            "meta": result.get("meta", {"primary_texts": [], "headlines": [], "descriptions": []}),
        }
    elif request.platform == "meta":
        return {
            "primary_texts": result.get("primary_texts", []),
            "headlines": result.get("headlines", []),
            "descriptions": result.get("descriptions", []),
        }
    else:  # google
        return {
            "headlines": result.get("headlines", []),
            "descriptions": result.get("descriptions", []),
        }
