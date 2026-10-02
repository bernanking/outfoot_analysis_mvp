import { apiErrorResponseSchema, dataEnvelope, type ApiErrorCode } from "@outfoot/contracts";
import { z } from "zod";
import { readWebConfig, type WebConfig } from "./config";

// 업무 API(Supabase Edge Function api) 호출의 공통 경로입니다. 기능별 서비스 모듈만 이 함수를 쓰고,
// 페이지·컴포넌트는 fetch나 Supabase SDK를 직접 쓰지 않습니다. 응답은 공용 계약(Zod)으로 검증합니다.
// 직원 인증 토큰 첨부는 T03에서 이 경로에 추가합니다.

export class ApiError extends Error {
  constructor(readonly status: number, readonly code: ApiErrorCode | "NETWORK_ERROR" | "INVALID_RESPONSE", readonly requestId?: string, message = "요청을 처리하지 못했습니다.") {
    super(message);
    this.name = "ApiError";
  }
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  config?: WebConfig;
  fetcher?: typeof fetch;
}

export async function requestData<T extends z.ZodType>(path: string, schema: T, options: RequestOptions = {}): Promise<z.infer<T>> {
  const config = options.config ?? readWebConfig();
  const fetcher = options.fetcher ?? fetch;
  let response: Response;
  try {
    response = await fetcher(`${config.apiBaseUrl}${path}`, {
      method: options.method ?? "GET",
      headers: { accept: "application/json", ...(options.body === undefined ? {} : { "content-type": "application/json" }) },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new ApiError(0, "NETWORK_ERROR", undefined, "서버에 연결하지 못했습니다.");
  }
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const parsed = apiErrorResponseSchema.safeParse(payload);
    if (parsed.success) throw new ApiError(response.status, parsed.data.error.code, parsed.data.error.requestId, parsed.data.error.message);
    throw new ApiError(response.status, "INVALID_RESPONSE");
  }
  const envelope = dataEnvelope(z.unknown()).safeParse(payload);
  const parsed = envelope.success ? schema.safeParse(envelope.data.data) : null;
  if (!parsed?.success) throw new ApiError(response.status, "INVALID_RESPONSE", response.headers.get("x-request-id") ?? undefined, "서버 응답 형식이 올바르지 않습니다.");
  return parsed.data as z.infer<T>;
}
