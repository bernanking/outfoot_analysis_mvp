// Data API 접근 검사의 판정 회귀 테스트입니다(로컬 Supabase 없이 실행, 합성 응답만 사용).
// 실행: npm run test:scripts
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { classifyRpcResponse, classifyTableResponse, meetsPasswordPolicy, summarize, syntheticPassword, syntheticPasswordLength } from "./check-data-api-access.mjs";

describe("check-data-api-access 판정", () => {
  it("역할별 기대 상태와 42501이 함께 맞을 때만 차단 확인", () => {
    assert.equal(classifyTableResponse("anon", { status: 401, code: "42501" }).outcome, "BLOCKED");
    assert.equal(classifyTableResponse("authenticated", { status: 403, code: "42501" }).outcome, "BLOCKED");
    assert.equal(classifyTableResponse("service_role", { status: 403, code: "42501" }).outcome, "BLOCKED");
    // 상태가 기대와 다르면 권한 오류여도 검사 미완료
    assert.equal(classifyTableResponse("anon", { status: 403, code: "42501" }).outcome, "INCOMPLETE");
    assert.equal(classifyTableResponse("authenticated", { status: 401, code: "42501" }).outcome, "INCOMPLETE");
  });

  it("2xx는 접근 허용", () => {
    for (const status of [200, 201, 204]) assert.equal(classifyTableResponse("anon", { status, code: "" }).outcome, "ALLOWED");
    assert.equal(classifyRpcResponse({ status: 200, code: "" }).outcome, "ALLOWED");
  });

  it("권한 차단이 아닌 오류는 차단 성공으로 기록하지 않음", () => {
    const cases = [
      ["인증 실패(JWT)", { status: 401, code: "PGRST301" }, "인증 실패"],
      ["인증 실패(코드 없음)", { status: 401, code: "" }, "인증 실패"],
      ["요청 형식 오류(열 없음)", { status: 400, code: "PGRST204" }, "요청 형식 오류"],
      ["요청 형식 오류(코드 없음)", { status: 400, code: "" }, "요청 형식 오류"],
      ["NOT NULL 위반", { status: 400, code: "23502" }, "제약 오류(권한 검사 전 단계 아님)"],
      ["외래키 위반", { status: 409, code: "23503" }, "제약 오류(권한 검사 전 단계 아님)"],
      ["서버 오류", { status: 500, code: "XX000" }, "서버 오류"],
      ["게이트웨이 오류", { status: 502, code: "" }, "서버 오류"],
      ["네트워크 실패", { status: 0, code: "", networkError: true }, "네트워크 실패"],
      ["테이블 없음", { status: 404, code: "PGRST205" }, "요청 형식 오류"],
    ];
    for (const [name, response, reason] of cases) {
      for (const role of ["anon", "authenticated", "service_role"]) {
        const result = classifyTableResponse(role, response);
        assert.equal(result.outcome, "INCOMPLETE", `${name}(${role})`);
        assert.equal(result.reason, reason, `${name}(${role})`);
      }
    }
  });

  it("RPC는 비노출(404 PGRST202)만 차단 확인", () => {
    assert.equal(classifyRpcResponse({ status: 404, code: "PGRST202" }).outcome, "BLOCKED");
    for (const response of [{ status: 401, code: "42501" }, { status: 403, code: "42501" }, { status: 404, code: "" }, { status: 400, code: "PGRST100" }, { status: 500, code: "" }, { status: 0, code: "", networkError: true }]) {
      assert.equal(classifyRpcResponse(response).outcome, "INCOMPLETE", JSON.stringify(response));
    }
  });

  it("접근 허용·정리 실패·검사 미완료를 구분해 실패로 끝냄", () => {
    const blocked = { outcome: "BLOCKED" };
    assert.deepEqual(summarize([blocked, blocked], { setupComplete: true, cleanupOk: true }), { blocked: 2, allowed: 0, incomplete: 0, cleanupFailed: 0, exitCode: 0, ok: true });
    assert.equal(summarize([blocked, { outcome: "ALLOWED" }], { setupComplete: true, cleanupOk: false }).exitCode, 1);
    assert.equal(summarize([blocked], { setupComplete: true, cleanupOk: false }).exitCode, 3);
    assert.equal(summarize([blocked, { outcome: "INCOMPLETE" }], { setupComplete: true, cleanupOk: true }).exitCode, 2);
    // 준비 단계(사용자 생성·로그인) 실패는 기록이 없어도 검사 미완료
    const notStarted = summarize([], { setupComplete: false, cleanupOk: true });
    assert.equal(notStarted.ok, false);
    assert.equal(notStarted.exitCode, 2);
    assert.equal(summarize([], { setupComplete: false, cleanupOk: false }).exitCode, 3);
  });

  it("합성 비밀번호는 난수에 숫자·영문이 없어도 정책(10자 이상·영문+숫자)을 만족", () => {
    // 고정 입력: 기존 식(base64url)은 0 바이트만 받으면 'A'만 나와 숫자가 없어 Auth가 422 weak_password로 거부했습니다.
    assert.equal(meetsPasswordPolicy(Buffer.alloc(18, 0).toString("base64url")), false);
    const fixed = (byte) => (size) => Buffer.alloc(size, byte);
    const cases = [
      ["모두 0(영문 'A'만 나오는 입력)", fixed(0)],
      ["모두 52(숫자 '0'만 나오는 입력)", fixed(52)],
      ["모두 255", fixed(255)],
      ["위치 계산이 배열 끝에서 처음으로 넘어가는 입력", (size) => Buffer.from(Array.from({ length: size }, (_, index) => (index >= syntheticPasswordLength ? 23 : 61)))],
    ];
    for (const [name, source] of cases) {
      const password = syntheticPassword(source);
      assert.equal(password.length, syntheticPasswordLength, name);
      assert.ok(meetsPasswordPolicy(password), name);
      assert.match(password, /^[A-Za-z0-9]+$/, name);
    }
    // 정책 판정 자체
    assert.equal(meetsPasswordPolicy("abcdefghij"), false);
    assert.equal(meetsPasswordPolicy("1234567890"), false);
    assert.equal(meetsPasswordPolicy("abc123"), false);
    assert.equal(meetsPasswordPolicy("abcdefghi1"), true);
    // 기본 난수 경로도 정책을 만족(난수 품질은 crypto.randomBytes에 맡김)
    for (let index = 0; index < 200; index += 1) assert.ok(meetsPasswordPolicy(syntheticPassword()));
  });
});
