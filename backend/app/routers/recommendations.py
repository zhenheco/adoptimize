# -*- coding: utf-8 -*-
"""
建議/行動中心 API 路由

實作建議相關的 API 端點：
- GET /recommendations - 建議列表
- POST /recommendations/:id/execute - 執行建議
- POST /recommendations/:id/ignore - 忽略建議
- GET /recommendations/history - 操作歷史
"""

import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import get_db
from app.models import Recommendation as RecommendationDBModel, ActionHistory as ActionHistoryDBModel, User
from app.services.action_limiter import (
    check_action_limit,
    increment_action_count,
    get_tier_from_string,
)
from app.services.recommendation_engine import (
    ActionDifficulty,
    ActionModule,
    ActionParams,
    Recommendation as RecommendationServiceModel,
    RecommendationStatus,
    calculate_priority_score,
)

router = APIRouter()


# Pydantic 模型
class Recommendation(BaseModel):
    """建議資訊"""

    id: str
    type: str
    priority_score: int = Field(ge=0, description="優先級分數")
    title: str
    description: str
    action_module: str
    action_params: Optional[dict] = None
    estimated_impact: float
    status: str = Field(description="狀態: pending, executed, ignored")
    created_at: str


class RecommendationListResponse(BaseModel):
    """建議列表回應"""

    data: list[Recommendation]
    meta: dict
    summary: dict


class RecommendationActionResponse(BaseModel):
    """建議操作回應"""

    success: bool
    recommendation_id: str
    new_status: str
    message: str
    executed_at: Optional[str] = None
    remaining_actions: Optional[int] = None  # Starter 用戶的剩餘次數


class ActionHistoryItem(BaseModel):
    """操作歷史項目"""

    id: str
    recommendation_id: str
    action_type: str
    target_type: str
    target_id: str
    before_state: Optional[dict] = None
    after_state: Optional[dict] = None
    created_at: str
    reverted: bool = False


class ActionHistoryResponse(BaseModel):
    """操作歷史回應"""

    data: list[ActionHistoryItem]
    meta: dict


def _generate_mock_recommendations(count: int = 15) -> list[Recommendation]:
    """產生模擬建議資料"""
    from app.services.audit_engine import IssueSeverity

    recommendation_types = [
        ("pause_fatigued_creative", "暫停疲勞素材", ActionModule.PAUSE_CREATIVE),
        ("reduce_budget", "降低低效預算", ActionModule.ADJUST_BUDGET),
        ("exclude_audience", "排除重疊受眾", ActionModule.ADD_EXCLUSION),
        ("fix_tracking", "修復追蹤設定", ActionModule.MANUAL_FIX),
        ("pause_campaign", "暫停低效廣告活動", ActionModule.PAUSE_CAMPAIGN),
    ]

    recommendations = []

    for i in range(count):
        rec_type, title_base, action_module = recommendation_types[i % len(recommendation_types)]

        # 計算優先級分數
        impact_score = 500 - (i * 30)  # 模擬不同影響金額
        difficulty = ActionDifficulty.ONE_CLICK if i % 3 == 0 else ActionDifficulty.SIMPLE
        entity_count = 1 + (i % 5)
        severity = IssueSeverity.HIGH if i < 5 else IssueSeverity.MEDIUM

        priority = calculate_priority_score(
            severity=severity,
            estimated_impact=impact_score,
            difficulty=difficulty,
            affected_entities_count=entity_count,
        )

        # 決定狀態
        if i < 3:
            status = "pending"
        elif i < 8:
            status = "executed"
        else:
            status = "ignored"

        recommendations.append(
            Recommendation(
                id=str(uuid.uuid4()),
                type=rec_type,
                priority_score=priority,
                title=f"{title_base} #{i + 1}",
                description=f"建議說明：根據分析，此項目需要進行 {title_base} 操作以優化廣告效能。",
                action_module=action_module.value,
                action_params={
                    "target_id": str(uuid.uuid4()),
                    "target_type": "creative" if "creative" in rec_type else "campaign",
                },
                estimated_impact=round(impact_score, 2),
                status=status,
                created_at=datetime.now(timezone.utc).isoformat(),
            )
        )

    # 按優先級排序
    recommendations.sort(key=lambda x: x.priority_score, reverse=True)

    return recommendations


def _convert_db_recommendation_to_response(rec: RecommendationDBModel) -> Recommendation:
    """將資料庫記錄轉換為 API 回應格式"""
    return Recommendation(
        id=str(rec.id),
        type=rec.type or "unknown",
        priority_score=rec.priority_score or 0,
        title=rec.title or "",
        description=rec.description or "",
        action_module=rec.action_module or "manual_fix",
        action_params=rec.action_params,
        estimated_impact=float(rec.estimated_impact or 0),
        status=rec.status,
        created_at=rec.created_at.isoformat() if rec.created_at else datetime.now(timezone.utc).isoformat(),
    )


@router.get("", response_model=RecommendationListResponse)
async def get_recommendations(
    page: int = Query(1, ge=1, description="頁碼"),
    page_size: int = Query(20, ge=1, le=50, description="每頁筆數"),
    status: Optional[str] = Query(
        None, description="狀態: pending, executed, ignored"
    ),
    type: Optional[str] = Query(None, description="建議類型"),
    sort_by: Optional[str] = Query("priority_score", description="排序欄位"),
    sort_order: Optional[str] = Query("desc", description="排序方向: asc, desc"),
    db: AsyncSession = Depends(get_db),
) -> RecommendationListResponse:
    """
    取得建議列表

    支援分頁、篩選和排序功能。

    Args:
        page: 頁碼（從 1 開始）
        page_size: 每頁筆數（1-50）
        status: 篩選狀態
        type: 篩選建議類型
        sort_by: 排序欄位（priority_score, estimated_impact, created_at）
        sort_order: 排序方向（asc, desc）
        db: 資料庫 session

    Returns:
        RecommendationListResponse: 建議列表與分頁資訊
    """
    try:
        # 從資料庫取得建議
        query = select(RecommendationDBModel)

        # 狀態篩選
        if status:
            query = query.where(RecommendationDBModel.status == status)

        # 類型篩選
        if type:
            query = query.where(RecommendationDBModel.type == type)

        result = await db.execute(query)
        rec_records = result.scalars().all()

        # 如果資料庫無資料，返回模擬數據
        if not rec_records:
            all_recommendations = _generate_mock_recommendations(30)
            # 狀態篩選
            if status:
                all_recommendations = [r for r in all_recommendations if r.status == status]
            # 類型篩選
            if type:
                all_recommendations = [r for r in all_recommendations if r.type == type]
        else:
            all_recommendations = [_convert_db_recommendation_to_response(r) for r in rec_records]
    except Exception as e:
        # 資料庫連線失敗時，返回模擬數據
        import logging
        logging.warning(f"Database connection failed, returning mock data: {e}")
        all_recommendations = _generate_mock_recommendations(30)
        # 狀態篩選
        if status:
            all_recommendations = [r for r in all_recommendations if r.status == status]
        # 類型篩選
        if type:
            all_recommendations = [r for r in all_recommendations if r.type == type]

    # 排序
    reverse = sort_order == "desc"
    if sort_by == "priority_score":
        all_recommendations.sort(key=lambda x: x.priority_score, reverse=reverse)
    elif sort_by == "estimated_impact":
        all_recommendations.sort(key=lambda x: x.estimated_impact, reverse=reverse)
    elif sort_by == "created_at":
        all_recommendations.sort(key=lambda x: x.created_at, reverse=reverse)

    # 計算摘要
    pending_count = len([r for r in all_recommendations if r.status == "pending"])
    total_impact = sum(r.estimated_impact for r in all_recommendations if r.status == "pending")

    # 分頁
    total = len(all_recommendations)
    start = (page - 1) * page_size
    end = start + page_size
    paginated = all_recommendations[start:end]

    return RecommendationListResponse(
        data=paginated,
        meta={
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": (total + page_size - 1) // page_size,
        },
        summary={
            "pending_count": pending_count,
            "estimated_savings": round(total_impact, 2),
        },
    )


@router.get("/{recommendation_id}", response_model=Recommendation)
async def get_recommendation(
    recommendation_id: str,
    db: AsyncSession = Depends(get_db),
) -> Recommendation:
    """
    取得建議詳情

    Args:
        recommendation_id: 建議 ID
        db: 資料庫 session

    Returns:
        Recommendation: 建議詳情
    """
    # 驗證 ID 格式
    try:
        rec_uuid = uuid.UUID(recommendation_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid recommendation ID format")

    # 從資料庫取得建議
    result = await db.execute(
        select(RecommendationDBModel).where(RecommendationDBModel.id == rec_uuid)
    )
    rec_record = result.scalar_one_or_none()

    if not rec_record:
        raise HTTPException(status_code=404, detail="Recommendation not found")

    return _convert_db_recommendation_to_response(rec_record)


@router.post("/{recommendation_id}/execute", response_model=RecommendationActionResponse)
async def execute_recommendation(
    recommendation_id: str,
    user_id: Optional[str] = Query(None, description="用戶 ID（用於檢查執行限制）"),
    db: AsyncSession = Depends(get_db),
) -> RecommendationActionResponse:
    """
    執行建議

    根據建議的 action_module 和 action_params 執行對應操作。
    Starter 用戶每月限制 10 次一鍵執行。

    Args:
        recommendation_id: 建議 ID
        user_id: 用戶 ID（可選，用於檢查執行限制）
        db: 資料庫 session

    Returns:
        RecommendationActionResponse: 操作結果
    """
    # 驗證 ID 格式
    try:
        rec_uuid = uuid.UUID(recommendation_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid recommendation ID format")

    # 取得用戶資訊並檢查執行限制
    user_record = None
    limit_result = None
    tier = None  # 訂閱層級

    if user_id:
        try:
            user_uuid = uuid.UUID(user_id)
            result = await db.execute(select(User).where(User.id == user_uuid))
            user_record = result.scalar_one_or_none()
        except ValueError:
            pass

    if user_record:
        # 檢查用戶執行限制
        tier = get_tier_from_string(user_record.subscription_tier)
        limit_result = check_action_limit(
            tier,
            user_record.monthly_action_count,
            user_record.action_count_reset_at,
        )

        if not limit_result.can_execute:
            raise HTTPException(
                status_code=429,
                detail={
                    "message": limit_result.message,
                    "limit": limit_result.limit,
                    "current_count": limit_result.current_count,
                    "resets_at": limit_result.resets_at.isoformat(),
                },
            )

    # 從資料庫取得建議
    result = await db.execute(
        select(RecommendationDBModel).where(RecommendationDBModel.id == rec_uuid)
    )
    rec_record = result.scalar_one_or_none()

    executed_at = datetime.now(timezone.utc)

    if not rec_record:
        # 模擬模式：如果資料庫無資料，仍返回成功
        return RecommendationActionResponse(
            success=True,
            recommendation_id=recommendation_id,
            new_status="executed",
            message="建議已成功執行 (simulated)",
            executed_at=executed_at.isoformat(),
            remaining_actions=limit_result.remaining_actions if limit_result else None,
        )

    # 記錄操作前狀態
    before_state = {"status": rec_record.status}

    # 更新建議狀態
    rec_record.status = "executed"
    rec_record.executed_at = executed_at

    # 遞增用戶執行次數
    if user_record:
        new_count, new_reset_date = increment_action_count(
            user_record.monthly_action_count,
            user_record.action_count_reset_at,
        )
        user_record.monthly_action_count = new_count
        user_record.action_count_reset_at = new_reset_date

        # 重新計算剩餘次數
        if tier:
            limit_result = check_action_limit(
                tier,
                new_count,
                new_reset_date,
            )

    # 記錄操作歷史
    action_history = ActionHistoryDBModel(
        id=uuid.uuid4(),
        recommendation_id=rec_uuid,
        action_type="EXECUTE",
        target_type=rec_record.action_params.get("target_type", "unknown") if rec_record.action_params else "unknown",
        target_id=rec_record.action_params.get("target_id", str(rec_uuid)) if rec_record.action_params else str(rec_uuid),
        before_state=before_state,
        after_state={"status": "executed"},
        created_at=executed_at,
        user_id=user_record.id if user_record else None,
    )
    db.add(action_history)
    await db.flush()

    return RecommendationActionResponse(
        success=True,
        recommendation_id=recommendation_id,
        new_status="executed",
        message="建議已成功執行",
        executed_at=executed_at.isoformat(),
        remaining_actions=limit_result.remaining_actions if limit_result else None,
    )


@router.post("/{recommendation_id}/ignore", response_model=RecommendationActionResponse)
async def ignore_recommendation(
    recommendation_id: str,
    db: AsyncSession = Depends(get_db),
) -> RecommendationActionResponse:
    """
    忽略建議

    Args:
        recommendation_id: 建議 ID
        db: 資料庫 session

    Returns:
        RecommendationActionResponse: 操作結果
    """
    # 驗證 ID 格式
    try:
        rec_uuid = uuid.UUID(recommendation_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid recommendation ID format")

    # 從資料庫取得建議
    result = await db.execute(
        select(RecommendationDBModel).where(RecommendationDBModel.id == rec_uuid)
    )
    rec_record = result.scalar_one_or_none()

    if not rec_record:
        # 模擬模式：如果資料庫無資料，仍返回成功
        return RecommendationActionResponse(
            success=True,
            recommendation_id=recommendation_id,
            new_status="ignored",
            message="建議已忽略 (simulated)",
        )

    # 更新建議狀態
    rec_record.status = "ignored"
    await db.flush()

    return RecommendationActionResponse(
        success=True,
        recommendation_id=recommendation_id,
        new_status="ignored",
        message="建議已忽略",
    )


@router.get("/history/all", response_model=ActionHistoryResponse)
async def get_action_history(
    page: int = Query(1, ge=1, description="頁碼"),
    page_size: int = Query(20, ge=1, le=50, description="每頁筆數"),
    action_type: Optional[str] = Query(None, description="操作類型"),
    days: int = Query(30, ge=1, le=90, description="查詢天數"),
    db: AsyncSession = Depends(get_db),
) -> ActionHistoryResponse:
    """
    取得操作歷史

    Args:
        page: 頁碼
        page_size: 每頁筆數
        action_type: 篩選操作類型
        days: 查詢過去幾天（1-90）
        db: 資料庫 session

    Returns:
        ActionHistoryResponse: 操作歷史列表
    """
    history_records = []
    try:
        # 計算查詢起始日期
        start_date = datetime.now(timezone.utc) - timedelta(days=days)

        # 建立查詢
        query = select(ActionHistoryDBModel).where(
            ActionHistoryDBModel.created_at >= start_date
        )

        # 操作類型篩選
        if action_type:
            query = query.where(ActionHistoryDBModel.action_type == action_type)

        # 排序（最新在前）
        query = query.order_by(ActionHistoryDBModel.created_at.desc())

        result = await db.execute(query)
        history_records = result.scalars().all()
    except Exception as e:
        # 資料庫連線失敗時，返回空列表（將回傳模擬數據）
        import logging
        logging.warning(f"Database connection failed, returning mock data: {e}")
        history_records = []

    # 如果資料庫無資料，返回模擬數據
    if not history_records:
        mock_history = [
            ActionHistoryItem(
                id=str(uuid.uuid4()),
                recommendation_id=str(uuid.uuid4()),
                action_type="PAUSE",
                target_type="CREATIVE",
                target_id=str(uuid.uuid4()),
                before_state={"status": "active"},
                after_state={"status": "paused"},
                created_at=datetime.now(timezone.utc).isoformat(),
                reverted=False,
            ),
            ActionHistoryItem(
                id=str(uuid.uuid4()),
                recommendation_id=str(uuid.uuid4()),
                action_type="BUDGET_CHANGE",
                target_type="CAMPAIGN",
                target_id=str(uuid.uuid4()),
                before_state={"budget": 100.0},
                after_state={"budget": 80.0},
                created_at=datetime.now(timezone.utc).isoformat(),
                reverted=False,
            ),
        ]
        return ActionHistoryResponse(
            data=mock_history,
            meta={
                "page": page,
                "page_size": page_size,
                "total": len(mock_history),
                "total_pages": 1,
                "days": days,
            },
        )

    # 轉換為回應格式
    all_history = [
        ActionHistoryItem(
            id=str(h.id),
            recommendation_id=str(h.recommendation_id) if h.recommendation_id else "",
            action_type=h.action_type or "",
            target_type=h.target_type or "",
            target_id=h.target_id or "",
            before_state=h.before_state,
            after_state=h.after_state,
            created_at=h.created_at.isoformat() if h.created_at else datetime.now(timezone.utc).isoformat(),
            reverted=h.reverted or False,
        )
        for h in history_records
    ]

    # 分頁
    total = len(all_history)
    start = (page - 1) * page_size
    end = start + page_size
    paginated = all_history[start:end]

    return ActionHistoryResponse(
        data=paginated,
        meta={
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": (total + page_size - 1) // page_size,
            "days": days,
        },
    )
