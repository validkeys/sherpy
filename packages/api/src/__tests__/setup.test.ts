import { Effect } from "effect";
import { describe, expect, it } from "vitest";

describe("API Package Setup", () => {
  it("should import Effect successfully", () => {
    expect(Effect).toBeDefined();
    expect(typeof Effect.succeed).toBe("function");
  });
});
