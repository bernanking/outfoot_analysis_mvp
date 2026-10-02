// Supabase Edge Functions(Deno) 진입점입니다. 실행환경 연동(환경변수 읽기, 로그 출력, 이후 Supabase SDK·인증·저장소 연결)은
// 이 폴더에만 두고, 요청 처리와 업무 규칙은 런타임 중립 패키지 @outfoot/api-core에 둡니다.
// 함수 게이트웨이의 JWT 검사는 끄고(config.toml verify_jwt = false) 직원 인증·공개 질문지 토큰을 api-core 경로별로 검사합니다(T03·T07).
// 현재는 상태 확인(/api/v1/health)만 있으며 DB·인증·파일은 연결되어 있지 않습니다.
import { createApiHandler } from "@outfoot/api-core";

const handler = createApiHandler({
  runtime: "supabase-edge",
  readEnv: (name) => Deno.env.get(name),
  log: (entry) => console.log(JSON.stringify(entry)),
});

Deno.serve(handler);
