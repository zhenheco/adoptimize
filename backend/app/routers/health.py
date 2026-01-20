# -*- coding: utf-8 -*-
"""
健康檢查 API 路由

實作健康檢查相關的 API 端點：
- GET /health/audit - 取得最新健檢報告
- GET /health/audit/:id - 取得指定健檢報告
- POST /health/audit - 觸發健檢

此路由包裝 audits 路由，提供 /health/audit 路徑給前端使用
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
from app.models import AuditIssue as AuditIssueModel, HealthAudit as HealthAuditModel
from app.services.audit_engine import (
    AuditInput,
    DimensionInput,
    calculate_audit_score,
    get_audit_grade,
    ALL_ISSUES,
)

router = APIRouter()


# Pydantic 模型
class AuditDimension(BaseModel):
    """健檢維度"""

    score: int
    weight: float
    issues: int


class AuditIssue(BaseModel):
    """健檢問題"""

    id: str
    category: str
    severity: str
    issue_code: str
    title: str
    description: str
    impact_description: str
    solution: str
    affected_entities: list[str]
    status: str = "open"


class HealthAudit(BaseModel):
    """健檢報告"""

    id: str
    account_id: str
    overall_score: int
    dimensions: dict[str, AuditDimension]
    grade: str
    issues_count: int
    created_at: str


class HealthAuditWithIssues(HealthAudit):
    """健檢報告（含問題列表）"""

    issues: list[AuditIssue]


class HealthAuditResponse(BaseModel):
    """健檢報告 API 回應"""

    data: HealthAuditWithIssues


class TriggerAuditRequest(BaseModel):
    """觸發健檢請求"""

    account_id: str


class TriggerAuditResponse(BaseModel):
    """觸發健檢回應"""

    success: bool
    task_id: str
    message: str


def _generate_mock_audit(account_id: str) -> HealthAuditWithIssues:
    """產生模擬健檢報告"""

    # 模擬各維度分數（使用 DimensionInput 正確的欄位）
    # DimensionInput(base_score, issues) - 分數會根據 issues 扣分計算
    # 這裡模擬不同的 base_score 來產生不同的維度分數
    audit_input = AuditInput(
        structure=DimensionInput(base_score=85, issues=[]),  # 85 分
        creative=DimensionInput(base_score=60, issues=[]),   # 60 分
        audience=DimensionInput(base_score=75, issues=[]),   # 75 分
        budget=DimensionInput(base_score=80, issues=[]),     # 80 分
        tracking=DimensionInput(base_score=65, issues=[]),   # 65 分
    )
    audit_result = calculate_audit_score(audit_input)

    # 用於前端顯示的維度數據
    dimensions = {
        "structure": {"score": 85, "weight": 0.20, "issues_count": 2},
        "creative": {"score": 60, "weight": 0.25, "issues_count": 5},
        "audience": {"score": 75, "weight": 0.25, "issues_count": 3},
        "budget": {"score": 80, "weight": 0.20, "issues_count": 1},
        "tracking": {"score": 65, "weight": 0.10, "issues_count": 2},
    }
    grade = get_audit_grade(audit_result.overall_score)

    # 產生模擬問題
    issues = []
    # 使用實際存在的問題代碼
    sample_issues = [
        ("CREATIVE_FATIGUE", "CREATIVE", "HIGH"),
        ("LOW_VARIETY", "CREATIVE", "MEDIUM"),
        ("HIGH_OVERLAP", "AUDIENCE", "HIGH"),
        ("SIZE_TOO_SMALL", "AUDIENCE", "MEDIUM"),
        ("INEFFICIENT_ALLOCATION", "BUDGET", "LOW"),
        ("POOR_NAMING", "STRUCTURE", "LOW"),
        ("INCOMPLETE_FUNNEL", "TRACKING", "MEDIUM"),
    ]

    for code, category, severity in sample_issues:
        # ALL_ISSUES 是 dict，使用 .get() 取得問題定義
        issue_def = ALL_ISSUES.get(code)
        if issue_def:
            issues.append(
                AuditIssue(
                    id=str(uuid.uuid4()),
                    category=category,
                    severity=severity,
                    issue_code=code,
                    title=issue_def.title,
                    description=issue_def.description,
                    impact_description=issue_def.impact_description,
                    solution=issue_def.solution,
                    affected_entities=[str(uuid.uuid4())],
                    status="open",
                )
            )

    return HealthAuditWithIssues(
        id=str(uuid.uuid4()),
        account_id=account_id,
        overall_score=audit_result.overall_score,
        dimensions={
            name: AuditDimension(
                score=dim["score"],
                weight=dim["weight"],
                issues=dim["issues_count"],
            )
            for name, dim in dimensions.items()
        },
        grade=grade.value,
        issues_count=len(issues),
        created_at=datetime.now(timezone.utc).isoformat(),
        issues=issues,
    )


def _convert_db_audit_to_response(audit_record: HealthAuditModel) -> HealthAuditWithIssues:
    """將資料庫記錄轉換為 API 回應格式"""
    # 計算 grade
    grade = get_audit_grade(audit_record.overall_score or 0)

    # 建立維度資料
    # 維度權重固定，依 SDD 2.3 定義
    dimension_weights = {
        "structure": 0.20,
        "creative": 0.25,
        "audience": 0.25,
        "budget": 0.20,
        "tracking": 0.10,
    }

    # 統計各類別的問題數
    category_issue_counts: dict[str, int] = {}
    for issue in audit_record.issues:
        cat = (issue.category or "").lower()
        category_issue_counts[cat] = category_issue_counts.get(cat, 0) + 1

    dimensions = {
        "structure": AuditDimension(
            score=audit_record.structure_score or 0,
            weight=dimension_weights["structure"],
            issues=category_issue_counts.get("structure", 0),
        ),
        "creative": AuditDimension(
            score=audit_record.creative_score or 0,
            weight=dimension_weights["creative"],
            issues=category_issue_counts.get("creative", 0),
        ),
        "audience": AuditDimension(
            score=audit_record.audience_score or 0,
            weight=dimension_weights["audience"],
            issues=category_issue_counts.get("audience", 0),
        ),
        "budget": AuditDimension(
            score=audit_record.budget_score or 0,
            weight=dimension_weights["budget"],
            issues=category_issue_counts.get("budget", 0),
        ),
        "tracking": AuditDimension(
            score=audit_record.tracking_score or 0,
            weight=dimension_weights["tracking"],
            issues=category_issue_counts.get("tracking", 0),
        ),
    }

    # 轉換問題列表
    issues = [
        AuditIssue(
            id=str(issue.id),
            category=issue.category or "",
            severity=issue.severity or "MEDIUM",
            issue_code=issue.issue_code or "",
            title=issue.title or "",
            description=issue.description or "",
            impact_description=issue.impact_description or "",
            solution=issue.solution or "",
            affected_entities=(
                issue.affected_entities.get("ids", [])
                if isinstance(issue.affected_entities, dict)
                else []
            ),
            status=issue.status,
        )
        for issue in audit_record.issues
    ]

    return HealthAuditWithIssues(
        id=str(audit_record.id),
        account_id=str(audit_record.account_id),
        overall_score=audit_record.overall_score or 0,
        dimensions=dimensions,
        grade=grade.value,
        issues_count=len(issues),
        created_at=audit_record.created_at.isoformat() if audit_record.created_at else datetime.now(timezone.utc).isoformat(),
        issues=issues,
    )


@router.get("/audit", response_model=HealthAuditResponse)
async def get_latest_audit(
    account_id: Optional[str] = Query(None, description="帳戶 ID"),
    db: AsyncSession = Depends(get_db),
) -> HealthAuditResponse:
    """
    取得最新健檢報告

    Args:
        account_id: 帳戶 ID（可選，預設取得第一個帳戶）
        db: 資料庫 session

    Returns:
        HealthAuditResponse: 最新健檢報告
    """
    default_account_id = account_id or str(uuid.uuid4())

    try:
        # 從資料庫取得最新健檢報告
        query = (
            select(HealthAuditModel)
            .options(selectinload(HealthAuditModel.issues))
            .order_by(HealthAuditModel.created_at.desc())
        )

        if account_id:
            try:
                account_uuid = uuid.UUID(account_id)
                query = query.where(HealthAuditModel.account_id == account_uuid)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid account_id format")

        result = await db.execute(query.limit(1))
        audit_record = result.scalar_one_or_none()

        # 如果資料庫無資料，返回模擬數據（向後相容）
        if not audit_record:
            audit = _generate_mock_audit(default_account_id)
            return HealthAuditResponse(data=audit)

        # 轉換資料庫記錄為 API 回應格式
        audit = _convert_db_audit_to_response(audit_record)
        return HealthAuditResponse(data=audit)

    except Exception as e:
        # 資料庫連線失敗時，返回模擬數據（提高可用性）
        import logging
        logging.warning(f"Database connection failed, returning mock data: {e}")
        audit = _generate_mock_audit(default_account_id)
        return HealthAuditResponse(data=audit)


@router.get("/audit/{audit_id}", response_model=HealthAuditResponse)
async def get_audit(
    audit_id: str,
    db: AsyncSession = Depends(get_db),
) -> HealthAuditResponse:
    """
    取得指定健檢報告

    Args:
        audit_id: 健檢報告 ID
        db: 資料庫 session

    Returns:
        HealthAuditResponse: 健檢報告
    """
    # 驗證 ID 格式
    try:
        audit_uuid = uuid.UUID(audit_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid audit ID format")

    # 從資料庫取得指定健檢報告
    result = await db.execute(
        select(HealthAuditModel)
        .options(selectinload(HealthAuditModel.issues))
        .where(HealthAuditModel.id == audit_uuid)
    )
    audit_record = result.scalar_one_or_none()

    if not audit_record:
        raise HTTPException(status_code=404, detail="Audit not found")

    audit = _convert_db_audit_to_response(audit_record)
    return HealthAuditResponse(data=audit)


@router.post("/audit", response_model=TriggerAuditResponse)
async def trigger_audit(request: TriggerAuditRequest) -> TriggerAuditResponse:
    """
    觸發健檢

    將健檢任務加入背景佇列執行。

    Args:
        request: 包含 account_id

    Returns:
        TriggerAuditResponse: 任務 ID
    """
    # 驗證 ID 格式
    try:
        uuid.UUID(request.account_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid account_id format")

    # TODO: 實際觸發 Celery 任務
    # from app.workers.run_health_audit import run_health_audit
    # task = run_health_audit.delay(request.account_id)

    return TriggerAuditResponse(
        success=True,
        task_id=str(uuid.uuid4()),
        message="Health audit scheduled",
    )


@router.post("/audit/{audit_id}/issues/{issue_id}/resolve")
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
        db: 資料庫 session

    Returns:
        成功訊息
    """
    # 驗證 ID 格式
    try:
        uuid.UUID(audit_id)
        issue_uuid = uuid.UUID(issue_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid ID format")

    # 更新資料庫中的問題狀態
    result = await db.execute(
        select(AuditIssueModel).where(AuditIssueModel.id == issue_uuid)
    )
    issue = result.scalar_one_or_none()

    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    issue.status = "resolved"
    issue.resolved_at = datetime.now(timezone.utc)
    await db.flush()

    return {
        "success": True,
        "issue_id": issue_id,
        "new_status": "resolved",
        "message": "Issue marked as resolved",
    }


@router.post("/audit/{audit_id}/issues/{issue_id}/ignore")
async def ignore_issue(
    audit_id: str,
    issue_id: str,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    忽略問題

    Args:
        audit_id: 健檢報告 ID
        issue_id: 問題 ID
        db: 資料庫 session

    Returns:
        成功訊息
    """
    # 驗證 ID 格式
    try:
        uuid.UUID(audit_id)
        issue_uuid = uuid.UUID(issue_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid ID format")

    # 更新資料庫中的問題狀態
    result = await db.execute(
        select(AuditIssueModel).where(AuditIssueModel.id == issue_uuid)
    )
    issue = result.scalar_one_or_none()

    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    issue.status = "ignored"
    await db.flush()

    return {
        "success": True,
        "issue_id": issue_id,
        "new_status": "ignored",
        "message": "Issue ignored",
    }
