# -*- coding: utf-8 -*-
"""TikTok API Client 單元測試"""

import pytest
from unittest.mock import patch, MagicMock


class TestTikTokAPIClient:
    """測試 TikTok API Client"""

    def test_client_uses_mock_when_env_set(self):
        """USE_MOCK_ADS_API=true 時應使用 Mock"""
        with patch.dict("os.environ", {"USE_MOCK_ADS_API": "true"}):
            from app.services.tiktok_api_client import TikTokAPIClient

            client = TikTokAPIClient(access_token="test_token")
            assert client.use_mock is True

    def test_client_uses_real_api_when_env_false(self):
        """USE_MOCK_ADS_API=false 時應使用真實 API"""
        with patch.dict("os.environ", {"USE_MOCK_ADS_API": "false"}):
            from app.services.tiktok_api_client import TikTokAPIClient

            client = TikTokAPIClient(access_token="test_token")
            assert client.use_mock is False

    @pytest.mark.asyncio
    async def test_get_campaigns_returns_mock_data(self):
        """Mock 模式應返回假數據"""
        with patch.dict("os.environ", {"USE_MOCK_ADS_API": "true"}):
            from app.services.tiktok_api_client import TikTokAPIClient

            client = TikTokAPIClient(access_token="test_token")
            campaigns = await client.get_campaigns(advertiser_id="mock_adv_001")

            assert isinstance(campaigns, list)
            assert len(campaigns) > 0
            assert "id" in campaigns[0]
            assert "name" in campaigns[0]

    @pytest.mark.asyncio
    async def test_get_adgroups_returns_mock_data(self):
        """Mock 模式應返回廣告組數據"""
        with patch.dict("os.environ", {"USE_MOCK_ADS_API": "true"}):
            from app.services.tiktok_api_client import TikTokAPIClient

            client = TikTokAPIClient(access_token="test_token")
            adgroups = await client.get_adgroups(advertiser_id="mock_adv_001")

            assert isinstance(adgroups, list)
            assert len(adgroups) > 0

    @pytest.mark.asyncio
    async def test_get_ads_returns_mock_data(self):
        """Mock 模式應返回廣告數據"""
        with patch.dict("os.environ", {"USE_MOCK_ADS_API": "true"}):
            from app.services.tiktok_api_client import TikTokAPIClient

            client = TikTokAPIClient(access_token="test_token")
            ads = await client.get_ads(advertiser_id="mock_adv_001")

            assert isinstance(ads, list)
            assert len(ads) > 0
