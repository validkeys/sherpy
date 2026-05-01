/**
 * Tests for Projects API Schemas
 */

import { describe, expect, it } from 'vitest';
import {
  createProjectInputSchema,
  listProjectsParamsSchema,
  pipelineStatusSchema,
  prioritySchema,
  updateProjectInputSchema,
} from './schemas';

describe('Projects API Schemas', () => {
  describe('pipelineStatusSchema', () => {
    it('should accept valid pipeline status values', () => {
      expect(() => pipelineStatusSchema.parse('intake')).not.toThrow();
      expect(() => pipelineStatusSchema.parse('business-requirements')).not.toThrow();
      expect(() => pipelineStatusSchema.parse('completed')).not.toThrow();
    });

    it('should reject invalid pipeline status values', () => {
      expect(() => pipelineStatusSchema.parse('invalid-status')).toThrow();
      expect(() => pipelineStatusSchema.parse('')).toThrow();
    });
  });

  describe('prioritySchema', () => {
    it('should accept valid priority values', () => {
      expect(() => prioritySchema.parse('low')).not.toThrow();
      expect(() => prioritySchema.parse('medium')).not.toThrow();
      expect(() => prioritySchema.parse('high')).not.toThrow();
      expect(() => prioritySchema.parse('critical')).not.toThrow();
    });

    it('should reject invalid priority values', () => {
      expect(() => prioritySchema.parse('urgent')).toThrow();
      expect(() => prioritySchema.parse('')).toThrow();
    });
  });

  describe('createProjectInputSchema', () => {
    it('should accept valid create project input', () => {
      const validInput = {
        name: 'Test Project',
        description: 'A test project',
        slug: 'test-project',
        tags: ['tag1', 'tag2'],
        priority: 'high' as const,
      };

      expect(() => createProjectInputSchema.parse(validInput)).not.toThrow();
    });

    it('should accept minimal valid input', () => {
      const minimalInput = {
        name: 'Test Project',
      };

      expect(() => createProjectInputSchema.parse(minimalInput)).not.toThrow();
    });

    it('should reject empty name', () => {
      const input = {
        name: '',
      };

      expect(() => createProjectInputSchema.parse(input)).toThrow('Name is required');
    });

    it('should reject name that is too long', () => {
      const input = {
        name: 'a'.repeat(256),
      };

      expect(() => createProjectInputSchema.parse(input)).toThrow('Name is too long');
    });

    it('should reject invalid slug format', () => {
      const input = {
        name: 'Test Project',
        slug: 'Invalid_Slug',
      };

      expect(() => createProjectInputSchema.parse(input)).toThrow(
        'Slug must be lowercase alphanumeric with hyphens'
      );
    });
  });

  describe('updateProjectInputSchema', () => {
    it('should accept valid update project input', () => {
      const validInput = {
        name: 'Updated Project',
        pipelineStatus: 'business-requirements' as const,
        tags: ['new-tag'],
        priority: 'critical' as const,
      };

      expect(() => updateProjectInputSchema.parse(validInput)).not.toThrow();
    });

    it('should accept partial updates', () => {
      const partialInput = {
        pipelineStatus: 'active-development' as const,
      };

      expect(() => updateProjectInputSchema.parse(partialInput)).not.toThrow();
    });

    it('should accept empty object (no updates)', () => {
      expect(() => updateProjectInputSchema.parse({})).not.toThrow();
    });

    it('should reject invalid pipeline status', () => {
      const input = {
        pipelineStatus: 'invalid-status',
      };

      expect(() => updateProjectInputSchema.parse(input)).toThrow();
    });
  });

  describe('listProjectsParamsSchema', () => {
    it('should accept valid list params', () => {
      const validParams = {
        pipelineStatus: ['intake' as const, 'business-requirements' as const],
        priority: ['high' as const, 'critical' as const],
        search: 'test',
        limit: 10,
        offset: 0,
      };

      expect(() => listProjectsParamsSchema.parse(validParams)).not.toThrow();
    });

    it('should accept empty params', () => {
      expect(() => listProjectsParamsSchema.parse({})).not.toThrow();
    });

    it('should reject negative offset', () => {
      const params = {
        offset: -1,
      };

      expect(() => listProjectsParamsSchema.parse(params)).toThrow();
    });

    it('should reject zero limit', () => {
      const params = {
        limit: 0,
      };

      expect(() => listProjectsParamsSchema.parse(params)).toThrow();
    });

    it('should reject non-integer limit', () => {
      const params = {
        limit: 10.5,
      };

      expect(() => listProjectsParamsSchema.parse(params)).toThrow();
    });
  });
});
