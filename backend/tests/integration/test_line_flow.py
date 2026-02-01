# -*- coding: utf-8 -*-
"""LINE Ads 整合流程測試"""

import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from uuid import uuid4


class TestLineIntegrationFlow:
    """測試 LINE Ads 完整整合流程"""

    @pytest.fixture
    def mock_user(self):
        """模擬已登入用戶"""
        from unittest.mock import MagicMock

        user = MagicMock()
        user.id = uuid4()
        user.email = "test@example.com"
        return user

    @pytest.mark.asyncio
    async def test_jws_signature_generation(self):
        """測試 JWS 簽章產生"""
        from app.services.line_jws_signer import LineJWSSigner

        signer = LineJWSSigner(
            access_key="test_access_key",
            secret_key="test_secret_key",
        )

        # 產生簽章
        auth_header = signer.get_authorization_header(
            method="GET",
            path="/api/v3/adaccounts",
        )

        assert auth_header.startswith("Bearer ")
        jws = auth_header.replace("Bearer ", "")
        assert len(jws.split(".")) == 3

    @pytest.mark.asyncio
    async def test_api_client_mock_flow(self):
        """測試 API Client Mock 流程"""
        from app.services.line_api_client import LineAPIClient

        client = LineAPIClient(
            access_key="test",
            secret_key="test",
            use_mock=True,
        )

        campaigns = await client.get_campaigns("test_account")
        ad_groups = await client.get_ad_groups("test_account")
        ads = await client.get_ads("test_account")
        metrics = await client.get_metrics("test_account", "2026-01-01", "2026-01-31")

        assert len(campaigns) > 0
        assert len(ad_groups) > 0
        assert len(ads) > 0
        assert len(metrics) > 0

    @pytest.mark.asyncio
    async def test_sync_service_initialization(self, mock_user):
        """測試同步服務初始化和 API Client 連接"""
        from app.services.sync_line import LineSyncService

        mock_account = MagicMock()
        mock_account.id = uuid4()
        mock_account.external_id = "test_account"
        mock_account.access_token = "test_access_key"
        mock_account.refresh_token = "test_secret_key"
        mock_account.user_id = mock_user.id

        service = LineSyncService(
            db=AsyncMock(),
            account=mock_account,
            use_mock=True,
        )

        # 驗證 client 正確初始化
        assert service.client is not None
        assert service.client.use_mock is True
        assert service.client.access_key == "test_access_key"

        # 驗證可以從 API Client 取得數據
        campaigns = await service.client.get_campaigns("test_account")
        assert len(campaigns) > 0

    @pytest.mark.asyncio
    async def test_status_mapping_comprehensive(self):
        """測試完整狀態映射"""
        from app.services.sync_line import LineSyncService

        mock_account = MagicMock()
        mock_account.access_token = "test"
        mock_account.refresh_token = "test"
        mock_account.external_id = "test"

        service = LineSyncService(
            db=AsyncMock(),
            account=mock_account,
            use_mock=True,
        )

        # Campaign 狀態映射
        assert service._map_campaign_status("ACTIVE") == "active"
        assert service._map_campaign_status("PAUSED") == "paused"
        assert service._map_campaign_status("ENDED") == "removed"
        assert service._map_campaign_status("DELETED") == "removed"
        assert service._map_campaign_status("UNKNOWN") == "unknown"

        # Ad 狀態映射
        assert service._map_ad_status("ACTIVE") == "active"
        assert service._map_ad_status("PAUSED") == "paused"
        assert service._map_ad_status("IN_REVIEW") == "pending"
        assert service._map_ad_status("REJECTED") == "rejected"
        assert service._map_ad_status("ENDED") == "removed"

    @pytest.mark.asyncio
    async def test_connect_endpoint_flow(self, mock_user):
        """測試連接端點流程"""
        from app.routers.oauth_line import (
            ConnectRequest,
            connect_account,
            verify_credentials,
            VerifyRequest,
        )

        # 測試驗證
        with patch("app.routers.oauth_line.is_mock_mode", return_value=True):
            verify_req = VerifyRequest(
                access_key="test_key",
                secret_key="test_secret",
            )
            verify_response = await verify_credentials(verify_req, mock_user)
            assert verify_response.valid is True

        # 測試連接
        with patch("app.routers.oauth_line.is_mock_mode", return_value=True):
            with patch("app.routers.oauth_line.TokenManager") as mock_tm:
                mock_tm_instance = AsyncMock()
                mock_tm_instance.save_new_account = AsyncMock(return_value=uuid4())
                mock_tm.return_value = mock_tm_instance

                connect_req = ConnectRequest(
                    access_key="test_key",
                    secret_key="test_secret",
                    ad_account_id="123456",
                )

                db_mock = AsyncMock()
                connect_response = await connect_account(connect_req, mock_user, db_mock)

                assert connect_response.success is True
                assert connect_response.account_id is not None
