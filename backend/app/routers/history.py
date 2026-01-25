# -*- coding: utf-8 -*-
"""
操作歷史 API 路由

實作操作歷史相關的 API 端點：
- GET /history - 操作歷史列表
- POST /history/:id/revert - 還原操作
"""

import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logger import get_logger
from app.db.base import get_db
from app.models.action_history import ActionHistory as ActionHistoryDBModel
from app.models.recommendation import Recommendation as RecommendationDBModel

logger = get_logger(__name__)

router = APIRouter()


class RevertResponse(BaseModel):
    """還原操作回應"""

    success: bool
    id: str
    reverted: bool
    reverted_at: Optional[str] = None
    error: Optional[str] = None


@router.post("/{history_id}/revert", response_model=RevertResponse)
async def revert_action(
    history_id: str,
    db: AsyncSession = Depends(get_db),
) -> RevertResponse:
    """
    還原操作

    根據操作歷史記錄還原先前的變更。

    Args:
        history_id: 操作歷史 ID
        db: 資料庫 session

    Returns:
        RevertResponse: 還原結果
    """
    # 驗證 ID 格式
    try:
        history_uuid = uuid.UUID(history_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid history ID format")

    # 從資料庫取得操作歷史
    try:
        result = await db.execute(
            select(ActionHistoryDBModel).where(ActionHistoryDBModel.id == history_uuid)
        )
        history_record = result.scalar_one_or_none()
    except Exception as e:
        logger.error(f"Database connection failed in revert_action: {e}")
        raise HTTPException(status_code=503, detail="Database service unavailable")

    if not history_record:
        raise HTTPException(status_code=404, detail="History record not found")

    if history_record.reverted:
        raise HTTPException(status_code=400, detail="This action has already been reverted")

    # 還原相關建議的狀態（如果有）
    if history_record.recommendation_id and history_record.before_state:
        try:
            rec_result = await db.execute(
                select(RecommendationDBModel).where(
                    RecommendationDBModel.id == history_record.recommendation_id
                )
            )
            rec_record = rec_result.scalar_one_or_none()

            if rec_record and "status" in history_record.before_state:
                rec_record.status = history_record.before_state["status"]
        except Exception as e:
            logger.warning(f"Failed to revert recommendation status: {e}")

    # 標記操作已還原
    reverted_at = datetime.now(timezone.utc)
    try:
        history_record.reverted = True
        history_record.reverted_at = reverted_at
        await db.flush()
    except Exception as e:
        logger.error(f"Database update failed in revert_action: {e}")
        raise HTTPException(status_code=503, detail="Database service unavailable")

    logger.info(f"Action {history_id} reverted successfully")

    return RevertResponse(
        success=True,
        id=history_id,
        reverted=True,
        reverted_at=reverted_at.isoformat(),
    )
