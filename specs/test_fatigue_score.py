# -*- coding: utf-8 -*-
"""
素材疲勞度計算模組測試

測試 fatigue_score.py 中的所有計算函數
"""

import pytest
from app.services.fatigue_score import (
    FatigueStatus,
    FatigueInput,
    FatigueResult,
    FatigueBreakdown,
    FATIGUE_WEIGHTS,
    FATIGUE_THRESHOLDS,
    calculate_ctr_score,
    calculate_frequency_score,
    calculate_days_score,
    calculate_conversion_score,
    get_fatigue_status,
    calculate_fatigue_score,
)


class TestCalculateCtrScore:
    """CTR 變化因子分數計算測試"""

    def test_positive_ctr_change_returns_zero(self):
        """CTR 上升時應該返回 0 分（不疲勞）"""
        assert calculate_ctr_score(5) == 0
        assert calculate_ctr_score(0.1) == 0

    def test_zero_ctr_change_returns_25(self):
        """CTR 沒有變化時應該返回 25 分"""
        assert calculate_ctr_score(0) == 25

    def test_slight_ctr_decline(self):
        """CTR 小幅下降（0% 到 -10%）應該返回 25-50 分"""
        score = calculate_ctr_score(-5)
        assert 25 < score < 50
        # -5% 應該是 25 + 12.5 = 37.5
        assert score == pytest.approx(37.5, abs=0.1)

    def test_moderate_ctr_decline(self):
        """CTR 中等下降（-10% 到 -20%）應該返回 50-75 分"""
        score = calculate_ctr_score(-15)
        assert 50 <= score <= 75
        # -15% 應該是 50 + 12.5 = 62.5
        assert score == pytest.approx(62.5, abs=0.1)

    def test_severe_ctr_decline(self):
        """CTR 嚴重下降（低於 -20%）應該返回 75-100 分"""
        score = calculate_ctr_score(-25)
        assert 75 <= score <= 100
        # -25% 應該是 75 + 12.5 = 87.5
        assert score == pytest.approx(87.5, abs=0.1)

    def test_extreme_ctr_decline_capped_at_100(self):
        """極端 CTR 下降應該最高 100 分"""
        assert calculate_ctr_score(-50) == 100
        assert calculate_ctr_score(-100) == 100

    def test_boundary_values(self):
        """測試邊界值"""
        assert calculate_ctr_score(-10) == 50  # 邊界：-10%
        assert calculate_ctr_score(-20) == 75  # 邊界：-20%


class TestCalculateFrequencyScore:
    """投放頻率因子分數計算測試"""

    def test_low_frequency(self):
        """頻率 < 2 應該返回 0-25 分"""
        assert calculate_frequency_score(0) == 0
        assert calculate_frequency_score(1) == pytest.approx(12.5, abs=0.1)
        assert calculate_frequency_score(1.9) == pytest.approx(23.75, abs=0.1)

    def test_moderate_frequency(self):
        """頻率 2-3 應該返回 25-50 分"""
        assert calculate_frequency_score(2) == 25
        assert calculate_frequency_score(2.5) == pytest.approx(37.5, abs=0.1)
        assert calculate_frequency_score(2.9) == pytest.approx(47.5, abs=0.1)

    def test_high_frequency(self):
        """頻率 3-4 應該返回 50-75 分"""
        assert calculate_frequency_score(3) == 50
        assert calculate_frequency_score(3.5) == pytest.approx(62.5, abs=0.1)
        assert calculate_frequency_score(3.9) == pytest.approx(72.5, abs=0.1)

    def test_very_high_frequency(self):
        """頻率 > 4 應該返回 75-100 分"""
        assert calculate_frequency_score(4) == 75
        assert calculate_frequency_score(5) == pytest.approx(87.5, abs=0.1)
        assert calculate_frequency_score(6) == 100

    def test_extreme_frequency_capped_at_100(self):
        """極端頻率應該最高 100 分"""
        assert calculate_frequency_score(10) == 100


class TestCalculateDaysScore:
    """投放天數因子分數計算測試"""

    def test_fresh_campaign(self):
        """投放 < 7 天應該返回 0-25 分"""
        assert calculate_days_score(0) == 0
        assert calculate_days_score(3) == pytest.approx(10.71, abs=0.5)
        assert calculate_days_score(6) == pytest.approx(21.43, abs=0.5)

    def test_short_campaign(self):
        """投放 7-14 天應該返回 25-50 分"""
        assert calculate_days_score(7) == 25
        assert calculate_days_score(10) == pytest.approx(35.71, abs=0.5)
        assert calculate_days_score(13) == pytest.approx(46.43, abs=0.5)

    def test_medium_campaign(self):
        """投放 14-30 天應該返回 50-75 分"""
        assert calculate_days_score(14) == 50
        assert calculate_days_score(22) == pytest.approx(62.5, abs=0.5)
        assert calculate_days_score(29) == pytest.approx(73.44, abs=0.5)

    def test_long_campaign(self):
        """投放 > 30 天應該返回 75-100 分"""
        assert calculate_days_score(30) == 75
        assert calculate_days_score(45) == pytest.approx(87.5, abs=0.5)
        assert calculate_days_score(60) == 100

    def test_extreme_days_capped_at_100(self):
        """極端天數應該最高 100 分"""
        assert calculate_days_score(100) == 100
        assert calculate_days_score(365) == 100


class TestCalculateConversionScore:
    """轉換率變化因子分數計算測試"""

    def test_positive_conversion_change_returns_zero(self):
        """轉換率上升時應該返回 0 分"""
        assert calculate_conversion_score(5) == 0
        assert calculate_conversion_score(0.1) == 0

    def test_zero_conversion_change_returns_25(self):
        """轉換率沒有變化時應該返回 25 分"""
        assert calculate_conversion_score(0) == 25

    def test_slight_conversion_decline(self):
        """轉換率小幅下降應該返回 25-50 分"""
        score = calculate_conversion_score(-5)
        assert 25 < score < 50
        assert score == pytest.approx(37.5, abs=0.1)

    def test_moderate_conversion_decline(self):
        """轉換率中等下降應該返回 50-75 分"""
        score = calculate_conversion_score(-15)
        assert 50 <= score <= 75

    def test_severe_conversion_decline(self):
        """轉換率嚴重下降應該返回 75-100 分"""
        score = calculate_conversion_score(-25)
        assert 75 <= score <= 100

    def test_extreme_conversion_decline_capped_at_100(self):
        """極端轉換率下降應該最高 100 分"""
        assert calculate_conversion_score(-50) == 100


class TestGetFatigueStatus:
    """疲勞狀態判定測試"""

    def test_healthy_status(self):
        """0-40 分應該為健康狀態"""
        assert get_fatigue_status(0) == FatigueStatus.HEALTHY
        assert get_fatigue_status(20) == FatigueStatus.HEALTHY
        assert get_fatigue_status(40) == FatigueStatus.HEALTHY

    def test_warning_status(self):
        """41-70 分應該為警告狀態"""
        assert get_fatigue_status(41) == FatigueStatus.WARNING
        assert get_fatigue_status(55) == FatigueStatus.WARNING
        assert get_fatigue_status(70) == FatigueStatus.WARNING

    def test_fatigued_status(self):
        """71-100 分應該為疲勞狀態"""
        assert get_fatigue_status(71) == FatigueStatus.FATIGUED
        assert get_fatigue_status(85) == FatigueStatus.FATIGUED
        assert get_fatigue_status(100) == FatigueStatus.FATIGUED


class TestCalculateFatigueScore:
    """疲勞度綜合計算測試"""

    def test_healthy_creative(self):
        """健康素材的疲勞度應該在 0-40 分"""
        input_data = FatigueInput(
            ctr_change=5,      # CTR 上升
            frequency=1.5,     # 低頻率
            days_active=5,     # 短投放時間
            conversion_rate_change=2,  # 轉換率上升
        )
        result = calculate_fatigue_score(input_data)

        assert result.score <= 40
        assert result.status == FatigueStatus.HEALTHY

    def test_warning_creative(self):
        """注意素材的疲勞度應該在 41-70 分"""
        input_data = FatigueInput(
            ctr_change=-15,    # CTR 中等下降
            frequency=3.2,     # 中等頻率
            days_active=21,    # 中等投放時間
            conversion_rate_change=-5,  # 轉換率小幅下降
        )
        result = calculate_fatigue_score(input_data)

        assert 41 <= result.score <= 70
        assert result.status == FatigueStatus.WARNING

    def test_fatigued_creative(self):
        """疲勞素材的疲勞度應該在 71-100 分"""
        input_data = FatigueInput(
            ctr_change=-30,    # CTR 嚴重下降
            frequency=5.0,     # 高頻率
            days_active=45,    # 長投放時間
            conversion_rate_change=-25,  # 轉換率嚴重下降
        )
        result = calculate_fatigue_score(input_data)

        assert result.score >= 71
        assert result.status == FatigueStatus.FATIGUED

    def test_result_includes_breakdown(self):
        """結果應該包含各因子分數明細"""
        input_data = FatigueInput(
            ctr_change=-10,
            frequency=3.0,
            days_active=14,
            conversion_rate_change=-10,
        )
        result = calculate_fatigue_score(input_data)

        assert isinstance(result.breakdown, FatigueBreakdown)
        assert result.breakdown.ctr_score == 50
        assert result.breakdown.frequency_score == 50
        assert result.breakdown.days_score == 50
        assert result.breakdown.conversion_score == 50

    def test_weighted_calculation(self):
        """測試加權計算是否正確"""
        # 所有因子都是 50 分的情況
        input_data = FatigueInput(
            ctr_change=-10,       # 50 分
            frequency=3.0,        # 50 分
            days_active=14,       # 50 分
            conversion_rate_change=-10,  # 50 分
        )
        result = calculate_fatigue_score(input_data)

        # 50 * 0.4 + 50 * 0.3 + 50 * 0.2 + 50 * 0.1 = 50
        assert result.score == 50

    def test_weights_sum_to_one(self):
        """權重應該加總為 1"""
        total_weight = sum(FATIGUE_WEIGHTS.values())
        assert total_weight == pytest.approx(1.0, abs=0.001)

    def test_result_is_rounded(self):
        """結果應該是整數"""
        input_data = FatigueInput(
            ctr_change=-7,
            frequency=2.3,
            days_active=18,
            conversion_rate_change=-3,
        )
        result = calculate_fatigue_score(input_data)

        assert isinstance(result.score, int)


class TestFatigueThresholds:
    """疲勞門檻常數測試"""

    def test_healthy_threshold(self):
        """健康門檻應該是 40"""
        assert FATIGUE_THRESHOLDS["healthy"] == 40

    def test_warning_threshold(self):
        """警告門檻應該是 70"""
        assert FATIGUE_THRESHOLDS["warning"] == 70


class TestEdgeCases:
    """邊界情況測試"""

    def test_all_zero_input(self):
        """所有輸入為 0 的情況"""
        input_data = FatigueInput(
            ctr_change=0,
            frequency=0,
            days_active=0,
            conversion_rate_change=0,
        )
        result = calculate_fatigue_score(input_data)

        # ctr=25, freq=0, days=0, conv=25
        # 25*0.4 + 0*0.3 + 0*0.2 + 25*0.1 = 10 + 0 + 0 + 2.5 = 12.5 ≈ 12
        assert result.score == pytest.approx(12, abs=1)
        assert result.status == FatigueStatus.HEALTHY

    def test_all_maximum_input(self):
        """所有輸入都達到最大疲勞值的情況"""
        input_data = FatigueInput(
            ctr_change=-50,       # 100 分
            frequency=10.0,       # 100 分
            days_active=100,      # 100 分
            conversion_rate_change=-50,  # 100 分
        )
        result = calculate_fatigue_score(input_data)

        assert result.score == 100
        assert result.status == FatigueStatus.FATIGUED

    def test_negative_frequency_treated_as_zero(self):
        """負頻率應該被視為 0（或產生低分）"""
        # 函數目前沒有處理負數的特殊邏輯，但應該不會崩潰
        score = calculate_frequency_score(-1)
        assert score <= 25  # 應該返回低分

    def test_result_type_consistency(self):
        """結果類型一致性"""
        input_data = FatigueInput(
            ctr_change=-10,
            frequency=3.0,
            days_active=14,
            conversion_rate_change=-10,
        )
        result = calculate_fatigue_score(input_data)

        assert isinstance(result, FatigueResult)
        assert isinstance(result.score, int)
        assert isinstance(result.status, FatigueStatus)
        assert isinstance(result.breakdown, FatigueBreakdown)
