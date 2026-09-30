import { createPinia, setActivePinia } from "pinia";
import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { createMemoryHistory } from "vue-router";
import ConsultationWorkPage from "./ConsultationWorkPage.vue";
import { createAppRouter } from "../router";
import { usePreviewStore } from "../stores/preview";

const mounted: Array<ReturnType<typeof mount>> = [];
afterEach(() => { mounted.forEach((wrapper) => wrapper.unmount()); mounted.length = 0; document.body.innerHTML = ""; });

async function open(path: string, role: "PRACTITIONER" | "ADMIN" = "PRACTITIONER") {
  const pinia = createPinia();
  setActivePinia(pinia);
  usePreviewStore(pinia).role = role;
  const router = createAppRouter(createMemoryHistory());
  await router.push(path);
  await router.isReady();
  const wrapper = mount(ConsultationWorkPage, { attachTo: document.body, global: { plugins: [pinia, router] } });
  mounted.push(wrapper);
  return { wrapper, router };
}

describe("consultation work screen", () => {
  it("shows work progress next to each tab", async () => {
    const { wrapper } = await open("/consultations/c-103/visit");
    const tabs = wrapper.findAll(".work-tabs a").map((tab) => tab.text());
    expect(tabs).toEqual(["사전답변확인 완료", "방문상담작성 중", "사진·발도장확인 완료", "분석·보완미구성", "최종결과미작성"]);
  });

  it("keeps tab status in line with each tab's own content (R6)", async () => {
    const progress = (wrapper: ReturnType<typeof mount>, label: string) => wrapper.findAll(".work-tabs a").find((tab) => tab.text().startsWith(label))!.get(".tab-progress").text();
    const qualityCheck = await open("/consultations/c-104/media");
    expect(qualityCheck.wrapper.text()).toContain("품질 확인 필요");
    expect(progress(qualityCheck.wrapper, "사진·발도장")).toBe("보완 필요");
    expect(progress(qualityCheck.wrapper, "분석·보완")).toBe("재실행 필요");
    const closed = await open("/consultations/c-105/result");
    expect(progress(closed.wrapper, "분석·보완")).toBe("미구성");
    expect(progress(closed.wrapper, "사진·발도장")).toBe("선택 항목");
    expect(progress(closed.wrapper, "사전답변")).toBe("확인 완료");
    expect(progress(closed.wrapper, "최종결과")).toBe("종결");
    const intake = await open("/consultations/c-101/questionnaire");
    expect(progress(intake.wrapper, "사전답변")).toBe("제출 대기");
    expect(progress(intake.wrapper, "방문상담")).toBe("시작 전");
  });

  it("asks before leaving with unsaved changes and never saves automatically", async () => {
    const { wrapper, router } = await open("/consultations/c-102/visit");
    await wrapper.get('#visit-today-title ~ label textarea').setValue("합성 입력");
    expect(wrapper.get(".save-status").text()).toBe("저장하지 않은 변경 있음");
    await wrapper.get('.work-actions a.primary-link').trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.path).toBe("/consultations/c-102/visit");
    const dialog = wrapper.get('[role="dialog"]');
    expect(dialog.text()).toContain("저장하지 않은 변경이 있습니다");
    await dialog.findAll("button").find((button) => button.text() === "저장하지 않고 이동")!.trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.path).toBe("/consultations/c-102/media");
    expect(wrapper.get(".save-status").text()).toBe("저장할 변경 없음");
  });

  it("keeps answers read-only and sends confirmation to the visit tab", async () => {
    const { wrapper } = await open("/consultations/c-102/questionnaire");
    expect(wrapper.findAll("textarea, input:not([type=radio]):not([type=checkbox])").length).toBe(0);
    expect(wrapper.findAll('a[href="/consultations/c-102/visit#visit-safety"]').length).toBeGreaterThan(0);
    expect(wrapper.get(".work-actions").text()).toContain("확인값은 방문상담에서 입력합니다");
    const pending = await open("/consultations/c-101/questionnaire");
    expect(pending.wrapper.text()).toContain("사전질문지가 아직 제출되지 않았습니다");
    expect(pending.wrapper.find(".answer-group").exists()).toBe(false);
  });

  it("disables inputs for a non-owner and keeps the next step available", async () => {
    const { wrapper } = await open("/consultations/c-103/visit");
    expect(wrapper.get("fieldset.visit-form").attributes("disabled")).toBeDefined();
    expect(wrapper.get(".work-actions").text()).toContain("조회 전용이라 저장할 수 없습니다");
    expect(wrapper.get(".work-actions a").text()).toContain("다음: 사진·발도장");
  });

  it("shows the fields each conclusion needs and separates follow-up date from undecided", async () => {
    const { wrapper } = await open("/consultations/c-104/result");
    await wrapper.get('input[name="result-conclusion"][value="의료기관 우선"]').setValue(true);
    const owner = wrapper.findAll(".conditional-fields label").find((label) => label.text().includes("확인 담당자"))!;
    expect(owner.get(".required-mark").text()).toBe("필수");
    await wrapper.get('input[name="result-conclusion"][value="관리 검토"]').setValue(true);
    expect(wrapper.get(".conditional-fields").text()).toContain("관리 방향");
    expect(wrapper.find('input[type="date"]').exists()).toBe(true);
    await wrapper.get('input[name="follow-up"][value="UNDECIDED"]').setValue(true);
    expect(wrapper.find('input[type="date"]').exists()).toBe(false);
    expect(wrapper.text()).toContain("미정 사유");
  });

  it("shows confirmed and previous results as read-only views", async () => {
    const { wrapper } = await open("/consultations/c-105/result");
    expect(wrapper.get("#final-view-title").text()).toBe("현재 확정본");
    await wrapper.get('input[name="result-view"][value="PREVIOUS"]').setValue(true);
    expect(wrapper.get("#final-view-title").text()).toBe("이전 결과");
    expect(wrapper.text()).toContain("현재 확정본과 다를 수 있으며 수정할 수 없습니다");
    const draftOnly = await open("/consultations/c-104/result");
    await draftOnly.wrapper.get('input[name="result-view"][value="CURRENT"]').setValue(true);
    expect(draftOnly.wrapper.text()).toContain("아직 확정된 결과가 없습니다");
    expect(draftOnly.wrapper.text()).toContain("확정된 결과가 없습니다.");
  });

  it("explains why an administrator cannot finalize and marks deleted consultations", async () => {
    const admin = await open("/consultations/c-104/result", "ADMIN");
    expect(admin.wrapper.get(".finalize-row").text()).toContain("O11 결정 전까지");
    const deleted = await open("/consultations/c-106-deleted/visit", "ADMIN");
    expect(deleted.wrapper.text()).toContain("삭제된 상담 · 조회 전용");
    expect(deleted.wrapper.get("fieldset.visit-form").attributes("disabled")).toBeDefined();
  });
});
