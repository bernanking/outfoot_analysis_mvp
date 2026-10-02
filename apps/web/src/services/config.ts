// 웹 공개 설정을 읽는 곳입니다. 화면·기능 모듈은 import.meta.env를 직접 읽지 않고 이 함수를 씁니다.
// 현재 화면은 합성 데이터만 쓰므로 앱 시작 시 검사하지 않고, API를 실제로 호출할 때 검사합니다.
export interface WebConfig {
  apiBaseUrl: string;
}

export class WebConfigError extends Error {
  constructor(readonly variable: string) {
    super(`웹 설정 ${variable}이(가) 없거나 올바른 주소가 아닙니다. .env.example을 참고해 설정해 주세요.`);
    this.name = "WebConfigError";
  }
}

export function readWebConfig(env: Partial<ImportMetaEnv> = import.meta.env): WebConfig {
  const raw = env.VITE_API_BASE_URL?.trim();
  if (!raw) throw new WebConfigError("VITE_API_BASE_URL");
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("protocol");
  } catch {
    throw new WebConfigError("VITE_API_BASE_URL");
  }
  return { apiBaseUrl: raw.replace(/\/+$/, "") };
}
