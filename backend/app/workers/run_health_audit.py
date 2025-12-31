# -*- coding: utf-8 -*-
"""
健康檢查背景任務

在 OAuth 成功連接帳戶後，自動觸發健檢任務。
此任務會分析帳戶數據並產生健檢報告。

Usage:
    from app.workers.run_health_audit import run_health_audit
    run_health_audit.delay(account_id="uuid-string")
"""

import uuid
from datetime import datetime, timezone
from typing import Any

from celery import shared_task

from app.services.audit_engine import (
    AuditInput,
    AuditScoreResult,
    DimensionInput,
    calculate_audit_score,
    create_issue_with_entities,
)


@shared_task(
    bind=True,
    name="app.workers.run_health_audit.run_health_audit",
    max_retries=3,
    default_retry_delay=60,
)
def run_health_audit(self, account_id: str) -> dict[str, Any]:
    """
    執行帳戶健檢

    分析帳戶的廣告結構、素材、受眾、預算、追蹤設定，
    產生健檢報告並儲存到資料庫。

    Args:
        account_id: 廣告帳戶 UUID

    Returns:
        包含健檢結果的字典

    Note:
        這是一個 Celery 任務，會在背景執行。
        實際的數據分析需要從資料庫讀取帳戶資料。
    """
    try:
        # TODO: 從資料庫取得帳戶資料
        # async with get_db_session() as db:
        #     account = await db.get(AdAccount, account_id)
        #     campaigns = await db.scalars(
        #         select(Campaign).where(Campaign.account_id == account_id)
        #     )

        # 目前使用初始健檢（帳戶剛連接時無數據）
        # 實際實作時會從資料庫讀取並分析數據
        audit_result = perform_initial_audit(account_id)

        # TODO: 將結果儲存到資料庫
        # audit_id = await save_audit_to_db(account_id, audit_result)

        return {
            "success": True,
            "account_id": account_id,
            "audit_id": str(uuid.uuid4()),  # 模擬產生的 audit ID
            "overall_score": audit_result.overall_score,
            "grade": audit_result.grade.value,
            "total_issues": audit_result.total_issues,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    except Exception as exc:
        # 記錄錯誤並重試
        self.retry(exc=exc)


def perform_initial_audit(account_id: str) -> AuditScoreResult:
    """
    執行初始健檢

    當帳戶剛連接時，進行基本的追蹤設定檢查。
    因為尚未同步數據，只檢查追蹤設定。

    Args:
        account_id: 帳戶 ID

    Returns:
        AuditScoreResult: 健檢結果
    """
    # 初始健檢：假設追蹤可能未設定
    # 實際實作時會檢查 Pixel 狀態和轉換追蹤
    tracking_issues = []

    # TODO: 實際檢查追蹤設定
    # 這裡只是示範，真實情況會根據 API 回傳的數據判斷
    # if not has_conversion_tracking(account_id):
    #     tracking_issues.append(
    #         create_issue_with_entities(
    #             "NO_CONVERSION_TRACKING",
    #             {"account_id": account_id}
    #         )
    #     )

    audit_input = AuditInput(
        structure=DimensionInput(base_score=100, issues=[]),
        creative=DimensionInput(base_score=100, issues=[]),
        audience=DimensionInput(base_score=100, issues=[]),
        budget=DimensionInput(base_score=100, issues=[]),
        tracking=DimensionInput(base_score=100, issues=tracking_issues),
    )

    return calculate_audit_score(audit_input)


@shared_task(
    bind=True,
    name="app.workers.run_health_audit.run_full_audit",
    max_retries=3,
    default_retry_delay=60,
)
def run_full_audit(self, account_id: str) -> dict[str, Any]:
    """
    執行完整健檢

    在數據同步完成後執行完整的 5 維度分析。
    會檢查所有廣告活動、素材、受眾、預算和追蹤設定。

    Args:
        account_id: 廣告帳戶 UUID

    Returns:
        包含詳細健檢結果的字典
    """
    try:
        # TODO: 實作完整健檢邏輯
        # 1. 從資料庫讀取帳戶的所有 campaigns, ad_sets, ads, creatives
        # 2. 分析每個維度：
        #    - Structure: 命名規則、廣告組數量、廣告數量、目標設定
        #    - Creative: 素材多樣性、疲勞度、頻率、新鮮度
        #    - Audience: 規模、重疊、排除設定、Lookalike 來源
        #    - Budget: 效率分配、消耗率、學習期預算
        #    - Tracking: 轉換追蹤、Pixel 狀態、UTM 參數
        # 3. 計算分數並產生建議

        audit_result = perform_initial_audit(account_id)

        return {
            "success": True,
            "account_id": account_id,
            "audit_id": str(uuid.uuid4()),
            "overall_score": audit_result.overall_score,
            "grade": audit_result.grade.value,
            "dimensions": {
                name: {
                    "score": dim.score,
                    "issues_count": dim.issues_count,
                }
                for name, dim in audit_result.dimensions.items()
            },
            "total_issues": audit_result.total_issues,
            "issues": [
                {
                    "code": issue.code,
                    "category": issue.category.value,
                    "severity": issue.severity.value,
                    "title": issue.title,
                    "description": issue.description,
                    "solution": issue.solution,
                }
                for issue in audit_result.issues
            ],
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    except Exception as exc:
        self.retry(exc=exc)
