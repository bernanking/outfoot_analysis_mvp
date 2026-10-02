import { createPinia, setActivePinia, type Pinia } from "pinia";
import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { nextTick } from "vue";
import { createMemoryHistory, RouterView } from "vue-router";
import { createAppRouter } from "../router";
import { consultations } from "../data/preview";
import { usePreviewStore } from "../stores/preview";
import { useWorkDraftStore } from "../stores/workDraft";

const mounted: Array<ReturnType<typeof mount>> = [];
afterEach(() => { mounted.forEach((wrapper) => wrapper.unmount()); mounted.length = 0; document.body.innerHTML = ""; });

async function openApp(path: string, options: { role?: "PRACTITIONER" | "ADMIN"; pinia?: Pinia } = {}) {
  const pinia = options.pinia ?? createPinia();
  setActivePinia(pinia);
  usePreviewStore(pinia).role = options.role ?? "PRACTITIONER";
  const router = createAppRouter(createMemoryHistory());
  await router.push(path);
  await router.isReady();
  const wrapper = mount({ components: { RouterView }, template: "<main><RouterView /></main>" }, { attachTo: document.body, global: { plugins: [pinia, router] } });
  mounted.push(wrapper);
  return { wrapper, router, pinia };
}

type Wrapper = ReturnType<typeof mount>;
const progress = (wrapper: Wrapper, label: string) => wrapper.findAll(".work-tabs a").find((tab) => tab.text().startsWith(label))!.get(".tab-progress").text();
const footprintRow = (wrapper: Wrapper) => wrapper.findAll('section[aria-labelledby="readiness-title"] li').find((row) => row.text().startsWith("좌우 발도장"))!;
const pendingHeading = (wrapper: Wrapper) => wrapper.get('section[aria-labelledby="readiness-title"] h3').text();
const mediaRequirement = (wrapper: Wrapper) => wrapper.get('section[aria-labelledby="footprint-title"] .surface-heading .status-badge').text();

describe("A · analysis readiness uses the same footprint need as the photo tab", () => {
  it("does not count an optional footprint as missing for a nail-only consultation", async () => {
    const analysis = await openApp("/consultations/c-105/analysis");
    const row = footprintRow(analysis.wrapper);
    expect(row.attributes("data-check-state")).toBe("OPTIONAL");
    expect(row.text()).toContain("발도장 선택 · 선택 사진 없음");
    expect(row.find('a[href="/consultations/c-105/media"]').exists()).toBe(false);
    expect(pendingHeading(analysis.wrapper)).toBe("확인할 항목 0건");
    const media = await openApp("/consultations/c-105/media");
    expect(mediaRequirement(media.wrapper)).toBe("발도장 선택");
    expect(progress(media.wrapper, "사진·발도장")).toBe("선택 항목");
  });

  it("keeps the left-missing and quality states for pain·insole consultations", async () => {
    const leftOnly = await openApp("/consultations/c-102/analysis");
    expect(footprintRow(leftOnly.wrapper).attributes("data-check-state")).toBe("PENDING");
    expect(footprintRow(leftOnly.wrapper).text()).toContain("발도장 기본 필요 · 왼쪽만 등록");
    expect(footprintRow(leftOnly.wrapper).find('a[href="/consultations/c-102/media"]').exists()).toBe(true);
    expect(progress(leftOnly.wrapper, "사진·발도장")).toBe("한쪽 누락");
    // 복합(환자 통증·인솔 + 시술자 발톱 추가)도 통증·인솔 기준으로 기본 필요입니다.
    const combined = await openApp("/consultations/c-104/analysis");
    expect(footprintRow(combined.wrapper).text()).toContain("발도장 기본 필요 · 품질 확인 필요");
    expect(footprintRow(combined.wrapper).attributes("data-check-state")).toBe("PENDING");
    expect(progress(combined.wrapper, "사진·발도장")).toBe("보완 필요");
    expect(progress(combined.wrapper, "분석·보완")).toBe("재실행 필요");
    // 환자가 두 유형을 함께 고른 상담은 좌우 등록 예시가 있으면 확인됨입니다.
    const both = await openApp("/consultations/c-103/analysis");
    expect(footprintRow(both.wrapper).attributes("data-check-state")).toBe("READY");
    expect(footprintRow(both.wrapper).text()).toContain("확인됨");
  });

  it("separates an unconfirmed type from a decided need and follows the practitioner's confirmed type", async () => {
    const { wrapper, pinia } = await openApp("/consultations/c-101/analysis");
    expect(footprintRow(wrapper).attributes("data-check-state")).toBe("PENDING");
    expect(footprintRow(wrapper).text()).toContain("필요 여부 미정 · 상담 유형 확인 전");
    expect(footprintRow(wrapper).get("a").attributes("href")).toBe("/consultations/c-101/visit#visit-type");

    useWorkDraftStore(pinia).toggleConfirmedType("c-101", "NAIL", true);
    await nextTick();
    expect(footprintRow(wrapper).attributes("data-check-state")).toBe("OPTIONAL");
    expect(progress(wrapper, "사진·발도장")).toBe("선택 항목");
    useWorkDraftStore(pinia).toggleConfirmedType("c-101", "PAIN_INSOLE", true);
    await nextTick();
    expect(footprintRow(wrapper).text()).toContain("발도장 기본 필요 · 미등록");
    expect(progress(wrapper, "사진·발도장")).toBe("미등록");
    // 환자 원선택은 그대로입니다.
    expect(wrapper.get(".page-heading").text()).toContain("환자 미선택");
  });
});

describe("B · print uses the same confirmed-result rule as the result tab", () => {
  it("shows a no-confirmed-result notice with a way back for unfinalized consultations", async () => {
    const { wrapper } = await openApp("/consultations/c-104/print");
    expect(wrapper.get("#print-empty-title").text()).toBe("인쇄할 확정본이 없습니다");
    expect(wrapper.find("article.print-document").exists()).toBe(false);
    expect(wrapper.find(".print-controls select").exists()).toBe(false);
    expect(wrapper.get('section[aria-labelledby="print-empty-title"] a').attributes("href")).toBe("/consultations/c-104/result");
    const result = await openApp("/consultations/c-104/result");
    await result.wrapper.get('input[name="result-view"][value="CURRENT"]').setValue(true);
    expect(result.wrapper.text()).toContain("아직 확정된 결과가 없습니다");
  });

  it("keeps current and previous revisions apart for a finalized consultation", async () => {
    const { wrapper } = await openApp("/consultations/c-105/print");
    expect(wrapper.findAll(".print-controls select option").map((option) => option.text())).toEqual(["현재 확정본 예시", "이전 결과 예시"]);
    expect(wrapper.get(".print-document .preview-pill").text()).toBe("현재 확정본 예시");
    expect(wrapper.get(".print-document").text()).toContain("결과 2 · 합성 예시");
    expect(wrapper.find(".print-document .print-previous").exists()).toBe(false);
    // 길이 확인용 중립 문장은 확정본 문맥에서 유지합니다.
    expect(wrapper.get(".print-document").text()).toContain("레이아웃 확인용 예시 문장입니다");
    await wrapper.get(".print-controls select").setValue("previous");
    expect(wrapper.get(".print-document .preview-pill").text()).toBe("이전 결과 · 현재 확정본 아님");
    expect(wrapper.get(".print-document").text()).toContain("결과 1 · 합성 예시");
    expect(wrapper.find(".print-document .print-previous").exists()).toBe(true);
  });

  it("matches the result tab's confirmed-result rule for every consultation", async () => {
    for (const item of consultations) {
      const { wrapper } = await openApp(`/consultations/${item.id}/print`, { role: "ADMIN" });
      expect(wrapper.find("article.print-document").exists(), item.id).toBe(item.status === "FINALIZED");
      expect(wrapper.find("#print-empty-title").exists(), item.id).toBe(item.status !== "FINALIZED");
    }
  });

  it("keeps deleted consultations admin-only and read-only", async () => {
    const admin = await openApp("/consultations/c-106-deleted/print", { role: "ADMIN" });
    expect(admin.wrapper.text()).toContain("삭제된 상담 · 조회 전용");
    expect(admin.wrapper.text()).toContain("인쇄할 확정본이 없습니다");
    const practitioner = await openApp("/consultations/c-106-deleted/print");
    expect(practitioner.router.currentRoute.value.path).toBe("/404");
  });
});

describe("C · questionnaire and visit badges follow the saved visit record", () => {
  it("shows c-104 as in progress with the saved values and an open questionnaire check", async () => {
    const { wrapper } = await openApp("/consultations/c-104/visit");
    expect(progress(wrapper, "방문상담")).toBe("작성 중");
    expect(progress(wrapper, "사전답변")).toBe("확인 필요");
    expect(wrapper.get('[data-testid="visit-record"]').text()).toBe("작성 중 · 저장 2026-09-17 14:20 · 합성 예시");
    expect(wrapper.findAll("#visit-safety select").map((select) => (select.element as HTMLSelectElement).value)).toEqual(["없음", "없음", "없음"]);
    expect(wrapper.get(".context-strip").text()).toContain("주의신호 확인 완료");
    expect(wrapper.get(".save-status").text()).toBe("저장할 변경 없음");

    const questionnaire = await openApp("/consultations/c-104/questionnaire");
    const checks = questionnaire.wrapper.get('section[aria-labelledby="q-confirm-title"]');
    expect(checks.get(".surface-heading .status-badge").text()).toBe("1건 확인 필요 · 합성 예시");
    expect(checks.findAll(".status-badge").map((badge) => badge.text())).toEqual(["1건 확인 필요 · 합성 예시", "확인됨 · 없음", "확인됨 · 없음"]);
    expect(checks.get('a[href="/consultations/c-104/visit#visit-today-title"]').text()).toBe("방문상담에서 확인");
  });

  it("keeps unsaved input apart from the saved record and its badges", async () => {
    const { wrapper } = await openApp("/consultations/c-104/visit");
    await wrapper.get("#visit-today-title ~ .field-grid select").setValue("5");
    await wrapper.get('select[aria-labelledby="safety-C05-name safety-C05-value-label"]').setValue("미확인");
    expect(wrapper.get(".save-status").text()).toBe("저장하지 않은 변경 있음");
    expect(progress(wrapper, "사전답변")).toBe("확인 필요");
    expect(progress(wrapper, "방문상담")).toBe("작성 중");
    expect(wrapper.get('[data-testid="visit-record"]').text()).toContain("작성 중");
    expect(wrapper.get("#consultation-summary").text()).toContain("현재 불편 정도미확인");
  });

  it("shows a confirmed synthetic record with filled required fields on a closed consultation", async () => {
    const { wrapper } = await openApp("/consultations/c-105/visit");
    expect(progress(wrapper, "방문상담")).toBe("확인 완료");
    expect(progress(wrapper, "사전답변")).toBe("확인 완료");
    expect(wrapper.get('[data-testid="visit-record"]').text()).toBe("확인 완료 · 저장 합성 예시");
    expect((wrapper.get('input[name="visit-decision"][value="보류"]').element as HTMLInputElement).checked).toBe(true);
    expect(wrapper.get("#consultation-summary").text()).toContain("3 / 10 · 저장값 합성 예시");
  });

  it("shows no saved record and unconfirmed values before the visit starts", async () => {
    const { wrapper } = await openApp("/consultations/c-102/visit");
    expect(progress(wrapper, "방문상담")).toBe("시작 전");
    expect(progress(wrapper, "사전답변")).toBe("확인 필요");
    expect(wrapper.get('[data-testid="visit-record"]').text()).toBe("저장된 기록 없음");
    expect(wrapper.findAll("#visit-safety select").map((select) => (select.element as HTMLSelectElement).value)).toEqual(["미확인", "미확인", "미확인"]);
    const questionnaire = await openApp("/consultations/c-102/questionnaire");
    expect(questionnaire.wrapper.get('section[aria-labelledby="q-confirm-title"] .surface-heading .status-badge').text()).toBe("3건 확인 필요 · 합성 예시");
  });

  it("labels a submitted questionnaire as submitted, not confirmed, on the analysis checks", async () => {
    const { wrapper } = await openApp("/consultations/c-104/analysis");
    const row = wrapper.findAll('section[aria-labelledby="readiness-title"] li').find((item) => item.text().startsWith("사전답변"))!;
    expect(row.text()).toContain("제출됨");
    expect(row.text()).not.toContain("확인됨");
  });
});
