import { createPinia, setActivePinia } from "pinia";
import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { createMemoryHistory } from "vue-router";
import QuestionnairePage from "./QuestionnairePage.vue";
import { createAppRouter } from "../router";

const mounted: Array<ReturnType<typeof mount>> = [];
afterEach(() => { mounted.forEach((wrapper) => wrapper.unmount()); mounted.length = 0; document.body.innerHTML = ""; });

async function open(path = "/q/preview-active") {
  const pinia = createPinia();
  setActivePinia(pinia);
  const router = createAppRouter(createMemoryHistory());
  await router.push(path);
  await router.isReady();
  const wrapper = mount(QuestionnairePage, { attachTo: document.body, global: { plugins: [pinia, router] } });
  mounted.push(wrapper);
  return wrapper;
}

async function next(wrapper: ReturnType<typeof mount>) {
  await wrapper.get("button.primary-button").trigger("click");
  await flushPromises();
}

async function chooseType(wrapper: ReturnType<typeof mount>, type: string) {
  await next(wrapper);
  await wrapper.get(`input[name="consultation-type"][value="${type}"]`).setValue(true);
}

function question(wrapper: ReturnType<typeof mount>, id: string) {
  const match = wrapper.find(`.question-card[data-question-id="${id}"]`);
  expect(match.exists(), `${id} should be visible`).toBe(true);
  return match;
}

async function goTo(wrapper: ReturnType<typeof mount>, title: string) {
  for (let guard = 0; guard < 20 && wrapper.get("h1").text() !== title; guard += 1) await next(wrapper);
  expect(wrapper.get("h1").text()).toBe(title);
}

const common = ["안내와 동의", "상담 내용", "안전 확인", "생활과 목표"];
const nailSteps = ["발톱 상태", "발톱 통증과 관리", "발톱 주변과 신발"];
const painSteps = ["불편 부위와 느낌", "생활 속 불편", "신발과 인솔"];

describe("questionnaire preview", () => {
  it.each([
    ["NAIL", [...common, ...nailSteps, "사진", "답변 확인"]],
    ["PAIN_INSOLE", [...common, ...painSteps, "답변 확인"]],
    ["BOTH", [...common, ...nailSteps, ...painSteps, "사진", "답변 확인"]],
  ])("splits the %s questionnaire into short steps with common steps once", async (type, expected) => {
    const wrapper = await open();
    const headings = [wrapper.get("h1").text()];
    await chooseType(wrapper, type as string);
    headings.push(wrapper.get("h1").text());
    expect(wrapper.get("progress").attributes("max")).toBe(String(expected.length));
    while (wrapper.get(".questionnaire-actions .primary-button").text() === "다음") {
      await next(wrapper);
      headings.push(wrapper.get("h1").text());
    }
    expect(headings).toEqual(expected);
    expect(headings.filter((heading) => heading === "안전 확인")).toHaveLength(1);
    expect(wrapper.get(".questionnaire-actions .primary-button").text()).toBe("제출하기");
  });

  it("does not show a total step count before the type is chosen", async () => {
    const wrapper = await open();
    expect(wrapper.get(".eyebrow").text()).toBe("1단계");
    expect(wrapper.find("progress").exists()).toBe(false);
    await chooseType(wrapper, "NAIL");
    expect(wrapper.get(".eyebrow").text()).toBe("2 / 9 단계");
    expect(wrapper.text()).toContain("질문 3단계가 이어집니다");
  });

  it("hides question codes and internal condition notes from patients", async () => {
    const wrapper = await open();
    await chooseType(wrapper, "BOTH");
    for (const title of ["상담 내용", "안전 확인", "발톱 상태", "불편 부위와 느낌", "신발과 인솔"]) {
      await goTo(wrapper, title);
      expect(wrapper.findAll(".question-card").length).toBeGreaterThan(0);
      expect(wrapper.text()).not.toMatch(/\b[CNP]\d{2}\b/);
      expect(wrapper.text()).not.toContain("확인하는 문항입니다");
      expect(wrapper.text()).not.toContain("확정 전");
    }
  });

  it("reveals N05 only after N02 pain is chosen", async () => {
    const wrapper = await open();
    await chooseType(wrapper, "NAIL");
    await goTo(wrapper, "발톱 상태");
    const n02 = question(wrapper, "N02");
    await n02.findAll("label").find((label) => label.text().includes("통증"))!.get("input").setValue(true);
    await next(wrapper);
    expect(wrapper.find('.question-card[data-question-id="N05"]').exists()).toBe(true);
    await wrapper.get(".questionnaire-actions .secondary-button").trigger("click");
    await flushPromises();
    await question(wrapper, "N02").findAll("label").find((label) => label.text().includes("통증"))!.get("input").setValue(false);
    await next(wrapper);
    expect(wrapper.find('.question-card[data-question-id="N05"]').exists()).toBe(false);
  });

  it("reveals P15 only after C13 insole goal and clears P02 when P01 changes", async () => {
    const wrapper = await open();
    await chooseType(wrapper, "PAIN_INSOLE");
    await goTo(wrapper, "생활과 목표");
    const c13 = question(wrapper, "C13");
    await c13.findAll("label").find((label) => label.text().includes("인솔 상담"))!.get("input").setValue(true);
    await next(wrapper);
    const p01 = question(wrapper, "P01");
    const left = p01.findAll("label").find((label) => label.text().includes("왼쪽 발가락"))!.get("input");
    await left.setValue(true);
    await question(wrapper, "P02").get("select").setValue("왼쪽 발가락");
    await left.setValue(false);
    expect(question(wrapper, "P02").get("select").attributes("disabled")).toBeDefined();
    await left.setValue(true);
    expect((question(wrapper, "P02").get("select").element as HTMLSelectElement).value).toBe("");
    await goTo(wrapper, "신발과 인솔");
    expect(wrapper.find('.question-card[data-question-id="P15"]').exists()).toBe(true);
  });

  it("shows detail inputs only for related answers and uses radios for short choices", async () => {
    const wrapper = await open();
    await chooseType(wrapper, "NAIL");
    await next(wrapper);
    const c07 = question(wrapper, "C07");
    expect(c07.findAll('input[type="radio"]')).toHaveLength(3);
    expect(c07.text()).not.toContain("다친 시기와 부위");
    await c07.get('input[value="예"]').setValue(true);
    expect(question(wrapper, "C07").text()).toContain("다친 시기와 부위");
    await question(wrapper, "C07").get('input[value="아니오"]').setValue(true);
    expect(question(wrapper, "C07").text()).not.toContain("다친 시기와 부위");
  });

  it("reviews answers by step, edits a step, and returns to the review", async () => {
    const wrapper = await open();
    await chooseType(wrapper, "PAIN_INSOLE");
    await next(wrapper);
    await question(wrapper, "C05").findAll("label").find((label) => label.text().trim() === "없음")!.get("input").setValue(true);
    await goTo(wrapper, "답변 확인");
    const safety = wrapper.findAll(".review-section").find((section) => section.text().includes("안전 확인"))!;
    expect(safety.get('[data-question-id="C05"] dd').text()).toBe("없음");
    expect(wrapper.text()).toContain("아직 답하지 않은 필수 질문이 있습니다");
    await safety.get("button").trigger("click");
    await flushPromises();
    expect(wrapper.get("h1").text()).toBe("안전 확인");
    expect(document.activeElement).toBe(wrapper.get("h1").element);
    await wrapper.findAll(".questionnaire-actions button").find((button) => button.text() === "답변 확인으로")!.trigger("click");
    await flushPromises();
    expect(wrapper.get("h1").text()).toBe("답변 확인");
  });

  it("shows the type, supplementary answers and details on the review step (R4)", async () => {
    const wrapper = await open();
    await chooseType(wrapper, "BOTH");
    await goTo(wrapper, "안전 확인");
    await question(wrapper, "C07").get('input[value="예"]').setValue(true);
    await question(wrapper, "C07").get("textarea").setValue("합성 설명: 지난주 계단");
    await goTo(wrapper, "발톱 상태");
    const n01 = question(wrapper, "N01");
    await n01.findAll("label").find((label) => label.text().includes("L1"))!.get("input").setValue(true);
    await n01.findAll("label").find((label) => label.text().includes("R2"))!.get("input").setValue(true);
    await n01.get("select").setValue("R2 · 오른쪽 둘째");
    await goTo(wrapper, "신발과 인솔");
    await question(wrapper, "P11").findAll("label").find((label) => label.text().trim() === "걷기")!.get("input").setValue(true);
    await question(wrapper, "P11").get('input[type="number"]').setValue("3");
    await goTo(wrapper, "답변 확인");

    const answer = (id: string) => wrapper.find(`.review-list [data-question-id="${id}"] dd`);
    expect(answer("C01").text()).toBe("발톱 + 통증·인솔");
    expect(answer("C07").text()).toBe("예");
    expect(answer("C07_DETAIL").text()).toBe("합성 설명: 지난주 계단");
    expect(answer("N01").text()).toBe("L1 · 왼쪽 엄지, R2 · 오른쪽 둘째");
    expect(answer("N01_REP").text()).toBe("R2 · 오른쪽 둘째");
    expect(answer("P11").text()).toBe("걷기");
    expect(answer("P11_WEEKLY").text()).toBe("주 3회");

    // 조건을 해제하면 상세 답변 줄이 사라지고, 수정한 값이 확인 화면에 반영됩니다.
    const safety = wrapper.findAll(".review-section").find((section) => section.text().includes("안전 확인"))!;
    await safety.get("button").trigger("click");
    await flushPromises();
    await question(wrapper, "C07").get('input[value="아니오"]').setValue(true);
    await wrapper.findAll(".questionnaire-actions button").find((button) => button.text() === "답변 확인으로")!.trigger("click");
    await flushPromises();
    expect(answer("C07").text()).toBe("아니오");
    expect(answer("C07_DETAIL").exists()).toBe(false);
  });

  it("tells an empty weekly count apart from 0 on the review step (P2-2)", async () => {
    const wrapper = await open();
    await chooseType(wrapper, "PAIN_INSOLE");
    await goTo(wrapper, "신발과 인솔");
    const weeklyInput = () => question(wrapper, "P11").get<HTMLInputElement>('input[type="number"]');
    const weekly = () => wrapper.get('.review-list [data-question-id="P11_WEEKLY"] dd').text();
    const backToEdit = async () => {
      const section = wrapper.findAll(".review-section").find((item) => item.text().includes("신발과 인솔"))!;
      await section.get("button").trigger("click");
      await flushPromises();
    };
    const backToReview = async () => {
      await wrapper.findAll(".questionnaire-actions button").find((button) => button.text() === "답변 확인으로")!.trigger("click");
      await flushPromises();
    };

    await goTo(wrapper, "답변 확인");
    expect(weekly()).toBe("미응답");

    await backToEdit();
    await weeklyInput().setValue("0");
    await backToReview();
    expect(weekly()).toBe("주 0회");

    await backToEdit();
    expect(weeklyInput().element.value).toBe("0");
    await weeklyInput().setValue("3");
    await backToReview();
    expect(weekly()).toBe("주 3회");

    await backToEdit();
    await weeklyInput().setValue("");
    await backToReview();
    expect(weekly()).toBe("미응답");
  });

  it("shows C01 error only after Next and focuses each new step", async () => {
    const wrapper = await open();
    await next(wrapper);
    expect(document.activeElement).toBe(wrapper.get("h1").element);
    expect(wrapper.find("#consultation-type-error").exists()).toBe(false);
    await next(wrapper);
    expect(wrapper.get("#consultation-type-error").text()).toContain("선택해 주세요");
    expect(document.activeElement).toBe(wrapper.get("#consultation-type-nail").element);
    await wrapper.get('input[value="NAIL"]').setValue(true);
    expect(wrapper.find("#consultation-type-error").exists()).toBe(false);
  });

  it.each([
    ["expired", "링크 사용 기간이 지났습니다", "새 링크를 요청"],
    ["revoked", "사용할 수 없는 링크입니다", "가장 최근에 받은 링크"],
    ["submitted", "이미 제출한 질문지입니다", "다시 작성할 필요가 없습니다"],
  ])("explains the %s link state and the next step without a form", async (token, heading, guide) => {
    const wrapper = await open(`/q/preview-${token}`);
    expect(wrapper.get("h1").text()).toBe(heading);
    expect(wrapper.text()).toContain(guide);
    expect(wrapper.find(".question-card").exists()).toBe(false);
    expect(wrapper.find("button.primary-button").exists()).toBe(false);
    expect(wrapper.find('a[href^="/consultations"], a[href="/login"]').exists()).toBe(false);
  });

  it("confirms receipt on the complete screen without asking to rewrite", async () => {
    const wrapper = await open("/q/preview-active/complete");
    expect(wrapper.get("h1").text()).toBe("답변이 접수되었습니다");
    expect(wrapper.text()).toContain("다시 작성하지 않아도 되며");
    expect(wrapper.text()).toContain("실제로 제출되지 않았습니다");
  });
});
