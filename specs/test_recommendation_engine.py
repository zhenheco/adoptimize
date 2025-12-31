# -*- coding: utf-8 -*-
"""
建議生成引擎測試

測試 recommendation_engine.py 中的所有函數
"""

import pytest
from app.services.recommendation_engine import (
    ActionDifficulty,
    ActionModule,
    RecommendationStatus,
    ActionParams,
    Recommendation,
    SEVERITY_BASE_SCORES,
    DIFFICULTY_SCORES,
    MAX_IMPACT_SCORE,
    ENTITY_SCORE,
    calculate_priority_score,
    get_action_module_for_issue,
    get_difficulty_for_action,
    estimate_impact,
    create_recommendation_from_issue,
    generate_recommendations_from_issues,
    filter_recommendations,
)
from app.services.audit_engine import (
    IssueSeverity,
    IssueCategory,
    AuditIssue,
    CREATIVE_ISSUES,
    AUDIENCE_ISSUES,
    BUDGET_ISSUES,
    STRUCTURE_ISSUES,
    TRACKING_ISSUES,
)


class TestCalculatePriorityScore:
    """優先級分數計算測試"""

    def test_critical_severity_base_score(self):
        """CRITICAL 嚴重度基礎分應該是 100"""
        score = calculate_priority_score(
            severity=IssueSeverity.CRITICAL,
            estimated_impact=0,
            difficulty=ActionDifficulty.COMPLEX,  # 0 分
            affected_entities_count=0,
        )
        assert score == 100

    def test_high_severity_base_score(self):
        """HIGH 嚴重度基礎分應該是 70"""
        score = calculate_priority_score(
            severity=IssueSeverity.HIGH,
            estimated_impact=0,
            difficulty=ActionDifficulty.COMPLEX,
            affected_entities_count=0,
        )
        assert score == 70

    def test_medium_severity_base_score(self):
        """MEDIUM 嚴重度基礎分應該是 40"""
        score = calculate_priority_score(
            severity=IssueSeverity.MEDIUM,
            estimated_impact=0,
            difficulty=ActionDifficulty.COMPLEX,
            affected_entities_count=0,
        )
        assert score == 40

    def test_low_severity_base_score(self):
        """LOW 嚴重度基礎分應該是 20"""
        score = calculate_priority_score(
            severity=IssueSeverity.LOW,
            estimated_impact=0,
            difficulty=ActionDifficulty.COMPLEX,
            affected_entities_count=0,
        )
        assert score == 20

    def test_impact_score_calculation(self):
        """金額影響分應該是 impact / 100"""
        # 300 元影響 = 3 分
        score = calculate_priority_score(
            severity=IssueSeverity.LOW,  # 20
            estimated_impact=300,         # 3
            difficulty=ActionDifficulty.COMPLEX,  # 0
            affected_entities_count=0,    # 0
        )
        assert score == 23  # 20 + 3 + 0 + 0

    def test_impact_score_capped_at_max(self):
        """金額影響分應該最高 50"""
        # 10000 元影響 = 100，但應該被限制在 50
        score = calculate_priority_score(
            severity=IssueSeverity.LOW,  # 20
            estimated_impact=10000,       # 50 (capped)
            difficulty=ActionDifficulty.COMPLEX,  # 0
            affected_entities_count=0,
        )
        assert score == 70  # 20 + 50 + 0 + 0

    def test_difficulty_scores(self):
        """修復難度分應該正確"""
        base_severity = IssueSeverity.LOW  # 20

        # 一鍵 = 30
        one_click = calculate_priority_score(
            base_severity, 0, ActionDifficulty.ONE_CLICK, 0
        )
        assert one_click == 50  # 20 + 0 + 30 + 0

        # 簡單 = 20
        simple = calculate_priority_score(
            base_severity, 0, ActionDifficulty.SIMPLE, 0
        )
        assert simple == 40

        # 中等 = 10
        medium = calculate_priority_score(
            base_severity, 0, ActionDifficulty.MEDIUM, 0
        )
        assert medium == 30

        # 複雜 = 0
        complex_score = calculate_priority_score(
            base_severity, 0, ActionDifficulty.COMPLEX, 0
        )
        assert complex_score == 20

    def test_entity_scope_score(self):
        """影響範圍分應該是每個實體 5 分"""
        score = calculate_priority_score(
            severity=IssueSeverity.LOW,  # 20
            estimated_impact=0,
            difficulty=ActionDifficulty.COMPLEX,  # 0
            affected_entities_count=5,  # 25
        )
        assert score == 45  # 20 + 0 + 0 + 25

    def test_combined_calculation(self):
        """綜合計算應該正確"""
        # 範例：HIGH(70) + 300影響(3) + ONE_CLICK(30) + 5實體(25) = 128
        score = calculate_priority_score(
            severity=IssueSeverity.HIGH,
            estimated_impact=300,
            difficulty=ActionDifficulty.ONE_CLICK,
            affected_entities_count=5,
        )
        assert score == 128


class TestGetActionModuleForIssue:
    """問題對應執行模組測試"""

    def test_creative_fatigue_uses_pause(self):
        """素材疲勞問題應該使用暫停素材模組"""
        issue = CREATIVE_ISSUES["CREATIVE_FATIGUE"]
        module = get_action_module_for_issue(issue)
        assert module == ActionModule.PAUSE_CREATIVE

    def test_high_frequency_uses_pause(self):
        """高頻率問題應該使用暫停素材模組"""
        issue = CREATIVE_ISSUES["HIGH_FREQUENCY"]
        module = get_action_module_for_issue(issue)
        assert module == ActionModule.PAUSE_CREATIVE

    def test_stale_creative_uses_pause(self):
        """過時素材問題應該使用暫停素材模組"""
        issue = CREATIVE_ISSUES["STALE_CREATIVE"]
        module = get_action_module_for_issue(issue)
        assert module == ActionModule.PAUSE_CREATIVE

    def test_high_overlap_uses_exclusion(self):
        """高重疊問題應該使用新增排除模組"""
        issue = AUDIENCE_ISSUES["HIGH_OVERLAP"]
        module = get_action_module_for_issue(issue)
        assert module == ActionModule.ADD_EXCLUSION

    def test_no_exclusion_uses_exclusion(self):
        """無排除問題應該使用新增排除模組"""
        issue = AUDIENCE_ISSUES["NO_EXCLUSION"]
        module = get_action_module_for_issue(issue)
        assert module == ActionModule.ADD_EXCLUSION

    def test_size_issues_use_update(self):
        """規模問題應該使用更新受眾模組"""
        issue = AUDIENCE_ISSUES["SIZE_TOO_SMALL"]
        module = get_action_module_for_issue(issue)
        assert module == ActionModule.UPDATE_AUDIENCE

        issue = AUDIENCE_ISSUES["SIZE_TOO_LARGE"]
        module = get_action_module_for_issue(issue)
        assert module == ActionModule.UPDATE_AUDIENCE

    def test_budget_issues_use_adjust(self):
        """預算問題應該使用調整預算模組"""
        issue = BUDGET_ISSUES["INEFFICIENT_ALLOCATION"]
        module = get_action_module_for_issue(issue)
        assert module == ActionModule.ADJUST_BUDGET

    def test_adset_issues_use_pause_adset(self):
        """廣告組問題應該使用暫停廣告組模組"""
        issue = STRUCTURE_ISSUES["TOO_MANY_ADSETS"]
        module = get_action_module_for_issue(issue)
        assert module == ActionModule.PAUSE_ADSET

    def test_unknown_issue_uses_manual(self):
        """未知問題應該使用手動修復模組"""
        issue = TRACKING_ISSUES["MISSING_UTM"]  # 需要手動設定 UTM
        module = get_action_module_for_issue(issue)
        assert module == ActionModule.MANUAL_FIX


class TestGetDifficultyForAction:
    """執行模組對應修復難度測試"""

    def test_pause_actions_are_one_click(self):
        """暫停操作應該是一鍵"""
        assert get_difficulty_for_action(ActionModule.PAUSE_CREATIVE) == ActionDifficulty.ONE_CLICK
        assert get_difficulty_for_action(ActionModule.ENABLE_CREATIVE) == ActionDifficulty.ONE_CLICK
        assert get_difficulty_for_action(ActionModule.PAUSE_CAMPAIGN) == ActionDifficulty.ONE_CLICK
        assert get_difficulty_for_action(ActionModule.ENABLE_CAMPAIGN) == ActionDifficulty.ONE_CLICK
        assert get_difficulty_for_action(ActionModule.PAUSE_ADSET) == ActionDifficulty.ONE_CLICK
        assert get_difficulty_for_action(ActionModule.ENABLE_ADSET) == ActionDifficulty.ONE_CLICK

    def test_exclusion_is_simple(self):
        """新增排除應該是簡單"""
        assert get_difficulty_for_action(ActionModule.ADD_EXCLUSION) == ActionDifficulty.SIMPLE

    def test_adjust_budget_is_medium(self):
        """調整預算應該是中等"""
        assert get_difficulty_for_action(ActionModule.ADJUST_BUDGET) == ActionDifficulty.MEDIUM

    def test_update_audience_is_medium(self):
        """更新受眾應該是中等"""
        assert get_difficulty_for_action(ActionModule.UPDATE_AUDIENCE) == ActionDifficulty.MEDIUM

    def test_manual_fix_is_complex(self):
        """手動修復應該是複雜"""
        assert get_difficulty_for_action(ActionModule.MANUAL_FIX) == ActionDifficulty.COMPLEX


class TestEstimateImpact:
    """影響估算測試"""

    def test_critical_severity_impact(self):
        """CRITICAL 嚴重度應該有 30% 影響"""
        issue = AuditIssue(
            code="TEST",
            category=IssueCategory.TRACKING,
            severity=IssueSeverity.CRITICAL,
            title="Test",
            description="Test",
            deduction=20,
        )
        impact = estimate_impact(issue, 1000)
        assert impact == 300  # 30% of 1000

    def test_high_severity_impact(self):
        """HIGH 嚴重度應該有 20% 影響"""
        issue = CREATIVE_ISSUES["CREATIVE_FATIGUE"]  # HIGH severity
        impact = estimate_impact(issue, 1000)
        assert impact == 200  # 20% of 1000

    def test_medium_severity_impact(self):
        """MEDIUM 嚴重度應該有 10% 影響"""
        issue = CREATIVE_ISSUES["LOW_VARIETY"]  # MEDIUM severity
        impact = estimate_impact(issue, 1000)
        assert impact == 100  # 10% of 1000

    def test_low_severity_impact(self):
        """LOW 嚴重度應該有 5% 影響"""
        issue = STRUCTURE_ISSUES["POOR_NAMING"]  # LOW severity
        impact = estimate_impact(issue, 1000)
        assert impact == 50  # 5% of 1000

    def test_zero_spend_returns_zero(self):
        """花費為 0 時影響應該為 0"""
        issue = CREATIVE_ISSUES["CREATIVE_FATIGUE"]
        impact = estimate_impact(issue, 0)
        assert impact == 0


class TestCreateRecommendationFromIssue:
    """從問題建立建議測試"""

    def test_creates_recommendation_with_correct_fields(self):
        """應該建立包含正確欄位的建議"""
        issue = CREATIVE_ISSUES["CREATIVE_FATIGUE"]
        rec = create_recommendation_from_issue(
            issue=issue,
            spend=1000,
            affected_entities=["creative_001", "creative_002"],
        )

        assert rec.issue == issue
        assert rec.title == f"處理: {issue.title}"
        assert rec.description == issue.solution
        assert rec.action_module == ActionModule.PAUSE_CREATIVE
        assert rec.difficulty == ActionDifficulty.ONE_CLICK
        assert rec.estimated_impact == 200  # 20% of 1000
        assert rec.status == RecommendationStatus.PENDING

    def test_priority_score_calculated(self):
        """應該計算優先級分數"""
        issue = CREATIVE_ISSUES["CREATIVE_FATIGUE"]  # HIGH severity
        rec = create_recommendation_from_issue(
            issue=issue,
            spend=1000,
            affected_entities=["creative_001"],
        )

        # HIGH(70) + 200影響(2) + ONE_CLICK(30) + 1實體(5) = 107
        assert rec.priority_score == 107

    def test_action_params_populated(self):
        """應該填充執行參數"""
        issue = CREATIVE_ISSUES["CREATIVE_FATIGUE"]
        entities = ["creative_001", "creative_002"]
        rec = create_recommendation_from_issue(
            issue=issue,
            spend=1000,
            affected_entities=entities,
        )

        assert rec.action_params.target_type == IssueCategory.CREATIVE.value
        assert rec.action_params.target_id == "creative_001"
        assert rec.action_params.action == ActionModule.PAUSE_CREATIVE.value
        assert rec.action_params.params["affected_entities"] == entities

    def test_no_entities_handled(self):
        """無受影響實體時應該正常處理"""
        issue = CREATIVE_ISSUES["CREATIVE_FATIGUE"]
        rec = create_recommendation_from_issue(
            issue=issue,
            spend=1000,
        )

        assert rec.action_params.target_id == ""
        assert rec.priority_score < 107  # 少了實體分數

    def test_generates_unique_id(self):
        """應該生成唯一 ID"""
        issue = CREATIVE_ISSUES["CREATIVE_FATIGUE"]
        rec1 = create_recommendation_from_issue(issue)
        rec2 = create_recommendation_from_issue(issue)

        assert rec1.id != rec2.id


class TestGenerateRecommendationsFromIssues:
    """批次生成建議測試"""

    def test_generates_recommendations_for_all_issues(self):
        """應該為所有問題生成建議"""
        issues = [
            CREATIVE_ISSUES["CREATIVE_FATIGUE"],
            AUDIENCE_ISSUES["HIGH_OVERLAP"],
            BUDGET_ISSUES["INEFFICIENT_ALLOCATION"],
        ]
        recs = generate_recommendations_from_issues(issues)

        assert len(recs) == 3

    def test_sorted_by_priority(self):
        """應該按優先級排序（高到低）"""
        issues = [
            STRUCTURE_ISSUES["POOR_NAMING"],       # LOW
            CREATIVE_ISSUES["CREATIVE_FATIGUE"],   # HIGH
            TRACKING_ISSUES["NO_CONVERSION_TRACKING"],  # CRITICAL
        ]
        recs = generate_recommendations_from_issues(issues)

        # 驗證按分數降序排列
        assert recs[0].issue.severity == IssueSeverity.CRITICAL
        assert recs[-1].issue.severity == IssueSeverity.LOW

    def test_uses_spend_by_entity(self):
        """應該使用實體花費資訊"""
        issue = CREATIVE_ISSUES["CREATIVE_FATIGUE"]
        issue_with_entities = AuditIssue(
            code=issue.code,
            category=issue.category,
            severity=issue.severity,
            title=issue.title,
            description=issue.description,
            deduction=issue.deduction,
            affected_entities={"ids": ["creative_001"]},
        )

        spend_map = {"creative_001": 1000}
        recs = generate_recommendations_from_issues([issue_with_entities], spend_map)

        assert recs[0].estimated_impact == 200  # 20% of 1000

    def test_empty_issues_returns_empty(self):
        """空問題列表應該返回空列表"""
        recs = generate_recommendations_from_issues([])
        assert len(recs) == 0


class TestFilterRecommendations:
    """篩選建議測試"""

    def test_filter_by_status(self):
        """應該能按狀態篩選"""
        issue = CREATIVE_ISSUES["CREATIVE_FATIGUE"]
        rec1 = create_recommendation_from_issue(issue)
        rec2 = create_recommendation_from_issue(issue)
        # 修改一個建議的狀態
        rec2_executed = Recommendation(
            id=rec2.id,
            issue=rec2.issue,
            priority_score=rec2.priority_score,
            title=rec2.title,
            description=rec2.description,
            action_module=rec2.action_module,
            action_params=rec2.action_params,
            difficulty=rec2.difficulty,
            estimated_impact=rec2.estimated_impact,
            status=RecommendationStatus.EXECUTED,
        )

        all_recs = [rec1, rec2_executed]
        pending = filter_recommendations(all_recs, status=RecommendationStatus.PENDING)
        executed = filter_recommendations(all_recs, status=RecommendationStatus.EXECUTED)

        assert len(pending) == 1
        assert len(executed) == 1

    def test_filter_by_min_priority(self):
        """應該能按最低優先級篩選"""
        issues = [
            STRUCTURE_ISSUES["POOR_NAMING"],       # LOW = 低分
            TRACKING_ISSUES["NO_CONVERSION_TRACKING"],  # CRITICAL = 高分
        ]
        recs = generate_recommendations_from_issues(issues)

        # 篩選分數 >= 100 的建議
        high_priority = filter_recommendations(recs, min_priority=100)

        assert len(high_priority) == 1
        assert high_priority[0].issue.severity == IssueSeverity.CRITICAL

    def test_filter_by_max_count(self):
        """應該能限制返回數量"""
        issues = [
            CREATIVE_ISSUES["CREATIVE_FATIGUE"],
            CREATIVE_ISSUES["HIGH_FREQUENCY"],
            CREATIVE_ISSUES["STALE_CREATIVE"],
        ]
        recs = generate_recommendations_from_issues(issues)

        limited = filter_recommendations(recs, max_count=2)

        assert len(limited) == 2

    def test_combined_filters(self):
        """應該能組合多個篩選條件"""
        issues = [
            STRUCTURE_ISSUES["POOR_NAMING"],
            CREATIVE_ISSUES["CREATIVE_FATIGUE"],
            TRACKING_ISSUES["NO_CONVERSION_TRACKING"],
        ]
        recs = generate_recommendations_from_issues(issues)

        # 只取分數 >= 50，最多 1 個
        filtered = filter_recommendations(recs, min_priority=50, max_count=1)

        assert len(filtered) == 1


class TestConstantsAndEnums:
    """常數和枚舉測試"""

    def test_severity_base_scores(self):
        """嚴重度基礎分應該正確"""
        assert SEVERITY_BASE_SCORES[IssueSeverity.CRITICAL] == 100
        assert SEVERITY_BASE_SCORES[IssueSeverity.HIGH] == 70
        assert SEVERITY_BASE_SCORES[IssueSeverity.MEDIUM] == 40
        assert SEVERITY_BASE_SCORES[IssueSeverity.LOW] == 20

    def test_difficulty_scores(self):
        """難度分數應該正確"""
        assert DIFFICULTY_SCORES[ActionDifficulty.ONE_CLICK] == 30
        assert DIFFICULTY_SCORES[ActionDifficulty.SIMPLE] == 20
        assert DIFFICULTY_SCORES[ActionDifficulty.MEDIUM] == 10
        assert DIFFICULTY_SCORES[ActionDifficulty.COMPLEX] == 0

    def test_max_impact_score(self):
        """最大影響分應該是 50"""
        assert MAX_IMPACT_SCORE == 50

    def test_entity_score(self):
        """每實體分數應該是 5"""
        assert ENTITY_SCORE == 5

    def test_action_difficulty_values(self):
        """修復難度枚舉值應該正確"""
        assert ActionDifficulty.ONE_CLICK.value == "one_click"
        assert ActionDifficulty.SIMPLE.value == "simple"
        assert ActionDifficulty.MEDIUM.value == "medium"
        assert ActionDifficulty.COMPLEX.value == "complex"

    def test_action_module_values(self):
        """執行模組枚舉值應該正確"""
        assert ActionModule.PAUSE_CREATIVE.value == "pause_creative"
        assert ActionModule.ENABLE_CREATIVE.value == "enable_creative"
        assert ActionModule.ADJUST_BUDGET.value == "adjust_budget"
        assert ActionModule.MANUAL_FIX.value == "manual_fix"

    def test_recommendation_status_values(self):
        """建議狀態枚舉值應該正確"""
        assert RecommendationStatus.PENDING.value == "pending"
        assert RecommendationStatus.EXECUTED.value == "executed"
        assert RecommendationStatus.IGNORED.value == "ignored"
