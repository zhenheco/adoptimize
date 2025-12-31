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

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.workers.run_health_audit import run_health_audit, run_full_audit

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
async def get_audit(audit_id: str) -> AuditDetailResponse:
    """
    取得健檢報告

    根據 audit_id 取得完整的健檢報告，包含問題列表。

    Args:
        audit_id: 健檢報告 ID

    Returns:
        AuditDetailResponse: 健檢報告詳情
    """
    # TODO: 從資料庫取得健檢報告
    # async with get_db_session() as db:
    #     audit = await db.get(HealthAudit, audit_id)
    #     if not audit:
    #         raise HTTPException(status_code=404, detail="Audit not found")

    # 模擬返回資料
    raise HTTPException(
        status_code=404,
        detail="Audit not found",
    )


@router.get("/{audit_id}/issues", response_model=list[AuditIssueResponse])
async def get_audit_issues(
    audit_id: str,
    category: Optional[str] = Query(None, description="篩選問題類別"),
    severity: Optional[str] = Query(None, description="篩選嚴重程度"),
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
    # TODO: 從資料庫取得問題清單
    # async with get_db_session() as db:
    #     query = select(AuditIssue).where(AuditIssue.audit_id == audit_id)
    #     if category:
    #         query = query.where(AuditIssue.category == category)
    #     if severity:
    #         query = query.where(AuditIssue.severity == severity)
    #     issues = await db.scalars(query)

    raise HTTPException(
        status_code=404,
        detail="Audit not found",
    )


@router.get("/account/{account_id}", response_model=AuditResponse)
async def get_latest_audit(account_id: str) -> AuditResponse:
    """
    取得帳戶最新的健檢報告

    Args:
        account_id: 廣告帳戶 ID

    Returns:
        AuditResponse: 最新的健檢報告
    """
    # TODO: 從資料庫取得最新健檢報告
    # async with get_db_session() as db:
    #     audit = await db.scalar(
    #         select(HealthAudit)
    #         .where(HealthAudit.account_id == account_id)
    #         .order_by(HealthAudit.created_at.desc())
    #         .limit(1)
    #     )

    raise HTTPException(
        status_code=404,
        detail="No audit found for this account",
    )


@router.post("/{audit_id}/issues/{issue_id}/resolve")
async def resolve_issue(audit_id: str, issue_id: str) -> dict:
    """
    標記問題為已解決

    Args:
        audit_id: 健檢報告 ID
        issue_id: 問題 ID

    Returns:
        成功訊息
    """
    # TODO: 更新資料庫中的問題狀態
    raise HTTPException(
        status_code=404,
        detail="Issue not found",
    )
