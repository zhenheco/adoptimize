# -*- coding: utf-8 -*-
"""
Meta Marketing API 受眾與廣告服務

提供以下功能：
1. 建立 Meta Custom Audience（興趣導向受眾）
2. 建立 Ad Set（廣告組合）
3. 建立 Ad（廣告）
4. 查詢興趣標籤

參考文件：
- https://developers.facebook.com/docs/marketing-api/audiences/guides/custom-audiences
- https://developers.facebook.com/docs/marketing-api/reference/ad-account/adsets
- https://developers.facebook.com/docs/marketing-api/reference/ad-account/ads
"""

import logging
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Optional

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.services.token_manager import TokenManager

logger = logging.getLogger(__name__)

# Meta Graph API 基底 URL
META_GRAPH_URL = "https://graph.facebook.com/v18.0"


# ============================================================
# 資料結構
# ============================================================


@dataclass
class InterestTargeting:
    """興趣導向設定"""

    interest_ids: list[str]  # Meta interest IDs
    interest_names: list[str]  # 興趣名稱（用於記錄）


@dataclass
class AudienceCreationResult:
    """受眾建立結果"""

    success: bool
    audience_id: Optional[str] = None
    audience_name: Optional[str] = None
    error_message: Optional[str] = None
    estimated_reach: Optional[int] = None


@dataclass
class AdSetCreationResult:
    """廣告組合建立結果"""

    success: bool
    adset_id: Optional[str] = None
    adset_name: Optional[str] = None
    error_message: Optional[str] = None


@dataclass
class AdCreationResult:
    """廣告建立結果"""

    success: bool
    ad_id: Optional[str] = None
    ad_name: Optional[str] = None
    error_message: Optional[str] = None


@dataclass
class CompleteAdCreationResult:
    """完整廣告建立結果（Ad Set + Ad）"""

    success: bool
    audience_id: Optional[str] = None
    adset_id: Optional[str] = None
    ad_id: Optional[str] = None
    audience_name: Optional[str] = None
    adset_name: Optional[str] = None
    ad_name: Optional[str] = None
    error_message: Optional[str] = None


# ============================================================
# Meta Marketing API 服務
# ============================================================


class MetaAudienceService:
    """Meta Marketing API 受眾與廣告服務"""

    def __init__(self, db: AsyncSession):
        """
        初始化服務

        Args:
            db: SQLAlchemy 非同步 session
        """
        self.db = db
        self.settings = get_settings()
        self.token_manager = TokenManager(db)

    async def _get_access_token(self, account_id: uuid.UUID) -> Optional[str]:
        """取得有效的 access token"""
        return await self.token_manager.get_valid_access_token(account_id)

    async def _make_api_request(
        self,
        method: str,
        endpoint: str,
        access_token: str,
        params: Optional[dict] = None,
        data: Optional[dict] = None,
    ) -> dict:
        """
        發送 Meta Graph API 請求

        Args:
            method: HTTP 方法
            endpoint: API 端點（相對路徑）
            access_token: OAuth access token
            params: URL 參數
            data: POST 資料

        Returns:
            API 回應 JSON

        Raises:
            httpx.HTTPStatusError: API 請求失敗
        """
        url = f"{META_GRAPH_URL}/{endpoint}"

        # 加入 access token
        if params is None:
            params = {}
        params["access_token"] = access_token

        async with httpx.AsyncClient(timeout=30.0) as client:
            if method.upper() == "GET":
                response = await client.get(url, params=params)
            elif method.upper() == "POST":
                response = await client.post(url, params=params, data=data)
            elif method.upper() == "DELETE":
                response = await client.delete(url, params=params)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")

            # 記錄 API 回應
            logger.debug(f"Meta API {method} {endpoint}: {response.status_code}")

            if response.status_code >= 400:
                logger.error(f"Meta API error: {response.text}")
                response.raise_for_status()

            return response.json()

    # ============================================================
    # 興趣標籤搜尋
    # ============================================================

    async def search_interests(
        self,
        account_id: uuid.UUID,
        query: str,
        limit: int = 20,
    ) -> list[dict]:
        """
        搜尋 Meta 興趣標籤

        Args:
            account_id: 廣告帳戶 ID（用於取得 access token）
            query: 搜尋關鍵字
            limit: 最大結果數量

        Returns:
            興趣標籤列表
        """
        access_token = await self._get_access_token(account_id)
        if not access_token:
            logger.error(f"No valid access token for account {account_id}")
            return []

        try:
            response = await self._make_api_request(
                "GET",
                "search",
                access_token,
                params={
                    "type": "adinterest",
                    "q": query,
                    "limit": limit,
                },
            )

            interests = response.get("data", [])

            # 格式化回傳
            return [
                {
                    "meta_interest_id": interest.get("id"),
                    "name": interest.get("name"),
                    "audience_size_lower": interest.get("audience_size_lower_bound"),
                    "audience_size_upper": interest.get("audience_size_upper_bound"),
                    "path": interest.get("path", []),
                    "description": interest.get("description"),
                }
                for interest in interests
            ]

        except Exception as e:
            logger.error(f"搜尋興趣標籤失敗: {e}")
            return []

    # ============================================================
    # 建立 Saved Audience（儲存的受眾）
    # ============================================================

    async def create_saved_audience(
        self,
        account_id: uuid.UUID,
        ad_account_external_id: str,
        audience_name: str,
        targeting: InterestTargeting,
        description: Optional[str] = None,
    ) -> AudienceCreationResult:
        """
        建立 Meta Saved Audience

        Saved Audience 是預先定義的受眾設定，可在建立廣告時直接使用。
        與 Custom Audience 不同，Saved Audience 是基於興趣/人口統計的定向，
        而非上傳的客戶資料。

        Args:
            account_id: 內部帳戶 ID
            ad_account_external_id: Meta 廣告帳戶 ID（如 act_123456）
            audience_name: 受眾名稱
            targeting: 興趣導向設定
            description: 受眾描述（選填）

        Returns:
            AudienceCreationResult: 建立結果
        """
        access_token = await self._get_access_token(account_id)
        if not access_token:
            return AudienceCreationResult(
                success=False,
                error_message="無法取得有效的 access token",
            )

        # 確保帳戶 ID 格式正確
        if not ad_account_external_id.startswith("act_"):
            ad_account_external_id = f"act_{ad_account_external_id}"

        # 建構興趣定向
        flexible_spec = [
            {
                "interests": [
                    {"id": interest_id, "name": name}
                    for interest_id, name in zip(
                        targeting.interest_ids, targeting.interest_names
                    )
                ]
            }
        ]

        # 建構定向規則
        targeting_spec = {
            "geo_locations": {
                "countries": ["TW"],  # 台灣
            },
            "flexible_spec": flexible_spec,
        }

        try:
            response = await self._make_api_request(
                "POST",
                f"{ad_account_external_id}/saved_audiences",
                access_token,
                data={
                    "name": audience_name,
                    "targeting": str(targeting_spec).replace("'", '"'),
                    "description": description or f"AI 建議受眾 - {datetime.now().strftime('%Y-%m-%d')}",
                },
            )

            audience_id = response.get("id")

            if audience_id:
                logger.info(f"成功建立 Saved Audience: {audience_id}")
                return AudienceCreationResult(
                    success=True,
                    audience_id=audience_id,
                    audience_name=audience_name,
                )
            else:
                return AudienceCreationResult(
                    success=False,
                    error_message="API 回應中缺少 audience ID",
                )

        except httpx.HTTPStatusError as e:
            error_msg = f"Meta API 錯誤: {e.response.status_code} - {e.response.text}"
            logger.error(error_msg)
            return AudienceCreationResult(
                success=False,
                error_message=error_msg,
            )
        except Exception as e:
            error_msg = f"建立受眾失敗: {str(e)}"
            logger.error(error_msg)
            return AudienceCreationResult(
                success=False,
                error_message=error_msg,
            )

    # ============================================================
    # 建立 Ad Set（廣告組合）
    # ============================================================

    async def create_ad_set(
        self,
        account_id: uuid.UUID,
        ad_account_external_id: str,
        campaign_id: str,
        adset_name: str,
        targeting: InterestTargeting,
        daily_budget: Decimal,
        optimization_goal: str = "CONVERSIONS",
        billing_event: str = "IMPRESSIONS",
        bid_strategy: str = "LOWEST_COST_WITHOUT_CAP",
        status: str = "PAUSED",  # 預設暫停，讓用戶審核後再啟動
    ) -> AdSetCreationResult:
        """
        建立 Meta Ad Set

        Args:
            account_id: 內部帳戶 ID
            ad_account_external_id: Meta 廣告帳戶 ID
            campaign_id: 廣告活動 ID
            adset_name: 廣告組合名稱
            targeting: 興趣導向設定
            daily_budget: 每日預算（台幣，會轉換為分）
            optimization_goal: 優化目標
            billing_event: 計費事件
            bid_strategy: 出價策略
            status: 初始狀態

        Returns:
            AdSetCreationResult: 建立結果
        """
        access_token = await self._get_access_token(account_id)
        if not access_token:
            return AdSetCreationResult(
                success=False,
                error_message="無法取得有效的 access token",
            )

        # 確保帳戶 ID 格式正確
        if not ad_account_external_id.startswith("act_"):
            ad_account_external_id = f"act_{ad_account_external_id}"

        # 建構興趣定向
        flexible_spec = [
            {
                "interests": [
                    {"id": interest_id, "name": name}
                    for interest_id, name in zip(
                        targeting.interest_ids, targeting.interest_names
                    )
                ]
            }
        ]

        # 建構定向規則
        targeting_spec = {
            "geo_locations": {
                "countries": ["TW"],
            },
            "flexible_spec": flexible_spec,
            "publisher_platforms": ["facebook", "instagram"],
            "facebook_positions": ["feed", "right_hand_column", "instant_article", "marketplace"],
            "instagram_positions": ["stream", "story", "explore"],
        }

        # 轉換預算為分（Meta API 使用最小貨幣單位）
        daily_budget_cents = int(daily_budget * 100)

        try:
            response = await self._make_api_request(
                "POST",
                f"{ad_account_external_id}/adsets",
                access_token,
                data={
                    "name": adset_name,
                    "campaign_id": campaign_id,
                    "daily_budget": str(daily_budget_cents),
                    "billing_event": billing_event,
                    "optimization_goal": optimization_goal,
                    "bid_strategy": bid_strategy,
                    "targeting": str(targeting_spec).replace("'", '"'),
                    "status": status,
                },
            )

            adset_id = response.get("id")

            if adset_id:
                logger.info(f"成功建立 Ad Set: {adset_id}")
                return AdSetCreationResult(
                    success=True,
                    adset_id=adset_id,
                    adset_name=adset_name,
                )
            else:
                return AdSetCreationResult(
                    success=False,
                    error_message="API 回應中缺少 adset ID",
                )

        except httpx.HTTPStatusError as e:
            error_msg = f"Meta API 錯誤: {e.response.status_code} - {e.response.text}"
            logger.error(error_msg)
            return AdSetCreationResult(
                success=False,
                error_message=error_msg,
            )
        except Exception as e:
            error_msg = f"建立廣告組合失敗: {str(e)}"
            logger.error(error_msg)
            return AdSetCreationResult(
                success=False,
                error_message=error_msg,
            )

    # ============================================================
    # 建立 Ad（廣告）
    # ============================================================

    async def create_ad(
        self,
        account_id: uuid.UUID,
        ad_account_external_id: str,
        adset_id: str,
        ad_name: str,
        creative_id: str,
        status: str = "PAUSED",
    ) -> AdCreationResult:
        """
        建立 Meta Ad

        Args:
            account_id: 內部帳戶 ID
            ad_account_external_id: Meta 廣告帳戶 ID
            adset_id: 廣告組合 ID
            ad_name: 廣告名稱
            creative_id: 素材 ID
            status: 初始狀態

        Returns:
            AdCreationResult: 建立結果
        """
        access_token = await self._get_access_token(account_id)
        if not access_token:
            return AdCreationResult(
                success=False,
                error_message="無法取得有效的 access token",
            )

        # 確保帳戶 ID 格式正確
        if not ad_account_external_id.startswith("act_"):
            ad_account_external_id = f"act_{ad_account_external_id}"

        try:
            response = await self._make_api_request(
                "POST",
                f"{ad_account_external_id}/ads",
                access_token,
                data={
                    "name": ad_name,
                    "adset_id": adset_id,
                    "creative": f'{{"creative_id": "{creative_id}"}}',
                    "status": status,
                },
            )

            ad_id = response.get("id")

            if ad_id:
                logger.info(f"成功建立 Ad: {ad_id}")
                return AdCreationResult(
                    success=True,
                    ad_id=ad_id,
                    ad_name=ad_name,
                )
            else:
                return AdCreationResult(
                    success=False,
                    error_message="API 回應中缺少 ad ID",
                )

        except httpx.HTTPStatusError as e:
            error_msg = f"Meta API 錯誤: {e.response.status_code} - {e.response.text}"
            logger.error(error_msg)
            return AdCreationResult(
                success=False,
                error_message=error_msg,
            )
        except Exception as e:
            error_msg = f"建立廣告失敗: {str(e)}"
            logger.error(error_msg)
            return AdCreationResult(
                success=False,
                error_message=error_msg,
            )

    # ============================================================
    # 建立 Ad Creative（廣告素材）
    # ============================================================

    async def create_ad_creative(
        self,
        account_id: uuid.UUID,
        ad_account_external_id: str,
        creative_name: str,
        page_id: str,
        link_url: str,
        message: str,
        headline: Optional[str] = None,
        description: Optional[str] = None,
        image_url: Optional[str] = None,
        call_to_action_type: str = "LEARN_MORE",
    ) -> dict:
        """
        建立 Meta Ad Creative

        Args:
            account_id: 內部帳戶 ID
            ad_account_external_id: Meta 廣告帳戶 ID
            creative_name: 素材名稱
            page_id: Facebook 粉絲專頁 ID
            link_url: 廣告連結
            message: 廣告文案
            headline: 標題（選填）
            description: 說明文字（選填）
            image_url: 圖片 URL（選填）
            call_to_action_type: 行動號召按鈕類型

        Returns:
            建立結果
        """
        access_token = await self._get_access_token(account_id)
        if not access_token:
            return {"success": False, "error_message": "無法取得有效的 access token"}

        # 確保帳戶 ID 格式正確
        if not ad_account_external_id.startswith("act_"):
            ad_account_external_id = f"act_{ad_account_external_id}"

        # 建構 object_story_spec
        link_data = {
            "link": link_url,
            "message": message,
            "call_to_action": {
                "type": call_to_action_type,
                "value": {"link": link_url},
            },
        }

        if headline:
            link_data["name"] = headline
        if description:
            link_data["description"] = description
        if image_url:
            link_data["picture"] = image_url

        object_story_spec = {
            "page_id": page_id,
            "link_data": link_data,
        }

        try:
            response = await self._make_api_request(
                "POST",
                f"{ad_account_external_id}/adcreatives",
                access_token,
                data={
                    "name": creative_name,
                    "object_story_spec": str(object_story_spec).replace("'", '"'),
                },
            )

            creative_id = response.get("id")

            if creative_id:
                logger.info(f"成功建立 Ad Creative: {creative_id}")
                return {
                    "success": True,
                    "creative_id": creative_id,
                    "creative_name": creative_name,
                }
            else:
                return {
                    "success": False,
                    "error_message": "API 回應中缺少 creative ID",
                }

        except httpx.HTTPStatusError as e:
            error_msg = f"Meta API 錯誤: {e.response.status_code} - {e.response.text}"
            logger.error(error_msg)
            return {"success": False, "error_message": error_msg}
        except Exception as e:
            error_msg = f"建立廣告素材失敗: {str(e)}"
            logger.error(error_msg)
            return {"success": False, "error_message": error_msg}

    # ============================================================
    # 完整廣告建立流程
    # ============================================================

    async def create_complete_ad(
        self,
        account_id: uuid.UUID,
        ad_account_external_id: str,
        campaign_id: str,
        page_id: str,
        targeting: InterestTargeting,
        daily_budget: Decimal,
        link_url: str,
        ad_copy: str,
        headline: Optional[str] = None,
        description: Optional[str] = None,
        image_url: Optional[str] = None,
        adset_name: Optional[str] = None,
        ad_name: Optional[str] = None,
    ) -> CompleteAdCreationResult:
        """
        建立完整廣告（Saved Audience + Ad Set + Creative + Ad）

        Args:
            account_id: 內部帳戶 ID
            ad_account_external_id: Meta 廣告帳戶 ID
            campaign_id: 廣告活動 ID
            page_id: Facebook 粉絲專頁 ID
            targeting: 興趣導向設定
            daily_budget: 每日預算（台幣）
            link_url: 廣告連結
            ad_copy: 廣告文案
            headline: 標題（選填）
            description: 說明文字（選填）
            image_url: 圖片 URL（選填）
            adset_name: 廣告組合名稱（選填）
            ad_name: 廣告名稱（選填）

        Returns:
            CompleteAdCreationResult: 完整建立結果
        """
        timestamp = datetime.now().strftime("%Y%m%d_%H%M")

        # 產生名稱
        if not adset_name:
            adset_name = f"AI建議廣告組合_{timestamp}"
        if not ad_name:
            ad_name = f"AI建議廣告_{timestamp}"
        audience_name = f"AI建議受眾_{timestamp}"
        creative_name = f"AI建議素材_{timestamp}"

        # Step 1: 建立 Saved Audience
        audience_result = await self.create_saved_audience(
            account_id=account_id,
            ad_account_external_id=ad_account_external_id,
            audience_name=audience_name,
            targeting=targeting,
        )

        if not audience_result.success:
            return CompleteAdCreationResult(
                success=False,
                error_message=f"建立受眾失敗: {audience_result.error_message}",
            )

        # Step 2: 建立 Ad Set
        adset_result = await self.create_ad_set(
            account_id=account_id,
            ad_account_external_id=ad_account_external_id,
            campaign_id=campaign_id,
            adset_name=adset_name,
            targeting=targeting,
            daily_budget=daily_budget,
        )

        if not adset_result.success:
            return CompleteAdCreationResult(
                success=False,
                audience_id=audience_result.audience_id,
                audience_name=audience_result.audience_name,
                error_message=f"建立廣告組合失敗: {adset_result.error_message}",
            )

        # Step 3: 建立 Ad Creative
        creative_result = await self.create_ad_creative(
            account_id=account_id,
            ad_account_external_id=ad_account_external_id,
            creative_name=creative_name,
            page_id=page_id,
            link_url=link_url,
            message=ad_copy,
            headline=headline,
            description=description,
            image_url=image_url,
        )

        if not creative_result.get("success"):
            return CompleteAdCreationResult(
                success=False,
                audience_id=audience_result.audience_id,
                audience_name=audience_result.audience_name,
                adset_id=adset_result.adset_id,
                adset_name=adset_result.adset_name,
                error_message=f"建立廣告素材失敗: {creative_result.get('error_message')}",
            )

        # Step 4: 建立 Ad
        creative_id = creative_result.get("creative_id")
        if not adset_result.adset_id or not creative_id:
            return CompleteAdCreationResult(
                success=False,
                audience_id=audience_result.audience_id,
                audience_name=audience_result.audience_name,
                adset_id=adset_result.adset_id,
                adset_name=adset_result.adset_name,
                error_message="缺少必要的 adset_id 或 creative_id",
            )

        ad_result = await self.create_ad(
            account_id=account_id,
            ad_account_external_id=ad_account_external_id,
            adset_id=adset_result.adset_id,
            ad_name=ad_name,
            creative_id=creative_id,
        )

        if not ad_result.success:
            return CompleteAdCreationResult(
                success=False,
                audience_id=audience_result.audience_id,
                audience_name=audience_result.audience_name,
                adset_id=adset_result.adset_id,
                adset_name=adset_result.adset_name,
                error_message=f"建立廣告失敗: {ad_result.error_message}",
            )

        # 全部成功
        return CompleteAdCreationResult(
            success=True,
            audience_id=audience_result.audience_id,
            audience_name=audience_result.audience_name,
            adset_id=adset_result.adset_id,
            adset_name=adset_result.adset_name,
            ad_id=ad_result.ad_id,
            ad_name=ad_result.ad_name,
        )

    # ============================================================
    # 查詢功能
    # ============================================================

    async def get_reach_estimate(
        self,
        account_id: uuid.UUID,
        ad_account_external_id: str,
        targeting: InterestTargeting,
    ) -> Optional[dict]:
        """
        取得興趣定向的預估觸及人數

        Args:
            account_id: 內部帳戶 ID
            ad_account_external_id: Meta 廣告帳戶 ID
            targeting: 興趣導向設定

        Returns:
            預估觸及資訊或 None
        """
        access_token = await self._get_access_token(account_id)
        if not access_token:
            return None

        # 確保帳戶 ID 格式正確
        if not ad_account_external_id.startswith("act_"):
            ad_account_external_id = f"act_{ad_account_external_id}"

        # 建構興趣定向
        flexible_spec = [
            {
                "interests": [
                    {"id": interest_id, "name": name}
                    for interest_id, name in zip(
                        targeting.interest_ids, targeting.interest_names
                    )
                ]
            }
        ]

        targeting_spec = {
            "geo_locations": {"countries": ["TW"]},
            "flexible_spec": flexible_spec,
        }

        try:
            response = await self._make_api_request(
                "GET",
                f"{ad_account_external_id}/reachestimate",
                access_token,
                params={
                    "targeting_spec": str(targeting_spec).replace("'", '"'),
                },
            )

            return {
                "users": response.get("data", {}).get("users"),
                "users_lower": response.get("data", {}).get("users_lower_bound"),
                "users_upper": response.get("data", {}).get("users_upper_bound"),
            }

        except Exception as e:
            logger.error(f"取得預估觸及失敗: {e}")
            return None
