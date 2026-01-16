# -*- coding: utf-8 -*-
"""
自定義異常模組

定義 AdOptimize 專案的所有自定義異常，
確保錯誤格式統一且包含足夠的診斷資訊。

統一錯誤格式:
{
    "error": {
        "code": "ERROR_CODE",  # 大寫 snake_case
        "message": "人類可讀的錯誤訊息"
    },
    "details": {...},  # 可選，包含額外資訊
    "retry_after": 60,  # 可選，用於 rate limit
    "reauth_url": "..."  # 可選，用於 token 過期
}
"""

from typing import Any, Optional


class AdOptimizeError(Exception):
    """
    AdOptimize 基礎異常類別

    所有自定義異常都應繼承此類別，確保統一的錯誤格式。
    """

    status_code: int = 500
    error_code: str = "INTERNAL_ERROR"
    message: str = "發生內部錯誤"

    def __init__(
        self,
        message: Optional[str] = None,
        details: Optional[dict[str, Any]] = None,
    ):
        self.message = message or self.__class__.message
        self.details = details or {}
        super().__init__(self.message)

    def to_response(self) -> dict[str, Any]:
        """轉換為統一的 API 回應格式"""
        response = {
            "error": {
                "code": self.error_code,
                "message": self.message,
            }
        }

        if self.details:
            response["details"] = self.details

        return response


class TokenExpiredError(AdOptimizeError):
    """
    Token 過期異常

    當 OAuth access token 過期或無效時拋出。
    包含重新授權的 URL 指引。

    AC-E1: 返回 401 並包含重新授權指引
    """

    status_code = 401
    error_code = "TOKEN_EXPIRED"
    message = "存取權杖已過期，請重新授權"

    def __init__(
        self,
        account_id: str,
        platform: str = "meta",
        message: Optional[str] = None,
    ):
        self.account_id = account_id
        self.platform = platform
        super().__init__(
            message=message,
            details={"account_id": account_id, "platform": platform},
        )

    def to_response(self) -> dict[str, Any]:
        """包含重新授權 URL 的回應"""
        response = super().to_response()

        # 根據平台生成重新授權 URL
        if self.platform == "meta":
            response["reauth_url"] = f"/api/v1/oauth/meta/auth?account_id={self.account_id}"
        elif self.platform == "google":
            response["reauth_url"] = f"/api/v1/oauth/google/auth?account_id={self.account_id}"
        else:
            response["reauth_url"] = f"/api/v1/oauth/{self.platform}/auth?account_id={self.account_id}"

        return response


class RateLimitError(AdOptimizeError):
    """
    Rate Limit 異常

    當 API 請求被限流時拋出。
    包含建議的重試等待時間。

    AC-E2: 返回 429 並包含重試時間
    """

    status_code = 429
    error_code = "RATE_LIMIT_EXCEEDED"
    message = "請求頻率超過限制，請稍後重試"

    def __init__(
        self,
        retry_after: int,
        message: Optional[str] = None,
    ):
        self.retry_after = retry_after
        super().__init__(
            message=message,
            details={"retry_after": retry_after},
        )

    def to_response(self) -> dict[str, Any]:
        """包含重試時間的回應"""
        response = super().to_response()
        response["retry_after"] = self.retry_after
        return response


class SyncError(AdOptimizeError):
    """
    同步異常

    當資料同步過程發生錯誤時拋出。
    包含詳細的同步操作資訊供除錯。

    AC-E3: 返回 500 並記錄詳細日誌
    """

    status_code = 500
    error_code = "SYNC_ERROR"
    message = "資料同步失敗"

    def __init__(
        self,
        account_id: str,
        operation: str,
        reason: str,
        details: Optional[dict[str, Any]] = None,
        message: Optional[str] = None,
    ):
        self.account_id = account_id
        self.operation = operation
        self.reason = reason

        sync_details = {
            "account_id": account_id,
            "operation": operation,
            "reason": reason,
        }

        if details:
            sync_details.update(details)

        super().__init__(
            message=message or f"同步操作 {operation} 失敗: {reason}",
            details=sync_details,
        )


class MetaAPIError(AdOptimizeError):
    """
    Meta Graph API 錯誤

    封裝 Meta API 回傳的錯誤，提供便利的錯誤類型判斷方法。

    Meta 錯誤碼參考:
    - 17: Rate limit (OAuthException)
    - 190: Token 過期或無效
    - 10: 權限錯誤
    - 1: Unknown error
    - 2: Service temporarily unavailable
    """

    status_code = 502
    error_code = "META_API_ERROR"
    message = "Meta API 請求失敗"

    # Meta 錯誤碼常量
    CODE_RATE_LIMIT = 17
    CODE_TOKEN_EXPIRED = 190
    CODE_PERMISSION_DENIED = 10
    CODE_UNKNOWN = 1
    CODE_SERVICE_UNAVAILABLE = 2

    # Token 過期的 subcode
    SUBCODE_TOKEN_EXPIRED = 463
    SUBCODE_TOKEN_INVALID = 460

    def __init__(
        self,
        error_code: int,
        error_message: str,
        fbtrace_id: str,
        error_subcode: Optional[int] = None,
    ):
        self.error_code_meta = error_code
        self.error_subcode = error_subcode
        self.fbtrace_id = fbtrace_id

        super().__init__(
            message=error_message,
            details={
                "meta_error_code": error_code,
                "meta_error_subcode": error_subcode,
                "fbtrace_id": fbtrace_id,
            },
        )

    @property
    def is_rate_limit(self) -> bool:
        """檢查是否為 Rate Limit 錯誤"""
        return self.error_code_meta == self.CODE_RATE_LIMIT

    @property
    def is_token_expired(self) -> bool:
        """檢查是否為 Token 過期錯誤"""
        if self.error_code_meta != self.CODE_TOKEN_EXPIRED:
            return False

        # 如果有 subcode，進一步確認是否為過期
        if self.error_subcode is not None:
            return self.error_subcode in (
                self.SUBCODE_TOKEN_EXPIRED,
                self.SUBCODE_TOKEN_INVALID,
            )

        # 沒有 subcode 但 code 是 190，視為 token 問題
        return True

    @property
    def is_permission_error(self) -> bool:
        """檢查是否為權限錯誤"""
        return self.error_code_meta == self.CODE_PERMISSION_DENIED

    @property
    def is_retryable(self) -> bool:
        """檢查是否可重試"""
        return self.error_code_meta in (
            self.CODE_RATE_LIMIT,
            self.CODE_SERVICE_UNAVAILABLE,
            self.CODE_UNKNOWN,
        )


class PermissionDeniedError(AdOptimizeError):
    """
    權限不足異常

    當帳戶沒有足夠的 API 權限時拋出。
    """

    status_code = 403
    error_code = "PERMISSION_DENIED"
    message = "權限不足，請確認帳戶已授權必要的權限範圍"

    def __init__(
        self,
        account_id: str,
        required_permission: str,
        message: Optional[str] = None,
    ):
        super().__init__(
            message=message,
            details={
                "account_id": account_id,
                "required_permission": required_permission,
            },
        )


class AccountNotFoundError(AdOptimizeError):
    """帳戶不存在異常"""

    status_code = 404
    error_code = "ACCOUNT_NOT_FOUND"
    message = "找不到指定的廣告帳戶"

    def __init__(self, account_id: str, message: Optional[str] = None):
        super().__init__(
            message=message,
            details={"account_id": account_id},
        )


class ValidationError(AdOptimizeError):
    """驗證錯誤異常"""

    status_code = 400
    error_code = "VALIDATION_ERROR"
    message = "請求參數驗證失敗"

    def __init__(
        self,
        field: str,
        reason: str,
        message: Optional[str] = None,
    ):
        super().__init__(
            message=message or f"欄位 {field} 驗證失敗: {reason}",
            details={"field": field, "reason": reason},
        )
