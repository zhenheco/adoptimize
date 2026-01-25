# -*- coding: utf-8 -*-
"""
一鍵執行與智慧建議限制器測試

測試驗收標準：
- AC-AL1: 訂閱層級的執行次數限制正確
- AC-AL2: 計數重置邏輯正確
- AC-AL3: 智慧建議限制正確
- AC-AL4: 功能權限判定正確
- AC-AL5: 建議內容過濾正確
"""

from datetime import date
from unittest.mock import patch

import pytest

from app.services.action_limiter import (
    SubscriptionTier,
    TierFeatures,
    ACTION_LIMITS,
    SUGGESTION_LIMITS,
    TIER_FEATURES,
    get_action_limit,
    get_suggestion_limit,
    get_tier_features,
    should_reset_count,
    get_next_reset_date,
    check_action_limit,
    increment_action_count,
    can_execute_action,
    get_tier_from_string,
    check_suggestion_limit,
    increment_suggestion_count,
    can_generate_suggestion,
    filter_suggestion_by_tier,
    can_execute_suggestion_action,
)


class TestGetActionLimit:
    """執行次數限制取得測試"""

    def test_starter_has_10_limit(self):
        """AC-AL1: Starter 層級應有 10 次限制"""
        limit = get_action_limit(SubscriptionTier.STARTER)
        assert limit == 10

    def test_professional_has_no_limit(self):
        """AC-AL1: Professional 層級應無限制"""
        limit = get_action_limit(SubscriptionTier.PROFESSIONAL)
        assert limit is None

    def test_agency_has_no_limit(self):
        """AC-AL1: Agency 層級應無限制"""
        limit = get_action_limit(SubscriptionTier.AGENCY)
        assert limit is None

    def test_enterprise_has_no_limit(self):
        """AC-AL1: Enterprise 層級應無限制"""
        limit = get_action_limit(SubscriptionTier.ENTERPRISE)
        assert limit is None


class TestShouldResetCount:
    """計數重置判定測試"""

    def test_should_reset_when_month_changed(self):
        """AC-AL2: 跨月應重置"""
        with patch("app.services.action_limiter.date") as mock_date:
            mock_date.today.return_value = date(2026, 2, 15)
            mock_date.side_effect = lambda *args, **kwargs: date(*args, **kwargs)

            # 上個月的日期應該觸發重置
            assert should_reset_count(date(2026, 1, 15)) is True

    def test_should_reset_when_year_changed(self):
        """AC-AL2: 跨年應重置"""
        with patch("app.services.action_limiter.date") as mock_date:
            mock_date.today.return_value = date(2026, 1, 15)
            mock_date.side_effect = lambda *args, **kwargs: date(*args, **kwargs)

            # 去年的日期應該觸發重置
            assert should_reset_count(date(2025, 12, 15)) is True

    def test_should_not_reset_same_month(self):
        """AC-AL2: 同月不應重置"""
        with patch("app.services.action_limiter.date") as mock_date:
            mock_date.today.return_value = date(2026, 1, 15)
            mock_date.side_effect = lambda *args, **kwargs: date(*args, **kwargs)

            # 同月的日期不應觸發重置
            assert should_reset_count(date(2026, 1, 1)) is False


class TestGetNextResetDate:
    """下次重置日期測試"""

    def test_next_reset_date_is_first_of_next_month(self):
        """AC-AL2: 下次重置日期應為下月 1 日"""
        with patch("app.services.action_limiter.date") as mock_date:
            mock_date.today.return_value = date(2026, 1, 15)
            mock_date.side_effect = lambda *args, **kwargs: date(*args, **kwargs)

            next_reset = get_next_reset_date()
            assert next_reset == date(2026, 2, 1)

    def test_december_rolls_over_to_next_year(self):
        """AC-AL2: 12 月應跨年到隔年 1 月"""
        with patch("app.services.action_limiter.date") as mock_date:
            mock_date.today.return_value = date(2025, 12, 15)
            mock_date.side_effect = lambda *args, **kwargs: date(*args, **kwargs)

            next_reset = get_next_reset_date()
            assert next_reset == date(2026, 1, 1)


class TestCheckActionLimit:
    """執行限制檢查測試"""

    def test_starter_can_execute_when_under_limit(self):
        """AC-AL1: Starter 在限制內應可執行"""
        result = check_action_limit(
            tier=SubscriptionTier.STARTER,
            current_count=5,
        )

        assert result.can_execute is True
        assert result.remaining_actions == 5
        assert result.limit == 10

    def test_starter_cannot_execute_when_at_limit(self):
        """AC-AL1: Starter 達到限制應無法執行"""
        result = check_action_limit(
            tier=SubscriptionTier.STARTER,
            current_count=10,
        )

        assert result.can_execute is False
        assert result.remaining_actions == 0

    def test_professional_always_can_execute(self):
        """AC-AL1: Professional 應總是可執行"""
        result = check_action_limit(
            tier=SubscriptionTier.PROFESSIONAL,
            current_count=1000,  # 即使很高的數字
        )

        assert result.can_execute is True
        assert result.remaining_actions is None
        assert result.limit is None

    def test_count_resets_when_month_changed(self):
        """AC-AL2: 跨月時計數應重置"""
        with patch("app.services.action_limiter.date") as mock_date:
            mock_date.today.return_value = date(2026, 2, 15)
            mock_date.side_effect = lambda *args, **kwargs: date(*args, **kwargs)

            # 上個月達到限制，但新月份應該重置
            result = check_action_limit(
                tier=SubscriptionTier.STARTER,
                current_count=10,
                count_reset_at=date(2026, 1, 1),
            )

            assert result.can_execute is True
            assert result.current_count == 0  # 已重置


class TestIncrementActionCount:
    """執行次數遞增測試"""

    def test_increment_count_normally(self):
        """AC-AL2: 正常遞增計數"""
        new_count, reset_date = increment_action_count(
            current_count=5,
            count_reset_at=date(2026, 1, 1),
        )

        assert new_count == 6

    def test_increment_resets_and_starts_at_one(self):
        """AC-AL2: 跨月時重置並從 1 開始"""
        with patch("app.services.action_limiter.date") as mock_date:
            mock_date.today.return_value = date(2026, 2, 15)
            mock_date.side_effect = lambda *args, **kwargs: date(*args, **kwargs)

            new_count, reset_date = increment_action_count(
                current_count=10,
                count_reset_at=date(2026, 1, 1),
            )

            assert new_count == 1
            assert reset_date == date(2026, 2, 15)


class TestCanExecuteAction:
    """簡化版執行檢查測試"""

    def test_accepts_string_tier(self):
        """AC-AL1: 應接受字串層級"""
        assert can_execute_action("starter", 5) is True
        assert can_execute_action("STARTER", 5) is True
        assert can_execute_action("Starter", 5) is True

    def test_unknown_tier_defaults_to_starter(self):
        """AC-AL1: 未知層級應預設為 Starter"""
        assert can_execute_action("unknown", 5) is True
        assert can_execute_action("unknown", 10) is False


class TestGetTierFromString:
    """字串轉換訂閱層級測試"""

    def test_converts_uppercase(self):
        """應能轉換大寫字串"""
        assert get_tier_from_string("STARTER") == SubscriptionTier.STARTER
        assert get_tier_from_string("PROFESSIONAL") == SubscriptionTier.PROFESSIONAL

    def test_converts_lowercase(self):
        """應能轉換小寫字串"""
        assert get_tier_from_string("starter") == SubscriptionTier.STARTER
        assert get_tier_from_string("professional") == SubscriptionTier.PROFESSIONAL

    def test_unknown_defaults_to_starter(self):
        """未知字串應預設為 Starter"""
        assert get_tier_from_string("unknown") == SubscriptionTier.STARTER
        assert get_tier_from_string("") == SubscriptionTier.STARTER


class TestGetSuggestionLimit:
    """智慧建議限制取得測試"""

    def test_starter_has_3_limit(self):
        """AC-AL3: Starter 應有 3 次限制"""
        limit = get_suggestion_limit(SubscriptionTier.STARTER)
        assert limit == 3

    def test_professional_has_5_limit(self):
        """AC-AL3: Professional 應有 5 次限制"""
        limit = get_suggestion_limit(SubscriptionTier.PROFESSIONAL)
        assert limit == 5

    def test_agency_has_no_limit(self):
        """AC-AL3: Agency 應無限制"""
        limit = get_suggestion_limit(SubscriptionTier.AGENCY)
        assert limit is None


class TestCheckSuggestionLimit:
    """智慧建議限制檢查測試"""

    def test_starter_can_generate_when_under_limit(self):
        """AC-AL3: Starter 在限制內應可生成"""
        result = check_suggestion_limit(
            tier=SubscriptionTier.STARTER,
            current_count=1,
        )

        assert result.can_generate is True
        assert result.remaining_suggestions == 2

    def test_starter_cannot_generate_at_limit(self):
        """AC-AL3: Starter 達到限制應無法生成"""
        result = check_suggestion_limit(
            tier=SubscriptionTier.STARTER,
            current_count=3,
        )

        assert result.can_generate is False
        assert result.remaining_suggestions == 0


class TestGetTierFeatures:
    """功能權限取得測試"""

    def test_starter_has_limited_features(self):
        """AC-AL4: Starter 應有限制的功能"""
        features = get_tier_features(SubscriptionTier.STARTER)

        assert features.can_view_full_report is False
        assert features.can_create_audience is False
        assert features.can_create_ad is False
        assert features.max_visible_interests == 2

    def test_professional_can_view_and_create_audience(self):
        """AC-AL4: Professional 應可查看完整報告和建立受眾"""
        features = get_tier_features(SubscriptionTier.PROFESSIONAL)

        assert features.can_view_full_report is True
        assert features.can_create_audience is True
        assert features.can_create_ad is False

    def test_agency_can_create_ad(self):
        """AC-AL4: Agency 應可建立廣告"""
        features = get_tier_features(SubscriptionTier.AGENCY)

        assert features.can_create_ad is True

    def test_enterprise_has_api_access(self):
        """AC-AL4: Enterprise 應有 API 存取權限"""
        features = get_tier_features(SubscriptionTier.ENTERPRISE)

        assert features.has_api_access is True


class TestFilterSuggestionByTier:
    """建議內容過濾測試"""

    def test_starter_sees_limited_interests(self):
        """AC-AL5: Starter 應只能看到有限的興趣標籤"""
        suggestion = {
            "suggested_interests": [
                {"name": "Interest 1", "reason": "Full reason 1"},
                {"name": "Interest 2", "reason": "Full reason 2"},
                {"name": "Interest 3", "reason": "Full reason 3"},
                {"name": "Interest 4", "reason": "Full reason 4"},
            ],
            "reasoning": "A" * 200,  # 長推薦理由
        }

        filtered = filter_suggestion_by_tier(suggestion, SubscriptionTier.STARTER)

        # 只能看 2 個興趣
        assert len(filtered["suggested_interests"]) == 2
        assert filtered["hidden_interests_count"] == 2

        # 推薦理由被截斷
        assert "[升級以查看完整分析]" in filtered["reasoning"]

    def test_professional_sees_full_content(self):
        """AC-AL5: Professional 應能看到完整內容"""
        suggestion = {
            "suggested_interests": [
                {"name": "Interest 1", "reason": "Full reason 1"},
                {"name": "Interest 2", "reason": "Full reason 2"},
            ],
            "reasoning": "Full reasoning",
        }

        filtered = filter_suggestion_by_tier(suggestion, SubscriptionTier.PROFESSIONAL)

        # 完整內容
        assert len(filtered["suggested_interests"]) == 2
        assert filtered["reasoning"] == "Full reasoning"
        assert filtered["can_view_full"] is True


class TestCanExecuteSuggestionAction:
    """建議操作權限測試"""

    def test_starter_cannot_create_audience(self):
        """AC-AL4: Starter 無法建立受眾"""
        can_do, message = can_execute_suggestion_action("starter", "create_audience")
        assert can_do is False
        assert "升級" in message

    def test_professional_can_create_audience(self):
        """AC-AL4: Professional 可建立受眾"""
        can_do, message = can_execute_suggestion_action("professional", "create_audience")
        assert can_do is True

    def test_professional_cannot_create_ad(self):
        """AC-AL4: Professional 無法建立廣告"""
        can_do, message = can_execute_suggestion_action("professional", "create_ad")
        assert can_do is False

    def test_agency_can_create_ad(self):
        """AC-AL4: Agency 可建立廣告"""
        can_do, message = can_execute_suggestion_action("agency", "create_ad")
        assert can_do is True


class TestActionLimitsConstants:
    """常數測試"""

    def test_action_limits_has_all_tiers(self):
        """所有層級都應有執行限制定義"""
        for tier in SubscriptionTier:
            assert tier in ACTION_LIMITS

    def test_suggestion_limits_has_all_tiers(self):
        """所有層級都應有建議限制定義"""
        for tier in SubscriptionTier:
            assert tier in SUGGESTION_LIMITS

    def test_tier_features_has_all_tiers(self):
        """所有層級都應有功能權限定義"""
        for tier in SubscriptionTier:
            assert tier in TIER_FEATURES
