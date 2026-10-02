// 웹 번들 비밀값 검사 스크립트를 실제로 실행하는 회귀 테스트입니다(Node 내장 테스트 실행기, 합성 문자열만 사용).
// 실행: npm run test:scripts
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { after, describe, it } from "node:test";
import assert from "node:assert/strict";

const script = fileURLToPath(new URL("./check-web-bundle.mjs", import.meta.url));
const dirs = [];
after(() => dirs.forEach((dir) => rmSync(dir, { recursive: true, force: true })));

const b64 = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
const syntheticJwt = (payload) => `${b64({ alg: "HS256", typ: "JWT" })}.${b64(payload)}.c3ludGhldGljLXNpZ25hdHVyZQ`;

// 합성 번들(client)과 웹 폴더(web)를 임시로 만들고 실제 스크립트를 실행합니다. 실행 환경변수는 PATH와 지정값만 넘깁니다.
function prepare(files, options) {
  const dir = mkdtempSync(join(tmpdir(), "outfoot-bundle-"));
  dirs.push(dir);
  mkdirSync(join(dir, "client", "assets"), { recursive: true });
  mkdirSync(join(dir, "web"), { recursive: true });
  for (const [path, content] of Object.entries({ "client/assets/app.js": "console.log('ok')", ...files })) writeFileSync(join(dir, path), content);
  for (const [name, content] of Object.entries(options?.envFiles ?? {})) writeFileSync(join(dir, "web", name), content);
  const result = spawnSync(process.execPath, [script, join(dir, "client"), "--env-dir", join(dir, "web")], { encoding: "utf8", env: { PATH: process.env.PATH, ...(options?.env ?? {}) } });
  return { status: result.status, output: `${result.stdout}${result.stderr}` };
}

describe("check-web-bundle", () => {
  it("passes a clean bundle and allowed public values", () => {
    const anonJwt = syntheticJwt({ iss: "supabase", ref: "synthetic", role: "anon" });
    const result = prepare({
      "client/assets/app.js": `const url="https://synthetic.supabase.co";const key="sb_publishable_SyntheticPublicKey123";const anon="${anonJwt}";const css="mask-image-composite-value-long-name";`,
    }, { envFiles: { ".env.local": "VITE_API_BASE_URL=http://127.0.0.1:54321/functions/v1/api/v1\nVITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_SyntheticPublicKey123\n" } });
    assert.equal(result.status, 0, result.output);
  });

  it("detects a service_role JWT without printing the token or payload", () => {
    const token = syntheticJwt({ iss: "supabase", ref: "synthetic", role: "service_role" });
    const result = prepare({ "client/assets/app.js": `const k="${token}";` });
    assert.equal(result.status, 1);
    assert.match(result.output, /권한 우회 JWT/);
    assert.ok(!result.output.includes(token));
    assert.ok(!result.output.includes(token.split(".")[1]));
    assert.ok(!result.output.includes("synthetic"));
  });

  it("detects sb_secret and sk- style keys including dashed project keys", () => {
    const secret = "sb_secret_SyntheticSecretValue123";
    const projectKey = `sk-proj-${"Ab12_-".repeat(6)}`;
    for (const value of [secret, projectKey, `sk-${"Q".repeat(32)}`]) {
      const result = prepare({ "client/assets/app.js": `const v="${value}";` });
      assert.equal(result.status, 1, value.slice(0, 8));
      assert.ok(!result.output.includes(value));
    }
  });

  it("ignores malformed JWT-like strings instead of crashing", () => {
    const malformed = `eyJhbGciOiJIUzI1NiJ9.eyJub3QtanNvbg.sig eyJxxxx.eyJ!!!!.zzz`;
    const result = prepare({ "client/assets/app.js": `const v="${malformed}";` });
    assert.equal(result.status, 0, result.output);
  });

  it("detects secret-looking VITE_ variables in env files and process env without printing values", () => {
    const fromFile = prepare({}, { envFiles: { ".env.local": "VITE_SUPABASE_SERVICE_ROLE_KEY=placeholder-value-123\n" } });
    assert.equal(fromFile.status, 1);
    assert.match(fromFile.output, /VITE_SUPABASE_SERVICE_ROLE_KEY/);
    assert.ok(!fromFile.output.includes("placeholder-value-123"));
    const fromEnv = prepare({}, { env: { VITE_API_KEY: "sb_secret_SyntheticSecretValue123" } });
    assert.equal(fromEnv.status, 1);
    assert.ok(!fromEnv.output.includes("sb_secret_SyntheticSecretValue123"));
    // 서버 전용 이름(VITE_ 아님)은 Vite가 번들에 넣지 않으므로 환경변수 검사 대상이 아닙니다.
    const serverOnly = prepare({}, { env: { SUPABASE_SERVICE_ROLE_KEY: "sb_secret_SyntheticSecretValue123" } });
    assert.equal(serverOnly.status, 0, serverOnly.output);
  });

  it("exits with usage error when the bundle folder is missing", () => {
    const result = spawnSync(process.execPath, [script, join(tmpdir(), "outfoot-missing-bundle-dir")], { encoding: "utf8" });
    assert.equal(result.status, 2);
  });
});
