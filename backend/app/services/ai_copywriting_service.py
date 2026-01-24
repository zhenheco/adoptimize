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

    # 平台字數限制（字元數）
    PLATFORM_LIMITS = {
        "google": {
            "headline_max": 30,  # Google RSA 標題
            "description_max": 90,  # Google RSA 描述
            "headline_count": 10,  # 建議生成數量
            "description_count": 4,
        },
        "meta": {
            "headline_max": 27,  # Meta 標題
            "primary_text_max": 125,  # Meta Primary Text
            "description_max": 30,  # Meta 描述
            "headline_count": 5,
            "description_count": 3,
            "primary_text_count": 3,
        },
    }

    # 風格對應的語氣描述
    STYLE_DESCRIPTIONS = {
        "professional": "專業、可信賴、權威",
        "casual": "輕鬆、親切、口語化",
        "urgent": "緊迫、限時、稀缺感",
        "friendly": "溫暖、貼心、有溫度",
        "luxury": "高端、精緻、尊榮",
        "playful": "活潑、有趣、幽默",
    }

    def __init__(self):
        self.api_key = settings.DEEPSEEK_API_KEY
        self.model = settings.DEEPSEEK_MODEL
        self.base_url = _get_deepseek_base_url()
        self.use_gateway = settings.CF_AI_GATEWAY_ENABLED

    def _build_prompt(self, product_description: str, style: str, platform: str) -> str:
        """
        根據平台和風格建構優化的 prompt
        """
        style_desc = self.STYLE_DESCRIPTIONS.get(style, self.STYLE_DESCRIPTIONS["professional"])

        if platform == "google":
            return self._build_google_prompt(product_description, style_desc)
        elif platform == "meta":
            return self._build_meta_prompt(product_description, style_desc)
        else:
            return self._build_all_platform_prompt(product_description, style_desc)

    def _build_google_prompt(self, product_description: str, style_desc: str) -> str:
        """Google Ads 專用 prompt"""
        return f"""你是頂尖的 Google Ads 文案專家，擅長撰寫高點擊率的 RSA（響應式搜尋廣告）文案。

## 商品/服務資訊
{product_description}

## 任務
請生成符合 Google Ads RSA 規格的廣告文案：

### 標題（Headlines）- 請生成 10 個
- 每個標題 **嚴格控制在 15 個中文字以內**（約 30 字元）
- 包含：主要賣點、獨特價值、行動呼籲、數字/優惠、品牌名稱等不同角度
- 避免重複用詞，每個標題都要有獨特賣點

### 描述（Descriptions）- 請生成 4 個
- 每個描述 **嚴格控制在 45 個中文字以內**（約 90 字元）
- 包含：詳細說明產品優勢、解決的問題、行動呼籲
- 使用具體數據和社會證明（如有）

## 風格要求
語氣：{style_desc}

## 文案技巧
1. 標題要吸睛，前 3 個字最重要
2. 使用動詞開頭（立即、馬上、現在）
3. 加入數字增加可信度（限時 50% off、100+ 好評）
4. 明確的 CTA（立即購買、免費試用、了解更多）
5. 突出差異化優勢

請以 JSON 格式回覆：
{{
    "headlines": ["標題1", "標題2", ...共10個],
    "descriptions": ["描述1", "描述2", ...共4個]
}}"""

    def _build_meta_prompt(self, product_description: str, style_desc: str) -> str:
        """Meta/Facebook Ads 專用 prompt"""
        return f"""你是頂尖的 Meta（Facebook/Instagram）廣告文案專家，擅長撰寫高互動率的社群廣告。

## 商品/服務資訊
{product_description}

## 任務
請生成符合 Meta Ads 規格的廣告文案：

### Primary Text（主要文案）- 請生成 3 個
- 每個 **控制在 60 個中文字以內**（約 125 字元，超過會被截斷）
- 這是用戶第一眼看到的文字，要能立即抓住注意力
- 可以使用 emoji 增加吸引力 🎯
- 包含故事性開頭、痛點共鳴、解決方案、CTA

### Headlines（標題）- 請生成 5 個
- 每個標題 **嚴格控制在 13 個中文字以內**（約 27 字元）
- 簡潔有力，一眼就懂
- 配合圖片使用，要有視覺衝擊力

### Descriptions（連結描述）- 請生成 3 個
- 每個 **控制在 15 個中文字以內**（約 30 字元）
- 補充說明，強化 CTA

## 風格要求
語氣：{style_desc}

## 社群文案技巧
1. 開頭用問句引發共鳴（你是否...？還在為...煩惱？）
2. 善用 emoji 但不過度（2-3 個為佳）
3. 創造 FOMO（限時、限量、獨家）
4. 社會證明（已有 1000+ 人選擇）
5. 口語化，像朋友推薦

請以 JSON 格式回覆：
{{
    "primary_texts": ["主要文案1", "主要文案2", "主要文案3"],
    "headlines": ["標題1", "標題2", ...共5個],
    "descriptions": ["描述1", "描述2", "描述3"]
}}"""

    def _build_all_platform_prompt(self, product_description: str, style_desc: str) -> str:
        """通用平台 prompt（同時生成 Google 和 Meta 文案）"""
        return f"""你是全方位的數位廣告文案專家，擅長為不同平台撰寫高轉換率文案。

## 商品/服務資訊
{product_description}

## 任務
請同時生成 Google Ads 和 Meta Ads 的廣告文案：

### Google Ads RSA 文案
**標題（10 個）**：每個 **嚴格控制在 15 個中文字以內**
**描述（4 個）**：每個 **嚴格控制在 45 個中文字以內**

### Meta Ads 文案
**Primary Text（3 個）**：每個 **控制在 60 個中文字以內**，可用 emoji
**標題（5 個）**：每個 **嚴格控制在 13 個中文字以內**
**描述（3 個）**：每個 **控制在 15 個中文字以內**

## 風格要求
語氣：{style_desc}

## 核心技巧
1. Google：精準關鍵字、專業可信、明確 CTA
2. Meta：情感共鳴、視覺化描述、社群互動感
3. 兩者都要：突出獨特賣點、創造緊迫感、解決用戶痛點

請以 JSON 格式回覆：
{{
    "google": {{
        "headlines": ["標題1", ...共10個],
        "descriptions": ["描述1", ...共4個]
    }},
    "meta": {{
        "primary_texts": ["主要文案1", "主要文案2", "主要文案3"],
        "headlines": ["標題1", ...共5個],
        "descriptions": ["描述1", "描述2", "描述3"]
    }}
}}"""

    async def generate_copy(
        self,
        product_description: str,
        style: str = "professional",
        language: str = "zh-TW",
        platform: str = "all",
    ) -> dict:
        """
        生成廣告文案

        Args:
            product_description: 商品/服務描述
            style: 文案風格（professional, casual, urgent, friendly）
            language: 語言
            platform: 目標平台（google, meta, all）

        Returns:
            包含標題和描述的字典
        """
        if not self.api_key:
            logger.warning("DeepSeek API Key 未設定，使用模擬資料")
            return self._generate_mock_copy(product_description, platform)

        # 根據平台調整字數要求
        prompt = self._build_prompt(product_description, style, platform)

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
                        "max_tokens": 2048,
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
            return self._generate_mock_copy(product_description, platform)

        except Exception as e:
            logger.error(f"DeepSeek API error: {e}")
            return self._generate_mock_copy(product_description, platform)

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
                        "max_tokens": 2048,
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

    def _generate_mock_copy(self, product_description: str, platform: str = "all") -> dict:
        """
        生成模擬文案（開發用）
        """
        short_desc = product_description[:10] if product_description else "優質商品"

        if platform == "google":
            return {
                "headlines": [
                    f"限時優惠 {short_desc}",
                    f"{short_desc} 品質保證",
                    f"立即購買 {short_desc}",
                    f"{short_desc} 免運優惠",
                    f"熱銷 {short_desc} 特價",
                    f"{short_desc} 官方直營",
                    f"今日限定 {short_desc}",
                    f"{short_desc} 滿意保證",
                    f"精選 {short_desc} 推薦",
                    f"{short_desc} 超值組合",
                ],
                "descriptions": [
                    f"精選{short_desc}，限時特惠中。立即選購享最優惠價格！品質保證，售後無憂。",
                    f"想要{short_desc}？現在正是最佳時機。專業品質，貼心服務，購物更安心。",
                    f"官方認證{short_desc}，原廠保固。今日下單享專屬優惠，數量有限！",
                    f"熱銷{short_desc}，好評不斷。免運費、快速到貨，現在購買最划算！",
                ],
            }
        elif platform == "meta":
            return {
                "primary_texts": [
                    f"🎯 還在找{short_desc}嗎？我們精選最優質的產品，讓你輕鬆擁有！限時優惠中 👉",
                    f"✨ 想要{short_desc}？超過 1000+ 顧客好評推薦！現在下單享專屬折扣 🛒",
                    f"💡 {short_desc}怎麼選？讓專家告訴你！點擊了解更多，找到最適合你的選擇 🔥",
                ],
                "headlines": [
                    f"{short_desc} 限時特惠",
                    f"立即擁有{short_desc}",
                    f"{short_desc} 好評推薦",
                    f"精選{short_desc}",
                    f"{short_desc} 獨家優惠",
                ],
                "descriptions": [
                    "限時優惠 立即搶購",
                    "免運費 快速到貨",
                    "品質保證 安心購買",
                ],
            }
        else:
            # 返回兩個平台的文案
            return {
                "google": {
                    "headlines": [
                        f"限時優惠 {short_desc}",
                        f"{short_desc} 品質保證",
                        f"立即購買 {short_desc}",
                        f"{short_desc} 免運優惠",
                        f"熱銷 {short_desc} 特價",
                        f"{short_desc} 官方直營",
                        f"今日限定 {short_desc}",
                        f"{short_desc} 滿意保證",
                        f"精選 {short_desc} 推薦",
                        f"{short_desc} 超值組合",
                    ],
                    "descriptions": [
                        f"精選{short_desc}，限時特惠中。立即選購享最優惠價格！品質保證。",
                        f"想要{short_desc}？現在正是最佳時機。專業品質，貼心服務。",
                        f"官方認證{short_desc}，原廠保固。今日下單享專屬優惠！",
                        f"熱銷{short_desc}，好評不斷。免運費、快速到貨，最划算！",
                    ],
                },
                "meta": {
                    "primary_texts": [
                        f"🎯 還在找{short_desc}嗎？精選最優質產品，限時優惠中 👉",
                        f"✨ 想要{short_desc}？1000+ 顧客好評！現在下單享折扣 🛒",
                        f"💡 {short_desc}怎麼選？專家推薦，點擊了解更多 🔥",
                    ],
                    "headlines": [
                        f"{short_desc} 限時特惠",
                        f"立即擁有{short_desc}",
                        f"{short_desc} 好評推薦",
                        f"精選{short_desc}",
                        f"{short_desc} 獨家優惠",
                    ],
                    "descriptions": [
                        "限時優惠 立即搶購",
                        "免運費 快速到貨",
                        "品質保證 安心購買",
                    ],
                },
            }
