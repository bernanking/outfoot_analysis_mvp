import type { ApiErrorCode, ApiErrorResponse, ApiRuntime, HealthResponse } from "@outfoot/contracts";
import { ConfigError, loadServerConfig, type EnvReader, type ServerConfig } from "./config.ts";

// 웹 표준 Request/Response만 쓰는 API 처리기입니다. Supabase Edge Functions(Deno)에서 쓰고,
// AWS 이전 시 Node 진입점에서도 그대로 쓸 수 있게 플랫폼 전역(Deno·process)과 SDK를 직접 참조하지 않습니다.

/** 로그 한 줄. 요청 경로 원문(질문지 토큰이 들어갈 수 있음)·본문·헤더 값은 넣지 않고 경로 이름(route)만 남깁니다. */
export interface ApiLogEntry {
  level: "info" | "error";
  requestId: string;
  method: string;
  route: string;
  status: number;
  code?: ApiErrorCode;
  detail?: string;
}

export interface ApiDeps {
  runtime: ApiRuntime;
  readEnv: EnvReader;
  log?: (entry: ApiLogEntry) => void;
  newRequestId?: () => string;
}

const errorMessages: Record<ApiErrorCode, string> = {
  NOT_FOUND: "요청한 API를 찾을 수 없습니다.",
  METHOD_NOT_ALLOWED: "허용되지 않는 요청 방식입니다.",
  ORIGIN_NOT_ALLOWED: "허용되지 않은 출처의 요청입니다.",
  CONFIG_INVALID: "서버 설정을 확인해야 합니다. 잠시 후 다시 시도해 주세요.",
  INTERNAL_ERROR: "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
};

const allowedHeaders = "authorization, content-type, apikey, x-client-info, idempotency-key, if-match";

function json(body: unknown, status: number, requestId: string, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-request-id": requestId, ...extra },
  });
}

function errorBody(code: ApiErrorCode, requestId: string): ApiErrorResponse {
  return { error: { code, message: errorMessages[code], requestId } };
}

// Edge Functions는 함수 이름(api)을 경로 앞에 붙여 전달하고, 게이트웨이 경로(/functions/v1)가 남는 경우도 있어 둘 다 받습니다.
function apiPath(url: URL): string | null {
  const path = url.pathname.replace(/^\/functions\/v1(?=\/)/, "");
  return path.startsWith("/api/v1/") ? path.slice("/api/v1".length) : null;
}

type Route = { name: string; method: string; handle: (context: { config: ServerConfig; runtime: ApiRuntime }) => { status: number; body: unknown } };

const routes: Record<string, Route> = {
  "/health": {
    name: "health",
    method: "GET",
    // 연결되지 않은 통합은 NOT_CONNECTED로만 답합니다. DB·인증·파일 성공을 흉내 내지 않습니다.
    handle: ({ config, runtime }) => {
      const data: HealthResponse = {
        ok: true,
        service: "outfoot-api",
        runtime,
        integrations: { database: "NOT_CONNECTED", auth: "NOT_CONNECTED", storage: "NOT_CONNECTED", ai: config.aiMode },
      };
      return { status: 200, body: { data } };
    },
  },
};

export function createApiHandler(deps: ApiDeps): (request: Request) => Promise<Response> {
  const log = deps.log ?? (() => undefined);
  const newRequestId = deps.newRequestId ?? (() => crypto.randomUUID());
  // 설정은 시작 시 한 번 검사합니다. 오류면 모든 요청에 CONFIG_INVALID를 답하고, 누락·형식 오류 변수 이름만 로그에 남깁니다.
  let config: ServerConfig | null = null;
  let configError: ConfigError | null = null;
  try {
    config = loadServerConfig(deps.readEnv);
  } catch (error) {
    if (!(error instanceof ConfigError)) throw error;
    configError = error;
  }

  return async (request) => {
    const requestId = newRequestId();
    const url = new URL(request.url);
    const path = apiPath(url);
    const route = path === null ? undefined : routes[path];
    const routeName = route?.name ?? "unmatched";
    const respond = (status: number, body: unknown, headers: Record<string, string> = {}, code?: ApiErrorCode, detail?: string) => {
      log({ level: status >= 500 ? "error" : "info", requestId, method: request.method, route: routeName, status, code, detail });
      return json(body, status, requestId, headers);
    };

    // CORS: 브라우저 요청은 허용한 출처만 받습니다. Origin이 없는 서버 간 요청은 CORS 대상이 아니며, 권한은 각 경로의 인증에서 검사합니다.
    // 출처 목록은 설정 오류와 따로 확인해, 목록이 정상이면 허용 출처가 CONFIG_INVALID 응답을 읽을 수 있게 합니다.
    const allowedOrigins = config?.allowedOrigins ?? configError?.allowedOrigins ?? null;
    const origin = request.headers.get("origin");
    if (origin !== null && allowedOrigins !== null && !allowedOrigins.includes(origin)) {
      return respond(403, errorBody("ORIGIN_NOT_ALLOWED", requestId), {}, "ORIGIN_NOT_ALLOWED");
    }
    const cors: Record<string, string> = origin !== null && allowedOrigins !== null ? { "access-control-allow-origin": origin, vary: "Origin" } : {};
    // 출처 목록 자체가 없거나 틀리면 어떤 출처도 허용하지 않습니다(CORS 헤더 없음).
    if (allowedOrigins === null) {
      return respond(500, errorBody("CONFIG_INVALID", requestId), {}, "CONFIG_INVALID", configError?.message);
    }
    if (request.method === "OPTIONS") {
      const preflight = { ...cors, "access-control-allow-methods": "GET, POST, PATCH, DELETE, OPTIONS", "access-control-allow-headers": allowedHeaders, "access-control-max-age": "600" };
      log({ level: "info", requestId, method: request.method, route: routeName, status: 204 });
      return new Response(null, { status: 204, headers: { ...preflight, "x-request-id": requestId } });
    }
    if (!config) {
      return respond(500, errorBody("CONFIG_INVALID", requestId), cors, "CONFIG_INVALID", configError?.message);
    }

    if (!route) return respond(404, errorBody("NOT_FOUND", requestId), cors, "NOT_FOUND");
    if (request.method !== route.method) return respond(405, errorBody("METHOD_NOT_ALLOWED", requestId), { ...cors, allow: route.method }, "METHOD_NOT_ALLOWED");
    try {
      const result = route.handle({ config, runtime: deps.runtime });
      return respond(result.status, result.body, cors);
    } catch {
      return respond(500, errorBody("INTERNAL_ERROR", requestId), cors, "INTERNAL_ERROR");
    }
  };
}
