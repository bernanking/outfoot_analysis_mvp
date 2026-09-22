# API 계약 초안

기본 경로는 `/api/v1`입니다. JSON 응답은 `{ data, meta }`, 오류는 `{ error: { code, message, fieldErrors?, requestId } }` 형태를 제안합니다. 목록은 cursor 또는 page 기반 중 하나로 초기 구현에서 통일합니다.

## 주요 엔드포인트

| 메서드·경로 | 용도 | 권한 |
| --- | --- | --- |
| POST `/auth/login`, `/auth/logout` | 로그인·로그아웃 | 공개/로그인 |
| GET·POST `/patients` | 검색·등록 | 직원 |
| GET·PATCH `/patients/:id` | 상세·수정 | 직원 |
| GET·POST `/patients/:id/consultations` | 회차 조회·생성 | 직원 |
| GET·PATCH `/consultations/:id` | 상담 작업 조회·저장 | 조회 권한/담당자·관리자 |
| DELETE `/consultations/:id` | 사유 있는 논리삭제 | 관리자 |
| POST `/consultations/:id/questionnaire-links` | 링크 발급·재발급 | 담당자·관리자 |
| GET `/public/questionnaires/:token` | 질문 정의·제출 가능 상태. 기존 답변·환자 상세는 반환하지 않음 | 링크 |
| POST `/public/questionnaires/:token/submissions` | 원자적 제출 | 링크 |
| POST `/consultations/:id/media/upload-request` | 제한된 업로드 요청 | 허용된 주체 |
| POST `/consultations/:id/media/complete` | 업로드 완료·검증 | 허용된 주체 |
| GET `/media/:id/download` | 권한 확인 후 이미지 조회 | 직원 |
| POST `/consultations/:id/footprint-analyses` | 발도장 분석 작업 생성 | 담당자·관리자 |
| GET `/footprint-analyses/:id` | 상태·결과 | 직원 |
| POST `/footprint-analyses/:id/overrides` | 시술자 보완 | 담당자·관리자 |
| POST `/consultations/:id/ai-analyses` | 종합분석 작업 생성 | 담당자·관리자 |
| GET `/ai-analyses/:id` | 상태·원본·구조화 결과 | 직원 |
| POST `/consultations/:id/final-reports` | 최종본 확정·개정 | 담당 시술자, 관리자 여부 보류 |
| GET `/consultations/:id/print-view` | 확정 고객안내 | 직원 |
| GET·POST·PATCH `/admin/users` | 계정관리 | 관리자 |

## 동시성·중복 방지

PATCH 요청은 `If-Match` 또는 body `version`을 보내고 불일치 시 `409 VERSION_CONFLICT`를 반환합니다. 질문지 제출·분석 실행은 `Idempotency-Key`를 사용합니다. 업로드 완료는 checksum과 저장 객체 상태를 확인한 뒤 MediaAsset을 `READY`로 바꿉니다.

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

`AUTH_INVALID`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `VERSION_CONFLICT`, `LINK_EXPIRED`, `LINK_REVOKED`, `ALREADY_SUBMITTED`, `MEDIA_TOO_LARGE`, `MEDIA_INVALID`, `ANALYSIS_NOT_CONFIGURED`, `ANALYSIS_INPUT_INCOMPLETE`, `ANALYSIS_FAILED`, `AI_OUTPUT_INVALID`, `RESULT_STALE`, `RATE_LIMITED`.

모든 오류 메시지는 개인정보·내부 프롬프트·공급자 키·스택트레이스를 노출하지 않습니다. 실제 OpenAPI 파일은 `packages/contracts/openapi.yaml`에서 관리합니다.
