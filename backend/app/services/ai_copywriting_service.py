# -*- coding: utf-8 -*-
"""
AI 文案生成服務
"""

import json
import logging

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class AICopywritingService:
    """
    AI 文案生成服務

    使用 OpenAI API 生成廣告文案
    """

    def __init__(self):
        self.api_key = getattr(settings, 'OPENAI_API_KEY', None)
        self.model = "gpt-4o-mini"

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
            # 沒有 API key 時返回模擬結果
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
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": self.model,
                        "messages": [{"role": "user", "content": prompt}],
                        "temperature": 0.7,
                    },
                    timeout=30.0,
                )
                response.raise_for_status()
                data = response.json()

                content = data["choices"][0]["message"]["content"]
                # 嘗試解析 JSON
                result = json.loads(content)
                return result

        except Exception as e:
            logger.error(f"OpenAI API error: {e}")
            return self._generate_mock_copy(product_description)

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
