/**
 * Chat Messages API Schemas
 *
 * Zod validation schemas for Chat Messages API inputs.
 * Ensures type-safe validation at runtime for all mutations.
 */

import { z } from 'zod';

/**
 * Message role schema
 */
export const messageRoleSchema = z.enum(['user', 'assistant']);

/**
 * Schema for sending a message
 * POST /api/projects/:projectId/chat/messages
 */
export const sendMessageInputSchema = z.object({
  content: z.string().min(1, 'Message content cannot be empty'),
  role: messageRoleSchema,
});

/**
 * Inferred type for send message input
 */
export type SendMessageInput = z.infer<typeof sendMessageInputSchema>;

/**
 * Schema for get messages query parameters
 * GET /api/projects/:projectId/chat/messages
 */
export const getMessagesParamsSchema = z.object({
  limit: z.number().int().positive().optional(),
  cursor: z.string().optional(),
});

/**
 * Inferred type for get messages params
 */
export type GetMessagesParams = z.infer<typeof getMessagesParamsSchema>;
