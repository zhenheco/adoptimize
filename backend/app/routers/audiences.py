# -*- coding: utf-8 -*-
"""
受眾分析 API 路由

實作受眾相關的 API 端點：
- GET /audiences - 受眾列表
- GET /audiences/:id - 受眾詳情
- GET /audiences/overlap - 重疊分析
"""

import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.base import get_db
from app.models import Audience as AudienceModel
from app.services.audience_health import (
    AudienceHealthInput,
    calculate_audience_health,
    get_audience_health_status,
)

router = APIRouter()


# Pydantic 模型
class AudienceMetrics(BaseModel):
    """受眾效能指標"""

    reach: int
    impressions: int
    conversions: int
    spend: float
    cpa: float
    roas: float


class Audience(BaseModel):
    """受眾資訊"""

    id: str
    name: str
    type: str = Field(description="類型: CUSTOM, LOOKALIKE, SAVED")
    size: int = Field(description="受眾規模")
    source: str = Field(description="來源: WEBSITE, CUSTOMER_LIST, APP")
    metrics: AudienceMetrics
    health_score: int = Field(ge=0, le=100, description="健康度分數 0-100")
    health_status: str = Field(description="健康狀態: healthy, warning, critical")


class AudienceListResponse(BaseModel):
    """受眾列表回應"""

    data: list[Audience]
    meta: dict


class OverlapPair(BaseModel):
    """受眾重疊配對"""

    audience_a: dict
    audience_b: dict
    overlap_rate: float = Field(ge=0, le=1, description="重疊率 0-1")
    status: str = Field(description="狀態: normal, warning, danger")
    recommendation: str


class OverlapAnalysisResponse(BaseModel):
    """重疊分析回應"""

    pairs: list[OverlapPair]
    meta: dict


def _calculate_health_from_metrics(audience_record: AudienceModel) -> tuple[int, str]:
    """
    從受眾指標計算健康度

    Returns:
        (score, status)
    """
    metrics = audience_record.metrics
    if not metrics:
        return (100, "healthy")

    # 彙總指標
    total_conversions = sum(m.conversions for m in metrics)
    total_spend = sum(float(m.spend) for m in metrics)
    avg_cpa = (total_spend / total_conversions) if total_conversions > 0 else 0
    avg_roas = sum(float(m.roas or 0) for m in metrics) / len(metrics) if metrics else 0

    # 計算更新天數
    if metrics:
        latest_date = max(m.date for m in metrics)
        days_since_update = (datetime.now(timezone.utc).date() - latest_date).days
    else:
        days_since_update = 0

    # 計算健康度
    health_input = AudienceHealthInput(
        size=audience_record.size or 0,
        cpa=avg_cpa,
        account_avg_cpa=avg_cpa,  # 簡化：使用自身 CPA 作為基準
        roas=avg_roas,
        days_since_update=days_since_update,
    )
    health_result = calculate_audience_health(health_input)
    health_status = get_audience_health_status(health_result.score)

    return (health_result.score, health_status.value)


def _convert_db_audience_to_response(audience_record: AudienceModel) -> Audience:
    """將資料庫記錄轉換為 API 回應格式"""
    # 計算健康度
    score, status = _calculate_health_from_metrics(audience_record)

    # 彙總指標
    metrics = audience_record.metrics
    total_reach = sum(m.reach for m in metrics) if metrics else 0
    total_impressions = sum(m.impressions for m in metrics) if metrics else 0
    total_conversions = sum(m.conversions for m in metrics) if metrics else 0
    total_spend = sum(float(m.spend) for m in metrics) if metrics else 0.0
    avg_cpa = (total_spend / total_conversions) if total_conversions > 0 else 0
    avg_roas = sum(float(m.roas or 0) for m in metrics) / len(metrics) if metrics else 0

    return Audience(
        id=str(audience_record.id),
        name=audience_record.name or f"Audience {str(audience_record.id)[:8]}",
        type=audience_record.type or "CUSTOM",
        size=audience_record.size or 0,
        source=audience_record.source or "WEBSITE",
        metrics=AudienceMetrics(
            reach=total_reach,
            impressions=total_impressions,
            conversions=total_conversions,
            spend=round(total_spend, 2),
            cpa=round(avg_cpa, 2),
            roas=round(avg_roas, 2),
        ),
        health_score=score,
        health_status=status,
    )


@router.get("", response_model=AudienceListResponse)
async def get_audiences(
    page: int = Query(1, ge=1, description="頁碼"),
    page_size: int = Query(12, ge=1, le=50, description="每頁筆數"),
    type: Optional[str] = Query(None, description="受眾類型: CUSTOM, LOOKALIKE, SAVED"),
    health_status: Optional[str] = Query(
        None, description="健康狀態: healthy, warning, critical"
    ),
    sort_by: Optional[str] = Query("health_score", description="排序欄位"),
    sort_order: Optional[str] = Query("desc", description="排序方向: asc, desc"),
    db: AsyncSession = Depends(get_db),
) -> AudienceListResponse:
    """
    取得受眾列表

    支援分頁、篩選和排序功能。

    Args:
        page: 頁碼（從 1 開始）
        page_size: 每頁筆數（1-50）
        type: 篩選受眾類型
        health_status: 篩選健康狀態
        sort_by: 排序欄位（health_score, cpa, roas, size, conversions, spend）
        sort_order: 排序方向（asc, desc）
        db: 資料庫 session

    Returns:
        AudienceListResponse: 受眾列表與分頁資訊
    """
    # 從資料庫取得受眾
    query = select(AudienceModel).options(selectinload(AudienceModel.metrics))

    # 類型篩選
    if type:
        query = query.where(AudienceModel.type == type.upper())

    result = await db.execute(query)
    audience_records = result.scalars().all()

    # 轉換為 API 回應格式
    all_audiences = [_convert_db_audience_to_response(a) for a in audience_records]

    # 健康狀態篩選
    if health_status:
        all_audiences = [a for a in all_audiences if a.health_status == health_status]

    # 排序
    reverse = sort_order == "desc"
    if sort_by == "health_score":
        all_audiences.sort(key=lambda x: x.health_score, reverse=reverse)
    elif sort_by == "cpa":
        all_audiences.sort(key=lambda x: x.metrics.cpa, reverse=reverse)
    elif sort_by == "roas":
        all_audiences.sort(key=lambda x: x.metrics.roas, reverse=reverse)
    elif sort_by == "size":
        all_audiences.sort(key=lambda x: x.size, reverse=reverse)
    elif sort_by == "conversions":
        all_audiences.sort(key=lambda x: x.metrics.conversions, reverse=reverse)
    elif sort_by == "spend":
        all_audiences.sort(key=lambda x: x.metrics.spend, reverse=reverse)

    # 分頁
    total = len(all_audiences)
    start = (page - 1) * page_size
    end = start + page_size
    paginated = all_audiences[start:end]

    return AudienceListResponse(
        data=paginated,
        meta={
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": (total + page_size - 1) // page_size,
        },
    )


@router.get("/overlap", response_model=OverlapAnalysisResponse)
async def get_audience_overlap(
    account_id: Optional[str] = Query(None, description="帳戶 ID"),
    threshold: float = Query(0.2, ge=0, le=1, description="重疊警示門檻"),
    db: AsyncSession = Depends(get_db),
) -> OverlapAnalysisResponse:
    """
    取得受眾重疊分析

    分析帳戶內受眾之間的重疊情況。

    Args:
        account_id: 帳戶 ID（可選）
        threshold: 重疊警示門檻（預設 0.2 = 20%）
        db: 資料庫 session

    Returns:
        OverlapAnalysisResponse: 重疊分析結果
    """
    # TODO: 實作實際的重疊分析
    # 這需要從廣告平台 API 取得重疊數據
    # 目前返回空列表，待廣告平台 API 整合後實作

    # 驗證 account_id 格式
    if account_id:
        try:
            uuid.UUID(account_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid account_id format")

    # 重疊分析需要從廣告平台 API 取得，目前返回空結果
    return OverlapAnalysisResponse(
        pairs=[],
        meta={
            "threshold": threshold,
            "total_pairs_analyzed": 0,
            "pairs_above_threshold": 0,
            "message": "Overlap analysis requires ad platform API integration",
        },
    )


@router.get("/{audience_id}", response_model=Audience)
async def get_audience(
    audience_id: str,
    db: AsyncSession = Depends(get_db),
) -> Audience:
    """
    取得受眾詳情

    Args:
        audience_id: 受眾 ID
        db: 資料庫 session

    Returns:
        Audience: 受眾詳情
    """
    # 驗證 ID 格式
    try:
        audience_uuid = uuid.UUID(audience_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid audience ID format")

    # 從資料庫取得受眾
    result = await db.execute(
        select(AudienceModel)
        .options(selectinload(AudienceModel.metrics))
        .where(AudienceModel.id == audience_uuid)
    )
    audience_record = result.scalar_one_or_none()

    if not audience_record:
        raise HTTPException(status_code=404, detail="Audience not found")

    return _convert_db_audience_to_response(audience_record)
