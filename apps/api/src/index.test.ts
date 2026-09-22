import { describe, expect, it } from "vitest";

import worker from "./index";

const testEnv = {
  ASSETS: {
    fetch: () => Promise.resolve(new Response("asset")),
  },
} as unknown as Env;

describe("worker api", () => {
  it("returns a validated health response", async () => {
    const request = new Request(
      "http://local.test/api/v1/health",
    ) as Parameters<typeof worker.fetch>[0];
    const response = await worker.fetch(
      request,
      testEnv,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      service: "outfoot-api",
    });
  });

  it("returns only synthetic demo consultations", async () => {
    const request = new Request(
      "http://local.test/api/v1/demo/consultations",
    ) as Parameters<typeof worker.fetch>[0];
    const response = await worker.fetch(
      request,
      testEnv,
    );

    const consultations = (await response.json()) as Array<{ synthetic: boolean }>;
    expect(consultations.length).toBeGreaterThan(0);
    expect(consultations.every((item) => item.synthetic)).toBe(true);
  });
});
