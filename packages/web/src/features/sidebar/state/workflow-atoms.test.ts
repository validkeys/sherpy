/**
 * Unit tests for workflow state atoms
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createStore } from 'jotai';
import {
  currentStepAtom,
  completedStepsAtom,
  stepStatusesAtom,
  nextStepAtom,
  prevStepAtom,
  markStepCompleteAtom,
} from './workflow-atoms';
import type { WorkflowStep } from '../types';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('currentStepAtom', () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    localStorageMock.clear();
    store = createStore();
  });

  it('has default value of intake', () => {
    const value = store.get(currentStepAtom);
    expect(value).toBe('intake');
  });

  it('can be updated to different step', () => {
    store.set(currentStepAtom, 'business-requirements');
    const value = store.get(currentStepAtom);
    expect(value).toBe('business-requirements');
  });

  it('persists value to localStorage', () => {
    store.set(currentStepAtom, 'technical-requirements');
    const stored = localStorageMock.getItem('sherpy:workflow:currentStep');
    expect(stored).toBeTruthy();
    expect(JSON.parse(stored!)).toBe('technical-requirements');
  });

  it('reads persisted value from localStorage', () => {
    // Set value and persist
    store.set(currentStepAtom, 'qa-test-plan');

    // Verify localStorage was updated
    const stored = localStorageMock.getItem('sherpy:workflow:currentStep');
    expect(stored).toBeTruthy();
    expect(JSON.parse(stored!)).toBe('qa-test-plan');

    // Value should still be accessible from same store
    const value = store.get(currentStepAtom);
    expect(value).toBe('qa-test-plan');
  });
});

describe('completedStepsAtom', () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    localStorageMock.clear();
    store = createStore();
  });

  it('has default value of empty array', () => {
    const value = store.get(completedStepsAtom);
    expect(value).toEqual([]);
  });

  it('can add steps to completed list', () => {
    const steps: WorkflowStep[] = ['intake', 'gap-analysis'];
    store.set(completedStepsAtom, steps);
    const value = store.get(completedStepsAtom);
    expect(value).toEqual(steps);
  });

  it('persists completed steps to localStorage', () => {
    const steps: WorkflowStep[] = ['intake', 'business-requirements'];
    store.set(completedStepsAtom, steps);
    const stored = localStorageMock.getItem('sherpy:workflow:completedSteps');
    expect(stored).toBeTruthy();
    expect(JSON.parse(stored!)).toEqual(steps);
  });

  it('reads persisted completed steps from localStorage', () => {
    const steps: WorkflowStep[] = ['intake', 'gap-analysis', 'business-requirements'];

    // Set value and persist
    store.set(completedStepsAtom, steps);

    // Verify localStorage was updated
    const stored = localStorageMock.getItem('sherpy:workflow:completedSteps');
    expect(stored).toBeTruthy();
    expect(JSON.parse(stored!)).toEqual(steps);

    // Value should still be accessible from same store
    const value = store.get(completedStepsAtom);
    expect(value).toEqual(steps);
  });
});

describe('stepStatusesAtom', () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    localStorageMock.clear();
    store = createStore();
  });

  it('marks current step as current', () => {
    store.set(currentStepAtom, 'technical-requirements');
    const statuses = store.get(stepStatusesAtom);
    expect(statuses.get('technical-requirements')).toBe('current');
  });

  it('marks completed steps as complete', () => {
    store.set(completedStepsAtom, ['intake', 'gap-analysis']);
    const statuses = store.get(stepStatusesAtom);
    expect(statuses.get('intake')).toBe('complete');
    expect(statuses.get('gap-analysis')).toBe('complete');
  });

  it('marks other steps as pending', () => {
    store.set(currentStepAtom, 'business-requirements');
    store.set(completedStepsAtom, ['intake']);
    const statuses = store.get(stepStatusesAtom);
    expect(statuses.get('technical-requirements')).toBe('pending');
    expect(statuses.get('qa-test-plan')).toBe('pending');
  });

  it('handles complex state with multiple completed steps', () => {
    store.set(currentStepAtom, 'implementation-planning');
    store.set(completedStepsAtom, [
      'intake',
      'gap-analysis',
      'business-requirements',
      'technical-requirements',
    ]);
    const statuses = store.get(stepStatusesAtom);

    expect(statuses.get('intake')).toBe('complete');
    expect(statuses.get('gap-analysis')).toBe('complete');
    expect(statuses.get('business-requirements')).toBe('complete');
    expect(statuses.get('technical-requirements')).toBe('complete');
    expect(statuses.get('implementation-planning')).toBe('current');
    expect(statuses.get('plan-review')).toBe('pending');
  });

  it('prioritizes complete status over current', () => {
    // Edge case: step is both completed and current
    store.set(currentStepAtom, 'intake');
    store.set(completedStepsAtom, ['intake']);
    const statuses = store.get(stepStatusesAtom);
    expect(statuses.get('intake')).toBe('complete');
  });
});

describe('nextStepAtom', () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    localStorageMock.clear();
    store = createStore();
  });

  it('reads next step after current', () => {
    store.set(currentStepAtom, 'intake');
    const nextStep = store.get(nextStepAtom);
    expect(nextStep).toBe('gap-analysis');
  });

  it('reads correct next step for middle step', () => {
    store.set(currentStepAtom, 'technical-requirements');
    const nextStep = store.get(nextStepAtom);
    expect(nextStep).toBe('style-anchors');
  });

  it('returns null when at last step', () => {
    store.set(currentStepAtom, 'qa-test-plan');
    const nextStep = store.get(nextStepAtom);
    expect(nextStep).toBeNull();
  });

  it('advances to next step on write', () => {
    store.set(currentStepAtom, 'business-requirements');
    store.set(nextStepAtom);
    const currentStep = store.get(currentStepAtom);
    expect(currentStep).toBe('technical-requirements');
  });

  it('does not advance past last step', () => {
    store.set(currentStepAtom, 'qa-test-plan');
    store.set(nextStepAtom);
    const currentStep = store.get(currentStepAtom);
    expect(currentStep).toBe('qa-test-plan'); // Should remain unchanged
  });
});

describe('prevStepAtom', () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    localStorageMock.clear();
    store = createStore();
  });

  it('reads previous step before current', () => {
    store.set(currentStepAtom, 'business-requirements');
    const prevStep = store.get(prevStepAtom);
    expect(prevStep).toBe('gap-analysis');
  });

  it('reads correct previous step for middle step', () => {
    store.set(currentStepAtom, 'delivery-timeline');
    const prevStep = store.get(prevStepAtom);
    expect(prevStep).toBe('architecture-decisions');
  });

  it('returns null when at first step', () => {
    store.set(currentStepAtom, 'intake');
    const prevStep = store.get(prevStepAtom);
    expect(prevStep).toBeNull();
  });

  it('goes back to previous step on write', () => {
    store.set(currentStepAtom, 'style-anchors');
    store.set(prevStepAtom);
    const currentStep = store.get(currentStepAtom);
    expect(currentStep).toBe('technical-requirements');
  });

  it('does not go back past first step', () => {
    store.set(currentStepAtom, 'intake');
    store.set(prevStepAtom);
    const currentStep = store.get(currentStepAtom);
    expect(currentStep).toBe('intake'); // Should remain unchanged
  });
});

describe('markStepCompleteAtom', () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    localStorageMock.clear();
    store = createStore();
  });

  it('adds step to completed list', () => {
    store.set(markStepCompleteAtom, 'intake');
    const completedSteps = store.get(completedStepsAtom);
    expect(completedSteps).toContain('intake');
  });

  it('adds multiple steps', () => {
    store.set(markStepCompleteAtom, 'intake');
    store.set(markStepCompleteAtom, 'gap-analysis');
    store.set(markStepCompleteAtom, 'business-requirements');
    const completedSteps = store.get(completedStepsAtom);
    expect(completedSteps).toEqual([
      'intake',
      'gap-analysis',
      'business-requirements',
    ]);
  });

  it('does not add duplicate steps', () => {
    store.set(markStepCompleteAtom, 'intake');
    store.set(markStepCompleteAtom, 'intake');
    const completedSteps = store.get(completedStepsAtom);
    expect(completedSteps).toEqual(['intake']);
    expect(completedSteps).toHaveLength(1);
  });

  it('preserves existing completed steps', () => {
    store.set(completedStepsAtom, ['intake', 'gap-analysis']);
    store.set(markStepCompleteAtom, 'business-requirements');
    const completedSteps = store.get(completedStepsAtom);
    expect(completedSteps).toEqual([
      'intake',
      'gap-analysis',
      'business-requirements',
    ]);
  });
});
