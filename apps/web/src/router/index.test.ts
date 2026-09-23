import { describe, expect, it } from "vitest";
import { createMemoryHistory } from "vue-router";

import { createAppRouter } from "./index";

describe("T04 routes", () => {
  it.each([
    ["/", "/consultations", "consultations"],
    ["/admin/records", "/admin/records/consultations", "admin-consultation-records"],
    ["/admin/records/audit", "/admin/records/audit", "admin-audit-records"],
    ["/missing-screen", "/404", "not-found"],
  ])("resolves %s to %s", async (path, destination, name) => {
    const router = createAppRouter(createMemoryHistory());
    await router.push(path);
    await router.isReady();

    expect(router.currentRoute.value.path).toBe(destination);
    expect(router.currentRoute.value.name).toBe(name);
  });
});
