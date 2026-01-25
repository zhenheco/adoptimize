# -*- coding: utf-8 -*-
"""
健檢評分引擎測試

測試驗收標準：
- AC-AE1: 計算維度分數正確（扣分邏輯）
- AC-AE2: 計算加權總分正確
- AC-AE3: 健檢等級判定正確
- AC-AE4: 問題代碼查詢正確
- AC-AE5: 帶受影響實體的問題建立正確
"""

import pytest

from app.services.audit_engine import (
    AuditGrade,
    AuditInput,
    AuditIssue,
    DimensionInput,
    DimensionScoreResult,
    IssueCategory,
    IssueSeverity,
    AUDIT_WEIGHTS,
    STRUCTURE_ISSUES,
    CREATIVE_ISSUES,
    AUDIENCE_ISSUES,
    BUDGET_ISSUES,
    TRACKING_ISSUES,
    calculate_dimension_score,
    calculate_audit_score,
    get_audit_grade,
    get_issue_by_code,
    create_issue_with_entities,
)


class TestCalculateDimensionScore:
    """維度分數計算測試"""

    def test_full_score_with_no_issues(self):
        """AC-AE1: 無問題時應得滿分"""
        result = calculate_dimension_score(
            base_score=100,
            issues=[],
            weight=0.20,
        )

        assert result.score == 100
        assert result.issues_count == 0
        assert result.deductions == 0
        assert result.weight == 0.20

    def test_deduction_with_single_issue(self):
        """AC-AE1: 單一問題應正確扣分"""
        issue = STRUCTURE_ISSUES["POOR_NAMING"]  # deduction=5
        result = calculate_dimension_score(
            base_score=100,
            issues=[issue],
            weight=0.20,
        )

        assert result.score == 95
        assert result.issues_count == 1
        assert result.deductions == 5

    def test_deduction_with_multiple_issues(self):
        """AC-AE1: 多個問題應累計扣分"""
        issues = [
            STRUCTURE_ISSUES["POOR_NAMING"],  # deduction=5
            STRUCTURE_ISSUES["TOO_FEW_ADSETS"],  # deduction=10
        ]
        result = calculate_dimension_score(
            base_score=100,
            issues=issues,
            weight=0.20,
        )

        assert result.score == 85
        assert result.issues_count == 2
        assert result.deductions == 15

    def test_score_cannot_go_below_zero(self):
        """AC-AE1: 分數不應低於 0"""
        # 建立多個高扣分問題
        issues = [
            TRACKING_ISSUES["NO_CONVERSION_TRACKING"],  # deduction=20
            TRACKING_ISSUES["PIXEL_NOT_FIRING"],  # deduction=18
            TRACKING_ISSUES["INCOMPLETE_FUNNEL"],  # deduction=10
            BUDGET_ISSUES["INEFFICIENT_ALLOCATION"],  # deduction=15
            BUDGET_ISSUES["LEARNING_PHASE_BUDGET"],  # deduction=12
            AUDIENCE_ISSUES["NO_EXCLUSION"],  # deduction=15
            CREATIVE_ISSUES["CREATIVE_FATIGUE"],  # deduction=12
        ]  # Total: 102

        result = calculate_dimension_score(
            base_score=100,
            issues=issues,
            weight=0.20,
        )

        assert result.score == 0
        assert result.deductions == 102


class TestGetAuditGrade:
    """健檢等級判定測試"""

    def test_excellent_grade(self):
        """AC-AE3: 90-100 分應為優秀等級"""
        assert get_audit_grade(100) == AuditGrade.EXCELLENT
        assert get_audit_grade(95) == AuditGrade.EXCELLENT
        assert get_audit_grade(90) == AuditGrade.EXCELLENT

    def test_good_grade(self):
        """AC-AE3: 70-89 分應為良好等級"""
        assert get_audit_grade(89) == AuditGrade.GOOD
        assert get_audit_grade(75) == AuditGrade.GOOD
        assert get_audit_grade(70) == AuditGrade.GOOD

    def test_needs_improvement_grade(self):
        """AC-AE3: 50-69 分應為需改善等級"""
        assert get_audit_grade(69) == AuditGrade.NEEDS_IMPROVEMENT
        assert get_audit_grade(60) == AuditGrade.NEEDS_IMPROVEMENT
        assert get_audit_grade(50) == AuditGrade.NEEDS_IMPROVEMENT

    def test_critical_grade(self):
        """AC-AE3: 0-49 分應為危險等級"""
        assert get_audit_grade(49) == AuditGrade.CRITICAL
        assert get_audit_grade(25) == AuditGrade.CRITICAL
        assert get_audit_grade(0) == AuditGrade.CRITICAL


class TestCalculateAuditScore:
    """健檢總分計算測試"""

    def test_perfect_score_with_no_issues(self):
        """AC-AE2: 無問題時應得 100 分"""
        audit_input = AuditInput(
            structure=DimensionInput(base_score=100, issues=[]),
            creative=DimensionInput(base_score=100, issues=[]),
            audience=DimensionInput(base_score=100, issues=[]),
            budget=DimensionInput(base_score=100, issues=[]),
            tracking=DimensionInput(base_score=100, issues=[]),
        )
        result = calculate_audit_score(audit_input)

        assert result.overall_score == 100
        assert result.grade == AuditGrade.EXCELLENT
        assert result.total_issues == 0

    def test_weighted_score_calculation(self):
        """AC-AE2: 加權計算應正確"""
        # 只在結構維度扣 5 分 (POOR_NAMING)
        audit_input = AuditInput(
            structure=DimensionInput(
                base_score=100,
                issues=[STRUCTURE_ISSUES["POOR_NAMING"]],  # score=95, weight=0.20
            ),
            creative=DimensionInput(base_score=100, issues=[]),  # score=100, weight=0.25
            audience=DimensionInput(base_score=100, issues=[]),  # score=100, weight=0.25
            budget=DimensionInput(base_score=100, issues=[]),  # score=100, weight=0.20
            tracking=DimensionInput(base_score=100, issues=[]),  # score=100, weight=0.10
        )
        result = calculate_audit_score(audit_input)

        # 95*0.20 + 100*0.25 + 100*0.25 + 100*0.20 + 100*0.10 = 19 + 25 + 25 + 20 + 10 = 99
        assert result.overall_score == 99
        assert result.grade == AuditGrade.EXCELLENT

    def test_multiple_dimension_issues(self):
        """AC-AE2: 多維度問題應正確計算"""
        audit_input = AuditInput(
            structure=DimensionInput(
                base_score=100,
                issues=[STRUCTURE_ISSUES["TOO_FEW_ADSETS"]],  # score=90, weight=0.20
            ),
            creative=DimensionInput(
                base_score=100,
                issues=[CREATIVE_ISSUES["CREATIVE_FATIGUE"]],  # score=88, weight=0.25
            ),
            audience=DimensionInput(
                base_score=100,
                issues=[AUDIENCE_ISSUES["HIGH_OVERLAP"]],  # score=88, weight=0.25
            ),
            budget=DimensionInput(base_score=100, issues=[]),  # score=100, weight=0.20
            tracking=DimensionInput(base_score=100, issues=[]),  # score=100, weight=0.10
        )
        result = calculate_audit_score(audit_input)

        # 90*0.20 + 88*0.25 + 88*0.25 + 100*0.20 + 100*0.10 = 18 + 22 + 22 + 20 + 10 = 92
        assert result.overall_score == 92
        assert result.grade == AuditGrade.EXCELLENT
        assert result.total_issues == 3

    def test_critical_issues_result_in_low_score(self):
        """AC-AE2: 嚴重問題應大幅降低分數"""
        audit_input = AuditInput(
            structure=DimensionInput(
                base_score=100,
                issues=[
                    STRUCTURE_ISSUES["MISSING_CONVERSION_TRACKING"],  # -15
                    STRUCTURE_ISSUES["AUDIENCE_COMPETITION"],  # -12
                ],
            ),  # score=73
            creative=DimensionInput(
                base_score=100,
                issues=[CREATIVE_ISSUES["LOW_VARIETY"]],  # -10
            ),  # score=90
            audience=DimensionInput(
                base_score=100,
                issues=[AUDIENCE_ISSUES["NO_EXCLUSION"]],  # -15
            ),  # score=85
            budget=DimensionInput(
                base_score=100,
                issues=[BUDGET_ISSUES["INEFFICIENT_ALLOCATION"]],  # -15
            ),  # score=85
            tracking=DimensionInput(
                base_score=100,
                issues=[TRACKING_ISSUES["NO_CONVERSION_TRACKING"]],  # -20
            ),  # score=80
        )
        result = calculate_audit_score(audit_input)

        # 73*0.20 + 90*0.25 + 85*0.25 + 85*0.20 + 80*0.10 = 14.6 + 22.5 + 21.25 + 17 + 8 = 83.35 ≈ 83
        assert result.overall_score == 83
        assert result.grade == AuditGrade.GOOD
        assert result.total_issues == 6

    def test_issues_are_collected(self):
        """AC-AE2: 所有問題應被收集"""
        issue1 = STRUCTURE_ISSUES["POOR_NAMING"]
        issue2 = CREATIVE_ISSUES["LOW_VARIETY"]

        audit_input = AuditInput(
            structure=DimensionInput(base_score=100, issues=[issue1]),
            creative=DimensionInput(base_score=100, issues=[issue2]),
            audience=DimensionInput(),
            budget=DimensionInput(),
            tracking=DimensionInput(),
        )
        result = calculate_audit_score(audit_input)

        assert len(result.issues) == 2
        assert issue1 in result.issues
        assert issue2 in result.issues


class TestGetIssueByCode:
    """問題代碼查詢測試"""

    def test_get_structure_issue(self):
        """AC-AE4: 應能取得結構問題"""
        issue = get_issue_by_code("POOR_NAMING")
        assert issue is not None
        assert issue.category == IssueCategory.STRUCTURE

    def test_get_creative_issue(self):
        """AC-AE4: 應能取得素材問題"""
        issue = get_issue_by_code("CREATIVE_FATIGUE")
        assert issue is not None
        assert issue.category == IssueCategory.CREATIVE

    def test_get_audience_issue(self):
        """AC-AE4: 應能取得受眾問題"""
        issue = get_issue_by_code("HIGH_OVERLAP")
        assert issue is not None
        assert issue.category == IssueCategory.AUDIENCE

    def test_get_budget_issue(self):
        """AC-AE4: 應能取得預算問題"""
        issue = get_issue_by_code("INEFFICIENT_ALLOCATION")
        assert issue is not None
        assert issue.category == IssueCategory.BUDGET

    def test_get_tracking_issue(self):
        """AC-AE4: 應能取得追蹤問題"""
        issue = get_issue_by_code("NO_CONVERSION_TRACKING")
        assert issue is not None
        assert issue.category == IssueCategory.TRACKING

    def test_unknown_code_returns_none(self):
        """AC-AE4: 未知代碼應返回 None"""
        issue = get_issue_by_code("UNKNOWN_ISSUE_CODE")
        assert issue is None


class TestCreateIssueWithEntities:
    """帶受影響實體的問題建立測試"""

    def test_create_issue_with_entities(self):
        """AC-AE5: 應能建立帶有受影響實體的問題"""
        entities = {
            "campaigns": ["campaign_123", "campaign_456"],
            "adsets": ["adset_789"],
        }
        issue = create_issue_with_entities("POOR_NAMING", entities)

        assert issue is not None
        assert issue.code == "POOR_NAMING"
        assert issue.affected_entities == entities

    def test_create_issue_preserves_original_attributes(self):
        """AC-AE5: 建立的問題應保留原有屬性"""
        original = STRUCTURE_ISSUES["TOO_FEW_ADSETS"]
        entities = {"campaigns": ["campaign_1"]}

        issue = create_issue_with_entities("TOO_FEW_ADSETS", entities)

        assert issue is not None
        assert issue.title == original.title
        assert issue.description == original.description
        assert issue.deduction == original.deduction
        assert issue.severity == original.severity
        assert issue.solution == original.solution

    def test_create_issue_with_unknown_code_returns_none(self):
        """AC-AE5: 未知代碼應返回 None"""
        entities = {"campaigns": ["campaign_1"]}
        issue = create_issue_with_entities("UNKNOWN_CODE", entities)
        assert issue is None


class TestAuditWeights:
    """權重設定測試"""

    def test_weights_sum_to_one(self):
        """權重總和應為 1"""
        total = sum(AUDIT_WEIGHTS.values())
        assert abs(total - 1.0) < 0.0001  # 允許浮點誤差

    def test_all_dimensions_have_weights(self):
        """所有維度應有權重"""
        expected_dimensions = ["structure", "creative", "audience", "budget", "tracking"]
        for dim in expected_dimensions:
            assert dim in AUDIT_WEIGHTS


class TestPredefinedIssues:
    """預定義問題測試"""

    def test_all_structure_issues_have_required_fields(self):
        """結構問題應有所有必要欄位"""
        for code, issue in STRUCTURE_ISSUES.items():
            assert issue.code == code
            assert issue.category == IssueCategory.STRUCTURE
            assert issue.title
            assert issue.description
            assert issue.deduction > 0

    def test_all_creative_issues_have_required_fields(self):
        """素材問題應有所有必要欄位"""
        for code, issue in CREATIVE_ISSUES.items():
            assert issue.code == code
            assert issue.category == IssueCategory.CREATIVE
            assert issue.title
            assert issue.description
            assert issue.deduction > 0

    def test_all_tracking_issues_have_required_fields(self):
        """追蹤問題應有所有必要欄位"""
        for code, issue in TRACKING_ISSUES.items():
            assert issue.code == code
            assert issue.category == IssueCategory.TRACKING
            assert issue.title
            assert issue.description
            assert issue.deduction > 0
