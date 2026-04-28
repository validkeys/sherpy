/**
 * BedrockService - AWS Bedrock integration for Claude LLM
 * Uses Effect.Service with Layer pattern (SA-001)
 */

import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";
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
    // Support BEDROCK_AWS_REGION with fallback to AWS_REGION (matches lumen pattern)
    const awsRegion = yield* Effect.promise(() =>
      Promise.resolve(
        process.env.BEDROCK_AWS_REGION ||
          process.env.AWS_REGION ||
          "ca-central-1", // Default to ca-central-1 to match lumen
      ),
    );

    // Model ID - support both BEDROCK_DEFAULT_MODEL (lumen pattern) and BEDROCK_MODEL_ID
    // Note: Must use inference profile IDs (e.g., amer.*, us.*, eu.*) not direct model IDs
    const modelId = yield* Effect.promise(() =>
      Promise.resolve(
        process.env.BEDROCK_DEFAULT_MODEL ||
          process.env.BEDROCK_MODEL_ID ||
          // Default to Claude Sonnet 4 via AMER cross-region inference profile
          "amer.anthropic.claude-sonnet-4-20250514-v1:0",
      ),
    );

    // AWS Profile for SSO (optional)
    const awsProfile = process.env.AWS_PROFILE;

    // Create credentials provider
    // Priority:
    // 1. Explicit BEDROCK_AWS_* or AWS_* env vars
    // 2. AWS SDK credential provider chain (SSO, IAM roles, shared credentials)
    const bedrockAccessKeyId =
      process.env.BEDROCK_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
    const bedrockSecretAccessKey =
      process.env.BEDROCK_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
    const bedrockSessionToken =
      process.env.BEDROCK_AWS_SESSION_TOKEN || process.env.AWS_SESSION_TOKEN;

    // Always use AWS SDK credential provider chain for SSO/STS support
    // This handles: AWS SSO profiles, IAM roles, shared credentials file, env vars
    console.log(
      `[BedrockService] Region: ${awsRegion}, Model: ${modelId}${awsProfile ? `, Profile: ${awsProfile}` : ""}`,
    );
    const credentials = fromNodeProviderChain({
      profile: awsProfile,
    });

    // Initialize Bedrock client
    const client = new BedrockRuntimeClient({
      region: awsRegion,
      credentials,
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
