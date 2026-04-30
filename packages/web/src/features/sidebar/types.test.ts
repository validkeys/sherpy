/**
 * Unit tests for workflow step types and utilities
 */

import { describe, expect, it } from 'vitest';
import { WORKFLOW_STEPS, type WorkflowStep, getStepIndex } from './types';

describe('WORKFLOW_STEPS', () => {
  it('contains exactly 10 workflow steps', () => {
    expect(WORKFLOW_STEPS).toHaveLength(10);
  });

  it('has unique step IDs', () => {
    const ids = WORKFLOW_STEPS.map((step) => step.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(10);
  });

  it('includes all required step IDs', () => {
    const requiredSteps: WorkflowStep[] = [
      'intake',
      'gap-analysis',
      'business-requirements',
      'technical-requirements',
      'style-anchors',
      'implementation-planning',
      'plan-review',
      'architecture-decisions',
      'delivery-timeline',
      'qa-test-plan',
    ];

    const stepIds = WORKFLOW_STEPS.map((s) => s.id);
    requiredSteps.forEach((requiredStep) => {
      expect(stepIds).toContain(requiredStep);
    });
  });

  it('has name and description for each step', () => {
    WORKFLOW_STEPS.forEach((step) => {
      expect(step.name).toBeTruthy();
      expect(step.name.length).toBeGreaterThan(0);
      expect(step.description).toBeTruthy();
      expect(step.description.length).toBeGreaterThan(0);
    });
  });

  it('maintains correct step order', () => {
    expect(WORKFLOW_STEPS[0].id).toBe('intake');
    expect(WORKFLOW_STEPS[1].id).toBe('gap-analysis');
    expect(WORKFLOW_STEPS[2].id).toBe('business-requirements');
    expect(WORKFLOW_STEPS[9].id).toBe('qa-test-plan');
  });
});

describe('getStepIndex', () => {
  it('returns 0 for first step (intake)', () => {
    expect(getStepIndex('intake')).toBe(0);
  });

  it('returns 9 for last step (qa-test-plan)', () => {
    expect(getStepIndex('qa-test-plan')).toBe(9);
  });

  it('returns correct index for middle steps', () => {
    expect(getStepIndex('business-requirements')).toBe(2);
    expect(getStepIndex('implementation-planning')).toBe(5);
    expect(getStepIndex('architecture-decisions')).toBe(7);
  });

  it('returns correct indices for all steps', () => {
    WORKFLOW_STEPS.forEach((step, expectedIndex) => {
      expect(getStepIndex(step.id)).toBe(expectedIndex);
    });
  });

  it('handles all valid WorkflowStep values', () => {
    const allSteps: WorkflowStep[] = [
      'intake',
      'gap-analysis',
      'business-requirements',
      'technical-requirements',
      'style-anchors',
      'implementation-planning',
      'plan-review',
      'architecture-decisions',
      'delivery-timeline',
      'qa-test-plan',
    ];

    allSteps.forEach((step) => {
      const index = getStepIndex(step);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(10);
    });
  });
});
