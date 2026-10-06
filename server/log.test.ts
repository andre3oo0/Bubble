import { describe, expect, it } from "vitest";
import { describeError } from "./log";

describe("describeError", () => {
  it("leaves out text a parse error quotes", () => {
    let error: unknown;
    try {
      JSON.parse('{"content":"my private words",}');
    } catch (e) {
      error = e;
    }
    expect(describeError(error)).toBe("SyntaxError");
  });

  it("keeps a network or database code, not the message", () => {
    const failed = new Error("Failed query: insert ... params: my private words", {
      cause: Object.assign(new Error("disk full"), { code: "53100" }),
    });
    expect(describeError(failed)).toBe("Error (53100)");
  });

  it("keeps the AI provider's status and message, which only describe the request", () => {
    const apiError = Object.assign(new Error("429 Rate limit reached"), { name: "RateLimitError", status: 429 });
    expect(describeError(apiError)).toBe("RateLimitError: 429 Rate limit reached");
  });
});
