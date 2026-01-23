# -*- coding: utf-8 -*-
"""
報告 API 路由
"""

from datetime import date
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.db.session import get_async_session
from app.models.report import Report
from app.models.user import User

router = APIRouter()


class ReportSummary(BaseModel):
    """報告摘要"""
    spend: float
    conversions: int
    revenue: float
    roas: float


class ReportListItem(BaseModel):
    """報告列表項目"""
    id: UUID
    report_type: str
    period_start: date
    period_end: date
    summary: ReportSummary
    created_at: str


class ReportDetail(BaseModel):
    """報告詳情"""
    id: UUID
    report_type: str
    period_start: date
    period_end: date
    content: dict
    content_text: Optional[str]
    created_at: str


@router.get("")
async def list_reports(
    report_type: Optional[str] = None,
    limit: int = 20,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
) -> list[ReportListItem]:
    """
    取得報告列表
    """
    stmt = select(Report).where(Report.user_id == current_user.id)

    if report_type:
        stmt = stmt.where(Report.report_type == report_type)

    stmt = stmt.order_by(Report.period_start.desc()).limit(limit).offset(offset)
    result = await session.execute(stmt)
    reports = result.scalars().all()

    return [
        ReportListItem(
            id=report.id,
            report_type=report.report_type,
            period_start=report.period_start,
            period_end=report.period_end,
            summary=ReportSummary(
                spend=report.content.get("spend", 0),
                conversions=report.content.get("conversions", 0),
                revenue=report.content.get("revenue", 0),
                roas=report.content.get("roas", 0),
            ),
            created_at=report.created_at.isoformat(),
        )
        for report in reports
    ]


@router.get("/{report_id}")
async def get_report(
    report_id: UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
) -> ReportDetail:
    """
    取得報告詳情
    """
    stmt = select(Report).where(
        Report.id == report_id,
        Report.user_id == current_user.id,
    )
    result = await session.execute(stmt)
    report = result.scalar_one_or_none()

    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="找不到報告",
        )

    return ReportDetail(
        id=report.id,
        report_type=report.report_type,
        period_start=report.period_start,
        period_end=report.period_end,
        content=report.content,
        content_text=report.content_text,
        created_at=report.created_at.isoformat(),
    )
