# -*- coding: utf-8 -*-
"""
建議生成引擎測試

測試驗收標準：
- AC-RE1: 優先級分數計算正確
- AC-RE2: 問題到執行模組的映射正確
- AC-RE3: 執行模組到難度的映射正確
- AC-RE4: 影響金額估算正確
- AC-RE5: 建議生成正確包含所有屬性
- AC-RE6: 建議篩選功能正確
"""

import pytest

from app.services.audit_engine import (
    AuditIssue,
    IssueCategory,
    IssueSeverity,
    CREATIVE_ISSUES,
    AUDIENCE_ISSUES,
    BUDGET_ISSUES,
    STRUCTURE_ISSUES,
)
from app.services.recommendation_engine import (
    ActionDifficulty,
    ActionModule,
    RecommendationStatus,
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


class TestCalculatePriorityScore:
    """優先級分數計算測試"""

    def test_base_score_calculation(self):
        """AC-RE1: 基礎分數計算"""
        # 只有嚴重度分數
        score = calculate_priority_score(
            severity=IssueSeverity.HIGH,
            estimated_impact=0,
            difficulty=ActionDifficulty.COMPLEX,  # 0 分
            affected_entities_count=0,
        )

        assert score == 70  # HIGH 基礎分

    def test_impact_score_calculation(self):
        """AC-RE1: 金額影響分計算"""
        score = calculate_priority_score(
            severity=IssueSeverity.LOW,  # 20 分
            estimated_impact=3000,  # 30 分 (3000/100, capped at 50)
            difficulty=ActionDifficulty.COMPLEX,
            affected_entities_count=0,
        )

        assert score == 50  # 20 + 30

    def test_impact_score_capped_at_maximum(self):
        """AC-RE1: 金額影響分應有上限"""
        score = calculate_priority_score(
            severity=IssueSeverity.LOW,  # 20 分
            estimated_impact=10000,  # 應被限制在 50 分
            difficulty=ActionDifficulty.COMPLEX,
            affected_entities_count=0,
        )

        assert score == 70  # 20 + 50 (capped)

    def test_difficulty_score_calculation(self):
        """AC-RE1: 修復難度分計算"""
        # 一鍵操作
        score_one_click = calculate_priority_score(
            severity=IssueSeverity.LOW,
            estimated_impact=0,
            difficulty=ActionDifficulty.ONE_CLICK,  # 30 分
            affected_entities_count=0,
        )
        assert score_one_click == 50  # 20 + 30

        # 複雜操作
        score_complex = calculate_priority_score(
            severity=IssueSeverity.LOW,
            estimated_impact=0,
            difficulty=ActionDifficulty.COMPLEX,  # 0 分
            affected_entities_count=0,
        )
        assert score_complex == 20  # 20 + 0

    def test_entity_scope_score_calculation(self):
        """AC-RE1: 影響範圍分計算"""
        score = calculate_priority_score(
            severity=IssueSeverity.LOW,  # 20 分
            estimated_impact=0,
            difficulty=ActionDifficulty.COMPLEX,  # 0 分
            affected_entities_count=10,  # 50 分
        )

        assert score == 70  # 20 + 50

    def test_full_score_calculation(self):
        """AC-RE1: 完整分數計算"""
        score = calculate_priority_score(
            severity=IssueSeverity.HIGH,  # 70 分
            estimated_impact=300,  # 3 分
            difficulty=ActionDifficulty.ONE_CLICK,  # 30 分
            affected_entities_count=5,  # 25 分
        )

        assert score == 128  # 70 + 3 + 30 + 25

    def test_critical_severity_gives_highest_base_score(self):
        """AC-RE1: CRITICAL 嚴重度應有最高基礎分"""
        score_critical = calculate_priority_score(
            severity=IssueSeverity.CRITICAL,
            estimated_impact=0,
            difficulty=ActionDifficulty.COMPLEX,
            affected_entities_count=0,
        )

        score_high = calculate_priority_score(
            severity=IssueSeverity.HIGH,
            estimated_impact=0,
            difficulty=ActionDifficulty.COMPLEX,
            affected_entities_count=0,
        )

        assert score_critical > score_high
        assert score_critical == 100


class TestGetActionModuleForIssue:
    """問題到執行模組映射測試"""

    def test_creative_fatigue_maps_to_pause_creative(self):
        """AC-RE2: 素材疲勞應映射到暫停素材"""
        issue = CREATIVE_ISSUES["CREATIVE_FATIGUE"]
        module = get_action_module_for_issue(issue)
        assert module == ActionModule.PAUSE_CREATIVE

    def test_high_overlap_maps_to_add_exclusion(self):
        """AC-RE2: 受眾重疊應映射到新增排除"""
        issue = AUDIENCE_ISSUES["HIGH_OVERLAP"]
        module = get_action_module_for_issue(issue)
        assert module == ActionModule.ADD_EXCLUSION

    def test_no_exclusion_maps_to_add_exclusion(self):
        """AC-RE2: 未排除已購買者應映射到新增排除"""
        issue = AUDIENCE_ISSUES["NO_EXCLUSION"]
        module = get_action_module_for_issue(issue)
        assert module == ActionModule.ADD_EXCLUSION

    def test_size_issues_map_to_update_audience(self):
        """AC-RE2: 受眾規模問題應映射到更新受眾"""
        issue = AUDIENCE_ISSUES["SIZE_TOO_SMALL"]
        module = get_action_module_for_issue(issue)
        assert module == ActionModule.UPDATE_AUDIENCE

    def test_budget_issues_map_to_adjust_budget(self):
        """AC-RE2: 預算問題應映射到調整預算"""
        issue = BUDGET_ISSUES["INEFFICIENT_ALLOCATION"]
        module = get_action_module_for_issue(issue)
        assert module == ActionModule.ADJUST_BUDGET

    def test_too_many_adsets_maps_to_pause_adset(self):
        """AC-RE2: 廣告組過多應映射到暫停廣告組"""
        issue = STRUCTURE_ISSUES["TOO_MANY_ADSETS"]
        module = get_action_module_for_issue(issue)
        assert module == ActionModule.PAUSE_ADSET

    def test_unknown_issue_maps_to_manual_fix(self):
        """AC-RE2: 未知問題應映射到手動修復"""
        issue = AuditIssue(
            code="UNKNOWN_ISSUE",
            category=IssueCategory.STRUCTURE,
            severity=IssueSeverity.LOW,
            title="Unknown Issue",
            description="Test",
            deduction=5,
        )
        module = get_action_module_for_issue(issue)
        assert module == ActionModule.MANUAL_FIX


class TestGetDifficultyForAction:
    """執行模組到難度映射測試"""

    def test_pause_operations_are_one_click(self):
        """AC-RE3: 暫停操作應為一鍵"""
        assert get_difficulty_for_action(ActionModule.PAUSE_CREATIVE) == ActionDifficulty.ONE_CLICK
        assert get_difficulty_for_action(ActionModule.PAUSE_CAMPAIGN) == ActionDifficulty.ONE_CLICK
        assert get_difficulty_for_action(ActionModule.PAUSE_ADSET) == ActionDifficulty.ONE_CLICK

    def test_enable_operations_are_one_click(self):
        """AC-RE3: 啟用操作應為一鍵"""
        assert get_difficulty_for_action(ActionModule.ENABLE_CREATIVE) == ActionDifficulty.ONE_CLICK
        assert get_difficulty_for_action(ActionModule.ENABLE_CAMPAIGN) == ActionDifficulty.ONE_CLICK
        assert get_difficulty_for_action(ActionModule.ENABLE_ADSET) == ActionDifficulty.ONE_CLICK

    def test_add_exclusion_is_simple(self):
        """AC-RE3: 新增排除應為簡單"""
        assert get_difficulty_for_action(ActionModule.ADD_EXCLUSION) == ActionDifficulty.SIMPLE

    def test_adjust_budget_is_medium(self):
        """AC-RE3: 調整預算應為中等"""
        assert get_difficulty_for_action(ActionModule.ADJUST_BUDGET) == ActionDifficulty.MEDIUM

    def test_update_audience_is_medium(self):
        """AC-RE3: 更新受眾應為中等"""
        assert get_difficulty_for_action(ActionModule.UPDATE_AUDIENCE) == ActionDifficulty.MEDIUM

    def test_manual_fix_is_complex(self):
        """AC-RE3: 手動修復應為複雜"""
        assert get_difficulty_for_action(ActionModule.MANUAL_FIX) == ActionDifficulty.COMPLEX


class TestEstimateImpact:
    """影響金額估算測試"""

    def test_critical_issue_has_30_percent_impact(self):
        """AC-RE4: CRITICAL 問題應有 30% 影響"""
        issue = AuditIssue(
            code="TEST",
            category=IssueCategory.TRACKING,
            severity=IssueSeverity.CRITICAL,
            title="Test",
            description="Test",
            deduction=20,
        )
        impact = estimate_impact(issue, spend=1000)
        assert impact == 300  # 30%

    def test_high_issue_has_20_percent_impact(self):
        """AC-RE4: HIGH 問題應有 20% 影響"""
        issue = AuditIssue(
            code="TEST",
            category=IssueCategory.CREATIVE,
            severity=IssueSeverity.HIGH,
            title="Test",
            description="Test",
            deduction=12,
        )
        impact = estimate_impact(issue, spend=1000)
        assert impact == 200  # 20%

    def test_medium_issue_has_10_percent_impact(self):
        """AC-RE4: MEDIUM 問題應有 10% 影響"""
        issue = AuditIssue(
            code="TEST",
            category=IssueCategory.AUDIENCE,
            severity=IssueSeverity.MEDIUM,
            title="Test",
            description="Test",
            deduction=10,
        )
        impact = estimate_impact(issue, spend=1000)
        assert impact == 100  # 10%

    def test_low_issue_has_5_percent_impact(self):
        """AC-RE4: LOW 問題應有 5% 影響"""
        issue = AuditIssue(
            code="TEST",
            category=IssueCategory.STRUCTURE,
            severity=IssueSeverity.LOW,
            title="Test",
            description="Test",
            deduction=5,
        )
        impact = estimate_impact(issue, spend=1000)
        assert impact == 50  # 5%

    def test_zero_spend_gives_zero_impact(self):
        """AC-RE4: 零花費應返回零影響"""
        issue = CREATIVE_ISSUES["CREATIVE_FATIGUE"]
        impact = estimate_impact(issue, spend=0)
        assert impact == 0


class TestCreateRecommendationFromIssue:
    """建議生成測試"""

    def test_recommendation_has_all_required_fields(self):
        """AC-RE5: 建議應包含所有必要欄位"""
        issue = CREATIVE_ISSUES["CREATIVE_FATIGUE"]
        rec = create_recommendation_from_issue(
            issue=issue,
            spend=1000,
            affected_entities=["creative_001"],
        )

        assert rec.id  # 有 ID
        assert rec.issue == issue
        assert rec.priority_score > 0
        assert rec.title
        assert rec.description
        assert rec.action_module == ActionModule.PAUSE_CREATIVE
        assert rec.difficulty == ActionDifficulty.ONE_CLICK
        assert rec.estimated_impact == 200  # HIGH: 20% of 1000
        assert rec.status == RecommendationStatus.PENDING

    def test_recommendation_includes_affected_entities(self):
        """AC-RE5: 建議應包含受影響實體"""
        issue = AUDIENCE_ISSUES["HIGH_OVERLAP"]
        entities = ["audience_001", "audience_002"]
        rec = create_recommendation_from_issue(
            issue=issue,
            spend=500,
            affected_entities=entities,
        )

        assert rec.action_params.params["affected_entities"] == entities
        assert rec.action_params.target_id == "audience_001"

    def test_recommendation_priority_score_calculation(self):
        """AC-RE5: 建議優先級分數計算正確"""
        issue = CREATIVE_ISSUES["CREATIVE_FATIGUE"]  # HIGH severity
        rec = create_recommendation_from_issue(
            issue=issue,
            spend=1000,  # impact = 200 -> score = 2
            affected_entities=["creative_001", "creative_002"],  # 2 entities -> 10
        )

        # HIGH=70 + impact=2 + ONE_CLICK=30 + entities=10 = 112
        assert rec.priority_score == 112


class TestGenerateRecommendationsFromIssues:
    """建議批量生成測試"""

    def test_generates_recommendations_for_all_issues(self):
        """AC-RE5: 應為所有問題生成建議"""
        issues = [
            CREATIVE_ISSUES["CREATIVE_FATIGUE"],
            AUDIENCE_ISSUES["HIGH_OVERLAP"],
            BUDGET_ISSUES["INEFFICIENT_ALLOCATION"],
        ]

        recs = generate_recommendations_from_issues(issues)

        assert len(recs) == 3

    def test_recommendations_sorted_by_priority(self):
        """AC-RE5: 建議應按優先級排序"""
        issues = [
            STRUCTURE_ISSUES["POOR_NAMING"],  # LOW severity
            CREATIVE_ISSUES["CREATIVE_FATIGUE"],  # HIGH severity
        ]

        recs = generate_recommendations_from_issues(issues)

        # HIGH severity 應在前面
        assert recs[0].issue.severity == IssueSeverity.HIGH
        assert recs[1].issue.severity == IssueSeverity.LOW


class TestFilterRecommendations:
    """建議篩選測試"""

    def test_filter_by_status(self):
        """AC-RE6: 應能按狀態篩選"""
        issue = CREATIVE_ISSUES["CREATIVE_FATIGUE"]
        rec1 = create_recommendation_from_issue(issue, 100, [])
        rec2 = create_recommendation_from_issue(issue, 100, [])
        rec2.status = RecommendationStatus.EXECUTED

        recs = [rec1, rec2]
        filtered = filter_recommendations(recs, status=RecommendationStatus.PENDING)

        assert len(filtered) == 1
        assert filtered[0].status == RecommendationStatus.PENDING

    def test_filter_by_min_priority(self):
        """AC-RE6: 應能按最低優先級篩選"""
        issue1 = CREATIVE_ISSUES["CREATIVE_FATIGUE"]  # HIGH
        issue2 = STRUCTURE_ISSUES["POOR_NAMING"]  # LOW

        rec1 = create_recommendation_from_issue(issue1, 0, [])  # Higher score
        rec2 = create_recommendation_from_issue(issue2, 0, [])  # Lower score

        recs = [rec1, rec2]
        filtered = filter_recommendations(recs, min_priority=50)

        # Only HIGH severity should pass
        assert len(filtered) == 1
        assert filtered[0].issue.severity == IssueSeverity.HIGH

    def test_filter_by_max_count(self):
        """AC-RE6: 應能限制返回數量"""
        issue = CREATIVE_ISSUES["CREATIVE_FATIGUE"]
        recs = [create_recommendation_from_issue(issue, 100, []) for _ in range(5)]

        filtered = filter_recommendations(recs, max_count=3)

        assert len(filtered) == 3

    def test_combined_filters(self):
        """AC-RE6: 組合篩選應正確運作"""
        issue = CREATIVE_ISSUES["CREATIVE_FATIGUE"]
        recs = []
        for i in range(5):
            rec = create_recommendation_from_issue(issue, 100, [])
            if i % 2 == 0:
                rec.status = RecommendationStatus.EXECUTED
            recs.append(rec)

        # 只要 PENDING 且最多 2 個
        filtered = filter_recommendations(
            recs,
            status=RecommendationStatus.PENDING,
            max_count=2,
        )

        assert len(filtered) == 2
        for rec in filtered:
            assert rec.status == RecommendationStatus.PENDING


class TestConstants:
    """常數測試"""

    def test_severity_scores_are_descending(self):
        """嚴重度分數應按嚴重程度遞減"""
        assert SEVERITY_BASE_SCORES[IssueSeverity.CRITICAL] > SEVERITY_BASE_SCORES[IssueSeverity.HIGH]
        assert SEVERITY_BASE_SCORES[IssueSeverity.HIGH] > SEVERITY_BASE_SCORES[IssueSeverity.MEDIUM]
        assert SEVERITY_BASE_SCORES[IssueSeverity.MEDIUM] > SEVERITY_BASE_SCORES[IssueSeverity.LOW]

    def test_difficulty_scores_favor_easier_actions(self):
        """難度分數應鼓勵較易操作"""
        assert DIFFICULTY_SCORES[ActionDifficulty.ONE_CLICK] > DIFFICULTY_SCORES[ActionDifficulty.SIMPLE]
        assert DIFFICULTY_SCORES[ActionDifficulty.SIMPLE] > DIFFICULTY_SCORES[ActionDifficulty.MEDIUM]
        assert DIFFICULTY_SCORES[ActionDifficulty.MEDIUM] > DIFFICULTY_SCORES[ActionDifficulty.COMPLEX]

    def test_max_impact_score_is_reasonable(self):
        """金額影響分上限應合理"""
        assert MAX_IMPACT_SCORE == 50

    def test_entity_score_is_positive(self):
        """實體分數應為正數"""
        assert ENTITY_SCORE > 0
