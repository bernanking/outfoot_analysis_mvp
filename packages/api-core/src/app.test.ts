import { describe, expect, it } from "vitest";
import { apiErrorResponseSchema, dataEnvelope, healthResponseSchema } from "@outfoot/contracts";
import { createApiHandler, type ApiLogEntry } from "./app.ts";
import { ConfigError, loadServerConfig } from "./config.ts";

const env = (values: Record<string, string | undefined>) => (name: string) => values[name];
const validEnv = { APP_ENV: "local", AI_MODE: "mock", ALLOWED_ORIGINS: "http://127.0.0.1:5173, https://outfoot.example" };

function setup(values: Record<string, string | undefined> = validEnv) {
  const logs: ApiLogEntry[] = [];
  const handler = createApiHandler({ runtime: "test", readEnv: env(values), log: (entry) => logs.push(entry), newRequestId: () => "req-test" });
  return { handler, logs };
}

describe("server config", () => {
  it("names missing and invalid variables without echoing their values", () => {
    expect(() => loadServerConfig(env({}))).toThrow(ConfigError);
    try {
      loadServerConfig(env({ APP_ENV: "local", AI_MODE: "openai", ALLOWED_ORIGINS: "secret-like-value-not-origin" }));
    } catch (error) {
      const configError = error as ConfigError;
      expect(configError.missing).toEqual([]);
      expect(configError.invalid.sort()).toEqual(["AI_MODE", "ALLOWED_ORIGINS"]);
      expect(configError.message).not.toContain("secret-like-value-not-origin");
    }
    try {
      loadServerConfig(env({ AI_MODE: "mock" }));
    } catch (error) {
      expect((error as ConfigError).missing).toEqual(["APP_ENV", "ALLOWED_ORIGINS"]);
    }
  });

  it("refuses wildcard or path origins and real AI modes", () => {
    expect(() => loadServerConfig(env({ ...validEnv, ALLOWED_ORIGINS: "*" }))).toThrow(ConfigError);
    expect(() => loadServerConfig(env({ ...validEnv, ALLOWED_ORIGINS: "https://outfoot.example/app" }))).toThrow(ConfigError);
    expect(() => loadServerConfig(env({ ...validEnv, AI_MODE: "live" }))).toThrow(ConfigError);
    expect(loadServerConfig(env(validEnv)).allowedOrigins).toEqual(["http://127.0.0.1:5173", "https://outfoot.example"]);
  });
});

describe("api handler", () => {
  it("answers health without claiming connected integrations", async () => {
    const { handler } = setup();
    for (const path of ["/api/v1/health", "/functions/v1/api/v1/health"]) {
      const response = await handler(new Request(`http://localhost${path}`));
      expect(response.status).toBe(200);
      expect(response.headers.get("cache-control")).toBe("no-store");
      const body = dataEnvelope(healthResponseSchema).parse(await response.json());
      expect(body.data.integrations).toEqual({ database: "NOT_CONNECTED", auth: "NOT_CONNECTED", storage: "NOT_CONNECTED", ai: "mock" });
    }
  });

  it("returns a clear configuration error on every request when variables are missing", async () => {
    const { handler, logs } = setup({ APP_ENV: "local" });
    const response = await handler(new Request("http://localhost/api/v1/health"));
    expect(response.status).toBe(500);
    const body = apiErrorResponseSchema.parse(await response.json());
    expect(body.error.code).toBe("CONFIG_INVALID");
    expect(JSON.stringify(body)).not.toContain("AI_MODE");
    expect(logs[0].detail).toContain("AI_MODE");
    expect(logs[0].detail).toContain("ALLOWED_ORIGINS");
  });

  it("uses the error envelope for unknown paths and wrong methods", async () => {
    const { handler } = setup();
    const missing = await handler(new Request("http://localhost/api/v1/unknown"));
    expect(missing.status).toBe(404);
    expect(apiErrorResponseSchema.parse(await missing.json()).error).toMatchObject({ code: "NOT_FOUND", requestId: "req-test" });
    const wrongMethod = await handler(new Request("http://localhost/api/v1/health", { method: "POST" }));
    expect(wrongMethod.status).toBe(405);
    expect(wrongMethod.headers.get("allow")).toBe("GET");
  });

  it("allows only configured browser origins", async () => {
    const { handler } = setup();
    const allowed = await handler(new Request("http://localhost/api/v1/health", { headers: { origin: "http://127.0.0.1:5173" } }));
    expect(allowed.headers.get("access-control-allow-origin")).toBe("http://127.0.0.1:5173");
    const preflight = await handler(new Request("http://localhost/api/v1/health", { method: "OPTIONS", headers: { origin: "https://outfoot.example" } }));
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get("access-control-allow-headers")).toContain("authorization");
    const denied = await handler(new Request("http://localhost/api/v1/health", { headers: { origin: "https://evil.example" } }));
    expect(denied.status).toBe(403);
    expect(denied.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("lets an allowed origin read CONFIG_INVALID when only other settings are broken", async () => {
    const { handler, logs } = setup({ APP_ENV: "local", ALLOWED_ORIGINS: validEnv.ALLOWED_ORIGINS });
    const preflight = await handler(new Request("http://localhost/api/v1/health", { method: "OPTIONS", headers: { origin: "http://127.0.0.1:5173" } }));
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get("access-control-allow-origin")).toBe("http://127.0.0.1:5173");
    const response = await handler(new Request("http://localhost/api/v1/health", { headers: { origin: "http://127.0.0.1:5173" } }));
    expect(response.status).toBe(500);
    expect(response.headers.get("access-control-allow-origin")).toBe("http://127.0.0.1:5173");
    expect(response.headers.get("vary")).toBe("Origin");
    expect(apiErrorResponseSchema.parse(await response.json()).error.code).toBe("CONFIG_INVALID");
    expect(logs.at(-1)?.detail).toContain("AI_MODE");
    // 허용되지 않은 출처는 설정 오류 중에도 차단하고 Origin을 되돌려 주지 않습니다.
    const denied = await handler(new Request("http://localhost/api/v1/health", { headers: { origin: "https://evil.example" } }));
    expect(denied.status).toBe(403);
    expect(denied.headers.get("access-control-allow-origin")).toBeNull();
    const deniedPreflight = await handler(new Request("http://localhost/api/v1/health", { method: "OPTIONS", headers: { origin: "https://evil.example" } }));
    expect(deniedPreflight.status).toBe(403);
    expect(deniedPreflight.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("adds no CORS headers when the origin list itself is missing or invalid", async () => {
    for (const values of [{ ...validEnv, ALLOWED_ORIGINS: undefined }, { ...validEnv, ALLOWED_ORIGINS: "*" }, { ...validEnv, ALLOWED_ORIGINS: "https://a.example/path" }]) {
      const { handler } = setup(values);
      for (const method of ["GET", "OPTIONS"]) {
        const response = await handler(new Request("http://localhost/api/v1/health", { method, headers: { origin: "http://127.0.0.1:5173" } }));
        expect(response.status).toBe(500);
        expect(response.headers.get("access-control-allow-origin")).toBeNull();
        expect(await response.text()).not.toContain("https://a.example/path");
      }
    }
  });

  it("logs route names, never the raw path that may carry a questionnaire token", async () => {
    const { handler, logs } = setup();
    await handler(new Request("http://localhost/api/v1/public/questionnaires/raw-token-should-not-be-logged"));
    expect(logs).toHaveLength(1);
    expect(JSON.stringify(logs)).not.toContain("raw-token-should-not-be-logged");
    expect(logs[0]).toMatchObject({ route: "unmatched", status: 404 });
  });
});
