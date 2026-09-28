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
  const match = wrapper.findAll(".question-card").find((item) => item.text().includes(`${id} ·`));
  expect(match, `${id} should be visible`).toBeDefined();
  return match!;
}

describe("questionnaire preview", () => {
  it.each([
    ["NAIL", ["안내와 동의", "상담 내용", "안전 확인", "생활과 목표", "발톱 질문", "사진과 확인"]],
    ["PAIN_INSOLE", ["안내와 동의", "상담 내용", "안전 확인", "생활과 목표", "통증·인솔 질문", "사진과 확인"]],
    ["BOTH", ["안내와 동의", "상담 내용", "안전 확인", "생활과 목표", "발톱 질문", "통증·인솔 질문", "사진과 확인"]],
  ])("shows the %s stage sequence with common stages once", async (type, expected) => {
    const wrapper = await open();
    const headings = [wrapper.get("h1").text()];
    await chooseType(wrapper, type as string);
    headings.push(wrapper.get("h1").text());
    expect(wrapper.get("progress").attributes("max")).toBe(String(expected.length));
    while (wrapper.find("button.primary-button").exists()) {
      await next(wrapper);
      headings.push(wrapper.get("h1").text());
    }
    expect(headings).toEqual(expected);
    expect(headings.filter((heading) => heading === "안전 확인")).toHaveLength(1);
  });

  it("reveals N05 only after N02 pain is chosen", async () => {
    const wrapper = await open();
    await chooseType(wrapper, "NAIL");
    await next(wrapper); await next(wrapper); await next(wrapper);
    expect(wrapper.text()).not.toContain("N05 · 통증 유발");
    const n02 = question(wrapper, "N02");
    await n02.findAll("label").find((label) => label.text().includes("통증"))!.get("input").setValue(true);
    expect(wrapper.text()).toContain("N05 · 통증 유발");
  });

  it("reveals P15 only after C13 insole goal and clears P02 when P01 changes", async () => {
    const wrapper = await open();
    await chooseType(wrapper, "PAIN_INSOLE");
    await next(wrapper); await next(wrapper);
    const c13 = question(wrapper, "C13");
    await c13.findAll("label").find((label) => label.text().includes("인솔 상담"))!.get("input").setValue(true);
    await next(wrapper);
    expect(wrapper.text()).toContain("P15 · 목표 신발");
    const p01 = question(wrapper, "P01");
    const left = p01.findAll("label").find((label) => label.text().includes("왼쪽 발가락"))!.get("input");
    await left.setValue(true);
    await question(wrapper, "P02").get("select").setValue("왼쪽 발가락");
    await left.setValue(false);
    expect(question(wrapper, "P02").get("select").attributes("disabled")).toBeDefined();
    await left.setValue(true);
    expect((question(wrapper, "P02").get("select").element as HTMLSelectElement).value).toBe("");
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
    ["expired", "만료된 링크"], ["revoked", "폐기된 링크"], ["submitted", "이미 제출한 질문지"],
  ])("shows %s token state without an editable form", async (token, heading) => {
    const wrapper = await open(`/q/preview-${token}`);
    expect(wrapper.get("h1").text()).toContain(heading);
    expect(wrapper.find(".question-card").exists()).toBe(false);
    expect(wrapper.find("button.primary-button").exists()).toBe(false);
  });
});
