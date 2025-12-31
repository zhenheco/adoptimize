/**
 * 健檢評分單元測試
 *
 * 遵循 TDD 原則，測試 specs/requirements.md 中定義的 5 維度評分系統
 */

import { describe, it, expect } from 'vitest';
import {
  calculateAuditScore,
  calculateDimensionScore,
  getAuditGrade,
  createIssue,
  AUDIT_WEIGHTS,
  AUDIT_GRADE_THRESHOLDS,
  STRUCTURE_ISSUES,
  CREATIVE_ISSUES,
  AUDIENCE_ISSUES,
  BUDGET_ISSUES,
  TRACKING_ISSUES,
} from '../utils/health-audit';

describe('Health Audit Calculation', () => {
  describe('AUDIT_WEIGHTS', () => {
    it('should have correct weights that sum to 1.0', () => {
      const sum =
        AUDIT_WEIGHTS.structure +
        AUDIT_WEIGHTS.creative +
        AUDIT_WEIGHTS.audience +
        AUDIT_WEIGHTS.budget +
        AUDIT_WEIGHTS.tracking;

      // 使用 toBeCloseTo 處理浮點數精度問題
      expect(sum).toBeCloseTo(1.0, 10);
    });

    it('should match specs: structure=20%, creative=25%, audience=25%, budget=20%, tracking=10%', () => {
      expect(AUDIT_WEIGHTS.structure).toBe(0.20);
      expect(AUDIT_WEIGHTS.creative).toBe(0.25);
      expect(AUDIT_WEIGHTS.audience).toBe(0.25);
      expect(AUDIT_WEIGHTS.budget).toBe(0.20);
      expect(AUDIT_WEIGHTS.tracking).toBe(0.10);
    });
  });

  describe('getAuditGrade', () => {
    it('should return "excellent" for scores 90-100', () => {
      expect(getAuditGrade(100)).toBe('excellent');
      expect(getAuditGrade(95)).toBe('excellent');
      expect(getAuditGrade(90)).toBe('excellent');
    });

    it('should return "good" for scores 70-89', () => {
      expect(getAuditGrade(89)).toBe('good');
      expect(getAuditGrade(80)).toBe('good');
      expect(getAuditGrade(70)).toBe('good');
    });

    it('should return "needs_improvement" for scores 50-69', () => {
      expect(getAuditGrade(69)).toBe('needs_improvement');
      expect(getAuditGrade(60)).toBe('needs_improvement');
      expect(getAuditGrade(50)).toBe('needs_improvement');
    });

    it('should return "critical" for scores 0-49', () => {
      expect(getAuditGrade(49)).toBe('critical');
      expect(getAuditGrade(25)).toBe('critical');
      expect(getAuditGrade(0)).toBe('critical');
    });
  });

  describe('calculateDimensionScore', () => {
    it('should return base score when no issues', () => {
      const result = calculateDimensionScore(
        { baseScore: 100, issues: [] },
        AUDIT_WEIGHTS.structure
      );

      expect(result.score).toBe(100);
      expect(result.issues).toBe(0);
      expect(result.deductions).toBe(0);
    });

    it('should deduct points for issues', () => {
      const poorNamingIssue = createIssue('POOR_NAMING', STRUCTURE_ISSUES.POOR_NAMING);

      const result = calculateDimensionScore(
        { baseScore: 100, issues: [poorNamingIssue] },
        AUDIT_WEIGHTS.structure
      );

      expect(result.score).toBe(95); // 100 - 5
      expect(result.issues).toBe(1);
      expect(result.deductions).toBe(5);
    });

    it('should accumulate deductions from multiple issues', () => {
      const issues = [
        createIssue('POOR_NAMING', STRUCTURE_ISSUES.POOR_NAMING), // -5
        createIssue('TOO_FEW_ADSETS', STRUCTURE_ISSUES.TOO_FEW_ADSETS), // -10
        createIssue('MISSING_CONVERSION_TRACKING', STRUCTURE_ISSUES.MISSING_CONVERSION_TRACKING), // -15
      ];

      const result = calculateDimensionScore(
        { baseScore: 100, issues },
        AUDIT_WEIGHTS.structure
      );

      expect(result.score).toBe(70); // 100 - 5 - 10 - 15
      expect(result.issues).toBe(3);
      expect(result.deductions).toBe(30);
    });

    it('should not go below 0', () => {
      const issues = [
        createIssue('NO_CONVERSION_TRACKING', TRACKING_ISSUES.NO_CONVERSION_TRACKING), // -20
        createIssue('PIXEL_NOT_FIRING', TRACKING_ISSUES.PIXEL_NOT_FIRING), // -18
        createIssue('INCOMPLETE_FUNNEL', TRACKING_ISSUES.INCOMPLETE_FUNNEL), // -10
        createIssue('MISSING_UTM', TRACKING_ISSUES.MISSING_UTM), // -8
      ];

      const result = calculateDimensionScore(
        { baseScore: 50, issues }, // 50 - 56 = -6 → 0
        AUDIT_WEIGHTS.tracking
      );

      expect(result.score).toBe(0);
      expect(result.deductions).toBe(56);
    });

    it('should include correct weight in result', () => {
      const result = calculateDimensionScore(
        { baseScore: 100, issues: [] },
        AUDIT_WEIGHTS.creative
      );

      expect(result.weight).toBe(0.25);
    });
  });

  describe('calculateAuditScore', () => {
    it('should return 100 with excellent grade when all dimensions are perfect', () => {
      const result = calculateAuditScore({
        structure: { baseScore: 100, issues: [] },
        creative: { baseScore: 100, issues: [] },
        audience: { baseScore: 100, issues: [] },
        budget: { baseScore: 100, issues: [] },
        tracking: { baseScore: 100, issues: [] },
      });

      expect(result.overallScore).toBe(100);
      expect(result.grade).toBe('excellent');
      expect(result.totalIssues).toBe(0);
    });

    it('should calculate weighted average correctly', () => {
      // 所有維度都是 80 分
      const result = calculateAuditScore({
        structure: { baseScore: 80, issues: [] },
        creative: { baseScore: 80, issues: [] },
        audience: { baseScore: 80, issues: [] },
        budget: { baseScore: 80, issues: [] },
        tracking: { baseScore: 80, issues: [] },
      });

      // 80 * 0.20 + 80 * 0.25 + 80 * 0.25 + 80 * 0.20 + 80 * 0.10 = 80
      expect(result.overallScore).toBe(80);
      expect(result.grade).toBe('good');
    });

    it('should apply correct weights to different dimension scores', () => {
      const result = calculateAuditScore({
        structure: { baseScore: 100, issues: [] }, // 100 * 0.20 = 20
        creative: { baseScore: 100, issues: [] },  // 100 * 0.25 = 25
        audience: { baseScore: 100, issues: [] },  // 100 * 0.25 = 25
        budget: { baseScore: 100, issues: [] },    // 100 * 0.20 = 20
        tracking: { baseScore: 0, issues: [] },    // 0 * 0.10 = 0
      });

      // 20 + 25 + 25 + 20 + 0 = 90
      expect(result.overallScore).toBe(90);
      expect(result.grade).toBe('excellent');
    });

    it('should deduct correctly across dimensions with issues', () => {
      const result = calculateAuditScore({
        structure: {
          baseScore: 100,
          issues: [createIssue('POOR_NAMING', STRUCTURE_ISSUES.POOR_NAMING)], // -5 → 95
        },
        creative: {
          baseScore: 100,
          issues: [createIssue('CREATIVE_FATIGUE', CREATIVE_ISSUES.CREATIVE_FATIGUE)], // -12 → 88
        },
        audience: {
          baseScore: 100,
          issues: [createIssue('HIGH_OVERLAP', AUDIENCE_ISSUES.HIGH_OVERLAP)], // -12 → 88
        },
        budget: {
          baseScore: 100,
          issues: [createIssue('LOW_SPEND_RATE', BUDGET_ISSUES.LOW_SPEND_RATE)], // -10 → 90
        },
        tracking: {
          baseScore: 100,
          issues: [createIssue('MISSING_UTM', TRACKING_ISSUES.MISSING_UTM)], // -8 → 92
        },
      });

      // 95 * 0.20 + 88 * 0.25 + 88 * 0.25 + 90 * 0.20 + 92 * 0.10
      // = 19 + 22 + 22 + 18 + 9.2 = 90.2 → 90
      expect(result.overallScore).toBe(90);
      expect(result.grade).toBe('excellent');
      expect(result.totalIssues).toBe(5);
    });

    it('should include all dimension details in result', () => {
      const result = calculateAuditScore({
        structure: { baseScore: 100, issues: [] },
        creative: { baseScore: 100, issues: [] },
        audience: { baseScore: 100, issues: [] },
        budget: { baseScore: 100, issues: [] },
        tracking: { baseScore: 100, issues: [] },
      });

      expect(result.dimensions).toHaveProperty('structure');
      expect(result.dimensions).toHaveProperty('creative');
      expect(result.dimensions).toHaveProperty('audience');
      expect(result.dimensions).toHaveProperty('budget');
      expect(result.dimensions).toHaveProperty('tracking');

      expect(result.dimensions.structure.weight).toBe(0.20);
      expect(result.dimensions.creative.weight).toBe(0.25);
      expect(result.dimensions.audience.weight).toBe(0.25);
      expect(result.dimensions.budget.weight).toBe(0.20);
      expect(result.dimensions.tracking.weight).toBe(0.10);
    });

    it('should return critical grade for severe issues', () => {
      // 模擬嚴重問題場景：每個維度都有大量嚴重問題
      const result = calculateAuditScore({
        structure: {
          baseScore: 100,
          issues: [
            createIssue('MISSING_CONVERSION_TRACKING', STRUCTURE_ISSUES.MISSING_CONVERSION_TRACKING), // -15
            createIssue('AUDIENCE_COMPETITION', STRUCTURE_ISSUES.AUDIENCE_COMPETITION), // -12
            createIssue('TOO_FEW_ADSETS', STRUCTURE_ISSUES.TOO_FEW_ADSETS), // -10
            createIssue('TOO_MANY_ADSETS', STRUCTURE_ISSUES.TOO_MANY_ADSETS), // -10
            createIssue('WRONG_ADS_PER_ADSET', STRUCTURE_ISSUES.WRONG_ADS_PER_ADSET), // -8
            createIssue('POOR_NAMING', STRUCTURE_ISSUES.POOR_NAMING), // -5
          ], // Total: -60 → 40 分
        },
        creative: {
          baseScore: 100,
          issues: [
            createIssue('CREATIVE_FATIGUE', CREATIVE_ISSUES.CREATIVE_FATIGUE), // -12
            createIssue('STALE_CREATIVE', CREATIVE_ISSUES.STALE_CREATIVE), // -10
            createIssue('LOW_VARIETY', CREATIVE_ISSUES.LOW_VARIETY), // -10
            createIssue('HIGH_FREQUENCY', CREATIVE_ISSUES.HIGH_FREQUENCY), // -8
            createIssue('TRUNCATED_COPY', CREATIVE_ISSUES.TRUNCATED_COPY), // -5
          ], // Total: -45 → 55 分
        },
        audience: {
          baseScore: 100,
          issues: [
            createIssue('NO_EXCLUSION', AUDIENCE_ISSUES.NO_EXCLUSION), // -15
            createIssue('HIGH_OVERLAP', AUDIENCE_ISSUES.HIGH_OVERLAP), // -12
            createIssue('STALE_AUDIENCE', AUDIENCE_ISSUES.STALE_AUDIENCE), // -10
            createIssue('SIZE_TOO_SMALL', AUDIENCE_ISSUES.SIZE_TOO_SMALL), // -10
            createIssue('POOR_LOOKALIKE_SOURCE', AUDIENCE_ISSUES.POOR_LOOKALIKE_SOURCE), // -8
          ], // Total: -55 → 45 分
        },
        budget: {
          baseScore: 100,
          issues: [
            createIssue('INEFFICIENT_ALLOCATION', BUDGET_ISSUES.INEFFICIENT_ALLOCATION), // -15
            createIssue('LEARNING_PHASE_BUDGET', BUDGET_ISSUES.LEARNING_PHASE_BUDGET), // -12
            createIssue('LOW_SPEND_RATE', BUDGET_ISSUES.LOW_SPEND_RATE), // -10
            createIssue('OVERSPEND', BUDGET_ISSUES.OVERSPEND), // -10
            createIssue('WRONG_BID_STRATEGY', BUDGET_ISSUES.WRONG_BID_STRATEGY), // -10
          ], // Total: -57 → 43 分
        },
        tracking: {
          baseScore: 100,
          issues: [
            createIssue('NO_CONVERSION_TRACKING', TRACKING_ISSUES.NO_CONVERSION_TRACKING), // -20
            createIssue('PIXEL_NOT_FIRING', TRACKING_ISSUES.PIXEL_NOT_FIRING), // -18
            createIssue('INCOMPLETE_FUNNEL', TRACKING_ISSUES.INCOMPLETE_FUNNEL), // -10
            createIssue('MISSING_UTM', TRACKING_ISSUES.MISSING_UTM), // -8
          ], // Total: -56 → 44 分
        },
      });

      // 40*0.20 + 55*0.25 + 45*0.25 + 43*0.20 + 44*0.10
      // = 8 + 13.75 + 11.25 + 8.6 + 4.4 = 46
      expect(result.overallScore).toBeLessThan(50);
      expect(result.grade).toBe('critical');
      expect(result.totalIssues).toBe(25);
    });
  });

  describe('Issue Definitions', () => {
    it('should have all structure issues defined', () => {
      expect(STRUCTURE_ISSUES).toHaveProperty('POOR_NAMING');
      expect(STRUCTURE_ISSUES).toHaveProperty('TOO_FEW_ADSETS');
      expect(STRUCTURE_ISSUES).toHaveProperty('TOO_MANY_ADSETS');
      expect(STRUCTURE_ISSUES).toHaveProperty('WRONG_ADS_PER_ADSET');
      expect(STRUCTURE_ISSUES).toHaveProperty('MISSING_CONVERSION_TRACKING');
      expect(STRUCTURE_ISSUES).toHaveProperty('AUDIENCE_COMPETITION');
    });

    it('should have all creative issues defined', () => {
      expect(CREATIVE_ISSUES).toHaveProperty('LOW_VARIETY');
      expect(CREATIVE_ISSUES).toHaveProperty('CREATIVE_FATIGUE');
      expect(CREATIVE_ISSUES).toHaveProperty('HIGH_FREQUENCY');
      expect(CREATIVE_ISSUES).toHaveProperty('STALE_CREATIVE');
      expect(CREATIVE_ISSUES).toHaveProperty('TRUNCATED_COPY');
    });

    it('should have all audience issues defined', () => {
      expect(AUDIENCE_ISSUES).toHaveProperty('SIZE_TOO_SMALL');
      expect(AUDIENCE_ISSUES).toHaveProperty('SIZE_TOO_LARGE');
      expect(AUDIENCE_ISSUES).toHaveProperty('HIGH_OVERLAP');
      expect(AUDIENCE_ISSUES).toHaveProperty('NO_EXCLUSION');
      expect(AUDIENCE_ISSUES).toHaveProperty('POOR_LOOKALIKE_SOURCE');
      expect(AUDIENCE_ISSUES).toHaveProperty('STALE_AUDIENCE');
    });

    it('should have all budget issues defined', () => {
      expect(BUDGET_ISSUES).toHaveProperty('INEFFICIENT_ALLOCATION');
      expect(BUDGET_ISSUES).toHaveProperty('LOW_SPEND_RATE');
      expect(BUDGET_ISSUES).toHaveProperty('OVERSPEND');
      expect(BUDGET_ISSUES).toHaveProperty('LEARNING_PHASE_BUDGET');
      expect(BUDGET_ISSUES).toHaveProperty('WRONG_BID_STRATEGY');
    });

    it('should have all tracking issues defined', () => {
      expect(TRACKING_ISSUES).toHaveProperty('NO_CONVERSION_TRACKING');
      expect(TRACKING_ISSUES).toHaveProperty('PIXEL_NOT_FIRING');
      expect(TRACKING_ISSUES).toHaveProperty('INCOMPLETE_FUNNEL');
      expect(TRACKING_ISSUES).toHaveProperty('MISSING_UTM');
    });

    it('should have correct deduction values per specs', () => {
      // 結構 issues
      expect(STRUCTURE_ISSUES.POOR_NAMING.deduction).toBe(5);
      expect(STRUCTURE_ISSUES.TOO_FEW_ADSETS.deduction).toBe(10);
      expect(STRUCTURE_ISSUES.MISSING_CONVERSION_TRACKING.deduction).toBe(15);

      // 素材 issues
      expect(CREATIVE_ISSUES.CREATIVE_FATIGUE.deduction).toBe(12);
      expect(CREATIVE_ISSUES.HIGH_FREQUENCY.deduction).toBe(8);

      // 受眾 issues
      expect(AUDIENCE_ISSUES.NO_EXCLUSION.deduction).toBe(15);
      expect(AUDIENCE_ISSUES.HIGH_OVERLAP.deduction).toBe(12);

      // 預算 issues
      expect(BUDGET_ISSUES.INEFFICIENT_ALLOCATION.deduction).toBe(15);
      expect(BUDGET_ISSUES.LEARNING_PHASE_BUDGET.deduction).toBe(12);

      // 追蹤 issues
      expect(TRACKING_ISSUES.NO_CONVERSION_TRACKING.deduction).toBe(20);
      expect(TRACKING_ISSUES.PIXEL_NOT_FIRING.deduction).toBe(18);
    });
  });

  describe('createIssue', () => {
    it('should create issue with code from definition', () => {
      const issue = createIssue('CREATIVE_FATIGUE', CREATIVE_ISSUES.CREATIVE_FATIGUE);

      expect(issue.code).toBe('CREATIVE_FATIGUE');
      expect(issue.category).toBe('CREATIVE');
      expect(issue.severity).toBe('HIGH');
      expect(issue.title).toBe('素材疲勞');
      expect(issue.deduction).toBe(12);
    });
  });
});
