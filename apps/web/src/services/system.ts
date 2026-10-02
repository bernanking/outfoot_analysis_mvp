import { healthResponseSchema, type HealthResponse } from "@outfoot/contracts";
import { requestData, type RequestOptions } from "./http";

// 서버 골격 상태 확인. 연결되지 않은 DB·인증·파일은 NOT_CONNECTED로 돌아오며 업무 기능 성공을 뜻하지 않습니다.
export function getApiHealth(options: Pick<RequestOptions, "config" | "fetcher"> = {}): Promise<HealthResponse> {
  return requestData("/health", healthResponseSchema, options);
}
