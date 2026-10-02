# API 계약 초안

업무 API는 Supabase Edge Function `api` 하나가 처리하며(D25·P18) 기준 주소는 `<SUPABASE_URL>/functions/v1/api/v1`입니다(웹 설정 `VITE_API_BASE_URL`). 아래 경로는 이 기준 주소 뒤에 붙습니다. JSON 응답은 `{ data, meta }`, 오류는 `{ error: { code, message, fieldErrors?, requestId } }` 형태이며 공용 Zod 계약(`packages/contracts`)으로 서버·웹이 함께 검증합니다. 목록은 cursor 또는 page 기반 중 하나로 초기 구현에서 통일합니다.

현재 구현(T01A)은 `GET /health`뿐이며, DB·인증·파일·AI 연결 상태를 모두 `NOT_CONNECTED`(AI는 `mock`/`disabled`)로만 답합니다. 아래 표의 나머지 경로는 계획입니다.

## 인증과 호출 경로

- 직원 경로: 브라우저가 Supabase Auth로 로그인해 받은 접근 토큰을 `Authorization: Bearer`로 보냅니다. 함수는 토큰 서명·만료를 확인한 뒤 `authUserId`로 업무 사용자를 조회해 현재 활성·역할·기관을 확인합니다(JWT 역할 클레임만으로 판단하지 않음). 비활성·미매핑이면 `AUTH_INVALID` 또는 `ACCOUNT_DISABLED`.
- 공개 질문지 경로(`/public/...`): 직원 토큰을 받지 않고 질문지 토큰의 해시로 상담을 찾습니다. 그 상담의 질문지·허용된 사진 업로드만 다룹니다. 토큰을 경로·헤더·본문 중 어디로 보낼지는 플랫폼 로그 기록 여부를 검증한 뒤 T07에서 확정합니다([보안](13_SECURITY_OPERATIONS.md#공개-질문지-링크)). 표의 `:token` 경로는 현재 초안입니다.
- 내부 작업 경로(`/internal/jobs/run`): pg_cron이 호출하며 함수 비밀값으로 만든 전용 키를 확인합니다. 브라우저 출처를 받지 않습니다(T10A).
- 함수 게이트웨이의 JWT 검사는 끄고(`verify_jwt = false`) 위 세 가지를 경로별로 검사합니다. 검사 없는 경로를 추가하지 않습니다.
- 브라우저 요청은 함수 비밀값 `ALLOWED_ORIGINS`에 등록한 출처만 받습니다(CORS).

## 주요 엔드포인트

| 메서드·경로 | 용도 | 권한 |
| --- | --- | --- |
| (Supabase Auth) 로그인·로그아웃·토큰 갱신 | 아이디를 내부 인증 이메일로 바꿔 Supabase Auth에 직접 요청(P20·O13). 업무 API 경로 아님 | 공개/로그인 |
| GET `/me` | 현재 업무 사용자(이름·역할·기관·상태·비밀번호 변경 필요 여부) | 직원 |
| GET `/health` | 서버 골격 상태. 연결 상태는 `NOT_CONNECTED`로만 표시 | 공개(구현됨) |
| GET·POST `/patients` | 검색·등록 | 직원 |
| GET·PATCH `/patients/:id` | 상세·수정 | 직원 |
| GET·POST `/patients/:id/consultations` | 회차 조회·생성 | 직원 |
| GET·PATCH `/consultations/:id` | 상담 작업 조회·저장 | 조회 권한/담당자·관리자 |
| DELETE `/consultations/:id` | 사유 있는 논리삭제 | 관리자 |
| POST `/consultations/:id/questionnaire-links` | 링크 발급·재발급 | 담당자·관리자 |
| GET `/public/questionnaires/:token` | 질문 정의·제출 가능 상태. 기존 답변·환자 상세는 반환하지 않음 | 링크 |
| POST `/public/questionnaires/:token/submissions` | 원자적 제출 | 링크 |
| POST `/consultations/:id/media/upload-request` | 권한·형식·크기 확인 후 서버가 정한 객체 경로의 서명 업로드 URL 발급 | 허용된 주체 |
| POST `/consultations/:id/media/complete` | 객체 존재·크기·형식·해시 확인 후 `READY` | 허용된 주체 |
| GET `/media/:id/download` | 권한 확인 후 짧게 만료되는 서명 조회 URL 발급(저장하지 않음) | 직원 |
| POST `/public/questionnaires/:token/media/upload-request` | 질문지 허용 유형 사진만 업로드 URL 발급 | 링크 |
| POST `/consultations/:id/footprint-analyses` | 발도장 분석 작업 생성 | 담당자·관리자 |
| GET `/footprint-analyses/:id` | 상태·결과(요청과 조회 분리) | 직원 |
| POST `/footprint-analyses/:id/overrides` | 시술자 보완 | 담당자·관리자 |
| POST `/consultations/:id/ai-analyses` | 종합분석 작업 생성 | 담당자·관리자 |
| GET `/ai-analyses/:id` | 상태·원본·구조화 결과 | 직원 |
| POST `/consultations/:id/final-reports` | 최종본 확정·개정 | 담당 시술자, 관리자 여부 보류 |
| GET `/consultations/:id/print-view` | 확정 고객안내 | 직원 |
| GET·POST·PATCH `/admin/users` | 계정관리. 생성·비활성화·비밀번호 초기화는 함수가 관리자 권한을 확인한 뒤 Supabase Admin API 호출 | 관리자 |
| POST `/internal/jobs/run` | 작업 선점·실행·회수 1회 | 내부(pg_cron) |

## 동시성·중복 방지

PATCH 요청은 `If-Match` 또는 body `version`을 보내고 불일치 시 `409 VERSION_CONFLICT`를 반환합니다. 질문지 제출·분석 실행은 `Idempotency-Key`를 사용합니다. 업로드 완료는 checksum과 저장 객체 상태를 확인한 뒤 MediaAsset을 `READY`로 바꿉니다. 분석·AI 작업의 선점·재시도·중단 회수·외부 호출 결과 불명 처리는 [아키텍처](08_ARCHITECTURE.md#분석ai-작업-처리)를 따릅니다. 최종확정은 권한·입력 버전 비교·확정본 생성·감사 기록을 한 트랜잭션으로 처리합니다.

## 발도장 어댑터 계약

분석 방식이 미정이어도 API 응답 구조는 다음을 따릅니다.

```json
{
  "status": "SUCCEEDED",
  "provider": "MANUAL_REVIEW",
  "quality": { "status": "REVIEW_REQUIRED", "reasons": [] },
  "measurements": {
    "footLengthMm": { "status": "NOT_MEASURABLE", "value": null },
    "contactAreaMm2": { "status": "NOT_MEASURABLE", "value": null }
  },
  "observations": [],
  "screening": { "status": "NOT_CONFIGURED", "labels": [] },
  "inputSnapshotHash": "..."
}
```

미구성 상태에서 성공·정상 수치를 생성하지 않습니다. 공급자별 원시 응답은 내부 보관하고 화면은 정규화 결과만 사용합니다.

## 오류코드 예시

`AUTH_INVALID`, `ACCOUNT_DISABLED`, `FORBIDDEN`, `ORIGIN_NOT_ALLOWED`, `METHOD_NOT_ALLOWED`, `CONFIG_INVALID`, `INTERNAL_ERROR`, `NOT_FOUND`, `VALIDATION_ERROR`, `VERSION_CONFLICT`, `LINK_EXPIRED`, `LINK_REVOKED`, `ALREADY_SUBMITTED`, `MEDIA_TOO_LARGE`, `MEDIA_INVALID`, `ANALYSIS_NOT_CONFIGURED`, `ANALYSIS_INPUT_INCOMPLETE`, `ANALYSIS_FAILED`, `AI_OUTPUT_INVALID`, `AI_OUTCOME_UNKNOWN`, `RESULT_STALE`, `RATE_LIMITED`. 현재 계약에 구현된 코드는 `NOT_FOUND`, `METHOD_NOT_ALLOWED`, `ORIGIN_NOT_ALLOWED`, `CONFIG_INVALID`, `INTERNAL_ERROR`입니다.

모든 오류 메시지는 개인정보·내부 프롬프트·공급자 키·스택트레이스를 노출하지 않습니다. 실제 OpenAPI 파일은 `packages/contracts/openapi.yaml`에서 관리합니다.
