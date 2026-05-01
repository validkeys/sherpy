/**
 * Documents API Schema Tests
 *
 * Unit tests for Zod schema validation ensuring proper input/output validation.
 */

import { describe, expect, it } from 'vitest';
import {
  documentFormatSchema,
  documentListResponseSchema,
  documentResponseSchema,
  documentSchema,
  documentTypeSchema,
  generateDocumentInputSchema,
} from './schemas';

describe('documentTypeSchema', () => {
  it('should validate all valid document types', () => {
    const validTypes = [
      'business-requirements',
      'technical-requirements',
      'implementation-plan',
      'qa-test-plan',
      'delivery-timeline',
      'executive-summary',
      'developer-summary',
      'architecture-decision-record',
    ];

    validTypes.forEach((type) => {
      const result = documentTypeSchema.safeParse(type);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(type);
      }
    });
  });

  it('should reject invalid document types', () => {
    const invalidTypes = ['invalid-type', 'requirements', '', 123, null, undefined];

    invalidTypes.forEach((type) => {
      const result = documentTypeSchema.safeParse(type);
      expect(result.success).toBe(false);
    });
  });
});

describe('documentFormatSchema', () => {
  it('should validate all valid document formats', () => {
    const validFormats = ['yaml', 'markdown', 'json'];

    validFormats.forEach((format) => {
      const result = documentFormatSchema.safeParse(format);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(format);
      }
    });
  });

  it('should reject invalid document formats', () => {
    const invalidFormats = ['pdf', 'html', 'xml', '', 123, null, undefined];

    invalidFormats.forEach((format) => {
      const result = documentFormatSchema.safeParse(format);
      expect(result.success).toBe(false);
    });
  });
});

describe('generateDocumentInputSchema', () => {
  it('should validate valid generate document input with required fields only', () => {
    const input = {
      documentType: 'business-requirements' as const,
    };

    const result = generateDocumentInputSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(input);
    }
  });

  it('should validate valid generate document input with all fields', () => {
    const input = {
      documentType: 'technical-requirements' as const,
      format: 'yaml' as const,
      metadata: {
        author: 'test-user',
        priority: 'high',
      },
    };

    const result = generateDocumentInputSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(input);
    }
  });

  it('should reject input with invalid document type', () => {
    const input = {
      documentType: 'invalid-type',
    };

    const result = generateDocumentInputSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should reject input with invalid format', () => {
    const input = {
      documentType: 'business-requirements' as const,
      format: 'pdf',
    };

    const result = generateDocumentInputSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should reject input missing required documentType', () => {
    const input = {
      format: 'yaml',
    };

    const result = generateDocumentInputSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should allow optional metadata as any object', () => {
    const input = {
      documentType: 'implementation-plan' as const,
      metadata: {
        complexField: {
          nested: {
            value: 123,
          },
        },
        array: [1, 2, 3],
      },
    };

    const result = generateDocumentInputSchema.safeParse(input);
    expect(result.success).toBe(true);
  });
});

describe('documentSchema', () => {
  it('should validate a complete valid document', () => {
    const document = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      projectId: '123e4567-e89b-12d3-a456-426614174001',
      documentType: 'business-requirements' as const,
      format: 'yaml' as const,
      content: '# Business Requirements\n\nContent here...',
      version: 1,
      createdAt: '2026-04-30T12:00:00.000Z',
      updatedAt: '2026-04-30T12:00:00.000Z',
    };

    const result = documentSchema.safeParse(document);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(document);
    }
  });

  it('should reject document with invalid UUID format', () => {
    const document = {
      id: 'invalid-uuid',
      projectId: '123e4567-e89b-12d3-a456-426614174001',
      documentType: 'business-requirements' as const,
      format: 'yaml' as const,
      content: 'content',
      version: 1,
      createdAt: '2026-04-30T12:00:00.000Z',
      updatedAt: '2026-04-30T12:00:00.000Z',
    };

    const result = documentSchema.safeParse(document);
    expect(result.success).toBe(false);
  });

  it('should reject document with invalid version (zero)', () => {
    const document = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      projectId: '123e4567-e89b-12d3-a456-426614174001',
      documentType: 'business-requirements' as const,
      format: 'yaml' as const,
      content: 'content',
      version: 0,
      createdAt: '2026-04-30T12:00:00.000Z',
      updatedAt: '2026-04-30T12:00:00.000Z',
    };

    const result = documentSchema.safeParse(document);
    expect(result.success).toBe(false);
  });

  it('should reject document with invalid version (negative)', () => {
    const document = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      projectId: '123e4567-e89b-12d3-a456-426614174001',
      documentType: 'business-requirements' as const,
      format: 'yaml' as const,
      content: 'content',
      version: -1,
      createdAt: '2026-04-30T12:00:00.000Z',
      updatedAt: '2026-04-30T12:00:00.000Z',
    };

    const result = documentSchema.safeParse(document);
    expect(result.success).toBe(false);
  });

  it('should reject document with invalid version (decimal)', () => {
    const document = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      projectId: '123e4567-e89b-12d3-a456-426614174001',
      documentType: 'business-requirements' as const,
      format: 'yaml' as const,
      content: 'content',
      version: 1.5,
      createdAt: '2026-04-30T12:00:00.000Z',
      updatedAt: '2026-04-30T12:00:00.000Z',
    };

    const result = documentSchema.safeParse(document);
    expect(result.success).toBe(false);
  });

  it('should reject document with invalid datetime format', () => {
    const document = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      projectId: '123e4567-e89b-12d3-a456-426614174001',
      documentType: 'business-requirements' as const,
      format: 'yaml' as const,
      content: 'content',
      version: 1,
      createdAt: 'invalid-date',
      updatedAt: '2026-04-30T12:00:00.000Z',
    };

    const result = documentSchema.safeParse(document);
    expect(result.success).toBe(false);
  });

  it('should reject document missing required fields', () => {
    const document = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      documentType: 'business-requirements' as const,
      // Missing required fields
    };

    const result = documentSchema.safeParse(document);
    expect(result.success).toBe(false);
  });
});

describe('documentListResponseSchema', () => {
  it('should validate empty documents array', () => {
    const response = {
      documents: [],
    };

    const result = documentListResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.documents).toHaveLength(0);
    }
  });

  it('should validate response with multiple documents', () => {
    const response = {
      documents: [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          projectId: '123e4567-e89b-12d3-a456-426614174001',
          documentType: 'business-requirements' as const,
          format: 'yaml' as const,
          content: 'content 1',
          version: 1,
          createdAt: '2026-04-30T12:00:00.000Z',
          updatedAt: '2026-04-30T12:00:00.000Z',
        },
        {
          id: '123e4567-e89b-12d3-a456-426614174002',
          projectId: '123e4567-e89b-12d3-a456-426614174001',
          documentType: 'technical-requirements' as const,
          format: 'markdown' as const,
          content: 'content 2',
          version: 2,
          createdAt: '2026-04-30T12:00:00.000Z',
          updatedAt: '2026-04-30T12:00:00.000Z',
        },
      ],
    };

    const result = documentListResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.documents).toHaveLength(2);
    }
  });

  it('should reject response with invalid document in array', () => {
    const response = {
      documents: [
        {
          id: 'invalid-uuid',
          projectId: '123e4567-e89b-12d3-a456-426614174001',
          documentType: 'business-requirements' as const,
          format: 'yaml' as const,
          content: 'content',
          version: 1,
          createdAt: '2026-04-30T12:00:00.000Z',
          updatedAt: '2026-04-30T12:00:00.000Z',
        },
      ],
    };

    const result = documentListResponseSchema.safeParse(response);
    expect(result.success).toBe(false);
  });

  it('should reject response missing documents array', () => {
    const response = {};

    const result = documentListResponseSchema.safeParse(response);
    expect(result.success).toBe(false);
  });
});

describe('documentResponseSchema', () => {
  it('should validate valid single document response', () => {
    const response = {
      document: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        projectId: '123e4567-e89b-12d3-a456-426614174001',
        documentType: 'business-requirements' as const,
        format: 'yaml' as const,
        content: 'content',
        version: 1,
        createdAt: '2026-04-30T12:00:00.000Z',
        updatedAt: '2026-04-30T12:00:00.000Z',
      },
    };

    const result = documentResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.document.id).toBe('123e4567-e89b-12d3-a456-426614174000');
    }
  });

  it('should reject response with invalid document', () => {
    const response = {
      document: {
        id: 'invalid-uuid',
        // Missing other required fields
      },
    };

    const result = documentResponseSchema.safeParse(response);
    expect(result.success).toBe(false);
  });

  it('should reject response missing document field', () => {
    const response = {};

    const result = documentResponseSchema.safeParse(response);
    expect(result.success).toBe(false);
  });
});
