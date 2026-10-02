// 로컬 Supabase의 Data API(PostgREST)로 업무 테이블을 직접 조회·변경할 수 없는지 확인합니다(AT-26 일부, T02).
// 실행: npm run db:check-access  (로컬 Supabase가 실행 중이어야 함, 원격 환경에는 쓰지 않음)
//
// 판정(2xx가 아니라는 이유만으로 차단 성공으로 보지 않음):
// - 테이블 요청: 역할별 기대 HTTP 상태와 42501이 함께 맞을 때만 차단 확인(PostgREST: 42501은 인증된 요청 403, 아니면 401).
// - RPC: 404 PGRST202(비노출)일 때만 차단 확인. 실행 권한 회수는 pgTAP(npm run db:test)에서 확인.
// - 그 밖의 결과(인증 실패·형식 오류·제약 오류·서버 오류·네트워크 실패·상태 불일치)는 검사 미완료, 2xx는 접근 허용, 사용자 삭제 실패는 정리 실패.
// - 키·토큰·비밀번호·응답 본문은 출력하지 않습니다.
import { randomBytes, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const expectedTableStatus = { anon: 401, authenticated: 403, service_role: 403 };

export function classifyTableResponse(roleKind, response) {
  if (response.networkError) return { outcome: "INCOMPLETE", reason: "네트워크 실패" };
  if (response.status >= 200 && response.status < 300) return { outcome: "ALLOWED", reason: "2xx 응답" };
  if (response.code === "42501" && response.status === expectedTableStatus[roleKind]) return { outcome: "BLOCKED", reason: "권한 없음(42501)" };
  if (response.code === "42501") return { outcome: "INCOMPLETE", reason: `권한 오류의 HTTP 상태가 기대(${expectedTableStatus[roleKind]})와 다름` };
  if (response.status >= 500) return { outcome: "INCOMPLETE", reason: "서버 오류" };
  if (/^PGRST3\d\d$/.test(response.code) || response.status === 401) return { outcome: "INCOMPLETE", reason: "인증 실패" };
  if (/^23\d{3}$/.test(response.code)) return { outcome: "INCOMPLETE", reason: "제약 오류(권한 검사 전 단계 아님)" };
  if (/^PGRST[12]\d\d$/.test(response.code) || response.status === 400) return { outcome: "INCOMPLETE", reason: "요청 형식 오류" };
  return { outcome: "INCOMPLETE", reason: "예상하지 않은 응답" };
}

export function classifyRpcResponse(response) {
  if (response.networkError) return { outcome: "INCOMPLETE", reason: "네트워크 실패" };
  if (response.status >= 200 && response.status < 300) return { outcome: "ALLOWED", reason: "2xx 응답" };
  if (response.status === 404 && response.code === "PGRST202") return { outcome: "BLOCKED", reason: "Data API에 노출되지 않음(PGRST202)" };
  return { outcome: "INCOMPLETE", reason: "비노출 응답이 아님" };
}

export function summarize(records, { setupComplete, cleanupOk }) {
  const count = (outcome) => records.filter((record) => record.outcome === outcome).length;
  const allowed = count("ALLOWED");
  const incomplete = count("INCOMPLETE") + (setupComplete ? 0 : 1);
  const cleanupFailed = cleanupOk ? 0 : 1;
  const exitCode = allowed > 0 ? 1 : cleanupFailed > 0 ? 3 : incomplete > 0 ? 2 : 0;
  return { blocked: count("BLOCKED"), allowed, incomplete, cleanupFailed, exitCode, ok: exitCode === 0 };
}

// 합성 인증 사용자 비밀번호. 로컬 Auth 정책(supabase/config.toml: 최소 10자, letters_digits)을 항상 만족해야 합니다.
// 난수 24자(영문·숫자 62종)를 만든 뒤, 난수로 고른 서로 다른 두 위치에 숫자 하나와 영문 하나를 넣어 둘 다 반드시 들어가게 합니다.
// randomSource는 테스트에서 입력을 고정하려고 받습니다(기본은 crypto.randomBytes). 만든 비밀번호는 출력하지 않습니다.
const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const digits = "0123456789";
const passwordAlphabet = letters + digits;
export const syntheticPasswordLength = 24;
export function meetsPasswordPolicy(password) {
  return password.length >= 10 && /[A-Za-z]/.test(password) && /[0-9]/.test(password);
}
export function syntheticPassword(randomSource = randomBytes) {
  const bytes = randomSource(syntheticPasswordLength + 4);
  const chars = Array.from(bytes.subarray(0, syntheticPasswordLength), (byte) => passwordAlphabet[byte % passwordAlphabet.length]);
  const digitAt = bytes[syntheticPasswordLength] % syntheticPasswordLength;
  const letterAt = (digitAt + 1 + (bytes[syntheticPasswordLength + 1] % (syntheticPasswordLength - 1))) % syntheticPasswordLength;
  chars[digitAt] = digits[bytes[syntheticPasswordLength + 2] % digits.length];
  chars[letterAt] = letters[bytes[syntheticPasswordLength + 3] % letters.length];
  return chars.join("");
}

async function call(apiUrl, path, { method = "GET", headers = {}, body } = {}) {
  try {
    const response = await fetch(`${apiUrl}${path}`, { method, headers: { "content-type": "application/json", ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
    const text = await response.text();
    let code;
    try { code = String(JSON.parse(text)?.code ?? ""); } catch { code = ""; }
    return { status: response.status, code, text };
  } catch {
    return { status: 0, code: "", text: "", networkError: true };
  }
}

async function main() {
  const status = spawnSync("npx", ["supabase", "status", "-o", "json"], { encoding: "utf8" });
  if (status.status !== 0) { console.error("검사 미완료: 로컬 Supabase 상태를 읽지 못했습니다."); process.exit(2); }
  let env;
  try { env = JSON.parse(status.stdout); } catch { console.error("검사 미완료: 상태 출력을 해석하지 못했습니다."); process.exit(2); }
  const apiUrl = env.API_URL;
  if (!apiUrl || !/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(apiUrl)) { console.error("검사 미완료: 로컬 API 주소가 아닙니다(원격 검사 금지)."); process.exit(2); }
  const tables = ["organizations", "app_users", "patients", "consultations", "consultation_concern_types"];
  const records = [];
  const notes = [];
  let setupComplete = false;
  let cleanupOk = true;
  const admin = { apikey: env.SERVICE_ROLE_KEY, authorization: `Bearer ${env.SERVICE_ROLE_KEY}` };
  const email = `t02-dataapi-${randomUUID().slice(0, 8)}@example.test`;
  const password = syntheticPassword();
  const created = await call(apiUrl, "/auth/v1/admin/users", { method: "POST", headers: admin, body: { email, password, email_confirm: true } });
  let userId;
  try { userId = created.status >= 200 && created.status < 300 ? JSON.parse(created.text).id : null; } catch { userId = null; }
  if (!userId) notes.push(`검사 미완료: 합성 인증 사용자 생성 실패(HTTP ${created.status}).`);
  try {
    if (userId) {
      const signedIn = await call(apiUrl, "/auth/v1/token?grant_type=password", { method: "POST", headers: { apikey: env.ANON_KEY }, body: { email, password } });
      let userToken = null;
      try { userToken = signedIn.status === 200 ? JSON.parse(signedIn.text).access_token : null; } catch { userToken = null; }
      if (!userToken) {
        notes.push(`검사 미완료: 합성 사용자 로그인 실패(HTTP ${signedIn.status}).`);
      } else {
        const roles = [
          ["anon(레거시 키)", "anon", { apikey: env.ANON_KEY, authorization: `Bearer ${env.ANON_KEY}` }],
          ["anon(publishable 키)", "anon", { apikey: env.PUBLISHABLE_KEY }],
          ["authenticated(로그인 사용자)", "authenticated", { apikey: env.ANON_KEY, authorization: `Bearer ${userToken}` }],
          ["service_role(레거시 키)", "service_role", admin],
          ["service_role(secret 키)", "service_role", { apikey: env.SECRET_KEY }],
        ];
        const unknownId = "00000000-0000-4000-8000-000000000000";
        for (const [label, roleKind, headers] of roles) {
          for (const table of tables) {
            const keyFilter = table === "consultation_concern_types" ? `consultation_id=eq.${unknownId}` : `id=eq.${unknownId}`;
            const attempts = [
              ["조회", `/rest/v1/${table}?select=*&limit=1`, { headers }],
              ["추가", `/rest/v1/${table}`, { method: "POST", headers: { ...headers, prefer: "return=minimal" }, body: {} }],
              ["수정", `/rest/v1/${table}?${keyFilter}`, { method: "PATCH", headers: { ...headers, prefer: "return=minimal" }, body: table === "consultation_concern_types" ? { concern_type: "NAIL" } : { updated_at: new Date().toISOString() } }],
              ["삭제", `/rest/v1/${table}?${keyFilter}`, { method: "DELETE", headers: { ...headers, prefer: "return=minimal" } }],
            ];
            for (const [action, path, options] of attempts) {
              const response = await call(apiUrl, path, options);
              records.push({ label, target: table, action, status: response.status, code: response.code, ...classifyTableResponse(roleKind, response) });
            }
          }
          const rpc = await call(apiUrl, "/rest/v1/rpc/set_updated_at", { method: "POST", headers, body: {} });
          records.push({ label, target: "rpc/set_updated_at", action: "실행", status: rpc.status, code: rpc.code, ...classifyRpcResponse(rpc) });
        }
        setupComplete = true;
      }
    }
  } finally {
    if (userId) {
      const removed = await call(apiUrl, `/auth/v1/admin/users/${userId}`, { method: "DELETE", headers: admin });
      cleanupOk = removed.status >= 200 && removed.status < 300;
      notes.push(cleanupOk ? "정리: 합성 인증 사용자 삭제 완료" : `정리 실패: 합성 인증 사용자 삭제 실패(HTTP ${removed.status}).`);
    }
  }
  const names = { BLOCKED: "차단 확인", ALLOWED: "접근 허용", INCOMPLETE: "검사 미완료" };
  for (const r of records) console.log(`${names[r.outcome]}\t${r.label}\t${r.target}\t${r.action}\tHTTP ${r.status}\t${r.code}\t${r.reason}`);
  for (const note of notes) console.log(note);
  const summary = summarize(records, { setupComplete, cleanupOk });
  console.log(`요약: 차단 확인 ${summary.blocked} · 접근 허용 ${summary.allowed} · 검사 미완료 ${summary.incomplete} · 정리 실패 ${summary.cleanupFailed}`);
  console.log(summary.ok ? "결과: 통과" : "결과: 실패");
  process.exit(summary.exitCode);
}

const isMain = process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isMain) await main();
