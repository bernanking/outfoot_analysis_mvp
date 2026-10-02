import { describe, expect, it } from "vitest";
import { readWebConfig, WebConfigError } from "./config";
import { ApiError } from "./http";
import { getApiHealth } from "./system";

const config = { apiBaseUrl: "http://127.0.0.1:54321/functions/v1/api/v1" };
const respond = (status: number, body: unknown) => (async () => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })) as unknown as typeof fetch;

describe("web service boundary", () => {
  it("reports a missing or invalid API base URL clearly", () => {
    expect(() => readWebConfig({})).toThrow(WebConfigError);
    expect(() => readWebConfig({ VITE_API_BASE_URL: "not a url" })).toThrow(/VITE_API_BASE_URL/);
    expect(readWebConfig({ VITE_API_BASE_URL: "https://project.supabase.co/functions/v1/api/v1/" }).apiBaseUrl).toBe("https://project.supabase.co/functions/v1/api/v1");
  });

  it("validates the health payload with the shared contract", async () => {
    const health = { ok: true, service: "outfoot-api", runtime: "supabase-edge", integrations: { database: "NOT_CONNECTED", auth: "NOT_CONNECTED", storage: "NOT_CONNECTED", ai: "mock" } };
    let calledUrl = "";
    const fetcher = (async (url: string) => { calledUrl = url; return new Response(JSON.stringify({ data: health }), { status: 200 }); }) as unknown as typeof fetch;
    await expect(getApiHealth({ config, fetcher })).resolves.toEqual(health);
    expect(calledUrl).toBe(`${config.apiBaseUrl}/health`);
    // 연결 성공을 주장하는 응답은 계약 위반으로 거부합니다.
    const connected = { ...health, integrations: { ...health.integrations, database: "CONNECTED" } };
    await expect(getApiHealth({ config, fetcher: respond(200, { data: connected }) })).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });

  it("maps the error envelope and network failures", async () => {
    const error = { error: { code: "CONFIG_INVALID", message: "서버 설정을 확인해야 합니다.", requestId: "req-1" } };
    await expect(getApiHealth({ config, fetcher: respond(500, error) })).rejects.toMatchObject({ status: 500, code: "CONFIG_INVALID", requestId: "req-1" });
    const offline = (async () => { throw new TypeError("network"); }) as unknown as typeof fetch;
    await expect(getApiHealth({ config, fetcher: offline })).rejects.toBeInstanceOf(ApiError);
    await expect(getApiHealth({ config, fetcher: offline })).rejects.toMatchObject({ code: "NETWORK_ERROR" });
  });
});
