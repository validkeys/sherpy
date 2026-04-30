import { describe, expect, it } from 'vitest';
import { getSkillMessageForStep } from './skill-service';
import { WORKFLOW_STEPS } from '../types/workflow';

describe('skill-service', () => {
  describe('getSkillMessageForStep', () => {
    it('returns correct skill command for intake step', () => {
      const result = getSkillMessageForStep('intake');
      expect(result).toBe('Start new project intake');
    });

    it('returns correct skill command for business-requirements step', () => {
      const result = getSkillMessageForStep('business-requirements');
      expect(result).toBe('Continue Sherpy Flow: Business Requirements');
    });

    it('returns correct skill command for gap-analysis step', () => {
      const result = getSkillMessageForStep('gap-analysis');
      expect(result).toBe('Continue Sherpy Flow: Gap Analysis');
    });

    it('returns correct skill command for technical-requirements step', () => {
      const result = getSkillMessageForStep('technical-requirements');
      expect(result).toBe('Continue Sherpy Flow: Technical Requirements');
    });

    it('returns correct skill command for style-anchors step', () => {
      const result = getSkillMessageForStep('style-anchors');
      expect(result).toBe('Continue Sherpy Flow: Style Anchors');
    });

    it('returns correct skill command for implementation-planning step', () => {
      const result = getSkillMessageForStep('implementation-planning');
      expect(result).toBe('Continue Sherpy Flow: Implementation Planning');
    });

    it('returns correct skill command for architecture-decisions step', () => {
      const result = getSkillMessageForStep('architecture-decisions');
      expect(result).toBe('Continue Sherpy Flow: Architecture Decisions');
    });

    it('returns correct skill command for delivery-timeline step', () => {
      const result = getSkillMessageForStep('delivery-timeline');
      expect(result).toBe('Continue Sherpy Flow: Delivery Timeline');
    });

    it('returns correct skill command for qa-test-plan step', () => {
      const result = getSkillMessageForStep('qa-test-plan');
      expect(result).toBe('Continue Sherpy Flow: QA Test Plan');
    });

    it('returns correct skill command for summaries step', () => {
      const result = getSkillMessageForStep('summaries');
      expect(result).toBe('Continue Sherpy Flow: Summaries');
    });

    it('returns null for invalid step id', () => {
      const result = getSkillMessageForStep('invalid-step');
      expect(result).toBeNull();
    });

    it('returns null for empty string', () => {
      const result = getSkillMessageForStep('');
      expect(result).toBeNull();
    });
  });

  describe('WORKFLOW_STEPS', () => {
    it('has exactly 10 entries', () => {
      expect(WORKFLOW_STEPS).toHaveLength(10);
    });

    it('each step has required fields', () => {
      WORKFLOW_STEPS.forEach((step) => {
        expect(step).toHaveProperty('id');
        expect(step).toHaveProperty('name');
        expect(step).toHaveProperty('number');
        expect(step).toHaveProperty('skillCommand');

        expect(typeof step.id).toBe('string');
        expect(typeof step.name).toBe('string');
        expect(typeof step.number).toBe('number');
        expect(typeof step.skillCommand).toBe('string');

        expect(step.id).toBeTruthy();
        expect(step.name).toBeTruthy();
        expect(step.skillCommand).toBeTruthy();
      });
    });
  });
});
