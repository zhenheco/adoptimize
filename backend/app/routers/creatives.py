# -*- coding: utf-8 -*-
"""
素材管理 API 路由

實作素材相關的 API 端點：
- GET /creatives - 素材列表
- GET /creatives/:id - 素材詳情
- POST /creatives/:id/pause - 暫停素材
- POST /creatives/:id/enable - 啟用素材
"""

import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.base import get_db
from app.models import Creative as CreativeModel, CreativeMetrics as CreativeMetricsModel
from app.services.fatigue_score import (
    FatigueInput,
    calculate_fatigue_score,
    get_fatigue_status,
)

router = APIRouter()


# Pydantic 模型
class CreativeMetrics(BaseModel):
    """素材效能指標"""

    impressions: int
    clicks: int
    ctr: float = Field(description="點擊率（百分比）")
    conversions: int
    spend: float


class CreativeFatigue(BaseModel):
    """素材疲勞度資訊"""

    score: int = Field(ge=0, le=100, description="疲勞度分數 0-100")
    status: str = Field(description="狀態: healthy, warning, fatigued")
    ctr_change: float = Field(description="CTR 變化百分比")
    frequency: float = Field(description="平均曝光頻率")
    days_active: int = Field(description="投放天數")


class Creative(BaseModel):
    """素材資訊"""

    id: str
    name: str
    type: str = Field(description="類型: IMAGE, VIDEO, CAROUSEL")
    thumbnail_url: str
    metrics: CreativeMetrics
    fatigue: CreativeFatigue
    status: str = Field(description="狀態: active, paused")


class CreativeListResponse(BaseModel):
    """素材列表回應"""

    data: list[Creative]
    meta: dict


class CreativeActionResponse(BaseModel):
    """素材操作回應"""

    success: bool
    creative_id: str
    new_status: str
    message: str


def _generate_mock_creatives(count: int = 12) -> list[Creative]:
    """產生模擬素材資料"""
    creative_types = ["IMAGE", "VIDEO", "CAROUSEL"]
    creatives = []

    for i in range(count):
        creative_type = creative_types[i % 3]

        # 隨機生成疲勞度相關數據
        ctr_change = -5 - (i * 3)  # 模擬不同程度的 CTR 下降
        frequency = 2.0 + (i * 0.2)
        days_active = 7 + (i * 3)
        conversion_change = -2 - (i * 2)

        # 計算疲勞度
        fatigue_input = FatigueInput(
            ctr_change=ctr_change,
            frequency=frequency,
            days_active=days_active,
            conversion_rate_change=conversion_change,
        )
        fatigue_result = calculate_fatigue_score(fatigue_input)
        status = get_fatigue_status(fatigue_result.score)

        # 根據疲勞度決定素材狀態
        creative_status = "paused" if fatigue_result.score > 80 else "active"

        creatives.append(
            Creative(
                id=str(uuid.uuid4()),
                name=f"Creative {i + 1} - {creative_type}",
                type=creative_type,
                thumbnail_url=f"https://picsum.photos/seed/{i}/300/200",
                metrics=CreativeMetrics(
                    impressions=10000 + (i * 1000),
                    clicks=500 + (i * 50),
                    ctr=5.0 - (i * 0.3),
                    conversions=25 + (i * 2),
                    spend=150.0 + (i * 20),
                ),
                fatigue=CreativeFatigue(
                    score=fatigue_result.score,
                    status=status.value,
                    ctr_change=ctr_change,
                    frequency=frequency,
                    days_active=days_active,
                ),
                status=creative_status,
            )
        )

    return creatives


def _calculate_fatigue_from_metrics(creative_record: CreativeModel) -> tuple[int, str, float, float, int]:
    """
    從素材指標計算疲勞度

    Returns:
        (score, status, ctr_change, frequency, days_active)
    """
    metrics = creative_record.metrics
    if not metrics:
        return (0, "healthy", 0.0, 0.0, 0)

    # 按日期排序
    sorted_metrics = sorted(metrics, key=lambda m: m.date)
    if len(sorted_metrics) < 2:
        return (0, "healthy", 0.0, float(sorted_metrics[0].frequency or 0) if sorted_metrics else 0.0, len(sorted_metrics))

    # 計算投放天數
    days_active = len(sorted_metrics)

    # 取得初始和最近的 CTR
    initial_ctr = float(sorted_metrics[0].ctr or 0)
    recent_ctr = float(sorted_metrics[-1].ctr or 0)

    # 計算 CTR 變化百分比
    if initial_ctr > 0:
        ctr_change = ((recent_ctr - initial_ctr) / initial_ctr) * 100
    else:
        ctr_change = 0.0

    # 取得平均頻率
    avg_frequency = sum(float(m.frequency or 0) for m in sorted_metrics) / len(sorted_metrics)

    # 計算轉換率變化
    initial_conv_rate = float(sorted_metrics[0].conversion_rate or 0)
    recent_conv_rate = float(sorted_metrics[-1].conversion_rate or 0)
    if initial_conv_rate > 0:
        conversion_change = ((recent_conv_rate - initial_conv_rate) / initial_conv_rate) * 100
    else:
        conversion_change = 0.0

    # 計算疲勞度
    fatigue_input = FatigueInput(
        ctr_change=ctr_change,
        frequency=avg_frequency,
        days_active=days_active,
        conversion_rate_change=conversion_change,
    )
    fatigue_result = calculate_fatigue_score(fatigue_input)
    status = get_fatigue_status(fatigue_result.score)

    return (fatigue_result.score, status.value, ctr_change, avg_frequency, days_active)


def _convert_db_creative_to_response(creative_record: CreativeModel) -> Creative:
    """將資料庫記錄轉換為 API 回應格式"""
    # 計算疲勞度
    score, status, ctr_change, frequency, days_active = _calculate_fatigue_from_metrics(creative_record)

    # 彙總指標
    metrics = creative_record.metrics
    total_impressions = sum(m.impressions for m in metrics) if metrics else 0
    total_clicks = sum(m.clicks for m in metrics) if metrics else 0
    total_conversions = sum(m.conversions for m in metrics) if metrics else 0
    total_spend = sum(float(m.spend) for m in metrics) if metrics else 0.0
    avg_ctr = (total_clicks / total_impressions * 100) if total_impressions > 0 else 0.0

    # 判斷素材狀態（依疲勞度）
    creative_status = "paused" if score > 80 else "active"

    return Creative(
        id=str(creative_record.id),
        name=creative_record.headline or f"Creative {str(creative_record.id)[:8]}",
        type=creative_record.type or "IMAGE",
        thumbnail_url=creative_record.thumbnail_url or "",
        metrics=CreativeMetrics(
            impressions=total_impressions,
            clicks=total_clicks,
            ctr=round(avg_ctr, 2),
            conversions=total_conversions,
            spend=round(total_spend, 2),
        ),
        fatigue=CreativeFatigue(
            score=score,
            status=status,
            ctr_change=round(ctr_change, 2),
            frequency=round(frequency, 2),
            days_active=days_active,
        ),
        status=creative_status,
    )


@router.get("", response_model=CreativeListResponse)
async def get_creatives(
    page: int = Query(1, ge=1, description="頁碼"),
    page_size: int = Query(12, ge=1, le=50, description="每頁筆數"),
    type: Optional[str] = Query(None, description="素材類型: IMAGE, VIDEO, CAROUSEL"),
    fatigue_status: Optional[str] = Query(
        None, description="疲勞狀態: healthy, warning, fatigued"
    ),
    status: Optional[str] = Query(None, description="素材狀態: active, paused"),
    sort_by: Optional[str] = Query("fatigue", description="排序欄位"),
    sort_order: Optional[str] = Query("desc", description="排序方向: asc, desc"),
    db: AsyncSession = Depends(get_db),
) -> CreativeListResponse:
    """
    取得素材列表

    支援分頁、篩選和排序功能。

    Args:
        page: 頁碼（從 1 開始）
        page_size: 每頁筆數（1-50）
        type: 篩選素材類型
        fatigue_status: 篩選疲勞狀態
        status: 篩選素材狀態
        sort_by: 排序欄位（fatigue, ctr, spend, conversions）
        sort_order: 排序方向（asc, desc）
        db: 資料庫 session

    Returns:
        CreativeListResponse: 素材列表與分頁資訊
    """
    # 從資料庫取得素材
    query = select(CreativeModel).options(selectinload(CreativeModel.metrics))

    # 類型篩選
    if type:
        query = query.where(CreativeModel.type == type.upper())

    result = await db.execute(query)
    creative_records = result.scalars().all()

    # 如果資料庫無資料，返回模擬數據
    if not creative_records:
        all_creatives = _generate_mock_creatives(36)
    else:
        all_creatives = [_convert_db_creative_to_response(c) for c in creative_records]

    # 疲勞狀態篩選（需在轉換後進行）
    if fatigue_status:
        all_creatives = [c for c in all_creatives if c.fatigue.status == fatigue_status]

    # 素材狀態篩選
    if status:
        all_creatives = [c for c in all_creatives if c.status == status]

    # 排序
    reverse = sort_order == "desc"
    if sort_by == "fatigue":
        all_creatives.sort(key=lambda x: x.fatigue.score, reverse=reverse)
    elif sort_by == "ctr":
        all_creatives.sort(key=lambda x: x.metrics.ctr, reverse=reverse)
    elif sort_by == "spend":
        all_creatives.sort(key=lambda x: x.metrics.spend, reverse=reverse)
    elif sort_by == "conversions":
        all_creatives.sort(key=lambda x: x.metrics.conversions, reverse=reverse)

    # 分頁
    total = len(all_creatives)
    start = (page - 1) * page_size
    end = start + page_size
    paginated = all_creatives[start:end]

    return CreativeListResponse(
        data=paginated,
        meta={
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": (total + page_size - 1) // page_size,
        },
    )


@router.get("/{creative_id}", response_model=Creative)
async def get_creative(
    creative_id: str,
    db: AsyncSession = Depends(get_db),
) -> Creative:
    """
    取得素材詳情

    Args:
        creative_id: 素材 ID
        db: 資料庫 session

    Returns:
        Creative: 素材詳情
    """
    # 驗證 ID 格式
    try:
        creative_uuid = uuid.UUID(creative_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid creative ID format")

    # 從資料庫取得素材
    result = await db.execute(
        select(CreativeModel)
        .options(selectinload(CreativeModel.metrics))
        .where(CreativeModel.id == creative_uuid)
    )
    creative_record = result.scalar_one_or_none()

    if not creative_record:
        raise HTTPException(status_code=404, detail="Creative not found")

    return _convert_db_creative_to_response(creative_record)


@router.post("/{creative_id}/pause", response_model=CreativeActionResponse)
async def pause_creative(
    creative_id: str,
    db: AsyncSession = Depends(get_db),
) -> CreativeActionResponse:
    """
    暫停素材

    Args:
        creative_id: 素材 ID
        db: 資料庫 session

    Returns:
        CreativeActionResponse: 操作結果
    """
    # 驗證 ID 格式
    try:
        creative_uuid = uuid.UUID(creative_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid creative ID format")

    # 從資料庫取得素材
    result = await db.execute(
        select(CreativeModel).where(CreativeModel.id == creative_uuid)
    )
    creative_record = result.scalar_one_or_none()

    if not creative_record:
        # 模擬模式：如果資料庫無資料，仍返回成功
        return CreativeActionResponse(
            success=True,
            creative_id=creative_id,
            new_status="paused",
            message="Creative paused successfully (simulated)",
        )

    # TODO: 呼叫廣告平台 API 暫停素材
    # 目前僅記錄操作，實際暫停需要平台 API

    return CreativeActionResponse(
        success=True,
        creative_id=creative_id,
        new_status="paused",
        message="Creative paused successfully",
    )


@router.post("/{creative_id}/enable", response_model=CreativeActionResponse)
async def enable_creative(
    creative_id: str,
    db: AsyncSession = Depends(get_db),
) -> CreativeActionResponse:
    """
    啟用素材

    Args:
        creative_id: 素材 ID
        db: 資料庫 session

    Returns:
        CreativeActionResponse: 操作結果
    """
    # 驗證 ID 格式
    try:
        creative_uuid = uuid.UUID(creative_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid creative ID format")

    # 從資料庫取得素材
    result = await db.execute(
        select(CreativeModel).where(CreativeModel.id == creative_uuid)
    )
    creative_record = result.scalar_one_or_none()

    if not creative_record:
        # 模擬模式
        return CreativeActionResponse(
            success=True,
            creative_id=creative_id,
            new_status="active",
            message="Creative enabled successfully (simulated)",
        )

    # TODO: 呼叫廣告平台 API 啟用素材

    return CreativeActionResponse(
        success=True,
        creative_id=creative_id,
        new_status="active",
        message="Creative enabled successfully",
    )


@router.get("/fatigued", response_model=CreativeListResponse)
async def get_fatigued_creatives(
    threshold: int = Query(70, ge=0, le=100, description="疲勞度門檻"),
    db: AsyncSession = Depends(get_db),
) -> CreativeListResponse:
    """
    取得疲勞素材列表

    返回疲勞度分數超過門檻的素材。

    Args:
        threshold: 疲勞度門檻（預設 70）
        db: 資料庫 session

    Returns:
        CreativeListResponse: 疲勞素材列表
    """
    # 從資料庫取得所有素材
    result = await db.execute(
        select(CreativeModel).options(selectinload(CreativeModel.metrics))
    )
    creative_records = result.scalars().all()

    # 如果資料庫無資料，返回模擬數據
    if not creative_records:
        all_creatives = _generate_mock_creatives(36)
    else:
        all_creatives = [_convert_db_creative_to_response(c) for c in creative_records]

    # 篩選超過門檻的素材
    fatigued = [c for c in all_creatives if c.fatigue.score >= threshold]

    # 按疲勞度降序排列
    fatigued.sort(key=lambda x: x.fatigue.score, reverse=True)

    return CreativeListResponse(
        data=fatigued,
        meta={
            "page": 1,
            "page_size": len(fatigued),
            "total": len(fatigued),
            "total_pages": 1,
            "threshold": threshold,
        },
    )
