# -*- coding: utf-8 -*-
"""
儀表板 API 路由

實作儀表板相關的 API 端點：
- GET /dashboard/overview - 取得總覽指標
- GET /dashboard/metrics - 取得詳細指標
- GET /dashboard/trends - 取得趨勢數據
- GET /dashboard/alerts - 取得異常警示
"""

import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import get_db
from app.models import AdAccount, Creative, CreativeMetrics

router = APIRouter()


# Pydantic 模型
class MetricValue(BaseModel):
    """指標數值"""

    value: float
    change: float = Field(description="相較上期變化百分比")
    status: str = Field(description="狀態: normal, warning, danger")


class PlatformMetrics(BaseModel):
    """平台指標"""

    spend: float
    conversions: int


class DashboardMetrics(BaseModel):
    """儀表板核心指標"""

    spend: MetricValue
    impressions: MetricValue
    clicks: MetricValue
    conversions: MetricValue
    cpa: MetricValue
    roas: MetricValue


class Period(BaseModel):
    """時間週期"""

    start: str
    end: str


class DashboardOverviewResponse(BaseModel):
    """儀表板總覽回應"""

    period: Period
    metrics: DashboardMetrics
    platforms: dict[str, PlatformMetrics]


def _get_metric_status(change: float, is_positive_better: bool = True) -> str:
    """
    根據變化率判斷指標狀態

    Args:
        change: 變化百分比
        is_positive_better: True 表示正數變化是好的（如 ROAS）
                           False 表示負數變化是好的（如 CPA）
    """
    if is_positive_better:
        if change >= -10:
            return "normal"
        elif change >= -30:
            return "warning"
        else:
            return "danger"
    else:
        # 對於 CPA，上升是壞的
        if change <= 10:
            return "normal"
        elif change <= 30:
            return "warning"
        else:
            return "danger"


def _calculate_period(period: str) -> tuple[str, str]:
    """計算時間週期的起始和結束日期"""
    today = datetime.now().date()

    if period == "today":
        return today.isoformat(), today.isoformat()
    elif period == "7d":
        start = today - timedelta(days=6)
        return start.isoformat(), today.isoformat()
    elif period == "30d":
        start = today - timedelta(days=29)
        return start.isoformat(), today.isoformat()
    else:
        # 預設 7 天
        start = today - timedelta(days=6)
        return start.isoformat(), today.isoformat()


@router.get("/overview", response_model=DashboardOverviewResponse)
async def get_dashboard_overview(
    period: str = Query("7d", description="時間週期: today, 7d, 30d, custom"),
    account_ids: Optional[str] = Query(None, description="帳戶 ID，逗號分隔"),
    db: AsyncSession = Depends(get_db),
) -> DashboardOverviewResponse:
    """
    取得儀表板總覽數據

    整合 Google Ads 和 Meta Marketing 數據，提供跨平台總覽。

    Args:
        period: 時間週期（today, 7d, 30d, custom）
        account_ids: 帳戶 ID 列表（逗號分隔，可選）
        db: 資料庫 session

    Returns:
        DashboardOverviewResponse: 包含指標、平台數據的總覽
    """
    start_date, end_date = _calculate_period(period)
    start_date_obj = datetime.strptime(start_date, "%Y-%m-%d").date()
    end_date_obj = datetime.strptime(end_date, "%Y-%m-%d").date()

    # 解析帳戶 ID 列表
    account_id_list = []
    if account_ids:
        for aid in account_ids.split(","):
            try:
                account_id_list.append(uuid.UUID(aid.strip()))
            except ValueError:
                pass

    # 從資料庫聚合指標
    # 查詢 CreativeMetrics，按平台分組
    query = (
        select(
            AdAccount.platform,
            func.sum(CreativeMetrics.impressions).label("impressions"),
            func.sum(CreativeMetrics.clicks).label("clicks"),
            func.sum(CreativeMetrics.conversions).label("conversions"),
            func.sum(CreativeMetrics.spend).label("spend"),
        )
        .join(Creative, CreativeMetrics.creative_id == Creative.id)
        .join(AdAccount, Creative.account_id == AdAccount.id)
        .where(CreativeMetrics.date >= start_date_obj)
        .where(CreativeMetrics.date <= end_date_obj)
        .group_by(AdAccount.platform)
    )

    # 篩選帳戶
    if account_id_list:
        query = query.where(AdAccount.id.in_(account_id_list))

    result = await db.execute(query)
    platform_data = result.all()

    # 如果資料庫無資料，返回模擬數據
    if not platform_data:
        multiplier = 1 if period == "today" else 7 if period == "7d" else 30

        google_spend = 800.00 * multiplier
        google_conversions = 70 * multiplier
        meta_spend = 700.00 * multiplier
        meta_conversions = 55 * multiplier

        total_spend = google_spend + meta_spend
        total_impressions = 50000 * multiplier
        total_clicks = 2500 * multiplier
        total_conversions = google_conversions + meta_conversions

        cpa = total_spend / total_conversions if total_conversions > 0 else 0
        roas = (total_conversions * 50) / total_spend if total_spend > 0 else 0

        return DashboardOverviewResponse(
            period=Period(start=start_date, end=end_date),
            metrics=DashboardMetrics(
                spend=MetricValue(
                    value=total_spend,
                    change=-5.2,
                    status=_get_metric_status(-5.2, is_positive_better=False),
                ),
                impressions=MetricValue(
                    value=total_impressions,
                    change=12.3,
                    status=_get_metric_status(12.3),
                ),
                clicks=MetricValue(
                    value=total_clicks,
                    change=8.1,
                    status=_get_metric_status(8.1),
                ),
                conversions=MetricValue(
                    value=total_conversions,
                    change=-2.5,
                    status=_get_metric_status(-2.5),
                ),
                cpa=MetricValue(
                    value=round(cpa, 2),
                    change=15.3,
                    status=_get_metric_status(15.3, is_positive_better=False),
                ),
                roas=MetricValue(
                    value=round(roas, 2),
                    change=-8.2,
                    status=_get_metric_status(-8.2),
                ),
            ),
            platforms={
                "google": PlatformMetrics(spend=google_spend, conversions=google_conversions),
                "meta": PlatformMetrics(spend=meta_spend, conversions=meta_conversions),
            },
        )

    # 彙總平台數據
    platforms = {}
    total_impressions = 0
    total_clicks = 0
    total_conversions = 0
    total_spend = Decimal("0")

    for row in platform_data:
        platform = row.platform or "unknown"
        impressions = row.impressions or 0
        clicks = row.clicks or 0
        conversions = row.conversions or 0
        spend = row.spend or Decimal("0")

        platforms[platform] = PlatformMetrics(
            spend=float(spend),
            conversions=conversions,
        )

        total_impressions += impressions
        total_clicks += clicks
        total_conversions += conversions
        total_spend += spend

    # 計算衍生指標
    cpa = float(total_spend) / total_conversions if total_conversions > 0 else 0
    roas = (total_conversions * 50) / float(total_spend) if total_spend > 0 else 0

    # 計算上期數據以獲取變化率（簡化：假設變化率需另外計算）
    # TODO: 實作完整的期間比較邏輯
    # 目前使用預設變化率
    spend_change = 0.0
    impressions_change = 0.0
    clicks_change = 0.0
    conversions_change = 0.0
    cpa_change = 0.0
    roas_change = 0.0

    return DashboardOverviewResponse(
        period=Period(start=start_date, end=end_date),
        metrics=DashboardMetrics(
            spend=MetricValue(
                value=float(total_spend),
                change=spend_change,
                status=_get_metric_status(spend_change, is_positive_better=False),
            ),
            impressions=MetricValue(
                value=total_impressions,
                change=impressions_change,
                status=_get_metric_status(impressions_change),
            ),
            clicks=MetricValue(
                value=total_clicks,
                change=clicks_change,
                status=_get_metric_status(clicks_change),
            ),
            conversions=MetricValue(
                value=total_conversions,
                change=conversions_change,
                status=_get_metric_status(conversions_change),
            ),
            cpa=MetricValue(
                value=round(cpa, 2),
                change=cpa_change,
                status=_get_metric_status(cpa_change, is_positive_better=False),
            ),
            roas=MetricValue(
                value=round(roas, 2),
                change=roas_change,
                status=_get_metric_status(roas_change),
            ),
        ),
        platforms=platforms,
    )


# ===== 新增端點的 Pydantic 模型 =====

class DetailedMetric(BaseModel):
    """詳細指標"""

    name: str
    value: float
    change: float
    status: str
    trend: list[float] = Field(default_factory=list, description="最近 7 天趨勢")


class DetailedMetricsResponse(BaseModel):
    """詳細指標回應"""

    period: Period
    metrics: list[DetailedMetric]


class TrendDataPoint(BaseModel):
    """趨勢數據點"""

    date: str
    impressions: int
    clicks: int
    conversions: int
    spend: float
    cpa: float
    roas: float


class TrendsResponse(BaseModel):
    """趨勢數據回應"""

    period: Period
    data: list[TrendDataPoint]
    granularity: str = Field(description="粒度: daily, weekly")


class Alert(BaseModel):
    """異常警示"""

    id: str
    type: str = Field(description="類型: anomaly, threshold, trend")
    severity: str = Field(description="嚴重度: low, medium, high, critical")
    title: str
    description: str
    metric: str
    value: float
    threshold: Optional[float] = None
    created_at: str


class AlertsResponse(BaseModel):
    """異常警示回應"""

    data: list[Alert]
    meta: dict


# ===== 新增端點 =====

@router.get("/metrics", response_model=DetailedMetricsResponse)
async def get_dashboard_metrics(
    period: str = Query("7d", description="時間週期: today, 7d, 30d"),
    account_ids: Optional[str] = Query(None, description="帳戶 ID，逗號分隔"),
    db: AsyncSession = Depends(get_db),
) -> DetailedMetricsResponse:
    """
    取得詳細指標

    返回更細緻的指標數據，包含每個指標的趨勢。

    Args:
        period: 時間週期
        account_ids: 帳戶 ID 列表
        db: 資料庫 session

    Returns:
        DetailedMetricsResponse: 詳細指標列表
    """
    start_date, end_date = _calculate_period(period)
    start_date_obj = datetime.strptime(start_date, "%Y-%m-%d").date()
    end_date_obj = datetime.strptime(end_date, "%Y-%m-%d").date()

    # 解析帳戶 ID
    account_id_list = []
    if account_ids:
        for aid in account_ids.split(","):
            try:
                account_id_list.append(uuid.UUID(aid.strip()))
            except ValueError:
                pass

    # 查詢每日數據用於計算趨勢
    query = (
        select(
            CreativeMetrics.date,
            func.sum(CreativeMetrics.impressions).label("impressions"),
            func.sum(CreativeMetrics.clicks).label("clicks"),
            func.sum(CreativeMetrics.conversions).label("conversions"),
            func.sum(CreativeMetrics.spend).label("spend"),
        )
        .join(Creative, CreativeMetrics.creative_id == Creative.id)
        .where(CreativeMetrics.date >= start_date_obj)
        .where(CreativeMetrics.date <= end_date_obj)
        .group_by(CreativeMetrics.date)
        .order_by(CreativeMetrics.date)
    )

    if account_id_list:
        query = query.join(AdAccount, Creative.account_id == AdAccount.id)
        query = query.where(AdAccount.id.in_(account_id_list))

    result = await db.execute(query)
    daily_data = result.all()

    # 如果無資料，返回模擬數據
    if not daily_data:
        multiplier = 1 if period == "today" else 7 if period == "7d" else 30
        base_impressions = 50000
        base_clicks = 2500
        base_conversions = 125
        base_spend = 1500.0

        return DetailedMetricsResponse(
            period=Period(start=start_date, end=end_date),
            metrics=[
                DetailedMetric(
                    name="impressions",
                    value=base_impressions * multiplier,
                    change=12.3,
                    status="normal",
                    trend=[45000, 48000, 52000, 49000, 51000, 53000, 50000],
                ),
                DetailedMetric(
                    name="clicks",
                    value=base_clicks * multiplier,
                    change=8.1,
                    status="normal",
                    trend=[2200, 2400, 2600, 2500, 2700, 2800, 2500],
                ),
                DetailedMetric(
                    name="conversions",
                    value=base_conversions * multiplier,
                    change=-2.5,
                    status="warning",
                    trend=[120, 130, 125, 110, 115, 128, 125],
                ),
                DetailedMetric(
                    name="spend",
                    value=base_spend * multiplier,
                    change=-5.2,
                    status="normal",
                    trend=[1400, 1500, 1600, 1450, 1550, 1480, 1500],
                ),
                DetailedMetric(
                    name="cpa",
                    value=12.0,
                    change=15.3,
                    status="warning",
                    trend=[11.67, 11.54, 12.80, 13.18, 13.48, 11.56, 12.00],
                ),
                DetailedMetric(
                    name="roas",
                    value=4.17,
                    change=-8.2,
                    status="normal",
                    trend=[4.29, 4.33, 3.91, 3.79, 3.71, 4.32, 4.17],
                ),
            ],
        )

    # 彙總數據
    total_impressions = sum(r.impressions or 0 for r in daily_data)
    total_clicks = sum(r.clicks or 0 for r in daily_data)
    total_conversions = sum(r.conversions or 0 for r in daily_data)
    total_spend = sum(float(r.spend or 0) for r in daily_data)

    cpa = total_spend / total_conversions if total_conversions > 0 else 0
    roas = (total_conversions * 50) / total_spend if total_spend > 0 else 0

    # 計算每日趨勢
    impressions_trend = [r.impressions or 0 for r in daily_data[-7:]]
    clicks_trend = [r.clicks or 0 for r in daily_data[-7:]]
    conversions_trend = [r.conversions or 0 for r in daily_data[-7:]]
    spend_trend = [float(r.spend or 0) for r in daily_data[-7:]]

    return DetailedMetricsResponse(
        period=Period(start=start_date, end=end_date),
        metrics=[
            DetailedMetric(
                name="impressions",
                value=total_impressions,
                change=0.0,
                status="normal",
                trend=impressions_trend,
            ),
            DetailedMetric(
                name="clicks",
                value=total_clicks,
                change=0.0,
                status="normal",
                trend=clicks_trend,
            ),
            DetailedMetric(
                name="conversions",
                value=total_conversions,
                change=0.0,
                status="normal",
                trend=conversions_trend,
            ),
            DetailedMetric(
                name="spend",
                value=total_spend,
                change=0.0,
                status="normal",
                trend=spend_trend,
            ),
            DetailedMetric(
                name="cpa",
                value=round(cpa, 2),
                change=0.0,
                status="normal",
                trend=[],
            ),
            DetailedMetric(
                name="roas",
                value=round(roas, 2),
                change=0.0,
                status="normal",
                trend=[],
            ),
        ],
    )


@router.get("/trends", response_model=TrendsResponse)
async def get_dashboard_trends(
    period: str = Query("7d", description="時間週期: 7d, 30d"),
    granularity: str = Query("daily", description="粒度: daily, weekly"),
    account_ids: Optional[str] = Query(None, description="帳戶 ID，逗號分隔"),
    db: AsyncSession = Depends(get_db),
) -> TrendsResponse:
    """
    取得趨勢數據

    返回指定時間範圍內的每日/每週數據，用於繪製圖表。

    Args:
        period: 時間週期（7d 或 30d）
        granularity: 數據粒度（daily 或 weekly）
        account_ids: 帳戶 ID 列表
        db: 資料庫 session

    Returns:
        TrendsResponse: 趨勢數據
    """
    start_date, end_date = _calculate_period(period)
    start_date_obj = datetime.strptime(start_date, "%Y-%m-%d").date()
    end_date_obj = datetime.strptime(end_date, "%Y-%m-%d").date()

    # 解析帳戶 ID
    account_id_list = []
    if account_ids:
        for aid in account_ids.split(","):
            try:
                account_id_list.append(uuid.UUID(aid.strip()))
            except ValueError:
                pass

    # 查詢每日數據
    query = (
        select(
            CreativeMetrics.date,
            func.sum(CreativeMetrics.impressions).label("impressions"),
            func.sum(CreativeMetrics.clicks).label("clicks"),
            func.sum(CreativeMetrics.conversions).label("conversions"),
            func.sum(CreativeMetrics.spend).label("spend"),
        )
        .join(Creative, CreativeMetrics.creative_id == Creative.id)
        .where(CreativeMetrics.date >= start_date_obj)
        .where(CreativeMetrics.date <= end_date_obj)
        .group_by(CreativeMetrics.date)
        .order_by(CreativeMetrics.date)
    )

    if account_id_list:
        query = query.join(AdAccount, Creative.account_id == AdAccount.id)
        query = query.where(AdAccount.id.in_(account_id_list))

    result = await db.execute(query)
    daily_data = result.all()

    # 如果無資料，返回模擬數據
    if not daily_data:
        days = 7 if period == "7d" else 30
        mock_data = []
        today = datetime.now().date()

        for i in range(days):
            day = today - timedelta(days=days - 1 - i)
            impressions = 50000 + (i * 1000) - (i % 3 * 500)
            clicks = 2500 + (i * 50) - (i % 3 * 25)
            conversions = 125 + (i * 2) - (i % 3)
            spend = 1500.0 + (i * 20) - (i % 3 * 10)
            cpa = spend / conversions if conversions > 0 else 0
            roas = (conversions * 50) / spend if spend > 0 else 0

            mock_data.append(
                TrendDataPoint(
                    date=day.isoformat(),
                    impressions=impressions,
                    clicks=clicks,
                    conversions=conversions,
                    spend=round(spend, 2),
                    cpa=round(cpa, 2),
                    roas=round(roas, 2),
                )
            )

        return TrendsResponse(
            period=Period(start=start_date, end=end_date),
            data=mock_data,
            granularity=granularity,
        )

    # 轉換為回應格式
    trend_data = []
    for row in daily_data:
        impressions = row.impressions or 0
        clicks = row.clicks or 0
        conversions = row.conversions or 0
        spend = float(row.spend or 0)
        cpa = spend / conversions if conversions > 0 else 0
        roas = (conversions * 50) / spend if spend > 0 else 0

        trend_data.append(
            TrendDataPoint(
                date=row.date.isoformat(),
                impressions=impressions,
                clicks=clicks,
                conversions=conversions,
                spend=round(spend, 2),
                cpa=round(cpa, 2),
                roas=round(roas, 2),
            )
        )

    return TrendsResponse(
        period=Period(start=start_date, end=end_date),
        data=trend_data,
        granularity=granularity,
    )


@router.get("/alerts", response_model=AlertsResponse)
async def get_dashboard_alerts(
    severity: Optional[str] = Query(None, description="嚴重度: low, medium, high, critical"),
    limit: int = Query(10, ge=1, le=50, description="返回數量"),
    db: AsyncSession = Depends(get_db),
) -> AlertsResponse:
    """
    取得異常警示

    檢測並返回廣告效能異常，包括：
    - 指標異常（突然大幅變化）
    - 閾值警報（超過預設門檻）
    - 趨勢警報（持續下降）

    Args:
        severity: 篩選嚴重度
        limit: 返回數量上限
        db: 資料庫 session

    Returns:
        AlertsResponse: 異常警示列表
    """
    # TODO: 實作真正的異常檢測邏輯
    # 需要查詢最近數據，比較歷史數據，檢測異常模式

    # 模擬警示數據
    now = datetime.now(timezone.utc)
    alerts = [
        Alert(
            id=str(uuid.uuid4()),
            type="anomaly",
            severity="high",
            title="CPA 異常上升",
            description="過去 3 天 CPA 上升 45%，超出正常波動範圍",
            metric="cpa",
            value=18.5,
            threshold=12.0,
            created_at=now.isoformat(),
        ),
        Alert(
            id=str(uuid.uuid4()),
            type="threshold",
            severity="medium",
            title="ROAS 低於目標",
            description="當前 ROAS 為 2.8，低於目標值 3.5",
            metric="roas",
            value=2.8,
            threshold=3.5,
            created_at=(now - timedelta(hours=2)).isoformat(),
        ),
        Alert(
            id=str(uuid.uuid4()),
            type="trend",
            severity="medium",
            title="轉換率持續下降",
            description="轉換率連續 5 天下降，累計下降 15%",
            metric="conversion_rate",
            value=2.1,
            threshold=None,
            created_at=(now - timedelta(hours=5)).isoformat(),
        ),
        Alert(
            id=str(uuid.uuid4()),
            type="anomaly",
            severity="low",
            title="曝光量波動",
            description="今日曝光量較昨日減少 20%",
            metric="impressions",
            value=40000,
            threshold=50000,
            created_at=(now - timedelta(hours=8)).isoformat(),
        ),
    ]

    # 篩選嚴重度
    if severity:
        alerts = [a for a in alerts if a.severity == severity]

    # 限制數量
    alerts = alerts[:limit]

    return AlertsResponse(
        data=alerts,
        meta={
            "total": len(alerts),
            "filtered_by_severity": severity,
        },
    )
