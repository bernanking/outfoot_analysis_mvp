import { mount, flushPromises } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { createMemoryHistory } from "vue-router";
import { createPinia } from "pinia";

import { createAppRouter } from "../router";
import StaffLayout from "./StaffLayout.vue";

const mounted: Array<ReturnType<typeof mount>> = [];

afterEach(() => {
  mounted.forEach((wrapper) => wrapper.unmount());
  mounted.length = 0;
  document.body.innerHTML = "";
});

async function mountLayout(path = "/consultations") {
  const router = createAppRouter(createMemoryHistory());
  await router.push(path);
  await router.isReady();
  const wrapper = mount(StaffLayout, {
    attachTo: document.body,
    global: { plugins: [createPinia(), router], stubs: { RouterView: true } },
  });
  mounted.push(wrapper);
  return wrapper;
}

describe("staff preview layout", () => {
  it.each([
    ["/consultations/c-103/visit", "/consultations"],
    ["/consultations/c-101/print", "/consultations"],
    ["/patients/p-a", "/patients"],
    ["/consultations/new", "/consultations/new"],
    ["/patients/new", "/patients/new"],
  ])("keeps the parent menu active on %s", async (path, activeHref) => {
    const wrapper = await mountLayout(path);
    const active = wrapper.findAll(".nav-link.nav-link--active");
    expect(active).toHaveLength(1);
    expect(active[0].attributes("href")).toBe(activeHref);
  });

  it("keeps preview tools collapsed by default and separate from the current user", async () => {
    const wrapper = await mountLayout();
    const tools = wrapper.get<HTMLDetailsElement>(".topbar-user details.preview-tools");
    expect(tools.element.open).toBe(false);
    expect(tools.get(".preview-tools-label-full").text()).toBe("시안 검토 도구");
    expect(tools.get(".preview-tools-label-short").attributes("aria-hidden")).toBe("true");
    expect(wrapper.get(".current-user").isVisible()).toBe(true);
  });

  it("shows operations links only in the administrator preview", async () => {
    const wrapper = await mountLayout();
    expect(wrapper.text()).toContain("시술자 김 · 시술자");
    expect(wrapper.find('a[href="/admin/users"]').exists()).toBe(false);

    await wrapper.get("#preview-role").setValue("ADMIN");
    expect(wrapper.text()).toContain("관리자 박 · 관리자");
    expect(wrapper.find('a[href="/admin/users"]').exists()).toBe(true);
    expect(wrapper.find('a[href="/admin/records/audit"]').exists()).toBe(true);
  });

  it("moves focus into the menu and restores it on Escape", async () => {
    const wrapper = await mountLayout();
    const toggle = wrapper.get<HTMLButtonElement>(".menu-toggle");
    await toggle.trigger("click");
    await flushPromises();

    expect(document.activeElement).toBe(wrapper.get('a[href="/consultations"].nav-link').element);
    expect(wrapper.get(".staff-content").attributes("inert")).toBeDefined();

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await flushPromises();
    expect(document.activeElement).toBe(toggle.element);
    expect(wrapper.get(".staff-content").attributes("inert")).toBeUndefined();
  });

  it("closes the menu and releases inert when the current route link is clicked", async () => {
    const wrapper = await mountLayout();
    await wrapper.get(".menu-toggle").trigger("click");
    await flushPromises();

    await wrapper.get('a[href="/consultations"].nav-link').trigger("click");
    await flushPromises();

    expect(wrapper.get(".menu-toggle").attributes("aria-expanded")).toBe("false");
    expect(wrapper.find(".mobile-scrim").exists()).toBe(false);
    expect(wrapper.get(".staff-content").attributes("inert")).toBeUndefined();
    expect(document.activeElement).toBe(wrapper.get("#main-content").element);
  });

  it("leaves an administrator page when preview role changes to practitioner", async () => {
    const pinia = createPinia();
    const router = createAppRouter(createMemoryHistory());
    const { usePreviewStore } = await import("../stores/preview");
    usePreviewStore(pinia).role = "ADMIN";
    await router.push("/admin/users");
    await router.isReady();
    const wrapper = mount(StaffLayout, {
      attachTo: document.body,
      global: { plugins: [pinia, router], stubs: { RouterView: true } },
    });
    mounted.push(wrapper);
    await wrapper.get("#preview-role").setValue("PRACTITIONER");
    await flushPromises();
    expect(router.currentRoute.value.path).toBe("/403");
  });
});
