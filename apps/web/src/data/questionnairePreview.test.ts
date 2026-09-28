import { describe, expect, it } from "vitest";
import { previewQuestions, toeOptions, toggleExclusiveChoice } from "./questionnairePreview";

describe("questionnaire screen preview", () => {
  it("keeps every proposed branch question visible for client review", () => {
    expect(previewQuestions["상담 내용"].map((item) => item.id)).toEqual(["C02", "C03", "C04"]);
    expect(previewQuestions["안전 확인"].map((item) => item.id)).toEqual(["C05", "C06", "C07", "C08", "C09", "C10"]);
    expect(previewQuestions["생활과 목표"].map((item) => item.id)).toEqual(["C11", "C12", "C13"]);
    expect(previewQuestions["발톱 질문"].map((item) => item.id)).toEqual(Array.from({ length: 13 }, (_, index) => `N${String(index + 1).padStart(2, "0")}`));
    expect(previewQuestions["통증·인솔 질문"].map((item) => item.id)).toEqual(Array.from({ length: 15 }, (_, index) => `P${String(index + 1).padStart(2, "0")}`));
    expect(toeOptions).toHaveLength(10);
  });

  it("does not allow 없음 with other choices", () => {
    expect(toggleExclusiveChoice(["출혈"], "없음")).toEqual(["없음"]);
    expect(toggleExclusiveChoice(["없음"], "출혈")).toEqual(["출혈"]);
  });
});
