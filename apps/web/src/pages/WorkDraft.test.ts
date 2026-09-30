import { createPinia, setActivePinia, type Pinia } from "pinia";
import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { createMemoryHistory, RouterView } from "vue-router";
import { createAppRouter } from "../router";
import { usePreviewStore } from "../stores/preview";
import { useWorkDraftStore } from "../stores/workDraft";

const mounted: Array<ReturnType<typeof mount>> = [];
afterEach(() => { mounted.forEach((wrapper) => wrapper.unmount()); mounted.length = 0; document.body.innerHTML = ""; });

// 실제 경로 이동을 확인하기 위해 RouterView로 화면을 띄웁니다.
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

const field = (wrapper: ReturnType<typeof mount>, placeholder: string) => wrapper.get<HTMLTextAreaElement | HTMLInputElement>(`[placeholder="${placeholder}"]`);
const observe = (wrapper: ReturnType<typeof mount>) => wrapper.get('section[aria-labelledby="visit-observe-title"]').text();
const saveStatus = (wrapper: ReturnType<typeof mount>) => wrapper.get(".save-status").text();
const dialogButton = (wrapper: ReturnType<typeof mount>, label: string) => wrapper.get('[role="dialog"]').findAll("button").find((button) => button.text() === label)!;

describe("R2 · result draft survives view switches", () => {
  it("keeps the customer guide after switching to the confirmed view and back", async () => {
    const { wrapper } = await openApp("/consultations/c-104/result");
    await field(wrapper, "확정된 쉬운 표현만 인쇄합니다").setValue("합성 안내 문장");
    await wrapper.get('input[name="result-view"][value="CURRENT"]').setValue(true);
    expect(wrapper.text()).toContain("아직 확정된 결과가 없습니다");
    await wrapper.get('input[name="result-view"][value="DRAFT"]').setValue(true);
    expect(field(wrapper, "확정된 쉬운 표현만 인쇄합니다").element.value).toBe("합성 안내 문장");
    expect(saveStatus(wrapper)).toBe("저장하지 않은 변경 있음");
  });

  it("keeps conditional inputs when the conclusion or follow-up mode changes and comes back", async () => {
    const { wrapper } = await openApp("/consultations/c-104/result");
    await wrapper.get('input[name="result-conclusion"][value="의료기관 우선"]').setValue(true);
    await field(wrapper, "판단 이유").setValue("합성 사유");
    await wrapper.get('input[name="result-conclusion"][value="관리 검토"]').setValue(true);
    expect(wrapper.find('[placeholder="판단 이유"]').exists()).toBe(false);
    await wrapper.get('input[name="result-conclusion"][value="의료기관 우선"]').setValue(true);
    expect(field(wrapper, "판단 이유").element.value).toBe("합성 사유");
    await wrapper.get('input[name="follow-up"][value="UNDECIDED"]').setValue(true);
    await field(wrapper, "날짜를 정하지 않은 이유").setValue("합성 미정 사유");
    await wrapper.get('input[name="follow-up"][value="DATE"]').setValue(true);
    await wrapper.get('input[type="date"]').setValue("2026-10-15");
    await wrapper.get('input[name="follow-up"][value="UNDECIDED"]').setValue(true);
    expect(field(wrapper, "날짜를 정하지 않은 이유").element.value).toBe("합성 미정 사유");
  });

  it("does not mix drafts between consultations", async () => {
    const first = await openApp("/consultations/c-104/result");
    await field(first.wrapper, "확정된 쉬운 표현만 인쇄합니다").setValue("c-104 전용 합성 문장");
    const second = await openApp("/consultations/c-102/result", { pinia: first.pinia });
    expect(field(second.wrapper, "확정된 쉬운 표현만 인쇄합니다").element.value).toBe("");
    expect(useWorkDraftStore(first.pinia).drafts["c-104"].result.customerGuide).toBe("c-104 전용 합성 문장");
  });
});

describe("R3 · discard and leave", () => {
  it("restores text, radio, checkbox, select, type and conditional inputs on 변경 취소", async () => {
    const { wrapper } = await openApp("/consultations/c-104/visit");
    await field(wrapper, "오늘 가장 먼저 다룰 불편과 목표").setValue("합성 주호소");
    await wrapper.get('input[name="visit-change"][value="악화"]').setValue(true);
    await wrapper.get('select[aria-labelledby="safety-C05-name safety-C05-value-label"]').setValue("있음");
    await wrapper.get('input[type="checkbox"][value="두께"]').setValue(true);
    await wrapper.get('input[name="visit-decision"][value="보류"]').setValue(true);
    await field(wrapper, "환자에게 전달할 안전 안내").setValue("합성 안내");
    await wrapper.get('input[type="checkbox"][value="NAIL"]').setValue(false);
    expect(saveStatus(wrapper)).toBe("저장하지 않은 변경 있음");

    await wrapper.findAll(".work-actions button").find((button) => button.text() === "변경 취소")!.trigger("click");
    expect(saveStatus(wrapper)).toBe("저장할 변경 없음");
    expect(field(wrapper, "오늘 가장 먼저 다룰 불편과 목표").element.value).toBe("");
    expect((wrapper.get('input[name="visit-change"][value="악화"]').element as HTMLInputElement).checked).toBe(false);
    expect((wrapper.get('select[aria-labelledby="safety-C05-name safety-C05-value-label"]').element as HTMLSelectElement).value).toBe("미확인");
    expect((wrapper.get('input[type="checkbox"][value="NAIL"]').element as HTMLInputElement).checked).toBe(true);
    expect((wrapper.get('input[type="checkbox"][value="두께"]').element as HTMLInputElement).checked).toBe(false);
    expect(wrapper.find('[placeholder="환자에게 전달할 안전 안내"]').exists()).toBe(false);
  });

  it("confirms before leaving, keeps values on 계속 작성, and discards on 저장하지 않고 이동", async () => {
    const { wrapper, router } = await openApp("/consultations/c-102/visit");
    await field(wrapper, "오늘 가장 먼저 다룰 불편과 목표").setValue("합성 주호소");

    await router.push("/consultations/c-102/media");
    await flushPromises();
    expect(router.currentRoute.value.path).toBe("/consultations/c-102/visit");
    await dialogButton(wrapper, "계속 작성").trigger("click");
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
    expect(field(wrapper, "오늘 가장 먼저 다룰 불편과 목표").element.value).toBe("합성 주호소");

    await router.push("/consultations");
    await flushPromises();
    expect(router.currentRoute.value.path).toBe("/consultations/c-102/visit");
    await dialogButton(wrapper, "저장하지 않고 이동").trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.path).toBe("/consultations");

    // 작업 화면을 떠난 뒤에는 이전 화면의 가드가 다른 이동을 막지 않습니다.
    await router.push("/patients");
    await flushPromises();
    expect(router.currentRoute.value.path).toBe("/patients");

    await router.push("/consultations/c-102/visit");
    await flushPromises();
    expect(field(wrapper, "오늘 가장 먼저 다룰 불편과 목표").element.value).toBe("");
  });
});

describe("R7 · practitioner-confirmed type", () => {
  it("adds confirmed types without changing the patient's selection and shows matching observations", async () => {
    const { wrapper, router } = await openApp("/consultations/c-101/visit");
    expect(wrapper.get('[data-testid="patient-types"]').text()).toBe("환자 미선택");
    expect(wrapper.get('[data-testid="confirmed-types"]').text()).toBe("미확인");
    expect(observe(wrapper)).not.toContain("NV01");

    await wrapper.get('input[type="checkbox"][value="NAIL"]').setValue(true);
    expect(wrapper.get('[data-testid="confirmed-types"]').text()).toBe("발톱");
    expect(observe(wrapper)).toContain("NV01");
    expect(observe(wrapper)).not.toContain("PV01");

    await wrapper.get('input[type="checkbox"][value="PAIN_INSOLE"]').setValue(true);
    expect(wrapper.get('[data-testid="confirmed-types"]').text()).toBe("발톱 + 통증·인솔");
    expect(observe(wrapper)).toContain("NV01");
    expect(observe(wrapper)).toContain("PV01");
    // 사진·발도장 탭 상태도 본문과 같은 확인 유형 기준으로 바뀝니다.
    expect(wrapper.findAll(".work-tabs a").find((tab) => tab.text().startsWith("사진·발도장"))!.get(".tab-progress").text()).toBe("미등록");
    expect(wrapper.get('[data-testid="patient-types"]').text()).toBe("환자 미선택");
    expect(wrapper.get(".page-heading").text()).toContain("환자 미선택");

    // 탭 이동만으로 사라지지 않고, 이동 전에 저장 여부를 묻습니다.
    await router.push("/consultations/c-101/media");
    await flushPromises();
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true);
    await dialogButton(wrapper, "계속 작성").trigger("click");
    expect(wrapper.get('[data-testid="confirmed-types"]').text()).toBe("발톱 + 통증·인솔");
  });

  it("locks the patient's own type, uses confirmed types on the photo tab, and blocks read-only changes", async () => {
    const { wrapper } = await openApp("/consultations/c-104/visit");
    expect(wrapper.get('[data-testid="patient-types"]').text()).toBe("통증·인솔");
    expect(wrapper.get('[data-testid="confirmed-types"]').text()).toBe("발톱 + 통증·인솔");
    expect(wrapper.get('input[type="checkbox"][value="PAIN_INSOLE"]').attributes("disabled")).toBeDefined();
    expect(wrapper.get('input[type="checkbox"][value="NAIL"]').attributes("disabled")).toBeUndefined();

    const media = await openApp("/consultations/c-104/media");
    expect(media.wrapper.find('section[aria-labelledby="nail-photo-title"]').exists()).toBe(true);
    expect(media.wrapper.get('section[aria-labelledby="footprint-title"] .surface-heading .status-badge').text()).toBe("발도장 기본 필요");

    const readonly = await openApp("/consultations/c-103/visit");
    expect(readonly.wrapper.get("fieldset.visit-form").attributes("disabled")).toBeDefined();
    const deleted = await openApp("/consultations/c-106-deleted/visit", { role: "ADMIN" });
    expect(deleted.wrapper.get("fieldset.visit-form").attributes("disabled")).toBeDefined();
  });
});

describe("V3 · safety confirmation inputs have distinct names", () => {
  it("links each confirmation value and memo to its question", async () => {
    const { wrapper } = await openApp("/consultations/c-102/visit");
    const nameOf = (element: Element) => (element.getAttribute("aria-labelledby") ?? "").split(" ").map((id) => document.getElementById(id)?.textContent?.trim()).join(" ");
    const values = wrapper.findAll("#visit-safety select").map((select) => nameOf(select.element));
    const memos = wrapper.findAll("#visit-safety input").map((input) => nameOf(input.element));
    expect(values).toEqual(["출혈·고름·상처·심한 붓기·열감 확인값", "갑작스러운 색·온도 변화 또는 체중부하 어려움 확인값", "진단·치료 중 건강상태 확인값"]);
    expect(memos).toEqual(["출혈·고름·상처·심한 붓기·열감 확인 메모", "갑작스러운 색·온도 변화 또는 체중부하 어려움 확인 메모", "진단·치료 중 건강상태 확인 메모"]);
  });
});
