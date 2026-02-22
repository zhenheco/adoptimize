# -*- coding: utf-8 -*-
"""
帳戶管理 API 路由

實作帳戶相關的 API 端點：
- GET /accounts - 帳戶列表
- GET /accounts/:id - 帳戶詳情
- DELETE /accounts/:id - 斷開帳戶連接
- POST /accounts/:id/sync - 手動觸發同步
"""

import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import get_db
from app.middleware.auth import get_current_user
from app.models import AdAccount
from app.models.user import User

router = APIRouter()


# Pydantic 模型
class AccountResponse(BaseModel):
    """帳戶資訊"""

    id: str
    platform: str = Field(description="平台: google, meta")
    external_id: str = Field(description="平台帳戶 ID")
    name: Optional[str] = None
    status: str = Field(description="狀態: active, paused, removed")
    last_sync_at: Optional[str] = None
    created_at: str


class AccountListResponse(BaseModel):
    """帳戶列表回應"""

    data: list[AccountResponse]
    meta: dict


class AccountDeleteResponse(BaseModel):
    """帳戶刪除回應"""

    success: bool
    account_id: str
    message: str


class AccountSyncResponse(BaseModel):
    """帳戶同步回應"""

    success: bool
    account_id: str
    task_id: str
    message: str


def _parse_account_uuid(account_id: str) -> uuid.UUID:
    """驗證並解析帳戶 ID 格式，失敗時拋出 400 HTTPException"""
    try:
        return uuid.UUID(account_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid account ID format")


async def _get_user_account(
    db: AsyncSession, account_uuid: uuid.UUID, user_id: uuid.UUID
) -> AdAccount:
    """取得用戶帳戶，不存在時拋出 404 HTTPException"""
    result = await db.execute(
        select(AdAccount).where(
            AdAccount.id == account_uuid,
            AdAccount.user_id == user_id,
        )
    )
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    return account


def _convert_db_account_to_response(account: AdAccount) -> AccountResponse:
    """將資料庫記錄轉換為 API 回應格式"""
    return AccountResponse(
        id=str(account.id),
        platform=account.platform,
        external_id=account.external_id,
        name=account.name,
        status=account.status,
        last_sync_at=account.last_sync_at.isoformat() if account.last_sync_at else None,
        created_at=account.created_at.isoformat() if account.created_at else datetime.now(timezone.utc).isoformat(),
    )


@router.get("", response_model=AccountListResponse)
async def get_accounts(
    platform: Optional[str] = Query(None, description="平台: google, meta"),
    status: Optional[str] = Query(None, description="狀態: active, paused, removed"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AccountListResponse:
    """
    取得帳戶列表

    返回用戶已連接的廣告帳戶。

    Args:
        platform: 篩選平台
        status: 篩選狀態
        db: 資料庫 session

    Returns:
        AccountListResponse: 帳戶列表
    """
    # 建立查詢（只返回當前用戶的帳戶）
    query = select(AdAccount).where(AdAccount.user_id == current_user.id)

    # 預設排除已移除的帳戶
    if status:
        query = query.where(AdAccount.status == status.lower())
    else:
        query = query.where(AdAccount.status != "removed")

    # 平台篩選
    if platform:
        query = query.where(AdAccount.platform == platform.lower())

    # 排序（最新在前）
    query = query.order_by(AdAccount.created_at.desc())

    result = await db.execute(query)
    account_records = result.scalars().all()

    # 返回真實資料（空陣列如果無資料）
    accounts = [_convert_db_account_to_response(a) for a in account_records]

    return AccountListResponse(
        data=accounts,
        meta={
            "total": len(accounts),
        },
    )


@router.get("/{account_id}", response_model=AccountResponse)
async def get_account(
    account_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AccountResponse:
    """
    取得帳戶詳情

    Args:
        account_id: 帳戶 ID
        db: 資料庫 session

    Returns:
        AccountResponse: 帳戶詳情
    """
    account_uuid = _parse_account_uuid(account_id)
    account_record = await _get_user_account(db, account_uuid, current_user.id)
    return _convert_db_account_to_response(account_record)


@router.delete("/{account_id}", response_model=AccountDeleteResponse)
async def delete_account(
    account_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AccountDeleteResponse:
    """
    斷開帳戶連接

    軟刪除：將帳戶狀態設為 removed，保留歷史數據。

    Args:
        account_id: 帳戶 ID
        db: 資料庫 session

    Returns:
        AccountDeleteResponse: 刪除結果
    """
    account_uuid = _parse_account_uuid(account_id)
    account_record = await _get_user_account(db, account_uuid, current_user.id)

    # 軟刪除：更新狀態
    account_record.status = "removed"
    # 清除敏感資訊
    account_record.access_token = None
    account_record.refresh_token = None
    await db.commit()

    return AccountDeleteResponse(
        success=True,
        account_id=account_id,
        message="帳戶已斷開連接",
    )


@router.post("/{account_id}/sync", response_model=AccountSyncResponse)
async def sync_account(
    account_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AccountSyncResponse:
    """
    手動觸發帳戶同步

    將同步任務加入背景佇列執行。

    Args:
        account_id: 帳戶 ID
        db: 資料庫 session

    Returns:
        AccountSyncResponse: 同步任務資訊
    """
    account_uuid = _parse_account_uuid(account_id)

    # 從資料庫取得帳戶（同時驗證所有權）
    result = await db.execute(
        select(AdAccount).where(
            AdAccount.id == account_uuid,
            AdAccount.user_id == current_user.id,
        )
    )
    account_record = result.scalar_one_or_none()

    if not account_record:
        # 模擬模式
        task_id = str(uuid.uuid4())
        return AccountSyncResponse(
            success=True,
            account_id=account_id,
            task_id=task_id,
            message="同步任務已排程 (simulated)",
        )

    # 檢查帳戶狀態
    if account_record.status == "removed":
        raise HTTPException(status_code=400, detail="Cannot sync removed account")

    # TODO: 實際觸發 Celery 同步任務
    # from app.workers.sync_account import sync_account_data
    # task = sync_account_data.delay(account_id)

    task_id = str(uuid.uuid4())

    # 更新最後同步時間
    account_record.last_sync_at = datetime.now(timezone.utc)
    await db.flush()

    return AccountSyncResponse(
        success=True,
        account_id=account_id,
        task_id=task_id,
        message="同步任務已排程",
    )
