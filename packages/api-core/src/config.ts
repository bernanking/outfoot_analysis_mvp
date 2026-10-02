import { z } from "zod";
import { aiModeSchema, type AiMode } from "@outfoot/contracts";

// 환경변수를 읽는 방법은 실행환경 진입점이 넘겨줍니다(Edge Functions는 Deno.env.get, 이후 Node는 process.env).
// 이 패키지는 Deno·Node 전역을 직접 읽지 않습니다.
export type EnvReader = (name: string) => string | undefined;

export interface ServerConfig {
  appEnv: "local" | "staging" | "production";
  aiMode: AiMode;
  /** 브라우저 요청을 허용할 웹 출처. 와일드카드는 받지 않습니다. */
  allowedOrigins: string[];
}

// 이 골격이 실제로 쓰는 설정만 검사합니다. Supabase가 함수에 주입하는 연결값(SUPABASE_URL·키·DB URL)은
// DB·인증·파일을 연결하는 작업(T02·T03·T09)에서 필요해질 때 추가합니다.
export const serverEnvNames = ["APP_ENV", "AI_MODE", "ALLOWED_ORIGINS"] as const;

const isOrigin = (value: string): boolean => {
  try {
    return new URL(value).origin === value;
  } catch {
    return false;
  }
};

// 출처 목록은 다른 설정과 따로 해석합니다. 목록이 정상이면 다른 설정 오류가 있어도 허용 출처가 CONFIG_INVALID를 읽을 수 있습니다.
// 목록이 없거나 형식이 틀리면 null이며, 이때는 어떤 출처에도 CORS 헤더를 주지 않습니다(와일드카드·Origin 반사 없음).
export function parseAllowedOrigins(raw: string | undefined): string[] | null {
  const origins = (raw ?? "").split(",").map((item) => item.trim()).filter(Boolean);
  return origins.length > 0 && origins.every(isOrigin) ? origins : null;
}

const serverEnvSchema = z.object({
  APP_ENV: z.enum(["local", "staging", "production"]),
  // 실제 AI 공급자 호출은 O06·O07 결정 전까지 열지 않으므로 mock·disabled만 받습니다.
  AI_MODE: aiModeSchema,
  ALLOWED_ORIGINS: z.string().transform((value) => parseAllowedOrigins(value)).refine((origins) => origins !== null, "origin 목록이 아닙니다"),
});

/** 설정 오류. 변수 이름만 담고 값은 담지 않습니다(비밀값이 로그에 남지 않게). allowedOrigins는 출처 목록이 정상일 때만 있습니다. */
export class ConfigError extends Error {
  constructor(readonly missing: string[], readonly invalid: string[], readonly allowedOrigins: string[] | null = null) {
    super(`서버 설정 오류: 누락 ${missing.join(", ") || "없음"} · 형식 오류 ${invalid.join(", ") || "없음"}`);
    this.name = "ConfigError";
  }
}

export function loadServerConfig(read: EnvReader): ServerConfig {
  const raw = Object.fromEntries(serverEnvNames.map((name) => [name, read(name)?.trim() || undefined]));
  const missing = serverEnvNames.filter((name) => raw[name] === undefined);
  const parsed = serverEnvSchema.safeParse(raw);
  if (missing.length > 0 || !parsed.success) {
    const invalid = parsed.success ? [] : [...new Set(parsed.error.issues.map((issue) => String(issue.path[0])))].filter((name) => !missing.includes(name as never));
    throw new ConfigError([...missing], invalid, parseAllowedOrigins(raw.ALLOWED_ORIGINS));
  }
  return { appEnv: parsed.data.APP_ENV, aiMode: parsed.data.AI_MODE, allowedOrigins: parsed.data.ALLOWED_ORIGINS ?? [] };
}
