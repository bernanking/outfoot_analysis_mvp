# 데이터베이스 설계 기준

모든 핵심 테이블은 `id`, `createdAt`, `updatedAt`을 가집니다. 개인정보가 있는 데이터는 기관 경계를 가지며 실제 D1 SQL 마이그레이션과 본 문서를 함께 갱신합니다.

## 핵심 엔터티

| 엔터티 | 주요 필드·관계 |
| --- | --- |
| Organization | 이름, 상태. MVP는 1개여도 모든 업무 데이터의 소유자 |
| User | organizationId, loginId, passwordHash, role, displayName, status, sessionVersion |
| Patient | organizationId, name, phoneEncrypted/phoneLookupHash, sex, birthYear, ageAtRegistration, version, deletedAt |
| Consultation | patientId, practitionerId, sequence, status, finalDecision, version, deletedAt |
| ConsultationConcernType | consultationId, concernType. `NAIL`, `PAIN_INSOLE` 복수 선택 관계 |
| QuestionnaireLink | consultationId, tokenHash, expiresAt, revokedAt, submittedAt |
| QuestionnaireSubmission | consultationId, definitionVersion, consentVersion, sourcePayload, submittedAt |
| QuestionnaireAnswer | submissionId, questionId, originalValue. 제출 후 불변 |
| QuestionnaireConfirmation | consultationId, submissionId, questionId, confirmedValue, reason, confirmedBy, confirmedAt, version |
| SafetyFlag | consultationId, code, sourceRef, severity, reviewStatus, reviewedBy, note |
| VisitRecord | consultationId, commonData, nailData, painInsoleData, version |
| MediaAsset | consultationId, storageKey, mediaType, laterality, toeNumber, mimeType, size, checksum, status |
| FootprintAnalysis | consultationId, provider, providerVersion, inputSnapshotHash, status, quality, resultJson, errorCode |
| FootprintOverride | analysisId, practitionerId, valueJson, reason |
| AiKnowledgeVersion | name, version, status, manifest; 원문 파일 자체는 별도 보관 가능 |
| AiAnalysisRun | consultationId, mode, model, promptVersion, knowledgeVersion, inputSnapshotHash, status, rawOutput, parsedOutput |
| FinalReportRevision | consultationId, sourceRunId, internalConclusion, patientSummary, revision, finalizedBy, finalizedAt |
| Job | type, entityId, idempotencyKey, status, attempt, runAfter, errorCode |
| AuditLog | organizationId, actorId, action, entityType, entityId, metadataRedacted, occurredAt |

`questionnaire_definition`은 MVP에서 DB 편집 화면이 필요하지 않습니다. 코드 JSON 파일의 버전을 제출 스냅샷에 저장합니다.

## 값과 상태

- 역할: `PRACTITIONER`, `ADMIN`.
- 관심유형: `NAIL`, `PAIN_INSOLE` 복수값.
- 방향: `LEFT`, `RIGHT`; 발가락 번호 1~5. 여러 발은 행 또는 명시적 배열로 저장합니다.
- 결론: `CARE_PLANNED`, `NEEDS_MORE_INFO`, `REFER_MEDICAL`, `ON_HOLD` 제안.
- 외부작업: `QUEUED`, `RUNNING`, `SUCCEEDED`, `FAILED`, `NOT_CONFIGURED`, `STALE`.
- 측정값 상태: `MEASURED`, `ESTIMATED`, `NOT_PROVIDED`, `NOT_MEASURABLE`, `NOT_APPLICABLE`.

DB의 null만으로 상태를 추측하지 않습니다. 0은 실제 값일 때만 저장합니다.

## 불변·개정 정책

제출된 환자 원답, 분석 실행 입력 스냅샷, AI 원본, 확정 리포트 개정은 불변입니다. 정정은 새 확인값·실행·개정을 만듭니다. 상담 입력이 바뀌면 그 이전 입력 해시를 사용한 분석을 `STALE`로 계산합니다.

삭제는 관리자만 수행하며 상담을 논리삭제하고 사유·행위자를 기록합니다. 실제 개인정보 파기는 보유정책 O07에 따라 별도 작업으로 처리합니다. 관리자 삭제 버튼이 즉시 모든 백업에서 지우는 것처럼 표시하지 않습니다.

## 개인정보

전화번호는 표시용 암호문과 중복검색용 정규화 해시를 분리하는 방식을 제안합니다. AI 요청에는 이름·전화·고객번호·생년 등 직접 식별정보를 넣지 않습니다. 이미지 저장 키에 환자 이름을 사용하지 않습니다.
