# -*- coding: utf-8 -*-
"""
通知系統 API 路由

實作通知相關的 API 端點：
- GET /notifications - 通知列表
- GET /notifications/:id - 通知詳情
- PUT /notifications/:id/read - 標記已讀
- PUT /notifications/read-all - 全部標記已讀
"""

import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import get_db
from app.models import Notification

router = APIRouter()


# Pydantic 模型
class NotificationResponse(BaseModel):
    """通知資訊"""

    id: str
    type: str = Field(description="類型: alert, recommendation, system, info")
    severity: str = Field(description="嚴重度: info, warning, error, critical")
    title: str
    message: str
    data: Optional[dict] = None
    is_read: bool
    read_at: Optional[str] = None
    created_at: str


class NotificationListResponse(BaseModel):
    """通知列表回應"""

    data: list[NotificationResponse]
    meta: dict


class MarkReadResponse(BaseModel):
    """標記已讀回應"""

    success: bool
    notification_id: Optional[str] = None
    count: Optional[int] = None
    message: str


def _convert_db_notification_to_response(notification: Notification) -> NotificationResponse:
    """將資料庫記錄轉換為 API 回應格式"""
    return NotificationResponse(
        id=str(notification.id),
        type=notification.type,
        severity=notification.severity,
        title=notification.title,
        message=notification.message,
        data=notification.data,
        is_read=notification.is_read,
        read_at=notification.read_at.isoformat() if notification.read_at else None,
        created_at=notification.created_at.isoformat() if notification.created_at else datetime.now(timezone.utc).isoformat(),
    )


def _generate_mock_notifications() -> list[NotificationResponse]:
    """產生模擬通知資料"""
    now = datetime.now(timezone.utc)
    return [
        NotificationResponse(
            id=str(uuid.uuid4()),
            type="alert",
            severity="critical",
            title="CPA 異常上升警報",
            message="過去 3 天 CPA 上升 45%，已超出正常波動範圍。建議立即檢查廣告活動設定。",
            data={"metric": "cpa", "value": 18.5, "threshold": 12.0},
            is_read=False,
            read_at=None,
            created_at=now.isoformat(),
        ),
        NotificationResponse(
            id=str(uuid.uuid4()),
            type="recommendation",
            severity="warning",
            title="新建議：暫停疲勞素材",
            message="系統偵測到 5 個素材疲勞度過高，建議暫停以優化廣告效能。",
            data={"recommendation_id": str(uuid.uuid4()), "count": 5},
            is_read=False,
            read_at=None,
            created_at=(now - timedelta(hours=2)).isoformat(),
        ),
        NotificationResponse(
            id=str(uuid.uuid4()),
            type="system",
            severity="info",
            title="資料同步完成",
            message="Google Ads 帳戶資料已成功同步，共更新 1,234 筆記錄。",
            data={"account_id": str(uuid.uuid4()), "records_updated": 1234},
            is_read=True,
            read_at=(now - timedelta(hours=3)).isoformat(),
            created_at=(now - timedelta(hours=4)).isoformat(),
        ),
        NotificationResponse(
            id=str(uuid.uuid4()),
            type="alert",
            severity="warning",
            title="ROAS 低於目標",
            message="當前 ROAS 為 2.8，低於目標值 3.5。建議優化廣告投放策略。",
            data={"metric": "roas", "value": 2.8, "threshold": 3.5},
            is_read=True,
            read_at=(now - timedelta(hours=6)).isoformat(),
            created_at=(now - timedelta(hours=8)).isoformat(),
        ),
        NotificationResponse(
            id=str(uuid.uuid4()),
            type="info",
            severity="info",
            title="健檢報告已產生",
            message="您的帳戶健檢報告已產生，整體健康度分數為 72 分。",
            data={"audit_id": str(uuid.uuid4()), "score": 72},
            is_read=True,
            read_at=(now - timedelta(days=1)).isoformat(),
            created_at=(now - timedelta(days=1)).isoformat(),
        ),
    ]


@router.get("", response_model=NotificationListResponse)
async def get_notifications(
    is_read: Optional[bool] = Query(None, description="篩選已讀/未讀"),
    type: Optional[str] = Query(None, description="類型: alert, recommendation, system, info"),
    severity: Optional[str] = Query(None, description="嚴重度: info, warning, error, critical"),
    page: int = Query(1, ge=1, description="頁碼"),
    page_size: int = Query(20, ge=1, le=50, description="每頁筆數"),
    db: AsyncSession = Depends(get_db),
) -> NotificationListResponse:
    """
    取得通知列表

    Args:
        is_read: 篩選已讀/未讀狀態
        type: 篩選通知類型
        severity: 篩選嚴重度
        page: 頁碼
        page_size: 每頁筆數
        db: 資料庫 session

    Returns:
        NotificationListResponse: 通知列表
    """
    # 建立查詢
    query = select(Notification)

    # 已讀篩選
    if is_read is not None:
        query = query.where(Notification.is_read == is_read)

    # 類型篩選
    if type:
        query = query.where(Notification.type == type)

    # 嚴重度篩選
    if severity:
        query = query.where(Notification.severity == severity)

    # 排序（最新在前）
    query = query.order_by(Notification.created_at.desc())

    result = await db.execute(query)
    notification_records = result.scalars().all()

    # 如果資料庫無資料，返回模擬數據
    if not notification_records:
        all_notifications = _generate_mock_notifications()

        # 套用篩選
        if is_read is not None:
            all_notifications = [n for n in all_notifications if n.is_read == is_read]
        if type:
            all_notifications = [n for n in all_notifications if n.type == type]
        if severity:
            all_notifications = [n for n in all_notifications if n.severity == severity]

        # 分頁
        total = len(all_notifications)
        start = (page - 1) * page_size
        end = start + page_size
        paginated = all_notifications[start:end]

        # 計算未讀數
        unread_count = len([n for n in _generate_mock_notifications() if not n.is_read])

        return NotificationListResponse(
            data=paginated,
            meta={
                "page": page,
                "page_size": page_size,
                "total": total,
                "total_pages": (total + page_size - 1) // page_size,
                "unread_count": unread_count,
            },
        )

    # 轉換為回應格式
    all_notifications = [_convert_db_notification_to_response(n) for n in notification_records]

    # 分頁
    total = len(all_notifications)
    start = (page - 1) * page_size
    end = start + page_size
    paginated = all_notifications[start:end]

    # 計算未讀數
    unread_count = len([n for n in notification_records if not n.is_read])

    return NotificationListResponse(
        data=paginated,
        meta={
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": (total + page_size - 1) // page_size,
            "unread_count": unread_count,
        },
    )


@router.get("/{notification_id}", response_model=NotificationResponse)
async def get_notification(
    notification_id: str,
    db: AsyncSession = Depends(get_db),
) -> NotificationResponse:
    """
    取得通知詳情

    Args:
        notification_id: 通知 ID
        db: 資料庫 session

    Returns:
        NotificationResponse: 通知詳情
    """
    # 驗證 ID 格式
    try:
        notification_uuid = uuid.UUID(notification_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid notification ID format")

    # 從資料庫取得通知
    result = await db.execute(
        select(Notification).where(Notification.id == notification_uuid)
    )
    notification_record = result.scalar_one_or_none()

    if not notification_record:
        raise HTTPException(status_code=404, detail="Notification not found")

    return _convert_db_notification_to_response(notification_record)


@router.put("/{notification_id}/read", response_model=MarkReadResponse)
async def mark_notification_read(
    notification_id: str,
    db: AsyncSession = Depends(get_db),
) -> MarkReadResponse:
    """
    標記通知為已讀

    Args:
        notification_id: 通知 ID
        db: 資料庫 session

    Returns:
        MarkReadResponse: 標記結果
    """
    # 驗證 ID 格式
    try:
        notification_uuid = uuid.UUID(notification_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid notification ID format")

    # 從資料庫取得通知
    result = await db.execute(
        select(Notification).where(Notification.id == notification_uuid)
    )
    notification_record = result.scalar_one_or_none()

    if not notification_record:
        # 模擬模式
        return MarkReadResponse(
            success=True,
            notification_id=notification_id,
            message="通知已標記為已讀 (simulated)",
        )

    # 更新為已讀
    notification_record.is_read = True
    notification_record.read_at = datetime.now(timezone.utc)
    await db.flush()

    return MarkReadResponse(
        success=True,
        notification_id=notification_id,
        message="通知已標記為已讀",
    )


@router.put("/read-all", response_model=MarkReadResponse)
async def mark_all_notifications_read(
    db: AsyncSession = Depends(get_db),
) -> MarkReadResponse:
    """
    將所有未讀通知標記為已讀

    Args:
        db: 資料庫 session

    Returns:
        MarkReadResponse: 標記結果
    """
    now = datetime.now(timezone.utc)

    # 更新所有未讀通知
    result = await db.execute(
        update(Notification)
        .where(Notification.is_read == False)  # noqa: E712
        .values(is_read=True, read_at=now)
        .returning(Notification.id)
    )

    updated_ids = result.scalars().all()
    count = len(updated_ids)

    if count == 0:
        return MarkReadResponse(
            success=True,
            count=0,
            message="沒有未讀通知",
        )

    await db.flush()

    return MarkReadResponse(
        success=True,
        count=count,
        message=f"已將 {count} 則通知標記為已讀",
    )
