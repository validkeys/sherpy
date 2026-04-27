/**
 * BedrockService - AWS Bedrock integration for Claude LLM
 * Uses Effect.Service with Layer pattern (SA-001)
 */

import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { ValidationError } from "@sherpy/shared";
import { Config, Effect, Layer } from "effect";

/**
 * Input for generating a chat response
 */
export interface GenerateChatResponseInput {
  readonly messages: ReadonlyArray<{
    readonly role: "user" | "assistant";
    readonly content: string;
  }>;
  readonly systemPrompt?: string;
  readonly maxTokens?: number;
}

/**
 * BedrockService - Effect.Service for Claude LLM operations
 */
export class BedrockService extends Effect.Service<BedrockService>()("BedrockService", {
  effect: Effect.gen(function* () {
    // Load AWS configuration from environment
    const awsRegion = yield* Config.string("AWS_REGION").pipe(
      Config.withDefault("us-east-1"),
    );

    const modelId = yield* Config.string("BEDROCK_MODEL_ID").pipe(
      Config.withDefault("anthropic.claude-3-5-sonnet-20241022-v2:0"),
    );

    // Initialize Bedrock client
    const client = new BedrockRuntimeClient({
      region: awsRegion,
    });

    /**
     * Generate a chat response using Claude via Bedrock
     */
    const generateChatResponse = (
      input: GenerateChatResponseInput,
    ): Effect.Effect<string, ValidationError> =>
      Effect.gen(function* () {
        try {
          // Format messages for Claude API
          const messages = input.messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
          }));

          // Build request payload
          const payload = {
            anthropic_version: "bedrock-2023-05-31",
            max_tokens: input.maxTokens ?? 4096,
            messages,
            ...(input.systemPrompt ? { system: input.systemPrompt } : {}),
          };

          // Invoke Claude model via Bedrock
          const command = new InvokeModelCommand({
            modelId,
            contentType: "application/json",
            accept: "application/json",
            body: JSON.stringify(payload),
          });

          const response = yield* Effect.tryPromise({
            try: () => client.send(command),
            catch: (error) =>
              new ValidationError({
                message: `Bedrock API error: ${error instanceof Error ? error.message : String(error)}`,
              }),
          });

          // Parse response
          const responseBody = JSON.parse(new TextDecoder().decode(response.body));

          // Extract assistant response
          if (responseBody.content?.[0]?.text) {
            return responseBody.content[0].text;
          }

          return yield* Effect.fail(
            new ValidationError({
              message: "Invalid response format from Bedrock",
            }),
          );
        } catch (error) {
          return yield* Effect.fail(
            new ValidationError({
              message: `Failed to generate response: ${error instanceof Error ? error.message : String(error)}`,
            }),
          );
        }
      });

    return {
      generateChatResponse,
    } as const;
  }),
  dependencies: [],
}) {}

/**
 * Live layer for BedrockService
 */
export const BedrockServiceLive = BedrockService.Default;
