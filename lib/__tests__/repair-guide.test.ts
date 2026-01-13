/**
 * Repair Guide Tests
 *
 * Tests for the step-by-step repair guide utilities
 * H-006: Step-by-step repair guide
 */

import { describe, it, expect } from 'vitest';
import {
  getRepairSteps,
  calculateRepairProgress,
  areAllStepsComplete,
  type RepairStep,
  type IssueCategory,
} from '../utils/repair-guide';

describe('repair-guide', () => {
  describe('getRepairSteps', () => {
    it('should return steps for CREATIVE_FATIGUE issue', () => {
      const steps = getRepairSteps('CREATIVE_FATIGUE', 'CREATIVE');
      expect(steps).toBeInstanceOf(Array);
      expect(steps.length).toBeGreaterThan(0);
      expect(steps[0]).toHaveProperty('id');
      expect(steps[0]).toHaveProperty('title');
      expect(steps[0]).toHaveProperty('description');
      expect(steps[0]).toHaveProperty('estimatedMinutes');
    });

    it('should return steps for AUDIENCE_OVERLAP issue', () => {
      const steps = getRepairSteps('AUDIENCE_OVERLAP', 'AUDIENCE');
      expect(steps).toBeInstanceOf(Array);
      expect(steps.length).toBeGreaterThan(0);
    });

    it('should return steps for BUDGET_INEFFICIENT issue', () => {
      const steps = getRepairSteps('BUDGET_INEFFICIENT', 'BUDGET');
      expect(steps).toBeInstanceOf(Array);
      expect(steps.length).toBeGreaterThan(0);
    });

    it('should return steps for TRACKING_MISSING issue', () => {
      const steps = getRepairSteps('TRACKING_MISSING', 'TRACKING');
      expect(steps).toBeInstanceOf(Array);
      expect(steps.length).toBeGreaterThan(0);
    });

    it('should return steps for STRUCTURE_NAMING issue', () => {
      const steps = getRepairSteps('STRUCTURE_NAMING', 'STRUCTURE');
      expect(steps).toBeInstanceOf(Array);
      expect(steps.length).toBeGreaterThan(0);
    });

    it('should return generic steps for unknown issue code', () => {
      const steps = getRepairSteps('UNKNOWN_ISSUE', 'CREATIVE');
      expect(steps).toBeInstanceOf(Array);
      expect(steps.length).toBe(3); // Generic steps
    });

    it('should include step order starting from 1', () => {
      const steps = getRepairSteps('CREATIVE_FATIGUE', 'CREATIVE');
      expect(steps[0].order).toBe(1);
      if (steps.length > 1) {
        expect(steps[1].order).toBe(2);
      }
    });

    it('should include estimated time for each step', () => {
      const steps = getRepairSteps('CREATIVE_FATIGUE', 'CREATIVE');
      steps.forEach((step) => {
        expect(step.estimatedMinutes).toBeGreaterThan(0);
        expect(step.estimatedMinutes).toBeLessThanOrEqual(30);
      });
    });
  });

  describe('calculateRepairProgress', () => {
    it('should return 0 for no completed steps', () => {
      const steps: RepairStep[] = [
        { id: '1', order: 1, title: 'Step 1', description: 'Desc', estimatedMinutes: 5, isCompleted: false },
        { id: '2', order: 2, title: 'Step 2', description: 'Desc', estimatedMinutes: 5, isCompleted: false },
      ];
      expect(calculateRepairProgress(steps)).toBe(0);
    });

    it('should return 50 for half completed steps', () => {
      const steps: RepairStep[] = [
        { id: '1', order: 1, title: 'Step 1', description: 'Desc', estimatedMinutes: 5, isCompleted: true },
        { id: '2', order: 2, title: 'Step 2', description: 'Desc', estimatedMinutes: 5, isCompleted: false },
      ];
      expect(calculateRepairProgress(steps)).toBe(50);
    });

    it('should return 100 for all completed steps', () => {
      const steps: RepairStep[] = [
        { id: '1', order: 1, title: 'Step 1', description: 'Desc', estimatedMinutes: 5, isCompleted: true },
        { id: '2', order: 2, title: 'Step 2', description: 'Desc', estimatedMinutes: 5, isCompleted: true },
      ];
      expect(calculateRepairProgress(steps)).toBe(100);
    });

    it('should return 0 for empty steps array', () => {
      expect(calculateRepairProgress([])).toBe(0);
    });

    it('should return 33 for 1 of 3 steps completed', () => {
      const steps: RepairStep[] = [
        { id: '1', order: 1, title: 'Step 1', description: 'Desc', estimatedMinutes: 5, isCompleted: true },
        { id: '2', order: 2, title: 'Step 2', description: 'Desc', estimatedMinutes: 5, isCompleted: false },
        { id: '3', order: 3, title: 'Step 3', description: 'Desc', estimatedMinutes: 5, isCompleted: false },
      ];
      expect(calculateRepairProgress(steps)).toBe(33);
    });
  });

  describe('areAllStepsComplete', () => {
    it('should return true when all steps are completed', () => {
      const steps: RepairStep[] = [
        { id: '1', order: 1, title: 'Step 1', description: 'Desc', estimatedMinutes: 5, isCompleted: true },
        { id: '2', order: 2, title: 'Step 2', description: 'Desc', estimatedMinutes: 5, isCompleted: true },
      ];
      expect(areAllStepsComplete(steps)).toBe(true);
    });

    it('should return false when not all steps are completed', () => {
      const steps: RepairStep[] = [
        { id: '1', order: 1, title: 'Step 1', description: 'Desc', estimatedMinutes: 5, isCompleted: true },
        { id: '2', order: 2, title: 'Step 2', description: 'Desc', estimatedMinutes: 5, isCompleted: false },
      ];
      expect(areAllStepsComplete(steps)).toBe(false);
    });

    it('should return false for empty steps array', () => {
      expect(areAllStepsComplete([])).toBe(false);
    });

    it('should return false when no steps are completed', () => {
      const steps: RepairStep[] = [
        { id: '1', order: 1, title: 'Step 1', description: 'Desc', estimatedMinutes: 5, isCompleted: false },
      ];
      expect(areAllStepsComplete(steps)).toBe(false);
    });
  });

  describe('step content quality', () => {
    it('should have actionable titles for CREATIVE_FATIGUE', () => {
      const steps = getRepairSteps('CREATIVE_FATIGUE', 'CREATIVE');
      steps.forEach((step) => {
        expect(step.title.length).toBeGreaterThanOrEqual(5);
        expect(step.description.length).toBeGreaterThan(10);
      });
    });

    it('should have actionable titles for AUDIENCE_OVERLAP', () => {
      const steps = getRepairSteps('AUDIENCE_OVERLAP', 'AUDIENCE');
      steps.forEach((step) => {
        expect(step.title.length).toBeGreaterThanOrEqual(5);
        expect(step.description.length).toBeGreaterThan(10);
      });
    });

    it('should have at least 2 steps for common issues', () => {
      const commonIssues = [
        { code: 'CREATIVE_FATIGUE', category: 'CREATIVE' as IssueCategory },
        { code: 'AUDIENCE_OVERLAP', category: 'AUDIENCE' as IssueCategory },
        { code: 'BUDGET_INEFFICIENT', category: 'BUDGET' as IssueCategory },
        { code: 'TRACKING_MISSING', category: 'TRACKING' as IssueCategory },
      ];

      commonIssues.forEach(({ code, category }) => {
        const steps = getRepairSteps(code, category);
        expect(steps.length).toBeGreaterThanOrEqual(2);
      });
    });
  });

  describe('repair guide for all 24 issue types', () => {
    const issueTypes: { code: string; category: IssueCategory }[] = [
      // STRUCTURE issues
      { code: 'STRUCTURE_NAMING', category: 'STRUCTURE' },
      { code: 'STRUCTURE_ADSET_COUNT', category: 'STRUCTURE' },
      { code: 'STRUCTURE_AD_COUNT', category: 'STRUCTURE' },
      { code: 'STRUCTURE_OBJECTIVE', category: 'STRUCTURE' },
      { code: 'STRUCTURE_AUDIENCE_COMPETITION', category: 'STRUCTURE' },
      // CREATIVE issues
      { code: 'CREATIVE_DIVERSITY', category: 'CREATIVE' },
      { code: 'CREATIVE_FATIGUE', category: 'CREATIVE' },
      { code: 'CREATIVE_FREQUENCY', category: 'CREATIVE' },
      { code: 'CREATIVE_FRESHNESS', category: 'CREATIVE' },
      { code: 'CREATIVE_COPY_LENGTH', category: 'CREATIVE' },
      // AUDIENCE issues
      { code: 'AUDIENCE_SIZE', category: 'AUDIENCE' },
      { code: 'AUDIENCE_OVERLAP', category: 'AUDIENCE' },
      { code: 'AUDIENCE_EXCLUSION', category: 'AUDIENCE' },
      { code: 'AUDIENCE_LOOKALIKE', category: 'AUDIENCE' },
      { code: 'AUDIENCE_FRESHNESS', category: 'AUDIENCE' },
      // BUDGET issues
      { code: 'BUDGET_ALLOCATION', category: 'BUDGET' },
      { code: 'BUDGET_UTILIZATION', category: 'BUDGET' },
      { code: 'BUDGET_LEARNING', category: 'BUDGET' },
      { code: 'BUDGET_BIDDING', category: 'BUDGET' },
      { code: 'BUDGET_INEFFICIENT', category: 'BUDGET' },
      // TRACKING issues
      { code: 'TRACKING_CONVERSION', category: 'TRACKING' },
      { code: 'TRACKING_PIXEL', category: 'TRACKING' },
      { code: 'TRACKING_EVENTS', category: 'TRACKING' },
      { code: 'TRACKING_UTM', category: 'TRACKING' },
    ];

    issueTypes.forEach(({ code, category }) => {
      it(`should have repair steps for ${code}`, () => {
        const steps = getRepairSteps(code, category);
        expect(steps).toBeInstanceOf(Array);
        expect(steps.length).toBeGreaterThan(0);
      });
    });
  });
});
