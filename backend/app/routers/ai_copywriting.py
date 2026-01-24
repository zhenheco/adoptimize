# -*- coding: utf-8 -*-
"""
AI 文案生成 API 路由

支援 Google Ads 和 Meta Ads 的文案生成
"""

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.middleware.auth import get_current_user
from app.models.user import User
from app.services.ai_copywriting_service import AICopywritingService

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
    current_user: User = Depends(get_current_user),
) -> dict:
    """
    生成廣告文案

    - **platform=google**: 生成 Google Ads RSA 文案（10 個標題 + 4 個描述）
    - **platform=meta**: 生成 Meta Ads 文案（3 個 Primary Text + 5 個標題 + 3 個描述）
    - **platform=all**: 同時生成兩個平台的文案
    """
    if not request.product_description.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="請提供商品描述",
        )

    # TODO: 檢查用戶用量限制
    # if current_user.ai_copywriting_count >= 20:
    #     raise HTTPException(
    #         status_code=status.HTTP_429_TOO_MANY_REQUESTS,
    #         detail="本月文案生成次數已達上限",
    #     )

    service = AICopywritingService()
    result = await service.generate_copy(
        product_description=request.product_description,
        style=request.style,
        platform=request.platform,
    )

    # TODO: 更新用戶用量
    # current_user.ai_copywriting_count += 1

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
