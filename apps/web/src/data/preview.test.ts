import { describe, expect, it } from "vitest";
import { consultations, footprintNeed, questionnaireChecks, resultRevisions, tabProgress } from "./preview";

describe("shared preview criteria", () => {
  it("decides footprint need from confirmed types and keeps unknown types separate", () => {
    expect(footprintNeed([])).toBe("UNDECIDED");
    expect(footprintNeed(["NAIL"])).toBe("OPTIONAL");
    expect(footprintNeed(["PAIN_INSOLE"])).toBe("REQUIRED");
    expect(footprintNeed(["NAIL", "PAIN_INSOLE"])).toBe("REQUIRED");
  });

  it("gives confirmed result revisions only to finalized consultations, with exactly one current", () => {
    for (const item of consultations) {
      const revisions = resultRevisions(item);
      if (item.status === "FINALIZED") {
        expect(revisions.filter((revision) => revision.current)).toHaveLength(1);
        expect(revisions.filter((revision) => !revision.current).length).toBeGreaterThan(0);
      } else {
        expect(revisions).toEqual([]);
      }
    }
  });

  it("does not mark questionnaire or visit as confirmed from the consultation stage alone", () => {
    const c104 = consultations.find((item) => item.id === "c-104")!;
    // 단계가 종결이어도 저장된 방문 기록이 없으면 확인 완료가 아닙니다.
    const stageOnly = { ...c104, status: "FINALIZED" as const, visitRecord: undefined };
    expect(tabProgress(stageOnly, "visit").label).toBe("시작 전");
    expect(tabProgress(stageOnly, "questionnaire").label).toBe("확인 필요");
    // 저장된 기록의 상태값만 확인 완료를 만듭니다.
    expect(tabProgress({ ...c104, visitRecord: { ...c104.visitRecord!, state: "CONFIRMED" } }, "visit").label).toBe("확인 완료");
  });
});

describe("synthetic fixture consistency", () => {
  it("keeps the visit badge, saved record, and safety summary in line for every consultation", () => {
    for (const item of consultations) {
      const record = item.visitRecord;
      const visit = tabProgress(item, "visit").label;
      expect(visit === "확인 완료", item.id).toBe(record?.state === "CONFIRMED");
      expect(visit === "시작 전", item.id).toBe(!record);
      const savedSafety = record ? Object.values(record.safety) : [];
      if (item.safety === "확인 완료" || item.safety === "없음") {
        expect(record, item.id).toBeDefined();
        expect(savedSafety, item.id).not.toContain("미확인");
      } else {
        expect(!record || savedSafety.includes("미확인"), item.id).toBe(true);
      }
    }
  });

  it("marks the questionnaire confirmed only when every listed item has a saved confirmation", () => {
    for (const item of consultations) {
      const label = tabProgress(item, "questionnaire").label;
      if (item.questionnaire !== "제출 완료") { expect(label, item.id).toBe("제출 대기"); continue; }
      const checks = questionnaireChecks(item);
      expect(label, item.id).toBe(checks.every((check) => check.confirmed) ? "확인 완료" : "확인 필요");
      if (label === "확인 완료") expect(item.visitRecord, item.id).toBeDefined();
    }
  });

  it("fills every field marked required when a synthetic visit record is confirmed", () => {
    for (const item of consultations.filter((entry) => entry.visitRecord?.state === "CONFIRMED")) {
      const record = item.visitRecord!;
      for (const value of [record.v02, record.change, record.v04, record.v07, record.decision]) expect(value, item.id).toBeTruthy();
    }
  });
});
