# -*- coding: utf-8 -*-
"""LINE Ads API Client 測試"""

import pytest
from unittest.mock import patch


class TestLineAPIClientInit:
    """測試 Client 初始化"""

    def test_init_with_keys(self):
        """應該正確初始化 access key 和 secret key"""
        from app.services.line_api_client import LineAPIClient

        client = LineAPIClient(
            access_key="test_access_key",
            secret_key="test_secret_key",
        )
        assert client.access_key == "test_access_key"
        assert client.secret_key == "test_secret_key"

    def test_init_uses_mock_mode_from_env(self):
        """應該從環境變數讀取 mock 模式"""
        with patch.dict("os.environ", {"USE_MOCK_ADS_API": "true"}):
            from app.services.line_api_client import LineAPIClient

            client = LineAPIClient(
                access_key="test_access_key",
                secret_key="test_secret_key",
            )
            assert client.use_mock is True

    def test_init_can_override_mock_mode(self):
        """應該可以覆蓋 mock 模式"""
        from app.services.line_api_client import LineAPIClient

        client = LineAPIClient(
            access_key="test_access_key",
            secret_key="test_secret_key",
            use_mock=False,
        )
        assert client.use_mock is False

    def test_init_creates_jws_signer(self):
        """應該建立 JWS 簽章產生器"""
        from app.services.line_api_client import LineAPIClient

        client = LineAPIClient(
            access_key="test_access_key",
            secret_key="test_secret_key",
        )
        assert client.signer is not None
        assert client.signer.access_key == "test_access_key"


class TestLineAPIClientMockMode:
    """測試 Mock 模式數據生成"""

    @pytest.fixture
    def client(self):
        """建立測試用 client"""
        from app.services.line_api_client import LineAPIClient

        return LineAPIClient(
            access_key="test_access_key",
            secret_key="test_secret_key",
            use_mock=True,
        )

    @pytest.mark.asyncio
    async def test_get_campaigns_returns_list(self, client):
        """應該回傳廣告活動列表"""
        campaigns = await client.get_campaigns("test_account_id")
        assert isinstance(campaigns, list)
        assert len(campaigns) > 0

    @pytest.mark.asyncio
    async def test_campaign_has_required_fields(self, client):
        """廣告活動應該有必要欄位"""
        campaigns = await client.get_campaigns("test_account_id")
        campaign = campaigns[0]
        assert "id" in campaign
        assert "name" in campaign
        assert "status" in campaign

    @pytest.mark.asyncio
    async def test_get_ad_groups_returns_list(self, client):
        """應該回傳廣告組列表"""
        ad_groups = await client.get_ad_groups("test_account_id")
        assert isinstance(ad_groups, list)
        assert len(ad_groups) > 0

    @pytest.mark.asyncio
    async def test_ad_group_has_required_fields(self, client):
        """廣告組應該有必要欄位"""
        ad_groups = await client.get_ad_groups("test_account_id")
        ad_group = ad_groups[0]
        assert "id" in ad_group
        assert "name" in ad_group
        assert "campaignId" in ad_group
        assert "status" in ad_group

    @pytest.mark.asyncio
    async def test_get_ads_returns_list(self, client):
        """應該回傳廣告列表"""
        ads = await client.get_ads("test_account_id")
        assert isinstance(ads, list)
        assert len(ads) > 0

    @pytest.mark.asyncio
    async def test_ad_has_required_fields(self, client):
        """廣告應該有必要欄位"""
        ads = await client.get_ads("test_account_id")
        ad = ads[0]
        assert "id" in ad
        assert "name" in ad
        assert "adGroupId" in ad
        assert "status" in ad

    @pytest.mark.asyncio
    async def test_get_metrics_returns_list(self, client):
        """應該回傳成效數據"""
        metrics = await client.get_metrics(
            account_id="test_account_id",
            start_date="2026-01-01",
            end_date="2026-01-31",
        )
        assert isinstance(metrics, list)

    @pytest.mark.asyncio
    async def test_metrics_has_required_fields(self, client):
        """成效數據應該有必要欄位"""
        metrics = await client.get_metrics(
            account_id="test_account_id",
            start_date="2026-01-01",
            end_date="2026-01-31",
        )
        assert len(metrics) > 0
        metric = metrics[0]
        assert "impressions" in metric
        assert "clicks" in metric
        assert "spend" in metric


class TestLineAPIClientHeaders:
    """測試 API 請求 headers"""

    def test_get_headers_includes_authorization(self):
        """headers 應該包含 Authorization"""
        from app.services.line_api_client import LineAPIClient

        client = LineAPIClient(
            access_key="test_access_key",
            secret_key="test_secret_key",
            use_mock=True,
        )
        headers = client._get_headers("GET", "/api/v3/adaccounts")
        assert "Authorization" in headers
        assert headers["Authorization"].startswith("Bearer ")

    def test_get_headers_includes_content_type(self):
        """headers 應該包含 Content-Type"""
        from app.services.line_api_client import LineAPIClient

        client = LineAPIClient(
            access_key="test_access_key",
            secret_key="test_secret_key",
            use_mock=True,
        )
        headers = client._get_headers("GET", "/api/v3/adaccounts")
        assert headers["Content-Type"] == "application/json"
