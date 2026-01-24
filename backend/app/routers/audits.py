# -*- coding: utf-8 -*-
"""
健檢報告 API 路由

實作健檢系統的 API 端點：
- POST /audits - 觸發帳戶健檢
- GET /audits/:id - 取得健檢報告
- GET /audits/:id/issues - 取得問題清單
"""

import uuid
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.base import get_db
from app.models.health_audit import HealthAudit
from app.models.audit_issue import AuditIssue

# 條件導入 Celery 任務（Celery 已棄用，改用 APScheduler）
try:
    from app.workers.run_health_audit import run_health_audit, run_full_audit
except ImportError:
    run_health_audit = None
    run_full_audit = None

router = APIRouter()


# Pydantic 模型
class TriggerAuditRequest(BaseModel):
    """觸發健檢請求"""

    account_id: str = Field(..., description="廣告帳戶 ID")
    full_audit: bool = Field(
        default=False,
        description="是否執行完整健檢（需要已同步數據）",
    )


class TriggerAuditResponse(BaseModel):
    """觸發健檢回應"""

    success: bool
    task_id: str
    message: str


class AuditDimension(BaseModel):
    """健檢維度"""

    score: int
    weight: float
    issues_count: int


class AuditIssueResponse(BaseModel):
    """健檢問題"""

    id: str
    code: str
    category: str
    severity: str
    title: str
    description: str
    impact_description: str
    solution: str
    status: str = "open"


class AuditResponse(BaseModel):
    """健檢報告"""

    id: str
    account_id: str
    overall_score: int
    grade: str
    dimensions: dict[str, AuditDimension]
    issues_count: int
    created_at: str


class AuditDetailResponse(AuditResponse):
    """健檢報告詳情（含問題列表）"""

    issues: list[AuditIssueResponse]


# API 端點
@router.post("", response_model=TriggerAuditResponse)
async def trigger_audit(request: TriggerAuditRequest) -> TriggerAuditResponse:
    """
    觸發帳戶健檢

    將健檢任務加入背景佇列執行，立即返回任務 ID。
    可透過 task_id 追蹤任務狀態。

    Args:
        request: 包含 account_id 和是否執行完整健檢

    Returns:
        TriggerAuditResponse: 包含任務 ID 和狀態訊息
    """
    try:
        # 驗證 account_id 格式
        try:
            uuid.UUID(request.account_id)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="Invalid account_id format",
            )

        # 檢查 Celery 是否可用（已改用 APScheduler）
        if run_health_audit is None or run_full_audit is None:
            raise HTTPException(
                status_code=503,
                detail="Background task service unavailable. Please use the new scheduler.",
            )

        # 選擇執行初始健檢或完整健檢
        if request.full_audit:
            task = run_full_audit.delay(request.account_id)
            message = "Full health audit scheduled"
        else:
            task = run_health_audit.delay(request.account_id)
            message = "Initial health audit scheduled"

        return TriggerAuditResponse(
            success=True,
            task_id=task.id,
            message=message,
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to schedule audit: {str(e)}",
        )


@router.get("/{audit_id}", response_model=AuditDetailResponse)
async def get_audit(
    audit_id: str,
    db: AsyncSession = Depends(get_db),
) -> AuditDetailResponse:
    """
    取得健檢報告

    根據 audit_id 取得完整的健檢報告，包含問題列表。

    Args:
        audit_id: 健檢報告 ID

    Returns:
        AuditDetailResponse: 健檢報告詳情
    """
    try:
        audit_uuid = UUID(audit_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid audit ID format")

    # AC-A1: 從資料庫取得健檢報告（真實資料，非 mock）
    result = await db.execute(
        select(HealthAudit)
        .options(selectinload(HealthAudit.issues))
        .where(HealthAudit.id == audit_uuid)
    )
    audit = result.scalar_one_or_none()

    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    # 轉換為回應格式
    return AuditDetailResponse(
        id=str(audit.id),
        account_id=str(audit.account_id),
        overall_score=audit.overall_score or 0,
        dimensions={
            "structure": AuditDimension(
                score=audit.structure_score or 0,
                weight=0.2,
                issues_count=sum(1 for i in audit.issues if i.category == "STRUCTURE"),
            ),
            "creative": AuditDimension(
                score=audit.creative_score or 0,
                weight=0.25,
                issues_count=sum(1 for i in audit.issues if i.category == "CREATIVE"),
            ),
            "audience": AuditDimension(
                score=audit.audience_score or 0,
                weight=0.2,
                issues_count=sum(1 for i in audit.issues if i.category == "AUDIENCE"),
            ),
            "budget": AuditDimension(
                score=audit.budget_score or 0,
                weight=0.15,
                issues_count=sum(1 for i in audit.issues if i.category == "BUDGET"),
            ),
            "tracking": AuditDimension(
                score=audit.tracking_score or 0,
                weight=0.2,
                issues_count=sum(1 for i in audit.issues if i.category == "TRACKING"),
            ),
        },
        issues=[
            AuditIssueResponse(
                id=str(issue.id),
                code=issue.issue_code or "",
                category=issue.category or "",
                severity=issue.severity or "",
                title=issue.title or "",
                description=issue.description or "",
                impact_description=issue.impact_description or "",
                solution=issue.solution or "",
            )
            for issue in audit.issues
        ],
        created_at=audit.created_at.isoformat() if audit.created_at else "",
    )


@router.get("/{audit_id}/issues", response_model=list[AuditIssueResponse])
async def get_audit_issues(
    audit_id: str,
    category: Optional[str] = Query(None, description="篩選問題類別"),
    severity: Optional[str] = Query(None, description="篩選嚴重程度"),
    db: AsyncSession = Depends(get_db),
) -> list[AuditIssueResponse]:
    """
    取得健檢問題清單

    Args:
        audit_id: 健檢報告 ID
        category: 篩選類別 (STRUCTURE, CREATIVE, AUDIENCE, BUDGET, TRACKING)
        severity: 篩選嚴重程度 (CRITICAL, HIGH, MEDIUM, LOW)

    Returns:
        問題清單
    """
    try:
        audit_uuid = UUID(audit_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid audit ID format")

    # AC-A1: 從資料庫取得問題清單（真實資料，非 mock）
    query = select(AuditIssue).where(AuditIssue.audit_id == audit_uuid)
    if category:
        query = query.where(AuditIssue.category == category)
    if severity:
        query = query.where(AuditIssue.severity == severity)

    result = await db.execute(query)
    issues = result.scalars().all()

    return [
        AuditIssueResponse(
            id=str(issue.id),
            code=issue.issue_code or "",
            category=issue.category or "",
            severity=issue.severity or "",
            title=issue.title or "",
            description=issue.description or "",
            impact_description=issue.impact_description or "",
            solution=issue.solution or "",
        )
        for issue in issues
    ]


@router.get("/account/{account_id}", response_model=AuditResponse)
async def get_latest_audit(
    account_id: str,
    db: AsyncSession = Depends(get_db),
) -> AuditResponse:
    """
    取得帳戶最新的健檢報告

    Args:
        account_id: 廣告帳戶 ID

    Returns:
        AuditResponse: 最新的健檢報告
    """
    try:
        account_uuid = UUID(account_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid account ID format")

    # AC-A1: 從資料庫取得最新健檢報告（真實資料，非 mock）
    result = await db.execute(
        select(HealthAudit)
        .where(HealthAudit.account_id == account_uuid)
        .order_by(HealthAudit.created_at.desc())
        .limit(1)
    )
    audit = result.scalar_one_or_none()

    if not audit:
        raise HTTPException(status_code=404, detail="No audit found for this account")

    return AuditResponse(
        id=str(audit.id),
        account_id=str(audit.account_id),
        overall_score=audit.overall_score or 0,
        issues_count=audit.issues_count,
        created_at=audit.created_at.isoformat() if audit.created_at else "",
    )


@router.post("/{audit_id}/issues/{issue_id}/resolve")
async def resolve_issue(
    audit_id: str,
    issue_id: str,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    標記問題為已解決

    Args:
        audit_id: 健檢報告 ID
        issue_id: 問題 ID

    Returns:
        成功訊息
    """
    try:
        audit_uuid = UUID(audit_id)
        issue_uuid = UUID(issue_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid ID format")

    # 從資料庫取得問題
    result = await db.execute(
        select(AuditIssue).where(
            AuditIssue.id == issue_uuid,
            AuditIssue.audit_id == audit_uuid,
        )
    )
    issue = result.scalar_one_or_none()

    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    # 更新問題狀態
    issue.status = "resolved"
    issue.resolved_at = datetime.now(timezone.utc)
    await db.commit()

    return {
        "success": True,
        "message": "Issue marked as resolved",
        "issue_id": str(issue.id),
    }
