# -*- coding: utf-8 -*-
"""
受眾健康度計算模組測試

測試 audience_health.py 中的所有計算函數
"""

import pytest
from datetime import datetime, timedelta
from app.services.audience_health import (
    AudienceHealthStatus,
    AudienceHealthInput,
    AudienceHealthResult,
    AudienceHealthBreakdown,
    AUDIENCE_HEALTH_WEIGHTS,
    AUDIENCE_HEALTH_THRESHOLDS,
    SIZE_THRESHOLDS,
    CPA_THRESHOLDS,
    ROAS_THRESHOLDS,
    FRESHNESS_THRESHOLDS,
    calculate_size_score,
    calculate_cpa_score,
    calculate_roas_score,
    calculate_freshness_score,
    get_audience_health_status,
    calculate_audience_health,
)


class TestCalculateSizeScore:
    """受眾規模因子分數計算測試"""

    def test_ideal_range_returns_100(self):
        """理想範圍（10K-2M）應該返回 100 分"""
        assert calculate_size_score(10_000) == 100
        assert calculate_size_score(50_000) == 100
        assert calculate_size_score(500_000) == 100
        assert calculate_size_score(1_000_000) == 100
        assert calculate_size_score(2_000_000) == 100

    def test_too_small_critical(self):
        """極端過小（< 5K）應該返回 0-25 分"""
        assert calculate_size_score(0) == 0
        assert calculate_size_score(2_500) == pytest.approx(12.5, abs=0.5)
        assert calculate_size_score(4_999) == pytest.approx(25, abs=0.5)

    def test_too_small_warning(self):
        """稍微過小（5K-10K）應該返回 50-100 分"""
        assert calculate_size_score(5_000) == 50
        assert calculate_size_score(7_500) == 75
        assert calculate_size_score(9_999) == pytest.approx(100, abs=1)

    def test_too_large_warning(self):
        """稍微過大（2M-10M）應該返回 50-100 分"""
        score_2m = calculate_size_score(2_000_001)
        assert 90 <= score_2m <= 100

        score_6m = calculate_size_score(6_000_000)
        assert 50 <= score_6m < 80

    def test_too_large_critical(self):
        """極端過大（> 10M）應該返回 0-25 分"""
        score = calculate_size_score(15_000_000)
        assert score <= 25


class TestCalculateCpaScore:
    """CPA 表現因子分數計算測試"""

    def test_below_average_returns_100(self):
        """CPA 低於平均應該返回 100 分"""
        assert calculate_cpa_score(10.0, 15.0) == 100
        assert calculate_cpa_score(5.0, 10.0) == 100
        assert calculate_cpa_score(0.0, 10.0) == 100

    def test_equal_to_average_returns_100(self):
        """CPA 等於平均應該返回 100 分"""
        assert calculate_cpa_score(10.0, 10.0) == 100

    def test_slightly_above_average(self):
        """CPA 略高於平均（0-30%）應該返回 50-100 分"""
        # 高於 15%
        score = calculate_cpa_score(11.5, 10.0)  # 15% 高於平均
        assert 50 < score < 100

    def test_significantly_above_average(self):
        """CPA 顯著高於平均（> 30%）應該返回 0-50 分"""
        # 高於 50%
        score = calculate_cpa_score(15.0, 10.0)  # 50% 高於平均
        assert score <= 50

    def test_zero_account_avg_returns_middle(self):
        """帳戶平均 CPA 為 0 時應該返回中間值"""
        assert calculate_cpa_score(10.0, 0.0) == 50


class TestCalculateRoasScore:
    """ROAS 表現因子分數計算測試"""

    def test_high_roas_returns_100(self):
        """ROAS >= 1.5 應該返回 100 分"""
        assert calculate_roas_score(1.5) == 100
        assert calculate_roas_score(2.0) == 100
        assert calculate_roas_score(5.0) == 100

    def test_moderate_roas(self):
        """ROAS 1.0-1.5 應該返回 50-100 分"""
        assert calculate_roas_score(1.0) == 50
        assert calculate_roas_score(1.25) == 75

    def test_low_roas(self):
        """ROAS < 1.0 應該返回 0-50 分"""
        assert calculate_roas_score(0.5) == 25
        assert calculate_roas_score(0.0) == 0

    def test_negative_roas(self):
        """負 ROAS 應該返回 0 分"""
        assert calculate_roas_score(-1.0) == 0


class TestCalculateFreshnessScore:
    """新鮮度因子分數計算測試"""

    def test_fresh_returns_100(self):
        """30 天內更新應該返回 100 分"""
        assert calculate_freshness_score(0) == 100
        assert calculate_freshness_score(15) == 100
        assert calculate_freshness_score(30) == 100

    def test_moderate_age(self):
        """30-60 天應該返回 50-100 分"""
        score_45 = calculate_freshness_score(45)
        assert 50 < score_45 < 100

        assert calculate_freshness_score(60) == 50

    def test_stale(self):
        """> 60 天應該返回 0-50 分"""
        score_90 = calculate_freshness_score(90)
        assert 0 < score_90 < 50

    def test_very_stale(self):
        """極度過時應該接近 0 分"""
        score = calculate_freshness_score(120)
        assert score == 0


class TestGetAudienceHealthStatus:
    """健康狀態判定測試"""

    def test_healthy_status(self):
        """70-100 分應該為健康狀態"""
        assert get_audience_health_status(70) == AudienceHealthStatus.HEALTHY
        assert get_audience_health_status(85) == AudienceHealthStatus.HEALTHY
        assert get_audience_health_status(100) == AudienceHealthStatus.HEALTHY

    def test_warning_status(self):
        """40-69 分應該為警告狀態"""
        assert get_audience_health_status(40) == AudienceHealthStatus.WARNING
        assert get_audience_health_status(55) == AudienceHealthStatus.WARNING
        assert get_audience_health_status(69) == AudienceHealthStatus.WARNING

    def test_critical_status(self):
        """0-39 分應該為危險狀態"""
        assert get_audience_health_status(0) == AudienceHealthStatus.CRITICAL
        assert get_audience_health_status(20) == AudienceHealthStatus.CRITICAL
        assert get_audience_health_status(39) == AudienceHealthStatus.CRITICAL


class TestCalculateAudienceHealth:
    """受眾健康度綜合計算測試"""

    def test_healthy_audience(self):
        """健康受眾的健康度應該在 70-100 分"""
        input_data = AudienceHealthInput(
            size=50_000,           # 理想規模
            cpa=12.00,             # 低於平均
            account_avg_cpa=15.00,
            roas=2.5,              # 高 ROAS
            days_since_update=15,  # 新鮮
        )
        result = calculate_audience_health(input_data)

        assert result.score >= 70
        assert result.status == AudienceHealthStatus.HEALTHY

    def test_warning_audience(self):
        """需關注的受眾應該在 40-69 分"""
        input_data = AudienceHealthInput(
            size=7_500,            # 稍微過小
            cpa=13.00,             # 略高於平均
            account_avg_cpa=10.00,
            roas=1.2,              # 中等 ROAS
            days_since_update=45,  # 稍微過時
        )
        result = calculate_audience_health(input_data)

        assert 40 <= result.score < 70
        assert result.status == AudienceHealthStatus.WARNING

    def test_critical_audience(self):
        """問題受眾的健康度應該在 0-39 分"""
        input_data = AudienceHealthInput(
            size=2_000,            # 極端過小
            cpa=20.00,             # 遠高於平均
            account_avg_cpa=10.00,
            roas=0.5,              # 低 ROAS
            days_since_update=90,  # 過時
        )
        result = calculate_audience_health(input_data)

        assert result.score < 40
        assert result.status == AudienceHealthStatus.CRITICAL

    def test_result_includes_breakdown(self):
        """結果應該包含各因子分數明細"""
        input_data = AudienceHealthInput(
            size=100_000,
            cpa=10.00,
            account_avg_cpa=10.00,
            roas=1.5,
            days_since_update=30,
        )
        result = calculate_audience_health(input_data)

        assert isinstance(result.breakdown, AudienceHealthBreakdown)
        assert result.breakdown.size_score == 100
        assert result.breakdown.cpa_score == 100
        assert result.breakdown.roas_score == 100
        assert result.breakdown.freshness_score == 100

    def test_weighted_calculation(self):
        """測試加權計算是否正確"""
        # 所有因子都是 100 分
        input_data = AudienceHealthInput(
            size=100_000,          # 100 分
            cpa=5.00,              # 100 分（低於平均）
            account_avg_cpa=10.00,
            roas=2.0,              # 100 分（>= 1.5）
            days_since_update=0,   # 100 分（新鮮）
        )
        result = calculate_audience_health(input_data)

        assert result.score == 100

    def test_last_updated_datetime(self):
        """使用 last_updated 日期時間應該正確計算"""
        input_data = AudienceHealthInput(
            size=100_000,
            cpa=10.00,
            account_avg_cpa=10.00,
            roas=1.5,
            last_updated=datetime.now() - timedelta(days=15),
        )
        result = calculate_audience_health(input_data)

        assert result.breakdown.freshness_score == 100

    def test_days_since_update_overrides_last_updated(self):
        """days_since_update 應該優先於 last_updated"""
        input_data = AudienceHealthInput(
            size=100_000,
            cpa=10.00,
            account_avg_cpa=10.00,
            roas=1.5,
            last_updated=datetime.now() - timedelta(days=90),  # 90 天前
            days_since_update=0,  # 但指定為 0 天
        )
        result = calculate_audience_health(input_data)

        # 應該使用 days_since_update=0，所以 freshness_score=100
        assert result.breakdown.freshness_score == 100

    def test_no_update_info_assumes_fresh(self):
        """無更新資訊時假設為新鮮"""
        input_data = AudienceHealthInput(
            size=100_000,
            cpa=10.00,
            account_avg_cpa=10.00,
            roas=1.5,
            # 沒有 last_updated 和 days_since_update
        )
        result = calculate_audience_health(input_data)

        assert result.breakdown.freshness_score == 100


class TestAudienceHealthWeights:
    """權重常數測試"""

    def test_weights_sum_to_one(self):
        """權重應該加總為 1"""
        total_weight = sum(AUDIENCE_HEALTH_WEIGHTS.values())
        assert total_weight == pytest.approx(1.0, abs=0.001)

    def test_size_weight(self):
        """規模權重應該是 25%"""
        assert AUDIENCE_HEALTH_WEIGHTS["size"] == 0.25

    def test_cpa_weight(self):
        """CPA 權重應該是 35%"""
        assert AUDIENCE_HEALTH_WEIGHTS["cpa"] == 0.35

    def test_roas_weight(self):
        """ROAS 權重應該是 25%"""
        assert AUDIENCE_HEALTH_WEIGHTS["roas"] == 0.25

    def test_freshness_weight(self):
        """新鮮度權重應該是 15%"""
        assert AUDIENCE_HEALTH_WEIGHTS["freshness"] == 0.15


class TestAudienceHealthThresholds:
    """門檻常數測試"""

    def test_health_thresholds(self):
        """健康門檻應該正確"""
        assert AUDIENCE_HEALTH_THRESHOLDS["healthy"] == 70
        assert AUDIENCE_HEALTH_THRESHOLDS["warning"] == 40

    def test_size_thresholds(self):
        """規模門檻應該正確"""
        assert SIZE_THRESHOLDS["min_healthy"] == 10_000
        assert SIZE_THRESHOLDS["max_healthy"] == 2_000_000
        assert SIZE_THRESHOLDS["min_critical"] == 5_000
        assert SIZE_THRESHOLDS["max_critical"] == 10_000_000

    def test_cpa_thresholds(self):
        """CPA 門檻應該正確"""
        assert CPA_THRESHOLDS["good_ratio"] == 1.0
        assert CPA_THRESHOLDS["warning_ratio"] == 1.3

    def test_roas_thresholds(self):
        """ROAS 門檻應該正確"""
        assert ROAS_THRESHOLDS["healthy"] == 1.5
        assert ROAS_THRESHOLDS["warning"] == 1.0

    def test_freshness_thresholds(self):
        """新鮮度門檻應該正確"""
        assert FRESHNESS_THRESHOLDS["healthy"] == 30
        assert FRESHNESS_THRESHOLDS["warning"] == 60


class TestAudienceHealthStatusValues:
    """健康狀態值測試"""

    def test_status_values(self):
        """狀態應該有正確的值"""
        assert AudienceHealthStatus.HEALTHY.value == "healthy"
        assert AudienceHealthStatus.WARNING.value == "warning"
        assert AudienceHealthStatus.CRITICAL.value == "critical"


class TestEdgeCases:
    """邊界情況測試"""

    def test_zero_size(self):
        """規模為 0 應該不會崩潰"""
        input_data = AudienceHealthInput(
            size=0,
            cpa=10.00,
            account_avg_cpa=10.00,
            roas=1.5,
            days_since_update=0,
        )
        result = calculate_audience_health(input_data)

        assert result.breakdown.size_score == 0

    def test_result_is_rounded(self):
        """結果應該是整數"""
        input_data = AudienceHealthInput(
            size=8_000,
            cpa=11.00,
            account_avg_cpa=10.00,
            roas=1.3,
            days_since_update=40,
        )
        result = calculate_audience_health(input_data)

        assert isinstance(result.score, int)

    def test_result_type_consistency(self):
        """結果類型一致性"""
        input_data = AudienceHealthInput(
            size=50_000,
            cpa=10.00,
            account_avg_cpa=10.00,
            roas=1.5,
            days_since_update=15,
        )
        result = calculate_audience_health(input_data)

        assert isinstance(result, AudienceHealthResult)
        assert isinstance(result.score, int)
        assert isinstance(result.status, AudienceHealthStatus)
        assert isinstance(result.breakdown, AudienceHealthBreakdown)
