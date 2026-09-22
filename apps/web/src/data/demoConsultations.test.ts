import { describe, expect, it } from "vitest";
import { demoConsultations } from "@outfoot/contracts";

describe("demo consultations", () => {
  it("marks every fixture as synthetic", () => {
    expect(demoConsultations.length).toBeGreaterThan(0);
    expect(demoConsultations.every((item) => item.synthetic)).toBe(true);
  });
});
