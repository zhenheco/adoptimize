# -*- coding: utf-8 -*-
"""Reddit API Client 單元測試"""

import pytest
from unittest.mock import patch


class TestRedditAPIClientInit:
    """測試 Client 初始化"""

    def test_init_with_access_token(self):
        """應該正確初始化 access token"""
        from app.services.reddit_api_client import RedditAPIClient

        client = RedditAPIClient(access_token="test_token")
        assert client.access_token == "test_token"

    def test_init_uses_mock_mode_from_env(self):
        """應該從環境變數讀取 mock 模式"""
        with patch.dict("os.environ", {"USE_MOCK_ADS_API": "true"}):
            from app.services.reddit_api_client import RedditAPIClient

            client = RedditAPIClient(access_token="test_token")
            assert client.use_mock is True

    def test_init_can_override_mock_mode(self):
        """應該可以覆蓋 mock 模式"""
        from app.services.reddit_api_client import RedditAPIClient

        client = RedditAPIClient(access_token="test_token", use_mock=False)
        assert client.use_mock is False


class TestRedditAPIClientMockMode:
    """測試 Mock 模式數據生成"""

    @pytest.mark.asyncio
    async def test_get_campaigns_returns_list(self):
        """get_campaigns 應返回列表"""
        from app.services.reddit_api_client import RedditAPIClient

        client = RedditAPIClient(access_token="test_token", use_mock=True)
        campaigns = await client.get_campaigns("test_account")

        assert isinstance(campaigns, list)
        assert len(campaigns) > 0
        for camp in campaigns:
            assert "id" in camp
            assert "name" in camp
            assert "status" in camp

    @pytest.mark.asyncio
    async def test_get_ad_groups_returns_list(self):
        """get_ad_groups 應返回列表"""
        from app.services.reddit_api_client import RedditAPIClient

        client = RedditAPIClient(access_token="test_token", use_mock=True)
        ad_groups = await client.get_ad_groups("test_account")

        assert isinstance(ad_groups, list)
        assert len(ad_groups) > 0
        for ag in ad_groups:
            assert "id" in ag
            assert "name" in ag
            assert "campaign_id" in ag
            assert "status" in ag

    @pytest.mark.asyncio
    async def test_get_ads_returns_list(self):
        """get_ads 應返回列表"""
        from app.services.reddit_api_client import RedditAPIClient

        client = RedditAPIClient(access_token="test_token", use_mock=True)
        ads = await client.get_ads("test_account")

        assert isinstance(ads, list)
        assert len(ads) > 0
        for ad in ads:
            assert "id" in ad
            assert "name" in ad
            assert "ad_group_id" in ad
            assert "status" in ad

    @pytest.mark.asyncio
    async def test_get_metrics_returns_list(self):
        """get_metrics 應返回列表"""
        from app.services.reddit_api_client import RedditAPIClient

        client = RedditAPIClient(access_token="test_token", use_mock=True)
        metrics = await client.get_metrics("test_account", "2026-01-01", "2026-01-31")

        assert isinstance(metrics, list)
        for m in metrics:
            assert "impressions" in m
            assert "clicks" in m
            assert "spend" in m
