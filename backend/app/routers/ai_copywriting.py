# -*- coding: utf-8 -*-
"""
AI 文案生成 API 路由
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.auth import get_current_user
from app.models.user import User
from app.services.ai_copywriting_service import AICopywritingService

router = APIRouter()


class CopywritingRequest(BaseModel):
    """文案生成請求"""
    product_description: str
    style: str = "professional"


class CopywritingResponse(BaseModel):
    """文案生成回應"""
    headlines: list[str]
    descriptions: list[str]


@router.post("/copywriting")
async def generate_copywriting(
    request: CopywritingRequest,
    current_user: User = Depends(get_current_user),
) -> CopywritingResponse:
    """
    生成廣告文案
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
    )

    # TODO: 更新用戶用量
    # current_user.ai_copywriting_count += 1

    return CopywritingResponse(
        headlines=result.get("headlines", []),
        descriptions=result.get("descriptions", []),
    )
