import { createPinia, setActivePinia } from "pinia";
import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { createMemoryHistory, RouterView } from "vue-router";
import ConsultationsPage from "./ConsultationsPage.vue";
import PatientsPage from "./PatientsPage.vue";
import { createAppRouter } from "../router";

const mounted: Array<ReturnType<typeof mount>> = [];
afterEach(() => { mounted.forEach((wrapper) => wrapper.unmount()); mounted.length = 0; document.body.innerHTML = ""; });

async function open(component: Parameters<typeof mount>[0], path: string) {
  const pinia = createPinia();
  setActivePinia(pinia);
  const router = createAppRouter(createMemoryHistory());
  await router.push(path);
  await router.isReady();
  const wrapper = mount(component, { attachTo: document.body, global: { plugins: [pinia, router] } });
  mounted.push(wrapper);
  return { wrapper, router };
}

const rowCount = (wrapper: ReturnType<typeof mount>) => wrapper.findAll("tbody tr").length;

describe("consultation list filters", () => {
  it("stores filters in the address and restores them when the list opens again", async () => {
    const { wrapper, router } = await open(ConsultationsPage, "/consultations");
    await wrapper.get(".filter-bar label:nth-child(3) select").setValue("시술자 이");
    await flushPromises();
    expect(router.currentRoute.value.query).toEqual({ owner: "시술자 이" });
    expect(rowCount(wrapper)).toBe(3);

    const reopened = await open(ConsultationsPage, router.currentRoute.value.fullPath);
    expect((reopened.wrapper.get(".filter-bar label:nth-child(3) select").element as HTMLSelectElement).value).toBe("시술자 이");
    expect(rowCount(reopened.wrapper)).toBe(3);
    expect(reopened.wrapper.get(".applied-filters").text()).toContain("담당자: 시술자 이");
  });

  it("shows my consultations and resets every condition at once", async () => {
    const { wrapper, router } = await open(ConsultationsPage, "/consultations?owner=MINE&safety=없음&q=합성");
    expect(wrapper.get(".applied-filters").text()).toContain("담당자: 내 담당 (시술자 김)");
    expect(wrapper.get("details.more-filters").attributes("open")).toBeDefined();
    expect(rowCount(wrapper)).toBe(1);
    await wrapper.get(".result-summary button").trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.query).toEqual({});
    expect(rowCount(wrapper)).toBe(8);
  });

  it("separates no matching results from having no records", async () => {
    const { wrapper } = await open(ConsultationsPage, "/consultations?q=없는환자");
    expect(wrapper.get(".empty-panel").text()).toContain("조건에 맞는 상담이 없습니다");
    const empty = await open(ConsultationsPage, "/consultations");
    await empty.wrapper.get("details.preview-tools select").setValue("EMPTY");
    expect(empty.wrapper.get(".empty-panel").text()).toContain("등록된 상담이 없는 상태 예시");
  });

  it("keeps the patient search in the address", async () => {
    const { wrapper, router } = await open(PatientsPage, "/patients");
    await wrapper.get('input[type="search"]').setValue("5402");
    await flushPromises();
    expect(router.currentRoute.value.query).toEqual({ q: "5402" });
    expect(rowCount(wrapper)).toBe(1);
    expect(wrapper.get("tbody tr").text()).toContain("새 상담 접수");
  });
});

describe("patient list return path (R5)", () => {
  async function openApp(path: string) {
    const pinia = createPinia();
    setActivePinia(pinia);
    const router = createAppRouter(createMemoryHistory());
    await router.push(path);
    await router.isReady();
    const wrapper = mount({ components: { RouterView }, template: "<main><RouterView /></main>" }, { attachTo: document.body, global: { plugins: [pinia, router] } });
    mounted.push(wrapper);
    return { wrapper, router };
  }
  const searchThenOpenDetail = async () => {
    const app = await openApp("/patients");
    await app.wrapper.get('input[type="search"]').setValue("5402");
    await flushPromises();
    await app.wrapper.get('tbody a[href="/patients/p-b"]').trigger("click");
    await flushPromises();
    expect(app.router.currentRoute.value.path).toBe("/patients/p-b");
    return app;
  };

  it("returns from patient detail to the searched list with 환자 목록으로", async () => {
    const { wrapper, router } = await searchThenOpenDetail();
    const back = wrapper.findAll("a").find((link) => link.text() === "환자 목록으로")!;
    expect(back.attributes("href")).toBe("/patients?q=5402");
    await back.trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.fullPath).toBe("/patients?q=5402");
    expect((wrapper.get('input[type="search"]').element as HTMLInputElement).value).toBe("5402");
    expect(rowCount(wrapper)).toBe(1);
  });

  it("returns with the breadcrumb link as well", async () => {
    const { wrapper, router } = await searchThenOpenDetail();
    await wrapper.get('nav[aria-label="현재 위치"] a').trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.fullPath).toBe("/patients?q=5402");
    expect(rowCount(wrapper)).toBe(1);
  });

  it("uses the plain list when the detail is opened directly", async () => {
    const { wrapper } = await openApp("/patients/p-b");
    expect(wrapper.findAll("a").find((link) => link.text() === "환자 목록으로")!.attributes("href")).toBe("/patients");
    expect(wrapper.get('nav[aria-label="현재 위치"] a').attributes("href")).toBe("/patients");
  });
});
