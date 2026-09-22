import { describe, expect, it } from "vitest";

import { concernTypeSchema, consultationStatusSchema } from "./index";

describe("shared contracts", () => {
  it("does not model BOTH as a third concern type", () => {
    expect(concernTypeSchema.safeParse("BOTH").success).toBe(false);
  });

  it("uses the canonical questionnaire consultation status", () => {
    expect(consultationStatusSchema.parse("QUESTIONNAIRE")).toBe("QUESTIONNAIRE");
  });
});
