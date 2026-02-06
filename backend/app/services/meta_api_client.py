# -*- coding: utf-8 -*-
"""
Meta Graph API Client

封裝 Meta Marketing API 的呼叫，提供：
- 自動分頁處理
- Rate limit 指數退避重試
- Token 過期偵測
- 統一的錯誤處理

使用方式:
    client = MetaAPIClient(
        access_token="your_token",
        ad_account_id="act_123456"
    )
    campaigns = await client.get_campaigns()
"""

import asyncio
import logging
from typing import Any, Optional

import httpx

from app.core.exceptions import (
    MetaAPIError,
    RateLimitError,
    TokenExpiredError,
)

logger = logging.getLogger(__name__)

# 降低 httpx 日誌等級，避免 access_token 在 URL 中被記錄
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)


class MetaAPIClient:
    """
    Meta Marketing API 客戶端

    封裝 Graph API 呼叫，處理分頁、重試和錯誤。
    """

    BASE_URL = "https://graph.facebook.com/v21.0"
    DEFAULT_TIMEOUT = 30.0
    MAX_RETRIES = 3
    INITIAL_RETRY_DELAY = 1.0  # 秒

    # 常用欄位定義
    CAMPAIGN_FIELDS = [
        "id",
        "name",
        "status",
        "objective",
        "daily_budget",
        "lifetime_budget",
        "start_time",
        "stop_time",
        "created_time",
        "updated_time",
    ]

    ADSET_FIELDS = [
        "id",
        "name",
        "status",
        "campaign_id",
        "targeting",
        "daily_budget",
        "lifetime_budget",
        "bid_strategy",
        "optimization_goal",
        "start_time",
        "end_time",
        "created_time",
        "updated_time",
    ]

    AD_FIELDS = [
        "id",
        "name",
        "status",
        "adset_id",
        "creative",
        "created_time",
        "updated_time",
    ]

    INSIGHTS_FIELDS = [
        "impressions",
        "clicks",
        "spend",
        "cpc",
        "cpm",
        "ctr",
        "reach",
        "frequency",
        "actions",
        "cost_per_action_type",
        "action_values",
    ]

    def __init__(
        self,
        access_token: str,
        ad_account_id: str,
        timeout: float = DEFAULT_TIMEOUT,
    ):
        """
        初始化 Meta API Client

        Args:
            access_token: Meta access token
            ad_account_id: 廣告帳戶 ID（格式：act_123456）
            timeout: 請求超時時間（秒）
        """
        self.access_token = access_token
        self.ad_account_id = ad_account_id
        self.timeout = timeout

        # 確保 ad_account_id 格式正確
        if not ad_account_id.startswith("act_"):
            self.ad_account_id = f"act_{ad_account_id}"

    async def _make_raw_request(
        self,
        endpoint: str,
        params: Optional[dict[str, Any]] = None,
    ) -> dict[str, Any]:
        """
        發送原始 HTTP 請求

        Args:
            endpoint: API 端點（不含 base URL）
            params: 查詢參數

        Returns:
            API 回應 JSON
        """
        url = f"{self.BASE_URL}/{endpoint}"

        request_params = {
            "access_token": self.access_token,
            **(params or {}),
        }

        # 記錄 API 呼叫（不含 access_token）
        safe_params = {k: v for k, v in request_params.items() if k != "access_token"}
        logger.debug(f"Meta API request: {endpoint}, params: {safe_params}")

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.get(url, params=request_params)
            result = response.json()

        # 記錄回應狀態
        if "error" in result:
            logger.warning(
                f"Meta API error for {endpoint}: "
                f"code={result['error'].get('code')}, "
                f"message={result['error'].get('message', '')[:100]}"
            )
        else:
            logger.debug(f"Meta API success: {endpoint}, status={response.status_code}")

        return result

    async def _make_request(
        self,
        endpoint: str,
        params: Optional[dict[str, Any]] = None,
    ) -> dict[str, Any]:
        """
        發送 HTTP 請求，帶有重試邏輯

        Args:
            endpoint: API 端點
            params: 查詢參數

        Returns:
            API 回應 JSON

        Raises:
            TokenExpiredError: Token 過期
            RateLimitError: 超過最大重試次數
            MetaAPIError: 其他 API 錯誤
        """
        retry_delay = self.INITIAL_RETRY_DELAY

        for attempt in range(self.MAX_RETRIES):
            result = await self._make_raw_request(endpoint, params)

            # 檢查是否有錯誤
            if "error" in result:
                error = result["error"]
                meta_error = MetaAPIError(
                    error_code=error.get("code", 0),
                    error_message=error.get("message", "Unknown error"),
                    fbtrace_id=error.get("fbtrace_id", ""),
                    error_subcode=error.get("error_subcode"),
                )

                # Token 過期 - 不重試，直接拋出
                if meta_error.is_token_expired:
                    logger.warning(
                        f"Token expired for ad account {self.ad_account_id}"
                    )
                    raise TokenExpiredError(
                        account_id=self.ad_account_id,
                        platform="meta",
                    )

                # Rate limit - 重試
                if meta_error.is_rate_limit:
                    if attempt < self.MAX_RETRIES - 1:
                        logger.warning(
                            f"Rate limited, retrying in {retry_delay}s "
                            f"(attempt {attempt + 1}/{self.MAX_RETRIES})"
                        )
                        await asyncio.sleep(retry_delay)
                        retry_delay *= 2  # 指數退避
                        continue
                    else:
                        logger.error(
                            f"Rate limit exceeded after {self.MAX_RETRIES} retries"
                        )
                        raise RateLimitError(
                            retry_after=int(retry_delay),
                            message="Rate limit exceeded after maximum retries",
                        )

                # 其他錯誤
                raise meta_error

            return result

        # 不應該到達這裡
        raise RateLimitError(
            retry_after=int(retry_delay),
            message="Maximum retries exceeded",
        )

    async def _fetch_all_pages(
        self,
        endpoint: str,
        params: Optional[dict[str, Any]] = None,
    ) -> list[dict[str, Any]]:
        """
        取得所有分頁資料

        Args:
            endpoint: API 端點
            params: 查詢參數

        Returns:
            合併後的所有資料
        """
        all_data: list[dict[str, Any]] = []
        request_params = params or {}

        while True:
            result = await self._make_request(endpoint, request_params)

            # 收集資料
            data = result.get("data", [])
            all_data.extend(data)

            # 檢查是否有下一頁
            paging = result.get("paging", {})
            next_url = paging.get("next")

            if not next_url:
                break

            # 從 next URL 提取 after cursor
            # Meta 的 next URL 格式: https://graph.facebook.com/...?after=xxx
            if "after=" in next_url:
                after_cursor = next_url.split("after=")[1].split("&")[0]
                request_params["after"] = after_cursor
            else:
                break

        return all_data

    async def get_campaigns(
        self,
        fields: Optional[list[str]] = None,
        limit: int = 100,
    ) -> list[dict[str, Any]]:
        """
        取得帳戶的所有廣告活動

        Args:
            fields: 要取得的欄位（預設使用 CAMPAIGN_FIELDS）
            limit: 每頁數量

        Returns:
            廣告活動列表

        AC-M1: 能從 Meta API 取得 campaigns
        """
        endpoint = f"{self.ad_account_id}/campaigns"
        params = {
            "fields": ",".join(fields or self.CAMPAIGN_FIELDS),
            "limit": limit,
        }

        logger.info(f"Fetching campaigns for {self.ad_account_id}")
        campaigns = await self._fetch_all_pages(endpoint, params)
        logger.info(f"Fetched {len(campaigns)} campaigns")

        return campaigns

    async def get_adsets(
        self,
        campaign_id: Optional[str] = None,
        fields: Optional[list[str]] = None,
        limit: int = 100,
    ) -> list[dict[str, Any]]:
        """
        取得廣告組

        Args:
            campaign_id: 指定 campaign（可選，不指定則取得帳戶所有）
            fields: 要取得的欄位
            limit: 每頁數量

        Returns:
            廣告組列表

        AC-M2: 能同步 ad sets 並關聯到正確的 campaign
        """
        if campaign_id:
            endpoint = f"{campaign_id}/adsets"
        else:
            endpoint = f"{self.ad_account_id}/adsets"

        params = {
            "fields": ",".join(fields or self.ADSET_FIELDS),
            "limit": limit,
        }

        logger.info(f"Fetching ad sets for {campaign_id or self.ad_account_id}")
        adsets = await self._fetch_all_pages(endpoint, params)
        logger.info(f"Fetched {len(adsets)} ad sets")

        return adsets

    async def get_ads(
        self,
        adset_id: Optional[str] = None,
        fields: Optional[list[str]] = None,
        limit: int = 100,
    ) -> list[dict[str, Any]]:
        """
        取得廣告

        Args:
            adset_id: 指定 ad set（可選）
            fields: 要取得的欄位
            limit: 每頁數量

        Returns:
            廣告列表

        AC-M3: 能同步 ads 並關聯到正確的 ad set
        """
        if adset_id:
            endpoint = f"{adset_id}/ads"
        else:
            endpoint = f"{self.ad_account_id}/ads"

        params = {
            "fields": ",".join(fields or self.AD_FIELDS),
            "limit": limit,
        }

        logger.info(f"Fetching ads for {adset_id or self.ad_account_id}")
        ads = await self._fetch_all_pages(endpoint, params)
        logger.info(f"Fetched {len(ads)} ads")

        return ads

    async def get_insights(
        self,
        date_preset: str = "last_7d",
        level: str = "account",
        fields: Optional[list[str]] = None,
        time_increment: int = 1,
        breakdowns: Optional[list[str]] = None,
    ) -> list[dict[str, Any]]:
        """
        取得效能指標（insights）

        Args:
            date_preset: 日期範圍（last_7d, last_14d, last_30d, etc.）
            level: 彙總層級（account, campaign, adset, ad）
            fields: 要取得的指標欄位
            time_increment: 時間粒度（1=每日, 7=每週, etc.）
            breakdowns: 細分維度

        Returns:
            指標資料列表

        AC-M4: 能取得 insights 並計算 CTR、CPC、ROAS
        """
        endpoint = f"{self.ad_account_id}/insights"

        params: dict[str, Any] = {
            "fields": ",".join(fields or self.INSIGHTS_FIELDS),
            "date_preset": date_preset,
            "level": level,
            "time_increment": time_increment,
        }

        if breakdowns:
            params["breakdowns"] = ",".join(breakdowns)

        logger.info(
            f"Fetching insights for {self.ad_account_id}, "
            f"date_preset={date_preset}, level={level}"
        )
        insights = await self._fetch_all_pages(endpoint, params)
        logger.info(f"Fetched {len(insights)} insight records")

        return insights

    async def get_custom_audiences(
        self,
        fields: Optional[list[str]] = None,
        limit: int = 100,
    ) -> list[dict[str, Any]]:
        """
        取得自訂受眾

        Args:
            fields: 要取得的欄位
            limit: 每頁數量

        Returns:
            自訂受眾列表
        """
        default_fields = [
            "id",
            "name",
            "subtype",
            "approximate_count",
            "description",
            "time_created",
            "time_updated",
        ]

        endpoint = f"{self.ad_account_id}/customaudiences"
        params = {
            "fields": ",".join(fields or default_fields),
            "limit": limit,
        }

        logger.info(f"Fetching custom audiences for {self.ad_account_id}")
        audiences = await self._fetch_all_pages(endpoint, params)
        logger.info(f"Fetched {len(audiences)} custom audiences")

        return audiences

    async def update_ad_status(
        self,
        ad_id: str,
        status: str,
    ) -> dict[str, Any]:
        """
        更新廣告狀態

        Args:
            ad_id: 廣告 ID
            status: 新狀態（ACTIVE, PAUSED）

        Returns:
            API 回應
        """
        endpoint = ad_id
        # 注意：更新操作需要 POST 請求，這裡簡化處理
        # 實際使用時可能需要調整

        logger.info(f"Updating ad {ad_id} status to {status}")

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(
                f"{self.BASE_URL}/{endpoint}",
                data={
                    "access_token": self.access_token,
                    "status": status,
                },
            )
            result = response.json()

        if "error" in result:
            error = result["error"]
            raise MetaAPIError(
                error_code=error.get("code", 0),
                error_message=error.get("message", "Unknown error"),
                fbtrace_id=error.get("fbtrace_id", ""),
                error_subcode=error.get("error_subcode"),
            )

        return result

    async def get_account_info(self) -> dict[str, Any]:
        """
        取得廣告帳戶基本資訊

        Returns:
            帳戶資訊（id, name, currency, timezone 等）
        """
        endpoint = self.ad_account_id
        params = {
            "fields": "id,name,account_status,currency,timezone_name,amount_spent,balance",
        }

        logger.info(f"Fetching account info for {self.ad_account_id}")
        result = await self._make_request(endpoint, params)
        return result

    async def get_ad_creatives(
        self,
        fields: Optional[list[str]] = None,
        limit: int = 100,
    ) -> list[dict[str, Any]]:
        """
        取得廣告素材

        Args:
            fields: 要取得的欄位
            limit: 每頁數量

        Returns:
            廣告素材列表
        """
        default_fields = [
            "id",
            "name",
            "status",
            "thumbnail_url",
            "object_type",
            "title",
            "body",
            "image_url",
        ]

        endpoint = f"{self.ad_account_id}/adcreatives"
        params = {
            "fields": ",".join(fields or default_fields),
            "limit": limit,
        }

        logger.info(f"Fetching ad creatives for {self.ad_account_id}")
        creatives = await self._fetch_all_pages(endpoint, params)
        logger.info(f"Fetched {len(creatives)} ad creatives")

        return creatives
