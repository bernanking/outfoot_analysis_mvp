import { describe, expect, it } from "vitest";
import { createMemoryHistory } from "vue-router";
import { createPinia, setActivePinia } from "pinia";

import { createAppRouter } from "./index";
import { usePreviewStore } from "../stores/preview";

describe("T04 routes", () => {
  it.each([
    ["/", "/consultations", "consultations"],
    ["/admin/records", "/admin/records/consultations", "admin-consultation-records"],
    ["/admin/records/audit", "/admin/records/audit", "admin-audit-records"],
    ["/missing-screen", "/404", "not-found"],
  ])("resolves %s to %s", async (path, destination, name) => {
    setActivePinia(createPinia());
    usePreviewStore().role = "ADMIN";
    const router = createAppRouter(createMemoryHistory());
    await router.push(path);
    await router.isReady();

    expect(router.currentRoute.value.path).toBe(destination);
    expect(router.currentRoute.value.name).toBe(name);
  });

  it("blocks practitioner preview from administrator pages", async () => {
    setActivePinia(createPinia());
    const router = createAppRouter(createMemoryHistory());
    await router.push("/admin/users");
    expect(router.currentRoute.value.path).toBe("/403");
  });

  it.each([
    "/patients", "/patients/new", "/patients/p-a", "/consultations/new",
    "/consultations/c-101/intake", "/consultations/c-101/questionnaire",
    "/consultations/c-101/visit", "/consultations/c-101/media",
    "/consultations/c-101/analysis", "/consultations/c-101/result",
    "/consultations/c-101/print", "/q/preview-active", "/q/preview-active/complete",
  ])("opens T04A screen %s", async (path) => {
    setActivePinia(createPinia());
    const router = createAppRouter(createMemoryHistory());
    await router.push(path);
    expect(router.currentRoute.value.path).toBe(path);
    expect(router.currentRoute.value.name).not.toBe("unknown-path");
  });
});
