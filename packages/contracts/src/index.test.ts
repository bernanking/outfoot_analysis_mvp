import { describe, expect, it } from "vitest";

import { concernTypeSchema, consultationStatusSchema, healthResponseSchema } from "./index";

describe("shared contracts", () => {
  it("does not model BOTH as a third concern type", () => {
    expect(concernTypeSchema.safeParse("BOTH").success).toBe(false);
  });

  it("uses the canonical questionnaire consultation status", () => {
    expect(consultationStatusSchema.parse("QUESTIONNAIRE")).toBe("QUESTIONNAIRE");
  });

  it("does not let a health response claim a connected database or real AI", () => {
    const base = { ok: true, service: "outfoot-api", runtime: "test", integrations: { database: "NOT_CONNECTED", auth: "NOT_CONNECTED", storage: "NOT_CONNECTED", ai: "mock" } };
    expect(healthResponseSchema.safeParse(base).success).toBe(true);
    expect(healthResponseSchema.safeParse({ ...base, integrations: { ...base.integrations, database: "CONNECTED" } }).success).toBe(false);
    expect(healthResponseSchema.safeParse({ ...base, integrations: { ...base.integrations, ai: "openai" } }).success).toBe(false);
  });
});
