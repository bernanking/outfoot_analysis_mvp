# 데이터베이스 설계 기준

모든 핵심 테이블은 `id`, `createdAt`, `updatedAt`을 가집니다(연결 테이블 `consultation_concern_types`는 예외, 아래 T02 구현 참고). 개인정보가 있는 데이터는 기관 경계를 가지며 Supabase PostgreSQL의 SQL 마이그레이션(`supabase/migrations`)과 본 문서를 함께 갱신합니다(D25, 2026-10-02. 이전 기준은 D1). 엔터티 이름은 개념명이며 실제 테이블·열 이름은 T02에서 snake_case로 정합니다.

## 핵심 엔터티

| 엔터티 | 주요 필드·관계 |
| --- | --- |
| Organization | 이름, 상태. MVP는 1개여도 모든 업무 데이터의 소유자 |
| User | organizationId, authUserId(인증 사용자 ID, 유일), loginId, role, displayName, status, passwordChangeRequired. 비밀번호 해시는 두지 않음(Supabase Auth 관리) |
| Patient | organizationId, name, phoneEncrypted/phoneLookupHash, sex, birthYear, ageAtRegistration, version, deletedAt |
| Consultation | patientId, practitionerId, sequence, status, finalDecision, version, deletedAt |
| ConsultationConcernType | consultationId, concernType. `NAIL`, `PAIN_INSOLE` 복수 선택 관계 |
| QuestionnaireLink | consultationId, tokenHash, expiresAt, revokedAt, submittedAt |
| QuestionnaireSubmission | consultationId, definitionVersion, consentVersion, sourcePayload, submittedAt |
| QuestionnaireAnswer | submissionId, questionId, originalValue. 제출 후 불변 |
| QuestionnaireConfirmation | consultationId, submissionId, questionId, confirmedValue, reason, confirmedBy, confirmedAt, version |
| SafetyFlag | consultationId, code, sourceRef, severity, reviewStatus, reviewedBy, note |
| VisitRecord | consultationId, commonData, nailData, painInsoleData, version |
| MediaAsset | consultationId, storageProvider(`SUPABASE_STORAGE`·이후 `S3`), bucket, objectPath, mediaType, laterality, toeNumber, mimeType, size, checksum, status, uploadedBy. 공개·서명 URL은 저장하지 않음 |
| FootprintAnalysis | consultationId, provider, providerVersion, inputSnapshotHash, status, quality, resultJson, errorCode |
| FootprintOverride | analysisId, practitionerId, valueJson, reason |
| AiKnowledgeVersion | name, version, status, manifest; 원문 파일 자체는 별도 보관 가능 |
| AiAnalysisRun | consultationId, mode, model, promptVersion, knowledgeVersion, inputSnapshotHash, status, rawOutput, parsedOutput |
| FinalReportRevision | consultationId, sourceRunId, internalConclusion, patientSummary, revision, finalizedBy, finalizedAt |
| Job | type, entityId, idempotencyKey(유일), inputVersion, status, attempt, maxAttempts, runAfter, lockedUntil, lockToken, dispatchState(`NOT_SENT`·`SENDING`·`RESPONSE_STORED`), dispatchedAt, retryOf, retryAcknowledgedBy, errorCode, providerRequestId |
| AuditLog | organizationId, actorId, action, entityType, entityId, metadataRedacted, occurredAt |

`questionnaire_definition`은 MVP에서 DB 편집 화면이 필요하지 않습니다. 코드 JSON 파일의 버전을 제출 스냅샷에 저장합니다.

## 값과 상태

- 역할: `PRACTITIONER`, `ADMIN`.
- 관심유형: `NAIL`, `PAIN_INSOLE` 복수값.
- 방향: `LEFT`, `RIGHT`; 발가락 번호 1~5. 여러 발은 행 또는 명시적 배열로 저장합니다.
- 결론: `CARE_PLANNED`, `NEEDS_MORE_INFO`, `REFER_MEDICAL`, `ON_HOLD` 제안.
- 외부작업: `QUEUED`, `RUNNING`, `SUCCEEDED`, `FAILED`, `NOT_CONFIGURED`, `OUTCOME_UNKNOWN`(외부 호출 성공 여부 불명, 자동 재호출 안 함), `STALE`.
- 측정값 상태: `MEASURED`, `ESTIMATED`, `NOT_PROVIDED`, `NOT_MEASURABLE`, `NOT_APPLICABLE`.

DB의 null만으로 상태를 추측하지 않습니다. 0은 실제 값일 때만 저장합니다.

## 불변·개정 정책

제출된 환자 원답, 분석 실행 입력 스냅샷, AI 원본, 확정 리포트 개정은 불변입니다. 정정은 새 확인값·실행·개정을 만듭니다. 상담 입력이 바뀌면 그 이전 입력 해시를 사용한 분석을 `STALE`로 계산합니다.

삭제는 관리자만 수행하며 상담을 논리삭제하고 사유·행위자를 기록합니다. 실제 개인정보 파기는 보유정책 O07에 따라 별도 작업으로 처리합니다. 관리자 삭제 버튼이 즉시 모든 백업에서 지우는 것처럼 표시하지 않습니다.

## 사용자 ID 매핑

업무 사용자 ID(`User.id`)와 인증 사용자 ID(`User.authUserId`, 현재 Supabase `auth.users.id`)를 분리합니다. 업무 테이블의 작성자·담당자·확정자·감사 행위자는 업무 사용자 ID를 참조합니다. 인증 체계를 바꾸거나 AWS로 옮길 때 `authUserId`만 다시 연결하면 업무 이력은 그대로 남습니다. 이식성을 위해 업무 테이블에서 Supabase 전용 `auth` 스키마로 외래키를 걸지 않고, 매핑 일치는 서버 처리와 정기 점검으로 확인합니다.

## PostgreSQL·Supabase 사용 원칙

- 테이블·인덱스·제약·DB 함수·트리거·RLS 정책·GRANT는 모두 `supabase/migrations`의 SQL로 관리합니다. 대시보드에서만 바꾼 설정을 남기지 않습니다.
- 업무 테이블은 Data API에 자동 노출하지 않고(`auto_expose_new_tables = false`) RLS를 켠 상태로 만듭니다. 브라우저 접근이 필요한 객체가 생기면 해당 마이그레이션에서 GRANT와 최소 RLS 정책을 함께 추가하고 이유를 적습니다(P19).
- 최종확정은 한 DB 트랜잭션(DB 함수)에서 권한 확인 결과, 최신 입력 버전과 분석 입력 버전 비교, 확정본 개정 생성, 상담 상태 변경, 감사 기록을 함께 처리합니다. 하나라도 실패하면 전체를 취소합니다. 입력 수정과의 동시 요청, 중복 확정 요청, 담당자·권한 변경과의 경합을 막는 방법(예: 상담 행 잠금, `version` 비교, 확정 요청 키·개정 번호 유일 제약, 트랜잭션 안에서 담당자·역할 재확인)은 T15에서 구현하고 [검수](14_ACCEPTANCE_TESTS.md) AT-34~37로 검증합니다. 이번 문서는 방식을 확정하지 않습니다.
- 낙관적 잠금은 `version` 열 비교로 처리하고(`UPDATE ... WHERE id = ? AND version = ?`), 영향 행이 0이면 `VERSION_CONFLICT`입니다.
- 표준 PostgreSQL 기능을 먼저 씁니다. `gen_random_uuid()`(PostgreSQL 13+ 기본)처럼 RDS에서도 같은 기능을 우선합니다. Supabase 전용 기능·확장(pg_cron, pg_net, Vault, `auth` 스키마, Storage 스키마)을 쓰면 [이전 문서](19_PLATFORM_MIGRATION.md#supabase-전용-기능과-대체)에 필요성과 대체 방법을 적습니다.
- 시드 데이터는 합성 데이터만 `supabase/seed.sql`에 둡니다(T02).

## T02 구현 (2026-10-02, `supabase/migrations/20261002091646_t02_core_schema.sql`, 검토 보완 `20261002093918_t02_review_constraints.sql`)

| 개념 | 테이블 | 구현 내용 |
| --- | --- | --- |
| Organization | `organizations` | 이름·상태(`ACTIVE`·`INACTIVE`) |
| User | `app_users` | `auth_user_id`(인증 사용자 ID, 유일, 비워 둘 수 있음, `auth` 스키마 외래키 없음), `login_id`(소문자·앞뒤 공백 없음 검사, 전역 유일), 역할·상태, `password_change_required`, `version`. 비밀번호 해시 없음 |
| Patient | `patients` | 이름, `phone_encrypted`·`phone_lookup_hash`(암호화 방식은 T05, 지금은 비움), `sex`(허용값은 O03·T05 전이라 제약 없음), 출생연도(1900~2100)·등록 시 나이(0~150) 범위 검사(범위는 입력 실수를 막는 구현 제안이며 고객 확정 아님), `version`, `deleted_at` |
| Consultation | `consultations` | 기관·환자·담당자를 (기관, ID) 복합 외래키로 묶어 다른 기관 데이터 연결을 DB에서 거부, 상태·결론 값 검사, `version`, 논리삭제(시각·같은 기관 삭제자·사유를 함께 남겨야 함. 사유는 NULL이 아니고 공백류(일반·탭·줄바꿈·NBSP·폭 없는 공백·전각 공백) 외 글자를 포함해야 함) |
| ConsultationConcernType | `consultation_concern_types` | `source`로 환자 원선택(`PATIENT_SELECTED`)과 시술자 확인 유형(`PRACTITIONER_CONFIRMED`)을 분리(구현 제안), 유형은 `NAIL`·`PAIN_INSOLE`만(두 유형 함께는 두 행). `organization_id`를 두고 상담과 기록자(`recorded_by`)를 모두 (기관, ID) 복합 외래키로 묶음. 시술자 확인 유형은 확인자를 반드시 남기고(확인값에 확인자를 기록하는 원칙, 구현 제안), 환자 원선택은 링크 제출이라 기록자를 비워 둘 수 있음(직원이 대신 입력하는 경우의 기록 방식은 미정) |

- 회차 번호는 삭제되지 않은 상담 사이에서만 유일합니다(부분 유일 인덱스). 삭제 후 번호 재사용 여부는 T06에서 정하며 이 제약은 두 정책을 모두 허용합니다.
- `updated_at`은 표준 PL/pgSQL 트리거(`set_updated_at`)로 갱신하고, 이 함수는 Data API RPC로 실행할 수 없게 권한을 회수했습니다.
- 다섯 테이블 모두 RLS를 켜고 정책을 두지 않았으며, `anon`·`authenticated`·`service_role` 권한을 회수했습니다(`auto_expose_new_tables = false`에 기대지 않고 마이그레이션에서 직접). `service_role`은 RLS를 우회하지만 테이블 권한이 없어 Data API로도 접근하지 못합니다.
- 서버(Edge Function)의 DB 접근 방식은 아직 정하지 않았습니다. 후보는 (1) 함수가 PostgreSQL에 직접 연결해 SQL로 접근(RDS로 옮기기 쉬움), (2) secret 키로 Data API를 쓰는 방식(해당 테이블에 `service_role` 권한을 다시 열어야 함)입니다. 첫 DB 사용 작업(T03)에서 정하고 필요한 권한은 그 마이그레이션에서 엽니다.
- 연결 테이블 예외: `consultation_concern_types`는 (상담, 출처, 유형) 복합 기본키로 한 상담의 유형 집합을 나타내며 공통 원칙의 `id`·`updated_at`을 두지 않습니다. 행은 수정하지 않고 추가·삭제로 바꾸며, 기록 시각(`created_at`)과 기록자(`recorded_by`)를 남깁니다. 환자 원선택 행은 제출 후 바꾸지 않는 것(T07에서 구현)과 시술자 확인 유형 변경 이력의 감사 기록(T16)을 전제로 하며, 행 단위 수정 추적이 필요해지면 그때 열을 더합니다.
- 합성 seed는 `supabase/seed.sql`(기관 1, 직원 4, 환자 5, 상담 7 중 논리삭제 1, 상담 유형 8). 직원의 인증 연결은 T03에서 합니다.
- 검사: `npm run db:test`(pgTAP 55개: 업무 테이블별 RLS, 정책 없음, 세 역할의 실효 테이블 권한(조회·추가·수정·삭제·비우기·참조·트리거·PostgreSQL 17의 MAINTAIN)과 열 권한(PUBLIC·상속 포함), 세 역할의 트리거 함수 실행 권한, 역할별 직접 조회·변경 거부, 기관 경계, 상담 유형·논리삭제·회차 제약), `npm run db:check-access`(Data API HTTP로 anon·publishable·authenticated·service_role·secret 키의 조회·추가·수정·삭제와 RPC를 시도해, 역할별 기대 상태와 `42501`이 함께 맞거나 RPC가 `404 PGRST202`일 때만 차단 확인으로 판정. 그 밖의 결과는 검사 미완료, 합성 인증 사용자 삭제 실패는 정리 실패로 전체 실패. 합성 사용자 비밀번호는 로컬 Auth 정책(10자 이상·영문+숫자)을 항상 만족하도록 만듦. 기준은 [PostgREST 오류 표](https://docs.postgrest.org/en/stable/references/errors.html)).

## 개인정보

전화번호는 표시용 암호문과 중복검색용 정규화 해시를 분리하는 방식을 제안합니다. AI 요청에는 이름·전화·고객번호·생년 등 직접 식별정보를 넣지 않습니다. 이미지 저장 키에 환자 이름을 사용하지 않습니다.
