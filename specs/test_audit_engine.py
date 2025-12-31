# -*- coding: utf-8 -*-
"""
帳戶健檢評分引擎測試

測試 audit_engine.py 中的所有計算函數
"""

import pytest
from app.services.audit_engine import (
    IssueSeverity,
    IssueCategory,
    AuditGrade,
    AuditIssue,
    DimensionScoreResult,
    AuditScoreResult,
    DimensionInput,
    AuditInput,
    AUDIT_WEIGHTS,
    AUDIT_GRADE_THRESHOLDS,
    STRUCTURE_ISSUES,
    CREATIVE_ISSUES,
    AUDIENCE_ISSUES,
    BUDGET_ISSUES,
    TRACKING_ISSUES,
    ALL_ISSUES,
    calculate_dimension_score,
    get_audit_grade,
    calculate_audit_score,
    get_issue_by_code,
    create_issue_with_entities,
)


class TestCalculateDimensionScore:
    """維度分數計算測試"""

    def test_no_issues_returns_full_score(self):
        """無問題時應該返回滿分"""
        result = calculate_dimension_score(100, [], 0.2)

        assert result.score == 100
        assert result.issues_count == 0
        assert result.deductions == 0
        assert result.weight == 0.2

    def test_single_issue_deduction(self):
        """單一問題應該正確扣分"""
        issue = STRUCTURE_ISSUES["POOR_NAMING"]  # 扣 5 分
        result = calculate_dimension_score(100, [issue], 0.2)

        assert result.score == 95
        assert result.issues_count == 1
        assert result.deductions == 5

    def test_multiple_issues_cumulative_deduction(self):
        """多個問題應該累計扣分"""
        issues = [
            STRUCTURE_ISSUES["POOR_NAMING"],      # -5
            STRUCTURE_ISSUES["TOO_FEW_ADSETS"],   # -10
        ]
        result = calculate_dimension_score(100, issues, 0.2)

        assert result.score == 85
        assert result.issues_count == 2
        assert result.deductions == 15

    def test_score_cannot_go_below_zero(self):
        """分數不能低於 0"""
        # 創建多個高扣分問題
        issues = [
            TRACKING_ISSUES["NO_CONVERSION_TRACKING"],  # -20
            TRACKING_ISSUES["PIXEL_NOT_FIRING"],        # -18
            AUDIENCE_ISSUES["NO_EXCLUSION"],            # -15
            BUDGET_ISSUES["INEFFICIENT_ALLOCATION"],    # -15
            CREATIVE_ISSUES["CREATIVE_FATIGUE"],        # -12
            AUDIENCE_ISSUES["HIGH_OVERLAP"],            # -12
        ]
        result = calculate_dimension_score(100, issues, 0.1)

        assert result.score == 0  # 不能為負數
        assert result.deductions == 92

    def test_custom_base_score(self):
        """自定義基礎分數"""
        result = calculate_dimension_score(80, [], 0.25)

        assert result.score == 80


class TestGetAuditGrade:
    """健檢等級判定測試"""

    def test_excellent_grade(self):
        """90-100 分應該為優秀等級"""
        assert get_audit_grade(90) == AuditGrade.EXCELLENT
        assert get_audit_grade(95) == AuditGrade.EXCELLENT
        assert get_audit_grade(100) == AuditGrade.EXCELLENT

    def test_good_grade(self):
        """70-89 分應該為良好等級"""
        assert get_audit_grade(70) == AuditGrade.GOOD
        assert get_audit_grade(80) == AuditGrade.GOOD
        assert get_audit_grade(89) == AuditGrade.GOOD

    def test_needs_improvement_grade(self):
        """50-69 分應該為需改善等級"""
        assert get_audit_grade(50) == AuditGrade.NEEDS_IMPROVEMENT
        assert get_audit_grade(60) == AuditGrade.NEEDS_IMPROVEMENT
        assert get_audit_grade(69) == AuditGrade.NEEDS_IMPROVEMENT

    def test_critical_grade(self):
        """0-49 分應該為危險等級"""
        assert get_audit_grade(0) == AuditGrade.CRITICAL
        assert get_audit_grade(25) == AuditGrade.CRITICAL
        assert get_audit_grade(49) == AuditGrade.CRITICAL


class TestCalculateAuditScore:
    """健檢總分計算測試"""

    def test_perfect_score(self):
        """完美帳戶應該得到 100 分"""
        audit_input = AuditInput()  # 所有維度預設為 100 分，無問題

        result = calculate_audit_score(audit_input)

        assert result.overall_score == 100
        assert result.grade == AuditGrade.EXCELLENT
        assert result.total_issues == 0

    def test_weighted_calculation(self):
        """加權計算應該正確"""
        # 設定各維度分數
        audit_input = AuditInput(
            structure=DimensionInput(base_score=80),
            creative=DimensionInput(base_score=80),
            audience=DimensionInput(base_score=80),
            budget=DimensionInput(base_score=80),
            tracking=DimensionInput(base_score=80),
        )

        result = calculate_audit_score(audit_input)

        # 所有維度都是 80 分，加權後應該是 80
        assert result.overall_score == 80
        assert result.grade == AuditGrade.GOOD

    def test_dimension_scores_included(self):
        """結果應該包含各維度分數"""
        audit_input = AuditInput()

        result = calculate_audit_score(audit_input)

        assert "structure" in result.dimensions
        assert "creative" in result.dimensions
        assert "audience" in result.dimensions
        assert "budget" in result.dimensions
        assert "tracking" in result.dimensions

        for dim_name, dim_score in result.dimensions.items():
            assert isinstance(dim_score, DimensionScoreResult)
            assert dim_score.score == 100

    def test_issues_aggregation(self):
        """問題應該正確彙總"""
        audit_input = AuditInput(
            structure=DimensionInput(issues=[STRUCTURE_ISSUES["POOR_NAMING"]]),
            creative=DimensionInput(issues=[CREATIVE_ISSUES["CREATIVE_FATIGUE"]]),
        )

        result = calculate_audit_score(audit_input)

        assert result.total_issues == 2
        assert len(result.issues) == 2

    def test_low_score_critical_grade(self):
        """低分應該得到危險等級"""
        # 添加很多問題導致低分
        audit_input = AuditInput(
            structure=DimensionInput(issues=[
                STRUCTURE_ISSUES["MISSING_CONVERSION_TRACKING"],  # -15
                STRUCTURE_ISSUES["AUDIENCE_COMPETITION"],  # -12
            ]),
            creative=DimensionInput(issues=[
                CREATIVE_ISSUES["CREATIVE_FATIGUE"],  # -12
                CREATIVE_ISSUES["STALE_CREATIVE"],    # -10
                CREATIVE_ISSUES["HIGH_FREQUENCY"],    # -8
            ]),
            audience=DimensionInput(issues=[
                AUDIENCE_ISSUES["NO_EXCLUSION"],      # -15
                AUDIENCE_ISSUES["HIGH_OVERLAP"],      # -12
            ]),
            budget=DimensionInput(issues=[
                BUDGET_ISSUES["INEFFICIENT_ALLOCATION"],  # -15
                BUDGET_ISSUES["LEARNING_PHASE_BUDGET"],   # -12
            ]),
            tracking=DimensionInput(issues=[
                TRACKING_ISSUES["NO_CONVERSION_TRACKING"],  # -20
            ]),
        )

        result = calculate_audit_score(audit_input)

        assert result.overall_score < 50
        assert result.grade == AuditGrade.CRITICAL


class TestPredefinedIssues:
    """預定義問題測試"""

    def test_structure_issues_exist(self):
        """結構問題應該存在"""
        expected_codes = [
            "POOR_NAMING",
            "TOO_FEW_ADSETS",
            "TOO_MANY_ADSETS",
            "WRONG_ADS_PER_ADSET",
            "MISSING_CONVERSION_TRACKING",
            "AUDIENCE_COMPETITION",
        ]
        for code in expected_codes:
            assert code in STRUCTURE_ISSUES

    def test_creative_issues_exist(self):
        """素材問題應該存在"""
        expected_codes = [
            "LOW_VARIETY",
            "CREATIVE_FATIGUE",
            "HIGH_FREQUENCY",
            "STALE_CREATIVE",
            "TRUNCATED_COPY",
        ]
        for code in expected_codes:
            assert code in CREATIVE_ISSUES

    def test_audience_issues_exist(self):
        """受眾問題應該存在"""
        expected_codes = [
            "SIZE_TOO_SMALL",
            "SIZE_TOO_LARGE",
            "HIGH_OVERLAP",
            "NO_EXCLUSION",
            "POOR_LOOKALIKE_SOURCE",
            "STALE_AUDIENCE",
        ]
        for code in expected_codes:
            assert code in AUDIENCE_ISSUES

    def test_budget_issues_exist(self):
        """預算問題應該存在"""
        expected_codes = [
            "INEFFICIENT_ALLOCATION",
            "LOW_SPEND_RATE",
            "OVERSPEND",
            "LEARNING_PHASE_BUDGET",
            "WRONG_BID_STRATEGY",
        ]
        for code in expected_codes:
            assert code in BUDGET_ISSUES

    def test_tracking_issues_exist(self):
        """追蹤問題應該存在"""
        expected_codes = [
            "NO_CONVERSION_TRACKING",
            "PIXEL_NOT_FIRING",
            "INCOMPLETE_FUNNEL",
            "MISSING_UTM",
        ]
        for code in expected_codes:
            assert code in TRACKING_ISSUES

    def test_all_issues_aggregated(self):
        """ALL_ISSUES 應該包含所有問題"""
        total_expected = (
            len(STRUCTURE_ISSUES)
            + len(CREATIVE_ISSUES)
            + len(AUDIENCE_ISSUES)
            + len(BUDGET_ISSUES)
            + len(TRACKING_ISSUES)
        )
        assert len(ALL_ISSUES) == total_expected

    def test_issue_has_required_fields(self):
        """問題應該有所有必要欄位"""
        issue = STRUCTURE_ISSUES["POOR_NAMING"]

        assert issue.code == "POOR_NAMING"
        assert issue.category == IssueCategory.STRUCTURE
        assert issue.severity in IssueSeverity
        assert issue.title != ""
        assert issue.description != ""
        assert issue.deduction > 0
        assert issue.impact_description != ""
        assert issue.solution != ""


class TestGetIssueByCode:
    """根據代碼取得問題測試"""

    def test_existing_issue(self):
        """存在的問題代碼應該返回問題"""
        issue = get_issue_by_code("CREATIVE_FATIGUE")

        assert issue is not None
        assert issue.code == "CREATIVE_FATIGUE"
        assert issue.category == IssueCategory.CREATIVE

    def test_nonexistent_issue(self):
        """不存在的問題代碼應該返回 None"""
        issue = get_issue_by_code("NONEXISTENT_ISSUE")

        assert issue is None


class TestCreateIssueWithEntities:
    """建立帶有受影響實體的問題測試"""

    def test_create_with_entities(self):
        """應該正確附加受影響實體"""
        entities = {"ids": ["creative_001", "creative_002"]}
        issue = create_issue_with_entities("CREATIVE_FATIGUE", entities)

        assert issue is not None
        assert issue.code == "CREATIVE_FATIGUE"
        assert issue.affected_entities == entities

    def test_create_without_entities(self):
        """無受影響實體時也應該正常建立"""
        issue = create_issue_with_entities("CREATIVE_FATIGUE")

        assert issue is not None
        assert issue.affected_entities is None

    def test_invalid_code_returns_none(self):
        """無效代碼應該返回 None"""
        issue = create_issue_with_entities("INVALID_CODE", {"ids": ["123"]})

        assert issue is None


class TestAuditWeights:
    """權重常數測試"""

    def test_weights_sum_to_one(self):
        """權重應該加總為 1"""
        total_weight = sum(AUDIT_WEIGHTS.values())
        assert total_weight == pytest.approx(1.0, abs=0.001)

    def test_structure_weight(self):
        """結構權重應該是 20%"""
        assert AUDIT_WEIGHTS["structure"] == 0.20

    def test_creative_weight(self):
        """素材權重應該是 25%"""
        assert AUDIT_WEIGHTS["creative"] == 0.25

    def test_audience_weight(self):
        """受眾權重應該是 25%"""
        assert AUDIT_WEIGHTS["audience"] == 0.25

    def test_budget_weight(self):
        """預算權重應該是 20%"""
        assert AUDIT_WEIGHTS["budget"] == 0.20

    def test_tracking_weight(self):
        """追蹤權重應該是 10%"""
        assert AUDIT_WEIGHTS["tracking"] == 0.10


class TestAuditGradeThresholds:
    """等級門檻測試"""

    def test_excellent_threshold(self):
        """優秀門檻應該是 90"""
        assert AUDIT_GRADE_THRESHOLDS["excellent"] == 90

    def test_good_threshold(self):
        """良好門檻應該是 70"""
        assert AUDIT_GRADE_THRESHOLDS["good"] == 70

    def test_needs_improvement_threshold(self):
        """需改善門檻應該是 50"""
        assert AUDIT_GRADE_THRESHOLDS["needs_improvement"] == 50


class TestIssueSeverityValues:
    """問題嚴重程度值測試"""

    def test_severity_values(self):
        """嚴重程度應該有正確的值"""
        assert IssueSeverity.CRITICAL.value == "CRITICAL"
        assert IssueSeverity.HIGH.value == "HIGH"
        assert IssueSeverity.MEDIUM.value == "MEDIUM"
        assert IssueSeverity.LOW.value == "LOW"


class TestIssueCategoryValues:
    """問題類別值測試"""

    def test_category_values(self):
        """類別應該有正確的值"""
        assert IssueCategory.STRUCTURE.value == "STRUCTURE"
        assert IssueCategory.CREATIVE.value == "CREATIVE"
        assert IssueCategory.AUDIENCE.value == "AUDIENCE"
        assert IssueCategory.BUDGET.value == "BUDGET"
        assert IssueCategory.TRACKING.value == "TRACKING"


class TestAuditGradeValues:
    """健檢等級值測試"""

    def test_grade_values(self):
        """等級應該有正確的值"""
        assert AuditGrade.EXCELLENT.value == "excellent"
        assert AuditGrade.GOOD.value == "good"
        assert AuditGrade.NEEDS_IMPROVEMENT.value == "needs_improvement"
        assert AuditGrade.CRITICAL.value == "critical"


class TestEdgeCases:
    """邊界情況測試"""

    def test_empty_audit_input(self):
        """空輸入應該返回完美分數"""
        audit_input = AuditInput()
        result = calculate_audit_score(audit_input)

        assert result.overall_score == 100
        assert result.grade == AuditGrade.EXCELLENT

    def test_result_is_rounded(self):
        """結果應該是整數"""
        # 創造一個會產生小數的情況
        audit_input = AuditInput(
            structure=DimensionInput(issues=[STRUCTURE_ISSUES["POOR_NAMING"]]),  # 95
        )
        result = calculate_audit_score(audit_input)

        assert isinstance(result.overall_score, int)
