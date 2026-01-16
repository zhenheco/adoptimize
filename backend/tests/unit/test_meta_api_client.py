# -*- coding: utf-8 -*-
"""
Meta API Client 測試

測試驗收標準：
- AC-M5: Rate limit 時自動重試（指數退避，最多 3 次）
- AC-M6: Token 過期時標記帳戶需重新授權
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.core.exceptions import RateLimitError, TokenExpiredError
from app.services.meta_api_client import MetaAPIClient


class TestMetaAPIClientGetCampaigns:
    """測試取得 campaigns 功能"""

    @pytest.mark.asyncio
    async def test_get_campaigns_success(self, mock_meta_api_response):
        """成功取得 campaigns"""
        client = MetaAPIClient(
            access_token="valid_token",
            ad_account_id="act_123456"
        )

        with patch.object(client, '_make_request', new_callable=AsyncMock) as mock_request:
            mock_request.return_value = mock_meta_api_response

            campaigns = await client.get_campaigns()

            assert len(campaigns) == 1
            assert campaigns[0]["id"] == "123456789"
            assert campaigns[0]["name"] == "Test Campaign"

    @pytest.mark.asyncio
    async def test_get_campaigns_with_pagination(self, mock_meta_api_response):
        """AC-M1: 應正確處理分頁"""
        client = MetaAPIClient(
            access_token="valid_token",
            ad_account_id="act_123456"
        )

        # 第一頁有下一頁
        page1 = {
            "data": [{"id": "1", "name": "Campaign 1"}],
            "paging": {"next": "https://graph.facebook.com/...?after=cursor1"}
        }
        # 第二頁是最後一頁
        page2 = {
            "data": [{"id": "2", "name": "Campaign 2"}],
            "paging": {"cursors": {"after": "cursor2"}}
        }

        with patch.object(client, '_make_request', new_callable=AsyncMock) as mock_request:
            mock_request.side_effect = [page1, page2]

            campaigns = await client.get_campaigns()

            assert len(campaigns) == 2
            assert mock_request.call_count == 2

    @pytest.mark.asyncio
    async def test_get_campaigns_rate_limit_retry(self):
        """AC-M5: Rate limit 時應自動重試（指數退避，最多 3 次）"""
        client = MetaAPIClient(
            access_token="valid_token",
            ad_account_id="act_123456"
        )

        rate_limit_error = {
            "error": {
                "message": "User request limit reached",
                "type": "OAuthException",
                "code": 17,
                "fbtrace_id": "trace123"
            }
        }
        success_response = {
            "data": [{"id": "123", "name": "Campaign"}],
            "paging": {}
        }

        with patch.object(client, '_make_raw_request', new_callable=AsyncMock) as mock_request:
            # 前兩次失敗，第三次成功
            mock_request.side_effect = [
                rate_limit_error,
                rate_limit_error,
                success_response
            ]

            with patch('asyncio.sleep', new_callable=AsyncMock):
                campaigns = await client.get_campaigns()

            assert len(campaigns) == 1
            assert mock_request.call_count == 3

    @pytest.mark.asyncio
    async def test_get_campaigns_rate_limit_max_retries_exceeded(self):
        """AC-M5: 超過最大重試次數應拋出 RateLimitError"""
        client = MetaAPIClient(
            access_token="valid_token",
            ad_account_id="act_123456"
        )

        rate_limit_error = {
            "error": {
                "message": "User request limit reached",
                "type": "OAuthException",
                "code": 17,
                "fbtrace_id": "trace123"
            }
        }

        with patch.object(client, '_make_raw_request', new_callable=AsyncMock) as mock_request:
            mock_request.return_value = rate_limit_error

            with patch('asyncio.sleep', new_callable=AsyncMock):
                with pytest.raises(RateLimitError) as exc_info:
                    await client.get_campaigns()

            assert exc_info.value.status_code == 429
            assert mock_request.call_count == 3  # 最多 3 次重試

    @pytest.mark.asyncio
    async def test_get_campaigns_token_expired(self):
        """AC-M6: Token 過期時應拋出 TokenExpiredError"""
        client = MetaAPIClient(
            access_token="expired_token",
            ad_account_id="act_123456"
        )

        token_expired_error = {
            "error": {
                "message": "Error validating access token",
                "type": "OAuthException",
                "code": 190,
                "error_subcode": 463,
                "fbtrace_id": "trace123"
            }
        }

        with patch.object(client, '_make_raw_request', new_callable=AsyncMock) as mock_request:
            mock_request.return_value = token_expired_error

            with pytest.raises(TokenExpiredError) as exc_info:
                await client.get_campaigns()

            assert exc_info.value.status_code == 401


class TestMetaAPIClientGetAdSets:
    """測試取得 ad sets 功能"""

    @pytest.mark.asyncio
    async def test_get_adsets_success(self):
        """成功取得 ad sets"""
        client = MetaAPIClient(
            access_token="valid_token",
            ad_account_id="act_123456"
        )

        mock_response = {
            "data": [
                {
                    "id": "adset_123",
                    "name": "Test Ad Set",
                    "status": "ACTIVE",
                    "targeting": {"age_min": 18, "age_max": 65},
                    "campaign_id": "campaign_456"
                }
            ],
            "paging": {}
        }

        with patch.object(client, '_make_request', new_callable=AsyncMock) as mock_request:
            mock_request.return_value = mock_response

            adsets = await client.get_adsets(campaign_id="campaign_456")

            assert len(adsets) == 1
            assert adsets[0]["id"] == "adset_123"
            assert adsets[0]["targeting"]["age_min"] == 18


class TestMetaAPIClientGetAds:
    """測試取得 ads 功能"""

    @pytest.mark.asyncio
    async def test_get_ads_success(self):
        """成功取得 ads"""
        client = MetaAPIClient(
            access_token="valid_token",
            ad_account_id="act_123456"
        )

        mock_response = {
            "data": [
                {
                    "id": "ad_789",
                    "name": "Test Ad",
                    "status": "ACTIVE",
                    "creative": {"id": "creative_101"},
                    "adset_id": "adset_123"
                }
            ],
            "paging": {}
        }

        with patch.object(client, '_make_request', new_callable=AsyncMock) as mock_request:
            mock_request.return_value = mock_response

            ads = await client.get_ads(adset_id="adset_123")

            assert len(ads) == 1
            assert ads[0]["id"] == "ad_789"
            assert ads[0]["creative"]["id"] == "creative_101"


class TestMetaAPIClientGetInsights:
    """測試取得 insights（metrics）功能"""

    @pytest.mark.asyncio
    async def test_get_insights_success(self):
        """成功取得 insights"""
        client = MetaAPIClient(
            access_token="valid_token",
            ad_account_id="act_123456"
        )

        mock_response = {
            "data": [
                {
                    "impressions": "10000",
                    "clicks": "500",
                    "spend": "150.00",
                    "conversions": "50",
                    "date_start": "2024-01-01",
                    "date_stop": "2024-01-07"
                }
            ],
            "paging": {}
        }

        with patch.object(client, '_make_request', new_callable=AsyncMock) as mock_request:
            mock_request.return_value = mock_response

            insights = await client.get_insights(
                date_preset="last_7d",
                level="account"
            )

            assert len(insights) == 1
            assert insights[0]["impressions"] == "10000"
            assert insights[0]["spend"] == "150.00"
