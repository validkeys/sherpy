import { describe, expect, it } from "vitest";
import { startCommand } from "../commands/start.js";
import { stopCommand } from "../commands/stop.js";

describe("CLI Package Setup", () => {
  it("should have start command defined", () => {
    expect(typeof startCommand).toBe("function");
  });

  it("should have stop command defined", () => {
    expect(typeof stopCommand).toBe("function");
  });
});
