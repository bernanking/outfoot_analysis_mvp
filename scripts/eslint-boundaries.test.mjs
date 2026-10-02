// 플랫폼 경계 ESLint 규칙의 허용·차단 사례를 실제 설정(eslint.config.js)으로 확인합니다. 파일은 만들지 않고 가상 경로로 검사합니다.
// 실행: npm run test:scripts
// 파서 오류(fatal)는 차단 성공으로도, 허용 통과로도 세지 않고 테스트 실패로 처리합니다.
import { ESLint } from "eslint";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const cwd = fileURLToPath(new URL("..", import.meta.url));
const eslint = new ESLint({ cwd });
const boundaryRules = new Set(["no-restricted-imports", "no-restricted-syntax", "no-restricted-globals", "outfoot/no-platform-global-access"]);

async function lint(filePath, code) {
  const [result] = await eslint.lintText(code, { filePath });
  const fatal = result.messages.filter((message) => message.fatal || message.ruleId === null);
  assert.equal(fatal.length, 0, `파싱 오류: ${filePath}: ${code}\n${fatal.map((message) => message.message).join("\n")}`);
  return result.messages.filter((message) => boundaryRules.has(message.ruleId ?? ""));
}
const assertBlocked = async (filePath, code) => assert.ok((await lint(filePath, code)).length > 0, `차단되어야 함: ${filePath}: ${code}`);
const assertAllowed = async (filePath, code) => {
  const messages = await lint(filePath, code);
  assert.equal(messages.length, 0, `허용되어야 함: ${filePath}: ${code}\n${messages.map((message) => `${message.ruleId}: ${message.message}`).join("\n")}`);
};

const core = "packages/api-core/src/probe.ts";
const contracts = "packages/contracts/src/probe.ts";
const page = "apps/web/src/pages/probe.ts";
const service = "apps/web/src/services/probe.ts";

const webToCore = "../../../../packages/api-core/src/app";
const webToFunction = "../../../../supabase/functions/api/index.ts";

describe("platform boundary lint rules", () => {
  it("blocks platform dependencies in the runtime-neutral core", async () => {
    for (const code of [
      'import { readFileSync } from "fs"; export const a = readFileSync;',
      'import { readFile } from "fs/promises"; export const a = readFile;',
      'import { join } from "node:path"; export const a = join;',
      'export { readFileSync } from "fs";',
      'import { createClient } from "@supabase/supabase-js"; export const a = createClient;',
      'export * from "@supabase/supabase-js";',
      'import x from "npm:zod"; export const a = x;',
      // 실행환경 진입점(supabase/functions)을 상대경로로 가져오거나 재수출
      'import "../../../supabase/functions/api/index.ts";',
      'export * from "../../../supabase/functions/api/index.ts";',
      // 동적 import는 경로와 관계없이 금지
      'export const a = () => import("@supabase/supabase-js");',
      "export const a = () => import(`@supabase/supabase-js`);",
      'const name = "x"; export const a = () => import(name);',
      // 플랫폼·Node 전용 전역
      "export const a = process.env.X;",
      'export const a = Deno.env.get("X");',
      'export const a = Buffer.from("synthetic");',
      "export const a = __dirname;",
      "export const a = setImmediate;",
      // 전역 객체를 통한 접근: 점·대괄호, 타입 단언 한 겹·두 겹, non-null 단언
      "export const a = globalThis.process;",
      'export const a = globalThis["Deno"];',
      "export const a = self.Buffer;",
      'export const a = window["process"];',
      'export const a = window["Deno"];',
      'export const a = globalThis["process"];',
      'export const a = (globalThis as Record<string, unknown>).Deno;',
      'export const a = (globalThis as unknown as Record<string, unknown>)["Buffer"];',
      // 같은 파일에 같은 이름의 지역 변수가 다른 함수 안에 있어도 바깥의 실제 전역 접근은 차단
      'const f = (window: { process: string }) => window.process; export const a = [f, window["process"]];',
      "export const a = (globalThis as unknown as Record<string, unknown>).process;",
      'export const a = (globalThis as unknown as Record<string, unknown>)["Deno"];',
      'export const a = (globalThis as Record<string, unknown>)["Buffer"];',
      "export const a = globalThis!.process;",
    ]) await assertBlocked(core, code);
  });

  it("allows web-standard APIs, internal modules, and ordinary objects in the core", async () => {
    for (const code of [
      'import { z } from "zod"; export const a = z.string();',
      'import { healthResponseSchema } from "@outfoot/contracts"; export const a = healthResponseSchema;',
      'import { loadServerConfig } from "./config.ts"; export const a = loadServerConfig;',
      'export { loadServerConfig } from "./config.ts";',
      "export const a = () => crypto.randomUUID();",
      "export const a = globalThis.crypto;",
      'export const a = new Request("http://x"); export const b = new Response(null, { headers: new Headers() }); export const c = new URL("http://x");',
      'export const a = () => fetch("http://x");',
      // 일반 업무 객체의 process·Deno 속성: 타입 단언 유무, 점·대괄호
      "export const read = (data: { process: string }) => data.process;",
      'export const read = (data: { process: string }) => data["process"];',
      "export const read = (data: unknown) => (data as { process: string }).process;",
      'export const read = (data: unknown) => (data as { Deno: string })["Deno"];',
      "export const read = (data: unknown) => (data as unknown as { Buffer: string }).Buffer;",
      // 전역 객체와 같은 이름의 지역 매개변수·변수
      "export const read = (window: { process: string }) => window.process;",
      'export const read = (self: { Deno: string }) => self["Deno"];',
      "export const read = (globalThis: { Buffer: string }) => globalThis.Buffer;",
      "export function read(global: { process: string }) { return global.process; }",
      'const window = { process: "x" }; export const read = window.process;',
      // 지역 객체에 타입 단언 한 겹·두 겹
      "export const read = (window: unknown) => (window as { process: string }).process;",
      'export const read = (self: unknown) => (self as unknown as { Deno: string })["Deno"];',
      "export const read = (global: unknown) => (global as unknown as { Buffer: string }).Buffer;",
      // 계산된 속성명(변수)은 검사 제외. 변수 이름이 process여도 실제 속성명으로 보지 않음
      'const process = "crypto"; export const value = globalThis[process];',
      "export const value = (name: string) => globalThis[name as keyof typeof globalThis];",
    ]) await assertAllowed(core, code);
  });

  it("keeps shared contracts free of platform and server code", async () => {
    for (const code of [
      'import { createApiHandler } from "@outfoot/api-core"; export const a = createApiHandler;',
      'import { createApiHandler } from "../../api-core/src/app"; export const a = createApiHandler;',
      'export * from "../../api-core/src/app";',
      'import { readFileSync } from "fs"; export const a = readFileSync;',
      'import "../../../supabase/functions/api/index.ts";',
      'export const a = () => import("@supabase/supabase-js");',
      'export const a = Buffer.from("synthetic");',
      'export const a = (globalThis as unknown as Record<string, unknown>)["process"];',
    ]) await assertBlocked(contracts, code);
    await assertAllowed(contracts, 'import { z } from "zod"; export const a = z.string();');
    await assertAllowed(contracts, "export const read = (data: unknown) => (data as { process: string }).process;");
  });

  it("blocks server code and Supabase SDK in web code outside services", async () => {
    for (const code of [
      'import { createApiHandler } from "@outfoot/api-core"; export const a = createApiHandler;',
      'export { createApiHandler } from "@outfoot/api-core";',
      `import { createApiHandler } from "${webToCore}"; export const a = createApiHandler;`,
      `import x from "${webToFunction}"; export const a = x;`,
      `export const a = () => import("${webToCore}");`,
      `export const a = () => import(\`${webToCore}\`);`,
      `export const a = () => import(\`${webToFunction}\`);`,
      'import { createClient } from "@supabase/supabase-js"; export const a = createClient;',
      'export * from "@supabase/supabase-js";',
      'export const a = () => import("@supabase/supabase-js");',
      "export const a = () => import(`@supabase/supabase-js`);",
    ]) await assertBlocked(page, code);
    for (const code of [
      'import { getApiHealth } from "../services/system"; export const a = getApiHealth;',
      'import { healthResponseSchema } from "@outfoot/contracts"; export const a = healthResponseSchema;',
      'export const a = () => import("../pages/LoginPage.vue");',
      "export const a = () => import(`../pages/LoginPage.vue`);",
    ]) await assertAllowed(page, code);
  });

  it("allows Supabase SDK inside web services but still blocks server code there", async () => {
    for (const code of [
      'import { createClient } from "@supabase/supabase-js"; export const a = createClient;',
      'export const a = () => import("@supabase/supabase-js");',
      "export const a = () => import(`@supabase/supabase-js`);",
      "export const a = (url: string) => fetch(url);",
    ]) await assertAllowed(service, code);
    for (const code of [
      'import { createApiHandler } from "@outfoot/api-core"; export const a = createApiHandler;',
      `export const a = () => import("${webToCore}");`,
      `export const a = () => import(\`${webToCore}\`);`,
      `export const a = () => import(\`${webToFunction}\`);`,
    ]) await assertBlocked(service, code);
  });

  // 이름 검색이 아니라 실제 값 참조의 해석 결과로 지역·전역을 판정하는지 확인합니다(코어·계약 모두).
  it("judges global objects by the resolved value reference, not by name", async () => {
    const rule = "outfoot/no-platform-global-access";
    const defaultParamCase = [
      "export function read(",
      "  value = (self as unknown as { Deno: unknown }).Deno",
      ") {",
      '  const self = { Deno: "local" };',
      "  return [value, self.Deno];",
      "}",
    ].join("\n");
    for (const filePath of [core, contracts]) {
      // 매개변수 기본값의 self는 본문의 지역 선언이 아니라 실제 전역입니다. 기본값(2행)만 차단하고 본문(5행)은 허용합니다.
      const messages = (await lint(filePath, defaultParamCase)).filter((message) => message.ruleId === rule);
      assert.deepEqual(messages.map((message) => message.line), [2], `${filePath}: 기본값 접근만 차단해야 함`);
      for (const code of [
        // 타입 별칭·interface는 런타임 전역을 가리지 않습니다.
        "export type self = { Deno: unknown };\nexport const read =\n  (self as unknown as { Deno: unknown }).Deno;",
        "export interface window { process: unknown }\nexport const read = (window as unknown as window).process;",
        'export interface globalThis { Buffer: unknown }\nexport const read = globalThis["Buffer"];',
      ]) {
        const blocked = (await lint(filePath, code)).filter((message) => message.ruleId === rule);
        assert.equal(blocked.length, 1, `차단되어야 함: ${filePath}: ${code}`);
      }
      for (const code of [
        // 함수 본문의 실제 지역 객체
        'export function read() { const self = { Deno: "local" }; return self.Deno; }',
        // 앞선 매개변수를 참조하는 뒤쪽 매개변수 기본값
        "export function read(self: { Deno: string }, value = self.Deno) { return value; }",
        'export function read(window: { process: string }, value = window["process"]) { return value; }',
        // import 바인딩
        'import { window } from "./local.ts";\nexport const read = window.process;',
        // 바깥 함수의 매개변수를 쓰는 중첩 함수
        "export function outer(window: { process: string }) { return () => window.process; }",
        "export function outer(self: unknown) { return function inner() { return (self as unknown as { Deno: string }).Deno; }; }",
        // 같은 이름의 타입과 실제 지역 값 선언이 함께 있는 경우
        'type self = { Deno: string };\nconst self: self = { Deno: "x" };\nexport const read = self.Deno;',
        'interface global { Buffer: string }\nconst global: global = { Buffer: "x" };\nexport const read = global["Buffer"];',
      ]) await assertAllowed(filePath, code);
    }
  });

  it("treats parser errors as test failures, not as blocked or allowed", async () => {
    await assert.rejects(() => lint(core, "export const = ;"), /파싱 오류/);
  });
});
