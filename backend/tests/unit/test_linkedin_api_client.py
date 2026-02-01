# -*- coding: utf-8 -*-
"""LinkedIn API Client 單元測試"""

import pytest
from unittest.mock import patch


class TestLinkedInAPIClientInit:
    """測試 Client 初始化"""

    def test_init_with_access_token(self):
        """應該正確初始化 access token"""
        from app.services.linkedin_api_client import LinkedInAPIClient

        client = LinkedInAPIClient(access_token="test_token", use_mock=True)
        assert client.access_token == "test_token"

    def test_init_uses_mock_mode_from_env(self):
        """應該從環境變數讀取 mock 模式"""
        with patch.dict("os.environ", {"USE_MOCK_ADS_API": "true"}):
            from app.services.linkedin_api_client import LinkedInAPIClient

            client = LinkedInAPIClient(access_token="test_token")
            assert client.use_mock is True

    def test_init_can_override_mock_mode(self):
        """應該可以覆蓋 mock 模式"""
        from app.services.linkedin_api_client import LinkedInAPIClient

        client = LinkedInAPIClient(access_token="test_token", use_mock=False)
        assert client.use_mock is False


class TestLinkedInAPIClientHeaders:
    """測試 Headers 生成"""

    def test_get_headers_contains_authorization(self):
        """Headers 應該包含 Authorization"""
        from app.services.linkedin_api_client import LinkedInAPIClient

        client = LinkedInAPIClient(access_token="test_token", use_mock=True)
        headers = client._get_headers()

        assert headers["Authorization"] == "Bearer test_token"

    def test_get_headers_contains_restli_protocol_version(self):
        """Headers 應該包含 X-Restli-Protocol-Version"""
        from app.services.linkedin_api_client import LinkedInAPIClient

        client = LinkedInAPIClient(access_token="test_token", use_mock=True)
        headers = client._get_headers()

        assert headers["X-Restli-Protocol-Version"] == "2.0.0"

    def test_get_headers_contains_linkedin_version(self):
        """Headers 應該包含 Linkedin-Version (yyyymm 格式)"""
        from app.services.linkedin_api_client import LinkedInAPIClient

        client = LinkedInAPIClient(access_token="test_token", use_mock=True)
        headers = client._get_headers()

        assert "Linkedin-Version" in headers
        # 驗證格式為 yyyymm (6 位數字)
        version = headers["Linkedin-Version"]
        assert len(version) == 6
        assert version.isdigit()

    def test_get_headers_contains_content_type(self):
        """Headers 應該包含 Content-Type"""
        from app.services.linkedin_api_client import LinkedInAPIClient

        client = LinkedInAPIClient(access_token="test_token", use_mock=True)
        headers = client._get_headers()

        assert headers["Content-Type"] == "application/json"


class TestLinkedInAPIClientMockMode:
    """測試 Mock 模式數據生成"""

    @pytest.mark.asyncio
    async def test_get_ad_accounts_returns_list(self):
        """get_ad_accounts 應返回列表"""
        from app.services.linkedin_api_client import LinkedInAPIClient

        client = LinkedInAPIClient(access_token="test_token", use_mock=True)
        accounts = await client.get_ad_accounts()

        assert isinstance(accounts, list)
        assert len(accounts) > 0
        for acc in accounts:
            assert "id" in acc
            assert "name" in acc

    @pytest.mark.asyncio
    async def test_get_campaigns_returns_list(self):
        """get_campaigns 應返回列表"""
        from app.services.linkedin_api_client import LinkedInAPIClient

        client = LinkedInAPIClient(access_token="test_token", use_mock=True)
        campaigns = await client.get_campaigns("test_account")

        assert isinstance(campaigns, list)
        assert len(campaigns) > 0
        for camp in campaigns:
            assert "id" in camp
            assert "name" in camp
            assert "status" in camp

    @pytest.mark.asyncio
    async def test_get_campaign_groups_returns_list(self):
        """get_campaign_groups 應返回列表"""
        from app.services.linkedin_api_client import LinkedInAPIClient

        client = LinkedInAPIClient(access_token="test_token", use_mock=True)
        groups = await client.get_campaign_groups("test_account")

        assert isinstance(groups, list)
        assert len(groups) > 0
        for group in groups:
            assert "id" in group

    @pytest.mark.asyncio
    async def test_get_creatives_returns_list(self):
        """get_creatives 應返回列表"""
        from app.services.linkedin_api_client import LinkedInAPIClient

        client = LinkedInAPIClient(access_token="test_token", use_mock=True)
        creatives = await client.get_creatives("test_account")

        assert isinstance(creatives, list)
        assert len(creatives) > 0
        for creative in creatives:
            assert "id" in creative

    @pytest.mark.asyncio
    async def test_get_metrics_returns_list(self):
        """get_metrics 應返回列表"""
        from app.services.linkedin_api_client import LinkedInAPIClient

        client = LinkedInAPIClient(access_token="test_token", use_mock=True)
        metrics = await client.get_metrics("test_account", "2026-01-01", "2026-01-31")

        assert isinstance(metrics, list)
        assert len(metrics) > 0
        for m in metrics:
            assert "impressions" in m
            assert "clicks" in m

    @pytest.mark.asyncio
    async def test_get_metrics_contains_spend_and_conversions(self):
        """get_metrics 應包含 spend 和 conversions"""
        from app.services.linkedin_api_client import LinkedInAPIClient

        client = LinkedInAPIClient(access_token="test_token", use_mock=True)
        metrics = await client.get_metrics("test_account", "2026-01-01", "2026-01-31")

        for m in metrics:
            assert "spend" in m
            assert "conversions" in m
