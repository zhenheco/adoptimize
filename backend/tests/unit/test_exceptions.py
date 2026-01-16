# -*- coding: utf-8 -*-
"""
自定義異常測試

測試驗收標準：
- AC-E1: TokenExpiredError 返回 401 並包含重新授權指引
- AC-E2: RateLimitError 返回 429 並包含重試時間
- AC-E3: SyncError 返回 500 並記錄詳細日誌
- AC-E4: 所有 API 端點錯誤格式統一
"""

import pytest

from app.core.exceptions import (
    AdOptimizeError,
    TokenExpiredError,
    RateLimitError,
    SyncError,
    MetaAPIError,
)


class TestTokenExpiredError:
    """Token 過期異常測試"""

    def test_token_expired_error_status_code(self):
        """AC-E1: Token 過期應返回 401 狀態碼"""
        error = TokenExpiredError(account_id="test-account-123")
        assert error.status_code == 401

    def test_token_expired_error_contains_reauth_url(self):
        """AC-E1: 錯誤訊息應包含重新授權指引"""
        error = TokenExpiredError(
            account_id="test-account-123",
            platform="meta"
        )
        response = error.to_response()

        assert "reauth_url" in response
        assert "meta" in response["reauth_url"].lower()

    def test_token_expired_error_format(self):
        """AC-E4: 錯誤格式應統一"""
        error = TokenExpiredError(account_id="test-account-123")
        response = error.to_response()

        # 驗證統一格式
        assert "error" in response
        assert "code" in response["error"]
        assert "message" in response["error"]
        assert response["error"]["code"] == "TOKEN_EXPIRED"


class TestRateLimitError:
    """Rate Limit 異常測試"""

    def test_rate_limit_error_status_code(self):
        """AC-E2: Rate limit 應返回 429 狀態碼"""
        error = RateLimitError(retry_after=60)
        assert error.status_code == 429

    def test_rate_limit_error_contains_retry_after(self):
        """AC-E2: 錯誤訊息應包含重試時間"""
        error = RateLimitError(retry_after=120)
        response = error.to_response()

        assert "retry_after" in response
        assert response["retry_after"] == 120

    def test_rate_limit_error_format(self):
        """AC-E4: 錯誤格式應統一"""
        error = RateLimitError(retry_after=60)
        response = error.to_response()

        assert "error" in response
        assert response["error"]["code"] == "RATE_LIMIT_EXCEEDED"


class TestSyncError:
    """同步異常測試"""

    def test_sync_error_status_code(self):
        """AC-E3: Sync error 應返回 500 狀態碼"""
        error = SyncError(
            account_id="test-account-123",
            operation="sync_campaigns",
            reason="Connection timeout"
        )
        assert error.status_code == 500

    def test_sync_error_contains_details(self):
        """AC-E3: 錯誤應包含詳細資訊"""
        error = SyncError(
            account_id="test-account-123",
            operation="sync_campaigns",
            reason="Connection timeout",
            details={"endpoint": "/campaigns", "attempt": 3}
        )
        response = error.to_response()

        assert "details" in response
        assert response["details"]["operation"] == "sync_campaigns"

    def test_sync_error_format(self):
        """AC-E4: 錯誤格式應統一"""
        error = SyncError(
            account_id="test-account-123",
            operation="sync_campaigns",
            reason="Connection timeout"
        )
        response = error.to_response()

        assert "error" in response
        assert response["error"]["code"] == "SYNC_ERROR"


class TestMetaAPIError:
    """Meta API 異常測試"""

    def test_meta_api_error_parses_error_code(self):
        """應正確解析 Meta API 錯誤碼"""
        error = MetaAPIError(
            error_code=17,
            error_message="User request limit reached",
            fbtrace_id="trace123"
        )

        assert error.error_code_meta == 17
        assert error.is_rate_limit

    def test_meta_api_error_detects_token_expired(self):
        """應正確偵測 Token 過期"""
        error = MetaAPIError(
            error_code=190,
            error_subcode=463,
            error_message="Error validating access token",
            fbtrace_id="trace123"
        )

        assert error.is_token_expired

    def test_meta_api_error_detects_permission_error(self):
        """應正確偵測權限錯誤"""
        error = MetaAPIError(
            error_code=10,
            error_message="Permission denied",
            fbtrace_id="trace123"
        )

        assert error.is_permission_error


class TestErrorFormatUniformity:
    """驗證所有錯誤格式統一"""

    def test_all_errors_have_consistent_format(self):
        """AC-E4: 所有錯誤應有統一的格式結構"""
        errors = [
            TokenExpiredError(account_id="test"),
            RateLimitError(retry_after=60),
            SyncError(account_id="test", operation="sync", reason="fail"),
        ]

        for error in errors:
            response = error.to_response()

            # 所有錯誤都應有 error 物件
            assert "error" in response
            assert isinstance(response["error"], dict)

            # error 物件必須有 code 和 message
            assert "code" in response["error"]
            assert "message" in response["error"]

            # code 應為大寫 snake_case
            assert response["error"]["code"].isupper()
