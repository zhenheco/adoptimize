# -*- coding: utf-8 -*-
"""
AI 智慧建議引擎

使用 AI 根據客戶數據和產業基準生成受眾組合建議。
支援 Anthropic Claude 和 OpenAI GPT。
"""

import json
import logging
from dataclasses import dataclass
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Any, Optional

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)


# ============================================================
# 資料結構
# ============================================================


@dataclass
class SuggestionInput:
    """建議生成輸入"""

    industry_code: str
    industry_name: str
    objective_code: str
    objective_name: str
    account_id: str
    historical_data: dict  # 帳戶歷史效能數據
    industry_benchmark: dict  # 產業基準數據
    available_interests: list[dict]  # 可用的興趣標籤
    additional_context: Optional[str] = None


@dataclass
class SuggestedInterest:
    """建議的興趣標籤"""

    meta_interest_id: str
    name: str
    name_zh: str
    relevance_score: float
    reason: str
    estimated_reach: Optional[int] = None


@dataclass
class SuggestionOutput:
    """建議生成輸出"""

    interests: list[SuggestedInterest]
    reasoning: str
    budget_allocation: dict
    creative_recommendations: list[str]
    suggested_ad_copy: Optional[str]
    estimated_cpa_range: tuple[float, float]
    estimated_roas_range: tuple[float, float]
    estimated_reach_range: tuple[int, int]
    confidence_score: float
    model_version: str


# ============================================================
# Prompt 模板
# ============================================================

SUGGESTION_PROMPT_TEMPLATE = """你是一位專業的 Meta 廣告投放專家，擁有豐富的台灣市場經驗。請根據以下資訊，為客戶推薦最適合的受眾興趣標籤組合。

## 客戶資訊
- 產業：{industry_name} ({industry_code})
- 廣告目標：{objective_name} ({objective_code})
- 補充說明：{additional_context}

## 客戶歷史數據摘要
{historical_summary}

## 產業基準數據
{benchmark_summary}

## 可用興趣標籤（從 Meta API 獲取）
{available_interests_json}

## 任務
請從上述可用興趣標籤中，選出 5-10 個最適合此客戶的標籤，並提供完整的建議。

## 回覆格式
請嚴格按照以下 JSON 格式回覆，不要添加其他文字：

```json
{{
  "interests": [
    {{
      "meta_interest_id": "標籤 ID",
      "name": "英文名稱",
      "name_zh": "中文名稱",
      "relevance_score": 0.95,
      "reason": "選擇此標籤的原因（50字內）"
    }}
  ],
  "reasoning": "整體推薦理由說明（150-200字，說明為何這個組合適合該客戶）",
  "budget_allocation": {{
    "awareness": 0.25,
    "consideration": 0.45,
    "conversion": 0.20,
    "retention": 0.10
  }},
  "creative_recommendations": [
    "素材建議1",
    "素材建議2",
    "素材建議3"
  ],
  "suggested_ad_copy": "建議的廣告文案（包含標題和內文）",
  "estimated_cpa_range": [最低CPA, 最高CPA],
  "estimated_roas_range": [最低ROAS, 最高ROAS],
  "confidence_score": 0.85
}}
```

## 注意事項
1. 興趣標籤必須從「可用興趣標籤」中選擇，不要自創
2. relevance_score 範圍為 0-1，越高表示越相關
3. budget_allocation 四個值相加必須等於 1.0
4. confidence_score 範圍為 0-1，表示對建議的信心程度
5. 預估 CPA/ROAS 應參考產業基準和歷史數據
"""


# ============================================================
# AI 建議引擎
# ============================================================


class AISuggestionEngine:
    """AI 智慧建議引擎"""

    def __init__(self):
        """初始化引擎"""
        self.settings = get_settings()
        self.provider = self.settings.AI_PROVIDER.lower()

    async def generate_suggestions(
        self,
        input_data: SuggestionInput,
    ) -> SuggestionOutput:
        """
        生成受眾建議

        Args:
            input_data: 建議生成輸入資料

        Returns:
            SuggestionOutput: 結構化的建議輸出
        """
        # 構建 prompt
        prompt = self._build_prompt(input_data)

        # 呼叫 AI API
        if self.provider == "anthropic":
            response = await self._call_anthropic(prompt)
        elif self.provider == "openai":
            response = await self._call_openai(prompt)
        else:
            raise ValueError(f"不支援的 AI 提供者: {self.provider}")

        # 解析回應
        return self._parse_response(response, input_data)

    def _build_prompt(self, input_data: SuggestionInput) -> str:
        """構建 prompt"""
        # 格式化歷史數據摘要
        historical = input_data.historical_data
        if historical:
            historical_summary = f"""
- 過去 30 天花費: NT${historical.get('total_spend', 0):,.0f}
- 平均 CPA: NT${historical.get('avg_cpa', 0):,.0f}
- 平均 ROAS: {historical.get('avg_roas', 0):.2f}x
- 總轉換數: {historical.get('total_conversions', 0):,}
- 平均 CTR: {historical.get('avg_ctr', 0):.2%}
"""
        else:
            historical_summary = "（無歷史數據，為新帳戶）"

        # 格式化產業基準
        benchmark = input_data.industry_benchmark
        if benchmark:
            benchmark_summary = f"""
- 產業平均 CPA: NT${benchmark.get('avg_cpa', 0):,.0f}
- 產業平均 ROAS: {benchmark.get('avg_roas', 0):.2f}x
- 產業平均 CTR: {benchmark.get('avg_ctr', 0):.2%}
- 產業平均 CPC: NT${benchmark.get('avg_cpc', 0):,.0f}
- 數據期間: {benchmark.get('data_period', 'N/A')}
"""
        else:
            benchmark_summary = "（無產業基準數據）"

        # 格式化可用興趣標籤（限制數量避免 token 過多）
        interests = input_data.available_interests[:50]  # 最多 50 個
        interests_json = json.dumps(
            [
                {
                    "id": i.get("meta_interest_id"),
                    "name": i.get("name"),
                    "name_zh": i.get("name_zh", i.get("name")),
                    "category": i.get("category"),
                    "audience_size": f"{i.get('audience_size_lower', 0):,} - {i.get('audience_size_upper', 0):,}",
                }
                for i in interests
            ],
            ensure_ascii=False,
            indent=2,
        )

        return SUGGESTION_PROMPT_TEMPLATE.format(
            industry_name=input_data.industry_name,
            industry_code=input_data.industry_code,
            objective_name=input_data.objective_name,
            objective_code=input_data.objective_code,
            additional_context=input_data.additional_context or "無",
            historical_summary=historical_summary,
            benchmark_summary=benchmark_summary,
            available_interests_json=interests_json,
        )

    async def _call_anthropic(self, prompt: str) -> str:
        """呼叫 Anthropic Claude API"""
        api_key = self.settings.ANTHROPIC_API_KEY
        if not api_key:
            raise ValueError("未設定 ANTHROPIC_API_KEY")

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": self.settings.ANTHROPIC_MODEL,
                    "max_tokens": self.settings.AI_MAX_TOKENS,
                    "temperature": self.settings.AI_TEMPERATURE,
                    "messages": [{"role": "user", "content": prompt}],
                },
            )

            if response.status_code != 200:
                logger.error(f"Anthropic API 錯誤: {response.text}")
                raise RuntimeError(f"Anthropic API 錯誤: {response.status_code}")

            data = response.json()
            return data["content"][0]["text"]

    async def _call_openai(self, prompt: str) -> str:
        """呼叫 OpenAI GPT API"""
        api_key = self.settings.OPENAI_API_KEY
        if not api_key:
            raise ValueError("未設定 OPENAI_API_KEY")

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": self.settings.OPENAI_MODEL,
                    "max_tokens": self.settings.AI_MAX_TOKENS,
                    "temperature": self.settings.AI_TEMPERATURE,
                    "messages": [{"role": "user", "content": prompt}],
                },
            )

            if response.status_code != 200:
                logger.error(f"OpenAI API 錯誤: {response.text}")
                raise RuntimeError(f"OpenAI API 錯誤: {response.status_code}")

            data = response.json()
            return data["choices"][0]["message"]["content"]

    def _parse_response(
        self, response: str, input_data: SuggestionInput
    ) -> SuggestionOutput:
        """解析 AI 回應"""
        # 嘗試提取 JSON
        try:
            # 移除可能的 markdown code block
            json_str = response
            if "```json" in json_str:
                json_str = json_str.split("```json")[1].split("```")[0]
            elif "```" in json_str:
                json_str = json_str.split("```")[1].split("```")[0]

            data = json.loads(json_str.strip())
        except json.JSONDecodeError as e:
            logger.error(f"JSON 解析失敗: {e}, 原始回應: {response[:500]}")
            raise ValueError(f"AI 回應格式錯誤: {e}")

        # 構建興趣標籤列表
        interests = []
        for item in data.get("interests", []):
            interests.append(
                SuggestedInterest(
                    meta_interest_id=item.get("meta_interest_id", ""),
                    name=item.get("name", ""),
                    name_zh=item.get("name_zh", item.get("name", "")),
                    relevance_score=float(item.get("relevance_score", 0.5)),
                    reason=item.get("reason", ""),
                    estimated_reach=item.get("estimated_reach"),
                )
            )

        # 計算預估觸及範圍（根據選中的興趣標籤）
        total_reach_lower = 0
        total_reach_upper = 0
        for interest_id in [i.meta_interest_id for i in interests]:
            matching = [
                tag
                for tag in input_data.available_interests
                if tag.get("meta_interest_id") == interest_id
            ]
            if matching:
                total_reach_lower += matching[0].get("audience_size_lower", 0)
                total_reach_upper += matching[0].get("audience_size_upper", 0)

        # 預估觸及（考慮重疊，約為總和的 30-50%）
        estimated_reach_lower = int(total_reach_lower * 0.3)
        estimated_reach_upper = int(total_reach_upper * 0.5)

        # 取得 CPA/ROAS 範圍
        cpa_range = data.get("estimated_cpa_range", [0, 0])
        roas_range = data.get("estimated_roas_range", [0, 0])

        return SuggestionOutput(
            interests=interests,
            reasoning=data.get("reasoning", ""),
            budget_allocation=data.get("budget_allocation", {}),
            creative_recommendations=data.get("creative_recommendations", []),
            suggested_ad_copy=data.get("suggested_ad_copy"),
            estimated_cpa_range=tuple(cpa_range) if len(cpa_range) == 2 else (0, 0),
            estimated_roas_range=tuple(roas_range) if len(roas_range) == 2 else (0, 0),
            estimated_reach_range=(estimated_reach_lower, estimated_reach_upper),
            confidence_score=float(data.get("confidence_score", 0.5)),
            model_version=f"{self.provider}:{self.settings.ANTHROPIC_MODEL if self.provider == 'anthropic' else self.settings.OPENAI_MODEL}",
        )


# ============================================================
# 工具函數
# ============================================================


def suggestion_output_to_dict(output: SuggestionOutput) -> dict:
    """將 SuggestionOutput 轉為 dict（用於存入資料庫）"""
    return {
        "suggested_interests": [
            {
                "meta_interest_id": i.meta_interest_id,
                "name": i.name,
                "name_zh": i.name_zh,
                "relevance_score": i.relevance_score,
                "reason": i.reason,
                "estimated_reach": i.estimated_reach,
            }
            for i in output.interests
        ],
        "reasoning": output.reasoning,
        "budget_allocation": output.budget_allocation,
        "creative_recommendations": output.creative_recommendations,
        "suggested_ad_copy": output.suggested_ad_copy,
        "estimated_cpa": (output.estimated_cpa_range[0] + output.estimated_cpa_range[1])
        / 2,
        "estimated_roas": (
            output.estimated_roas_range[0] + output.estimated_roas_range[1]
        )
        / 2,
        "estimated_reach_lower": output.estimated_reach_range[0],
        "estimated_reach_upper": output.estimated_reach_range[1],
        "confidence_score": output.confidence_score,
        "ai_model_version": output.model_version,
    }


async def generate_mock_suggestion(input_data: SuggestionInput) -> SuggestionOutput:
    """
    生成模擬建議（用於開發/測試，不呼叫 AI API）

    Args:
        input_data: 建議生成輸入資料

    Returns:
        SuggestionOutput: 模擬的建議輸出
    """
    # 從可用興趣中隨機選取
    import random

    selected = random.sample(
        input_data.available_interests, min(8, len(input_data.available_interests))
    )

    interests = [
        SuggestedInterest(
            meta_interest_id=tag.get("meta_interest_id", f"mock_{i}"),
            name=tag.get("name", f"Interest {i}"),
            name_zh=tag.get("name_zh", tag.get("name", f"興趣 {i}")),
            relevance_score=round(random.uniform(0.7, 0.95), 2),
            reason=f"此興趣與 {input_data.industry_name} 產業高度相關",
            estimated_reach=random.randint(100000, 5000000),
        )
        for i, tag in enumerate(selected)
    ]

    return SuggestionOutput(
        interests=interests,
        reasoning=f"根據 {input_data.industry_name} 產業特性和 {input_data.objective_name} 廣告目標，推薦以上興趣組合。這些標籤涵蓋了目標受眾的主要興趣領域，預期能有效觸及潛在客戶。",
        budget_allocation={
            "awareness": 0.25,
            "consideration": 0.40,
            "conversion": 0.25,
            "retention": 0.10,
        },
        creative_recommendations=[
            "使用產品實拍圖搭配促銷文案",
            "A/B 測試不同的 CTA 按鈕文字",
            "加入客戶好評或使用見證",
        ],
        suggested_ad_copy=f"【限時優惠】{input_data.industry_name}精選商品，立即選購享獨家折扣！品質保證，售後無憂。",
        estimated_cpa_range=(150.0, 300.0),
        estimated_roas_range=(2.0, 4.0),
        estimated_reach_range=(500000, 2000000),
        confidence_score=0.75,
        model_version="mock:v1.0",
    )
