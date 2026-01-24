# -*- coding: utf-8 -*-
"""
AI 文案生成服務

使用 DeepSeek API（通過 Cloudflare AI Gateway）生成廣告文案
"""

import json
import logging

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


def _get_deepseek_base_url() -> str:
    """
    取得 DeepSeek API Base URL

    Gateway 模式：https://gateway.ai.cloudflare.com/v1/{account_id}/{gateway_id}/deepseek
    直連模式：https://api.deepseek.com
    """
    if settings.CF_AI_GATEWAY_ENABLED and settings.CF_AI_GATEWAY_ACCOUNT_ID and settings.CF_AI_GATEWAY_ID:
        return f"https://gateway.ai.cloudflare.com/v1/{settings.CF_AI_GATEWAY_ACCOUNT_ID}/{settings.CF_AI_GATEWAY_ID}/deepseek"
    return "https://api.deepseek.com"


def _build_headers() -> dict[str, str]:
    """
    建構 API 請求 Headers

    Gateway BYOK 模式：需同時傳送 cf-aig-authorization 和 Authorization
    直連模式：只需要 Authorization
    """
    api_key = settings.DEEPSEEK_API_KEY
    if not api_key:
        return {}

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key.strip()}",
    }

    # Gateway 模式加入 cf-aig-authorization
    if settings.CF_AI_GATEWAY_ENABLED and settings.CF_AI_GATEWAY_TOKEN:
        headers["cf-aig-authorization"] = f"Bearer {settings.CF_AI_GATEWAY_TOKEN.strip()}"

    return headers


class AICopywritingService:
    """
    AI 文案生成服務

    使用 DeepSeek API 生成廣告文案
    """

    def __init__(self):
        self.api_key = settings.DEEPSEEK_API_KEY
        self.model = settings.DEEPSEEK_MODEL
        self.base_url = _get_deepseek_base_url()
        self.use_gateway = settings.CF_AI_GATEWAY_ENABLED

    async def generate_copy(
        self,
        product_description: str,
        style: str = "professional",
        language: str = "zh-TW",
    ) -> dict:
        """
        生成廣告文案

        Args:
            product_description: 商品/服務描述
            style: 文案風格
            language: 語言

        Returns:
            包含標題和描述的字典
        """
        if not self.api_key:
            logger.warning("DeepSeek API Key 未設定，使用模擬資料")
            return self._generate_mock_copy(product_description)

        prompt = f"""你是一位專業的廣告文案撰寫專家。請根據以下商品描述，生成 2 組廣告文案。

商品描述：{product_description}

請生成：
1. 2 個廣告標題（每個不超過 30 個字）
2. 2 個廣告描述（每個不超過 90 個字）

要求：
- 使用繁體中文
- 語氣{style}
- 突出商品優勢
- 包含行動呼籲

請以 JSON 格式回覆：
{{
    "headlines": ["標題1", "標題2"],
    "descriptions": ["描述1", "描述2"]
}}"""

        try:
            # Gateway 模式使用 /chat/completions，直連模式使用 /v1/chat/completions
            endpoint = "/chat/completions" if self.use_gateway else "/v1/chat/completions"
            url = f"{self.base_url}{endpoint}"

            headers = _build_headers()
            logger.info(f"DeepSeek API (gateway: {self.use_gateway}, url: {url})")

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    url,
                    headers=headers,
                    json={
                        "model": self.model,
                        "messages": [{"role": "user", "content": prompt}],
                        "temperature": 0.7,
                        "max_tokens": 1024,
                        "response_format": {"type": "json_object"},
                    },
                    timeout=60.0,
                )
                response.raise_for_status()
                data = response.json()

                content = data["choices"][0]["message"]["content"]
                result = json.loads(content)

                logger.info(f"DeepSeek 文案生成成功，使用 tokens: {data.get('usage', {})}")
                return result

        except httpx.HTTPStatusError as e:
            logger.error(f"DeepSeek API HTTP error: {e.response.status_code} - {e.response.text}")
            # Gateway Error 2005 fallback 到直連
            if self.use_gateway and "2005" in str(e.response.text):
                logger.warning("Gateway Error 2005，嘗試直連 DeepSeek API...")
                return await self._fallback_direct_call(prompt)
            return self._generate_mock_copy(product_description)

        except Exception as e:
            logger.error(f"DeepSeek API error: {e}")
            return self._generate_mock_copy(product_description)

    async def _fallback_direct_call(self, prompt: str) -> dict:
        """
        Fallback 直連 DeepSeek API（當 Gateway 失敗時）
        """
        try:
            url = "https://api.deepseek.com/v1/chat/completions"
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.api_key.strip() if self.api_key else ''}",
            }

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    url,
                    headers=headers,
                    json={
                        "model": self.model,
                        "messages": [{"role": "user", "content": prompt}],
                        "temperature": 0.7,
                        "max_tokens": 1024,
                        "response_format": {"type": "json_object"},
                    },
                    timeout=60.0,
                )
                response.raise_for_status()
                data = response.json()

                content = data["choices"][0]["message"]["content"]
                result = json.loads(content)

                logger.info("直連 DeepSeek API 成功")
                return result

        except Exception as e:
            logger.error(f"直連 DeepSeek API 失敗: {e}")
            return {"headlines": [], "descriptions": []}

    def _generate_mock_copy(self, product_description: str) -> dict:
        """
        生成模擬文案（開發用）
        """
        short_desc = product_description[:15] if product_description else "優質商品"

        return {
            "headlines": [
                f"限時優惠！{short_desc}特價中",
                f"{short_desc} - 品質保證，價格實惠",
            ],
            "descriptions": [
                f"精選{short_desc}，限時特惠中。立即選購，享受最優惠價格！品質保證，售後無憂。",
                f"想要{short_desc}？現在正是最佳時機。專業品質，貼心服務，讓您購物更安心。",
            ],
        }
