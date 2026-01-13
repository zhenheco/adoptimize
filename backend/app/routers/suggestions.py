# -*- coding: utf-8 -*-
"""
智慧受眾建議 API 路由

實作智慧受眾建議相關的 API 端點：
- POST /suggestions/generate - 生成 AI 受眾建議
- GET /suggestions - 取得建議歷史列表
- GET /suggestions/{id} - 取得建議詳情
- GET /suggestions/limit - 檢查使用限制
- POST /suggestions/{id}/save-audience - 建立 Meta 自訂受眾
- POST /suggestions/{id}/create-ad - 建立完整廣告（Ad Set + Ad）
"""

import logging
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import get_db
from app.models import (
    AdAccount,
    AudienceSuggestion,
    IndustryBenchmark,
    InterestTag,
    User,
)
from app.services.action_limiter import (
    check_suggestion_limit,
    filter_suggestion_by_tier,
    get_tier_from_string,
    increment_suggestion_count,
    can_execute_suggestion_action,
    SuggestionLimitResult,
)
from app.services.ai_suggestion_engine import (
    AISuggestionEngine,
    SuggestionInput,
    generate_mock_suggestion,
    suggestion_output_to_dict,
)

logger = logging.getLogger(__name__)

router = APIRouter()


# ============================================================
# Pydantic 模型定義
# ============================================================


class IndustryOption(BaseModel):
    """產業選項"""

    code: str
    name: str
    description: str


class ObjectiveOption(BaseModel):
    """廣告目標選項"""

    code: str
    name: str
    funnel_stage: str
    description: str


class OptionsResponse(BaseModel):
    """選項回應"""

    industries: list[IndustryOption]
    objectives: list[ObjectiveOption]


class GenerateSuggestionRequest(BaseModel):
    """生成建議請求"""

    account_id: str = Field(..., description="廣告帳戶 ID")
    industry_code: str = Field(..., description="產業代碼")
    objective_code: str = Field(..., description="廣告目標代碼")
    additional_context: Optional[str] = Field(None, description="補充說明")


class SuggestedInterest(BaseModel):
    """建議的興趣標籤"""

    meta_interest_id: str
    name: str
    name_zh: str
    relevance_score: float = Field(ge=0, le=1)
    reason: str
    estimated_reach: Optional[int] = None


class SuggestionResponse(BaseModel):
    """建議回應"""

    id: str
    account_id: str
    industry_code: str
    objective_code: str
    suggested_interests: list[SuggestedInterest]
    reasoning: Optional[str] = None
    budget_allocation: Optional[dict] = None
    creative_recommendations: Optional[list[str]] = None
    suggested_ad_copy: Optional[str] = None
    estimated_reach_lower: Optional[int] = None
    estimated_reach_upper: Optional[int] = None
    estimated_cpa: Optional[float] = None
    estimated_roas: Optional[float] = None
    confidence_score: Optional[float] = None
    status: str
    meta_audience_id: Optional[str] = None
    meta_adset_id: Optional[str] = None
    meta_ad_id: Optional[str] = None
    created_at: str
    # 功能權限
    can_view_full: bool = True
    can_create_audience: bool = False
    can_create_ad: bool = False
    hidden_interests_count: Optional[int] = None


class SuggestionListResponse(BaseModel):
    """建議列表回應"""

    data: list[SuggestionResponse]
    meta: dict


class SuggestionLimitResponse(BaseModel):
    """使用限制回應"""

    can_generate: bool
    remaining_suggestions: Optional[int]
    limit: Optional[int]
    current_count: int
    resets_at: str
    message: str
    features: dict


class SaveAudienceRequest(BaseModel):
    """建立受眾請求"""

    audience_name: Optional[str] = Field(None, description="受眾名稱（選填）")


class SaveAudienceResponse(BaseModel):
    """建立受眾回應"""

    success: bool
    suggestion_id: str
    meta_audience_id: Optional[str] = None
    audience_name: str
    message: str


class CreateAdRequest(BaseModel):
    """建立廣告請求"""

    campaign_id: str = Field(..., description="廣告活動 ID")
    daily_budget: float = Field(..., gt=0, description="每日預算（台幣）")
    ad_name: Optional[str] = Field(None, description="廣告名稱（選填）")
    use_suggested_copy: bool = Field(True, description="是否使用 AI 建議文案")
    custom_ad_copy: Optional[str] = Field(None, description="自訂廣告文案")


class CreateAdResponse(BaseModel):
    """建立廣告回應"""

    success: bool
    suggestion_id: str
    meta_adset_id: Optional[str] = None
    meta_ad_id: Optional[str] = None
    adset_name: str
    ad_name: str
    message: str


# ============================================================
# 常量定義
# ============================================================

# 產業選項
INDUSTRY_OPTIONS: list[IndustryOption] = [
    IndustryOption(
        code="ECOMMERCE",
        name="電商零售",
        description="線上購物平台、電商品牌、零售商店",
    ),
    IndustryOption(
        code="SERVICES",
        name="專業服務",
        description="顧問、法律、會計、行銷等專業服務",
    ),
    IndustryOption(
        code="EDUCATION",
        name="教育培訓",
        description="線上課程、補習班、職業培訓",
    ),
    IndustryOption(
        code="FOOD_BEVERAGE",
        name="餐飲美食",
        description="餐廳、飲料、食品品牌",
    ),
    IndustryOption(
        code="BEAUTY_HEALTH",
        name="美妝保健",
        description="化妝品、保養品、健康食品",
    ),
    IndustryOption(
        code="TRAVEL_LEISURE",
        name="旅遊休閒",
        description="旅行社、飯店、休閒娛樂",
    ),
    IndustryOption(
        code="TECH_SAAS",
        name="科技軟體",
        description="軟體服務、App、科技產品",
    ),
    IndustryOption(
        code="REAL_ESTATE",
        name="房產金融",
        description="房地產、金融服務、保險",
    ),
]

# 廣告目標選項
OBJECTIVE_OPTIONS: list[ObjectiveOption] = [
    ObjectiveOption(
        code="AWARENESS",
        name="品牌認知",
        funnel_stage="漏斗頂端",
        description="提升品牌知名度、觸及新受眾",
    ),
    ObjectiveOption(
        code="CONSIDERATION",
        name="流量互動",
        funnel_stage="漏斗中端",
        description="增加網站流量、互動、影片觀看",
    ),
    ObjectiveOption(
        code="CONVERSION",
        name="轉換銷售",
        funnel_stage="漏斗底端",
        description="促進購買、註冊、預約等轉換",
    ),
    ObjectiveOption(
        code="RETENTION",
        name="再行銷",
        funnel_stage="維繫階段",
        description="對既有客戶再行銷、提升 LTV",
    ),
]


# ============================================================
# 輔助函數
# ============================================================


def _get_industry_name(code: str) -> str:
    """取得產業名稱"""
    for industry in INDUSTRY_OPTIONS:
        if industry.code == code:
            return industry.name
    return code


def _get_objective_name(code: str) -> str:
    """取得廣告目標名稱"""
    for objective in OBJECTIVE_OPTIONS:
        if objective.code == code:
            return objective.name
    return code


def _convert_db_suggestion_to_response(
    suggestion: AudienceSuggestion,
    tier: str = "STARTER",
) -> SuggestionResponse:
    """將資料庫記錄轉換為 API 回應格式"""
    # 先建立完整資料
    suggestion_data = {
        "id": str(suggestion.id),
        "account_id": str(suggestion.account_id),
        "industry_code": suggestion.industry_code,
        "objective_code": suggestion.objective_code,
        "suggested_interests": suggestion.suggested_interests or [],
        "reasoning": suggestion.reasoning,
        "budget_allocation": suggestion.budget_allocation,
        "creative_recommendations": suggestion.creative_recommendations,
        "suggested_ad_copy": suggestion.suggested_ad_copy,
        "estimated_reach_lower": suggestion.estimated_reach_lower,
        "estimated_reach_upper": suggestion.estimated_reach_upper,
        "estimated_cpa": float(suggestion.estimated_cpa) if suggestion.estimated_cpa else None,
        "estimated_roas": float(suggestion.estimated_roas) if suggestion.estimated_roas else None,
        "confidence_score": float(suggestion.confidence_score) if suggestion.confidence_score else None,
        "status": suggestion.status,
        "meta_audience_id": suggestion.meta_audience_id,
        "meta_adset_id": suggestion.meta_adset_id,
        "meta_ad_id": suggestion.meta_ad_id,
        "created_at": suggestion.created_at.isoformat() if suggestion.created_at else datetime.now(timezone.utc).isoformat(),
    }

    # 根據訂閱層級過濾內容
    subscription_tier = get_tier_from_string(tier)
    filtered_data = filter_suggestion_by_tier(suggestion_data, subscription_tier)

    # 轉換興趣標籤格式
    interests = []
    for item in filtered_data.get("suggested_interests", []):
        if isinstance(item, dict):
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

    return SuggestionResponse(
        id=filtered_data["id"],
        account_id=filtered_data["account_id"],
        industry_code=filtered_data["industry_code"],
        objective_code=filtered_data["objective_code"],
        suggested_interests=interests,
        reasoning=filtered_data.get("reasoning"),
        budget_allocation=filtered_data.get("budget_allocation"),
        creative_recommendations=filtered_data.get("creative_recommendations"),
        suggested_ad_copy=filtered_data.get("suggested_ad_copy"),
        estimated_reach_lower=filtered_data.get("estimated_reach_lower"),
        estimated_reach_upper=filtered_data.get("estimated_reach_upper"),
        estimated_cpa=filtered_data.get("estimated_cpa"),
        estimated_roas=filtered_data.get("estimated_roas"),
        confidence_score=filtered_data.get("confidence_score"),
        status=filtered_data["status"],
        meta_audience_id=filtered_data.get("meta_audience_id"),
        meta_adset_id=filtered_data.get("meta_adset_id"),
        meta_ad_id=filtered_data.get("meta_ad_id"),
        created_at=filtered_data["created_at"],
        can_view_full=filtered_data.get("can_view_full", False),
        can_create_audience=filtered_data.get("can_create_audience", False),
        can_create_ad=filtered_data.get("can_create_ad", False),
        hidden_interests_count=filtered_data.get("hidden_interests_count"),
    )


# ============================================================
# API 端點
# ============================================================


@router.get("/options", response_model=OptionsResponse)
async def get_options() -> OptionsResponse:
    """
    取得產業和廣告目標選項

    Returns:
        OptionsResponse: 產業和廣告目標選項列表
    """
    return OptionsResponse(
        industries=INDUSTRY_OPTIONS,
        objectives=OBJECTIVE_OPTIONS,
    )


@router.get("/limit", response_model=SuggestionLimitResponse)
async def get_suggestion_limit(
    user_id: str = Query(..., description="用戶 ID"),
    db: AsyncSession = Depends(get_db),
) -> SuggestionLimitResponse:
    """
    檢查智慧建議使用限制

    Args:
        user_id: 用戶 ID
        db: 資料庫 session

    Returns:
        SuggestionLimitResponse: 使用限制資訊
    """
    # 驗證用戶 ID
    try:
        user_uuid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID format")

    # 取得用戶資訊
    result = await db.execute(select(User).where(User.id == user_uuid))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # 檢查限制
    tier = get_tier_from_string(user.subscription_tier)
    limit_result = check_suggestion_limit(
        tier,
        user.monthly_suggestion_count,
        user.suggestion_count_reset_at,
    )

    return SuggestionLimitResponse(
        can_generate=limit_result.can_generate,
        remaining_suggestions=limit_result.remaining_suggestions,
        limit=limit_result.limit,
        current_count=limit_result.current_count,
        resets_at=limit_result.resets_at.isoformat(),
        message=limit_result.message,
        features=limit_result.features,
    )


@router.post("/generate", response_model=SuggestionResponse)
async def generate_suggestion(
    request: GenerateSuggestionRequest,
    user_id: str = Query(..., description="用戶 ID"),
    use_mock: bool = Query(False, description="是否使用模擬模式（不呼叫 AI API）"),
    db: AsyncSession = Depends(get_db),
) -> SuggestionResponse:
    """
    生成 AI 受眾建議

    根據選擇的產業和廣告目標，使用 AI 生成受眾興趣標籤組合建議。

    Args:
        request: 生成建議請求
        user_id: 用戶 ID
        use_mock: 是否使用模擬模式
        db: 資料庫 session

    Returns:
        SuggestionResponse: AI 生成的建議

    Raises:
        HTTPException: 429 - 超過使用限制
        HTTPException: 404 - 用戶或帳戶不存在
    """
    # 驗證用戶 ID
    try:
        user_uuid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID format")

    # 驗證帳戶 ID
    try:
        account_uuid = uuid.UUID(request.account_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid account ID format")

    # 取得用戶資訊
    result = await db.execute(select(User).where(User.id == user_uuid))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # 檢查使用限制
    tier = get_tier_from_string(user.subscription_tier)
    limit_result = check_suggestion_limit(
        tier,
        user.monthly_suggestion_count,
        user.suggestion_count_reset_at,
    )

    if not limit_result.can_generate:
        raise HTTPException(
            status_code=429,
            detail={
                "message": limit_result.message,
                "limit": limit_result.limit,
                "current_count": limit_result.current_count,
                "resets_at": limit_result.resets_at.isoformat(),
            },
        )

    # 取得廣告帳戶
    result = await db.execute(select(AdAccount).where(AdAccount.id == account_uuid))
    account = result.scalar_one_or_none()

    if not account:
        raise HTTPException(status_code=404, detail="Ad account not found")

    # 取得產業基準數據
    result = await db.execute(
        select(IndustryBenchmark).where(
            IndustryBenchmark.industry_code == request.industry_code,
            IndustryBenchmark.objective_code == request.objective_code,
        )
    )
    benchmark = result.scalar_one_or_none()

    benchmark_data = {}
    if benchmark:
        benchmark_data = {
            "avg_cpa": float(benchmark.avg_cpa) if benchmark.avg_cpa else None,
            "avg_roas": float(benchmark.avg_roas) if benchmark.avg_roas else None,
            "avg_ctr": float(benchmark.avg_ctr) if benchmark.avg_ctr else None,
            "avg_cpc": float(benchmark.avg_cpc) if benchmark.avg_cpc else None,
            "data_period": benchmark.data_period,
        }

    # 取得可用興趣標籤
    result = await db.execute(
        select(InterestTag)
        .where(InterestTag.is_active == True)  # noqa: E712
        .limit(100)
    )
    interest_tags = result.scalars().all()

    available_interests = [
        {
            "meta_interest_id": tag.meta_interest_id,
            "name": tag.name,
            "name_zh": tag.name_zh,
            "category": tag.category,
            "audience_size_lower": tag.audience_size_lower,
            "audience_size_upper": tag.audience_size_upper,
        }
        for tag in interest_tags
    ]

    # 如果沒有興趣標籤，使用預設清單
    if not available_interests:
        available_interests = _get_default_interests(request.industry_code)

    # TODO: 從帳戶歷史數據中提取摘要
    historical_data = {}

    # 建立輸入資料
    input_data = SuggestionInput(
        industry_code=request.industry_code,
        industry_name=_get_industry_name(request.industry_code),
        objective_code=request.objective_code,
        objective_name=_get_objective_name(request.objective_code),
        account_id=str(account.id),
        historical_data=historical_data,
        industry_benchmark=benchmark_data,
        available_interests=available_interests,
        additional_context=request.additional_context,
    )

    # 生成建議
    if use_mock:
        output = await generate_mock_suggestion(input_data)
    else:
        engine = AISuggestionEngine()
        try:
            output = await engine.generate_suggestions(input_data)
        except Exception as e:
            logger.error(f"AI 建議生成失敗: {e}")
            # 降級到模擬模式
            output = await generate_mock_suggestion(input_data)

    # 將輸出轉為 dict
    output_dict = suggestion_output_to_dict(output)

    # 建立資料庫記錄
    suggestion = AudienceSuggestion(
        id=uuid.uuid4(),
        user_id=user_uuid,
        account_id=account_uuid,
        industry_code=request.industry_code,
        objective_code=request.objective_code,
        additional_context=request.additional_context,
        suggested_interests=output_dict["suggested_interests"],
        reasoning=output_dict["reasoning"],
        budget_allocation=output_dict["budget_allocation"],
        creative_recommendations=output_dict["creative_recommendations"],
        suggested_ad_copy=output_dict["suggested_ad_copy"],
        estimated_reach_lower=output_dict["estimated_reach_lower"],
        estimated_reach_upper=output_dict["estimated_reach_upper"],
        estimated_cpa=output_dict["estimated_cpa"],
        estimated_roas=output_dict["estimated_roas"],
        confidence_score=output_dict["confidence_score"],
        ai_model_version=output_dict["ai_model_version"],
        status="generated",
        created_at=datetime.now(timezone.utc),
    )

    db.add(suggestion)

    # 遞增用戶建議生成次數
    new_count, new_reset_date = increment_suggestion_count(
        user.monthly_suggestion_count,
        user.suggestion_count_reset_at,
    )
    user.monthly_suggestion_count = new_count
    user.suggestion_count_reset_at = new_reset_date

    await db.flush()

    # 轉換為回應格式（根據訂閱層級過濾）
    return _convert_db_suggestion_to_response(suggestion, user.subscription_tier)


@router.get("", response_model=SuggestionListResponse)
async def get_suggestions(
    user_id: str = Query(..., description="用戶 ID"),
    account_id: Optional[str] = Query(None, description="帳戶 ID（選填）"),
    status: Optional[str] = Query(None, description="狀態篩選"),
    page: int = Query(1, ge=1, description="頁碼"),
    page_size: int = Query(20, ge=1, le=50, description="每頁筆數"),
    db: AsyncSession = Depends(get_db),
) -> SuggestionListResponse:
    """
    取得建議歷史列表

    Args:
        user_id: 用戶 ID
        account_id: 帳戶 ID（選填）
        status: 狀態篩選
        page: 頁碼
        page_size: 每頁筆數
        db: 資料庫 session

    Returns:
        SuggestionListResponse: 建議列表
    """
    # 驗證用戶 ID
    try:
        user_uuid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID format")

    # 取得用戶資訊（用於訂閱層級）
    result = await db.execute(select(User).where(User.id == user_uuid))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # 建立查詢
    query = select(AudienceSuggestion).where(AudienceSuggestion.user_id == user_uuid)

    # 帳戶篩選
    if account_id:
        try:
            account_uuid = uuid.UUID(account_id)
            query = query.where(AudienceSuggestion.account_id == account_uuid)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid account ID format")

    # 狀態篩選
    if status:
        query = query.where(AudienceSuggestion.status == status)

    # 排序（最新在前）
    query = query.order_by(AudienceSuggestion.created_at.desc())

    # 執行查詢
    result = await db.execute(query)
    suggestions = result.scalars().all()

    # 轉換為回應格式
    all_suggestions = [
        _convert_db_suggestion_to_response(s, user.subscription_tier) for s in suggestions
    ]

    # 分頁
    total = len(all_suggestions)
    start = (page - 1) * page_size
    end = start + page_size
    paginated = all_suggestions[start:end]

    return SuggestionListResponse(
        data=paginated,
        meta={
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": (total + page_size - 1) // page_size if total > 0 else 0,
        },
    )


@router.get("/{suggestion_id}", response_model=SuggestionResponse)
async def get_suggestion(
    suggestion_id: str,
    user_id: str = Query(..., description="用戶 ID"),
    db: AsyncSession = Depends(get_db),
) -> SuggestionResponse:
    """
    取得建議詳情

    Args:
        suggestion_id: 建議 ID
        user_id: 用戶 ID
        db: 資料庫 session

    Returns:
        SuggestionResponse: 建議詳情
    """
    # 驗證 ID
    try:
        suggestion_uuid = uuid.UUID(suggestion_id)
        user_uuid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid ID format")

    # 取得用戶資訊
    result = await db.execute(select(User).where(User.id == user_uuid))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # 取得建議
    result = await db.execute(
        select(AudienceSuggestion).where(
            AudienceSuggestion.id == suggestion_uuid,
            AudienceSuggestion.user_id == user_uuid,
        )
    )
    suggestion = result.scalar_one_or_none()

    if not suggestion:
        raise HTTPException(status_code=404, detail="Suggestion not found")

    return _convert_db_suggestion_to_response(suggestion, user.subscription_tier)


@router.post("/{suggestion_id}/save-audience", response_model=SaveAudienceResponse)
async def save_audience(
    suggestion_id: str,
    request: SaveAudienceRequest,
    user_id: str = Query(..., description="用戶 ID"),
    db: AsyncSession = Depends(get_db),
) -> SaveAudienceResponse:
    """
    根據建議建立 Meta 自訂受眾

    需要 Professional 或以上訂閱方案。

    Args:
        suggestion_id: 建議 ID
        request: 建立受眾請求
        user_id: 用戶 ID
        db: 資料庫 session

    Returns:
        SaveAudienceResponse: 建立結果
    """
    # 驗證 ID
    try:
        suggestion_uuid = uuid.UUID(suggestion_id)
        user_uuid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid ID format")

    # 取得用戶資訊
    result = await db.execute(select(User).where(User.id == user_uuid))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # 檢查權限
    can_execute, message = can_execute_suggestion_action(
        user.subscription_tier, "create_audience"
    )

    if not can_execute:
        raise HTTPException(status_code=403, detail=message)

    # 取得建議
    result = await db.execute(
        select(AudienceSuggestion).where(
            AudienceSuggestion.id == suggestion_uuid,
            AudienceSuggestion.user_id == user_uuid,
        )
    )
    suggestion = result.scalar_one_or_none()

    if not suggestion:
        raise HTTPException(status_code=404, detail="Suggestion not found")

    # 產生受眾名稱
    audience_name = request.audience_name or f"AI建議受眾_{_get_industry_name(suggestion.industry_code)}_{datetime.now().strftime('%Y%m%d_%H%M')}"

    # TODO: 呼叫 Meta API 建立受眾
    # 目前先模擬成功
    mock_audience_id = f"meta_audience_{uuid.uuid4().hex[:8]}"

    # 更新建議狀態
    suggestion.status = "saved"
    suggestion.meta_audience_id = mock_audience_id
    await db.flush()

    return SaveAudienceResponse(
        success=True,
        suggestion_id=suggestion_id,
        meta_audience_id=mock_audience_id,
        audience_name=audience_name,
        message="受眾已成功建立",
    )


@router.post("/{suggestion_id}/create-ad", response_model=CreateAdResponse)
async def create_ad(
    suggestion_id: str,
    request: CreateAdRequest,
    user_id: str = Query(..., description="用戶 ID"),
    db: AsyncSession = Depends(get_db),
) -> CreateAdResponse:
    """
    根據建議建立完整廣告（Ad Set + Ad）

    需要 Agency 或以上訂閱方案。

    Args:
        suggestion_id: 建議 ID
        request: 建立廣告請求
        user_id: 用戶 ID
        db: 資料庫 session

    Returns:
        CreateAdResponse: 建立結果
    """
    # 驗證 ID
    try:
        suggestion_uuid = uuid.UUID(suggestion_id)
        user_uuid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid ID format")

    # 取得用戶資訊
    result = await db.execute(select(User).where(User.id == user_uuid))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # 檢查權限
    can_execute, message = can_execute_suggestion_action(
        user.subscription_tier, "create_ad"
    )

    if not can_execute:
        raise HTTPException(status_code=403, detail=message)

    # 取得建議
    result = await db.execute(
        select(AudienceSuggestion).where(
            AudienceSuggestion.id == suggestion_uuid,
            AudienceSuggestion.user_id == user_uuid,
        )
    )
    suggestion = result.scalar_one_or_none()

    if not suggestion:
        raise HTTPException(status_code=404, detail="Suggestion not found")

    # 產生名稱
    timestamp = datetime.now().strftime("%Y%m%d_%H%M")
    adset_name = f"AI建議廣告組合_{_get_industry_name(suggestion.industry_code)}_{timestamp}"
    ad_name = request.ad_name or f"AI建議廣告_{timestamp}"

    # TODO: 呼叫 Meta API 建立 Ad Set 和 Ad
    # 目前先模擬成功
    mock_adset_id = f"meta_adset_{uuid.uuid4().hex[:8]}"
    mock_ad_id = f"meta_ad_{uuid.uuid4().hex[:8]}"

    # 如果尚未建立受眾，先建立
    if not suggestion.meta_audience_id:
        suggestion.meta_audience_id = f"meta_audience_{uuid.uuid4().hex[:8]}"

    # 更新建議狀態
    suggestion.status = "executed"
    suggestion.meta_adset_id = mock_adset_id
    suggestion.meta_ad_id = mock_ad_id
    suggestion.executed_at = datetime.now(timezone.utc)
    await db.flush()

    return CreateAdResponse(
        success=True,
        suggestion_id=suggestion_id,
        meta_adset_id=mock_adset_id,
        meta_ad_id=mock_ad_id,
        adset_name=adset_name,
        ad_name=ad_name,
        message="廣告已成功建立",
    )


# ============================================================
# 預設興趣標籤（開發用）
# ============================================================


def _get_default_interests(industry_code: str) -> list[dict]:
    """取得預設興趣標籤（當資料庫無資料時使用）"""
    # 通用興趣標籤
    common_interests = [
        {
            "meta_interest_id": "6003139266461",
            "name": "Online shopping",
            "name_zh": "網路購物",
            "category": "Shopping and fashion",
            "audience_size_lower": 500000000,
            "audience_size_upper": 600000000,
        },
        {
            "meta_interest_id": "6003020834693",
            "name": "Business",
            "name_zh": "商業",
            "category": "Business and industry",
            "audience_size_lower": 800000000,
            "audience_size_upper": 900000000,
        },
    ]

    # 產業特定興趣標籤
    industry_interests = {
        "ECOMMERCE": [
            {
                "meta_interest_id": "6003442346895",
                "name": "Fashion accessories",
                "name_zh": "時尚配件",
                "category": "Shopping and fashion",
                "audience_size_lower": 200000000,
                "audience_size_upper": 300000000,
            },
            {
                "meta_interest_id": "6003107902433",
                "name": "Discount stores",
                "name_zh": "折扣商店",
                "category": "Shopping and fashion",
                "audience_size_lower": 100000000,
                "audience_size_upper": 150000000,
            },
            {
                "meta_interest_id": "6002714398322",
                "name": "Shopping",
                "name_zh": "購物",
                "category": "Shopping and fashion",
                "audience_size_lower": 700000000,
                "audience_size_upper": 800000000,
            },
        ],
        "SERVICES": [
            {
                "meta_interest_id": "6003017240433",
                "name": "Entrepreneurship",
                "name_zh": "創業",
                "category": "Business and industry",
                "audience_size_lower": 300000000,
                "audience_size_upper": 400000000,
            },
            {
                "meta_interest_id": "6003248745433",
                "name": "Small business",
                "name_zh": "小型企業",
                "category": "Business and industry",
                "audience_size_lower": 400000000,
                "audience_size_upper": 500000000,
            },
        ],
        "EDUCATION": [
            {
                "meta_interest_id": "6003012674433",
                "name": "Higher education",
                "name_zh": "高等教育",
                "category": "Education",
                "audience_size_lower": 200000000,
                "audience_size_upper": 300000000,
            },
            {
                "meta_interest_id": "6003017399433",
                "name": "Online learning",
                "name_zh": "線上學習",
                "category": "Education",
                "audience_size_lower": 150000000,
                "audience_size_upper": 200000000,
            },
        ],
        "FOOD_BEVERAGE": [
            {
                "meta_interest_id": "6003107674433",
                "name": "Restaurants",
                "name_zh": "餐廳",
                "category": "Food and drink",
                "audience_size_lower": 400000000,
                "audience_size_upper": 500000000,
            },
            {
                "meta_interest_id": "6003139266433",
                "name": "Food delivery",
                "name_zh": "外送美食",
                "category": "Food and drink",
                "audience_size_lower": 200000000,
                "audience_size_upper": 300000000,
            },
        ],
        "BEAUTY_HEALTH": [
            {
                "meta_interest_id": "6003248766433",
                "name": "Cosmetics",
                "name_zh": "化妝品",
                "category": "Beauty",
                "audience_size_lower": 300000000,
                "audience_size_upper": 400000000,
            },
            {
                "meta_interest_id": "6003017266433",
                "name": "Skin care",
                "name_zh": "護膚",
                "category": "Beauty",
                "audience_size_lower": 250000000,
                "audience_size_upper": 350000000,
            },
        ],
        "TRAVEL_LEISURE": [
            {
                "meta_interest_id": "6003139266433",
                "name": "Travel",
                "name_zh": "旅行",
                "category": "Travel",
                "audience_size_lower": 500000000,
                "audience_size_upper": 600000000,
            },
            {
                "meta_interest_id": "6003020866433",
                "name": "Hotels",
                "name_zh": "飯店",
                "category": "Travel",
                "audience_size_lower": 200000000,
                "audience_size_upper": 300000000,
            },
        ],
        "TECH_SAAS": [
            {
                "meta_interest_id": "6003017266433",
                "name": "Technology",
                "name_zh": "科技",
                "category": "Technology",
                "audience_size_lower": 600000000,
                "audience_size_upper": 700000000,
            },
            {
                "meta_interest_id": "6003020866433",
                "name": "Software",
                "name_zh": "軟體",
                "category": "Technology",
                "audience_size_lower": 300000000,
                "audience_size_upper": 400000000,
            },
        ],
        "REAL_ESTATE": [
            {
                "meta_interest_id": "6003139266433",
                "name": "Real estate",
                "name_zh": "房地產",
                "category": "Real estate",
                "audience_size_lower": 200000000,
                "audience_size_upper": 300000000,
            },
            {
                "meta_interest_id": "6003017266433",
                "name": "Investment",
                "name_zh": "投資",
                "category": "Finance",
                "audience_size_lower": 400000000,
                "audience_size_upper": 500000000,
            },
        ],
    }

    return common_interests + industry_interests.get(industry_code, [])
