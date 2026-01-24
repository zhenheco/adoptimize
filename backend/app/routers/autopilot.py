# -*- coding: utf-8 -*-
"""
自動駕駛 API 路由
"""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.middleware.auth import get_current_user
from app.db.session import get_async_session
from app.models.ad_account import AdAccount
from app.models.autopilot_log import AutopilotLog
from app.models.user import User

router = APIRouter()


class AutopilotSettingsSchema(BaseModel):
    """自動駕駛設定 Schema"""
    target_cpa: Optional[float] = None
    monthly_budget: Optional[float] = None
    goal_type: str = "maximize_conversions"
    auto_pause_enabled: bool = True
    auto_adjust_budget_enabled: bool = True
    auto_boost_enabled: bool = False
    notify_before_action: bool = False


class AutopilotStatusResponse(BaseModel):
    """自動駕駛狀態回應"""
    enabled: bool
    settings: AutopilotSettingsSchema
    stats: dict


class AutopilotLogResponse(BaseModel):
    """執行記錄回應"""
    id: UUID
    action_type: str
    target_name: Optional[str]
    reason: str
    estimated_savings: Optional[float]
    executed_at: str


@router.get("/settings")
async def get_autopilot_settings(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
) -> AutopilotStatusResponse:
    """
    取得自動駕駛設定
    """
    # 取得用戶的第一個廣告帳戶（簡化版）
    stmt = select(AdAccount).where(AdAccount.user_id == current_user.id).limit(1)
    result = await session.execute(stmt)
    account = result.scalar_one_or_none()

    if not account:
        return AutopilotStatusResponse(
            enabled=False,
            settings=AutopilotSettingsSchema(),
            stats={"total_savings": 0, "actions_count": 0, "days_running": 0},
        )

    settings = account.autopilot_settings or {}

    # 計算統計數據
    logs_stmt = select(AutopilotLog).where(AutopilotLog.ad_account_id == account.id)
    logs_result = await session.execute(logs_stmt)
    logs = logs_result.scalars().all()

    total_savings = sum(float(log.estimated_savings or 0) for log in logs)

    return AutopilotStatusResponse(
        enabled=account.autopilot_enabled,
        settings=AutopilotSettingsSchema(**settings),
        stats={
            "total_savings": total_savings,
            "actions_count": len(logs),
            "days_running": 15,  # TODO: 計算實際天數
        },
    )


@router.put("/settings")
async def update_autopilot_settings(
    settings: AutopilotSettingsSchema,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
) -> dict:
    """
    更新自動駕駛設定
    """
    stmt = select(AdAccount).where(AdAccount.user_id == current_user.id).limit(1)
    result = await session.execute(stmt)
    account = result.scalar_one_or_none()

    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="找不到廣告帳戶",
        )

    account.autopilot_settings = settings.model_dump()
    await session.commit()

    return {"message": "設定已更新"}


@router.post("/toggle")
async def toggle_autopilot(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
) -> dict:
    """
    啟用/停用自動駕駛
    """
    stmt = select(AdAccount).where(AdAccount.user_id == current_user.id).limit(1)
    result = await session.execute(stmt)
    account = result.scalar_one_or_none()

    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="找不到廣告帳戶",
        )

    account.autopilot_enabled = not account.autopilot_enabled
    await session.commit()

    return {
        "enabled": account.autopilot_enabled,
        "message": "自動駕駛已" + ("啟用" if account.autopilot_enabled else "停用"),
    }


@router.get("/logs")
async def get_autopilot_logs(
    limit: int = 20,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
) -> list[AutopilotLogResponse]:
    """
    取得自動駕駛執行記錄
    """
    # 取得用戶的帳戶
    accounts_stmt = select(AdAccount.id).where(AdAccount.user_id == current_user.id)
    accounts_result = await session.execute(accounts_stmt)
    account_ids = [row[0] for row in accounts_result.all()]

    if not account_ids:
        return []

    # 取得執行記錄
    logs_stmt = (
        select(AutopilotLog)
        .where(AutopilotLog.ad_account_id.in_(account_ids))
        .order_by(AutopilotLog.executed_at.desc())
        .limit(limit)
        .offset(offset)
    )
    result = await session.execute(logs_stmt)
    logs = result.scalars().all()

    return [
        AutopilotLogResponse(
            id=log.id,
            action_type=log.action_type,
            target_name=log.target_name,
            reason=log.reason,
            estimated_savings=float(log.estimated_savings) if log.estimated_savings else None,
            executed_at=log.executed_at.isoformat(),
        )
        for log in logs
    ]
