# -*- coding: utf-8 -*-
"""
Token 管理服務

負責：
1. Token 儲存與讀取
2. Token 過期檢查
3. 自動刷新過期 Token
4. 加密敏感資訊
"""

import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

import httpx
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.ad_account import AdAccount

settings = get_settings()

# Google OAuth 端點
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"

# Meta OAuth 端點
META_TOKEN_URL = "https://graph.facebook.com/v18.0/oauth/access_token"


class TokenManager:
    """Token 管理器"""

    def __init__(self, db: AsyncSession):
        """
        初始化 Token 管理器

        Args:
            db: SQLAlchemy 非同步 session
        """
        self.db = db

    async def get_account(self, account_id: uuid.UUID) -> Optional[AdAccount]:
        """
        取得廣告帳戶

        Args:
            account_id: 帳戶 ID

        Returns:
            AdAccount 或 None
        """
        result = await self.db.execute(
            select(AdAccount).where(AdAccount.id == account_id)
        )
        return result.scalar_one_or_none()

    async def get_valid_access_token(self, account_id: uuid.UUID) -> Optional[str]:
        """
        取得有效的 access token

        如果 token 即將過期，會自動刷新。

        Args:
            account_id: 帳戶 ID

        Returns:
            有效的 access token 或 None
        """
        account = await self.get_account(account_id)
        if not account:
            return None

        # 檢查 token 是否即將過期（提前 5 分鐘刷新）
        if account.token_expires_at:
            buffer = timedelta(minutes=5)
            if datetime.now(timezone.utc) + buffer >= account.token_expires_at:
                # Token 即將過期，需要刷新
                if account.platform == "google":
                    refreshed = await self.refresh_google_token(account)
                    if refreshed:
                        return account.access_token
                    return None
                elif account.platform == "meta":
                    # Meta token 無法刷新，返回現有 token
                    # 如果過期，需要用戶重新授權
                    return account.access_token

        return account.access_token

    async def refresh_google_token(self, account: AdAccount) -> bool:
        """
        刷新 Google OAuth Token

        Args:
            account: 廣告帳戶

        Returns:
            是否刷新成功
        """
        if not account.refresh_token:
            return False

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    GOOGLE_TOKEN_URL,
                    data={
                        "refresh_token": account.refresh_token,
                        "client_id": settings.GOOGLE_ADS_CLIENT_ID,
                        "client_secret": settings.GOOGLE_ADS_CLIENT_SECRET,
                        "grant_type": "refresh_token",
                    },
                )

                if response.status_code != 200:
                    return False

                data = response.json()
                new_access_token = data.get("access_token")
                expires_in = data.get("expires_in", 3600)

                if not new_access_token:
                    return False

                # 更新資料庫
                await self.update_tokens(
                    account_id=account.id,
                    access_token=new_access_token,
                    expires_in=expires_in,
                )

                return True

        except Exception as e:
            print(f"Failed to refresh Google token: {e}")
            return False

    async def refresh_meta_token(self, account: AdAccount) -> bool:
        """
        延長 Meta OAuth Token 有效期

        Meta 長期 token 在過期前 60 天內可以延長。

        Args:
            account: 廣告帳戶

        Returns:
            是否延長成功
        """
        if not account.access_token:
            return False

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    META_TOKEN_URL,
                    params={
                        "grant_type": "fb_exchange_token",
                        "client_id": settings.META_APP_ID,
                        "client_secret": settings.META_APP_SECRET,
                        "fb_exchange_token": account.access_token,
                    },
                )

                if response.status_code != 200:
                    return False

                data = response.json()
                new_access_token = data.get("access_token")
                expires_in = data.get("expires_in", 5184000)  # 60 days

                if not new_access_token:
                    return False

                # 更新資料庫
                await self.update_tokens(
                    account_id=account.id,
                    access_token=new_access_token,
                    expires_in=expires_in,
                )

                return True

        except Exception as e:
            print(f"Failed to refresh Meta token: {e}")
            return False

    async def update_tokens(
        self,
        account_id: uuid.UUID,
        access_token: str,
        refresh_token: Optional[str] = None,
        expires_in: int = 3600,
    ) -> bool:
        """
        更新帳戶的 tokens

        Args:
            account_id: 帳戶 ID
            access_token: 新的 access token
            refresh_token: 新的 refresh token（可選）
            expires_in: Token 有效秒數

        Returns:
            是否更新成功
        """
        try:
            expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)

            update_values = {
                "access_token": access_token,
                "token_expires_at": expires_at,
            }

            if refresh_token:
                update_values["refresh_token"] = refresh_token

            await self.db.execute(
                update(AdAccount)
                .where(AdAccount.id == account_id)
                .values(**update_values)
            )
            await self.db.commit()
            return True

        except Exception as e:
            print(f"Failed to update tokens: {e}")
            await self.db.rollback()
            return False

    async def save_new_account(
        self,
        user_id: uuid.UUID,
        platform: str,
        external_id: str,
        name: str,
        access_token: str,
        refresh_token: str,
        expires_in: int,
    ) -> uuid.UUID:
        """
        儲存新的廣告帳戶

        Args:
            user_id: 用戶 ID
            platform: 平台名稱 (google, meta)
            external_id: 平台帳戶 ID
            name: 帳戶名稱
            access_token: OAuth access token
            refresh_token: OAuth refresh token
            expires_in: Token 有效秒數

        Returns:
            新建立的帳戶 ID
        """
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)

        account = AdAccount(
            user_id=user_id,
            platform=platform,
            external_id=external_id,
            name=name,
            access_token=access_token,
            refresh_token=refresh_token,
            token_expires_at=expires_at,
            status="active",
        )

        self.db.add(account)
        await self.db.commit()
        await self.db.refresh(account)

        return account.id

    async def is_token_valid(self, account_id: uuid.UUID) -> bool:
        """
        檢查 token 是否有效

        Args:
            account_id: 帳戶 ID

        Returns:
            Token 是否有效
        """
        account = await self.get_account(account_id)
        if not account or not account.access_token:
            return False

        if not account.token_expires_at:
            return True  # 沒有過期時間，假設有效

        return datetime.now(timezone.utc) < account.token_expires_at

    async def delete_account(self, account_id: uuid.UUID) -> bool:
        """
        刪除廣告帳戶

        Args:
            account_id: 帳戶 ID

        Returns:
            是否刪除成功
        """
        try:
            account = await self.get_account(account_id)
            if not account:
                return False

            await self.db.delete(account)
            await self.db.commit()
            return True

        except Exception as e:
            print(f"Failed to delete account: {e}")
            await self.db.rollback()
            return False
