# OUTFOOT 개발 에이전트 지침

이 저장소의 공통 지침입니다. Codex와 Claude Code 모두 같은 문서 기준으로 작업합니다.

## 우선순위

플랫폼의 상위 지침과 접근 통제를 준수합니다. 프로젝트 업무 기준은 최신 사용자의 명시적 결정 → `docs/02_DECISIONS.md`의 확정 사항 → 해당 기능 문서 → 참고자료 순서로 적용합니다. 제안과 미정 사항을 고객 확정으로 바꾸지 않습니다.

## 시작과 종료

1. `README.md`, `docs/02_DECISIONS.md`, `docs/15_TASKS.md`와 해당 작업 문서를 읽습니다.
2. 현재 변경사항과 실행환경을 확인합니다. 타인의 파일을 덮어쓰거나 작업 트리를 초기화하지 않습니다.
3. 한 번에 작업 ID 한 개 또는 직접 연관된 작은 묶음을 구현합니다.
4. 의미 있는 검증을 수행하고 결과를 기록합니다. 실행하지 않은 테스트를 통과로 보고하지 않습니다.
5. 기능·계약이 바뀌면 관련 문서와 작업 상태를 같은 변경에서 갱신합니다.
6. 결과 보고는 변경 이유, 파일, 검증, 남은 제한, 다음 작업을 한국어로 간단히 정리합니다.

## 구현 원칙

- 사용자 지정 언어는 TypeScript입니다. 웹과 서버 계약을 같은 타입 기준으로 관리합니다.
- 단일 저장소를 유지합니다(2026-10-02 D25). Vue 3·Vite 웹은 Cloudflare 정적 호스팅(Workers Static Assets, 서버 스크립트 없음)으로 제공하고, 업무 데이터는 Supabase PostgreSQL, 직원 인증은 Supabase Auth, 파일은 Supabase Storage 비공개 버킷, 업무 API는 Supabase Edge Functions로 처리합니다. Cloudflare에 업무 API·Pages Functions를 추가하거나 Workers+Hyperdrive와 섞지 않습니다. 상세 구조는 `docs/08_ARCHITECTURE.md`를 따릅니다.
- 업무 규칙은 런타임 중립 `packages/api-core`에 두고 Supabase SDK·Deno·Node 전용 API는 실행환경 진입점(`supabase/functions/*`)과 웹 `services/`에만 둡니다. AWS 이전 대비는 `docs/19_PLATFORM_MIGRATION.md`의 작은 경계만 유지하고 과도한 추상화·인프라를 추가하지 않습니다(D26).
- DB 구조·RLS·GRANT는 `supabase/migrations`로만 관리합니다. 서버 비밀값(secret·service_role 키, DB 접속, AI 키)은 웹 번들·Git·로그에 넣지 않습니다.
- 역할은 `PRACTITIONER`, `ADMIN`이며 환자는 상담 한 건의 질문지 링크로 접근합니다. AI 계정을 만들지 않습니다.
- 기관 경계와 담당자 권한을 API와 파일 다운로드 모두에서 검사합니다.
- 환자 원답, 방문 확인값, 분석 원본, 시술자 최종본을 덮어쓰지 않습니다.
- 두 상담 유형의 복합 선택을 지원합니다. 발·발가락은 `L1`, `R1`처럼 명확히 매핑합니다.
- 발도장 기술 선택과 수치 산출은 보류입니다. `NOT_CONFIGURED`, `NOT_MEASURABLE`, `NOT_PROVIDED`와 성공을 구분합니다.
- 부족한 이미지에서 길이·압력·아치 지표·점수·정상 판정을 만들어내지 않습니다.
- AI 출력은 비신뢰 입력으로 취급하고 구조, 근거 참조, 허용값을 검증합니다.
- 오래된 입력으로 생성한 분석은 최신 결과로 확정할 수 없습니다.
- 예제·목업은 합성 데이터로 표시하고 실제 API 성공으로 기록하지 않습니다.
- 불명확한 임상 기준·동의문구를 만들어 운영 승인된 것처럼 사용하지 않습니다.
- 일반 상담 준비·화면 개발은 보류 사항과 분리해 진행합니다. 필요한 세부 구현 선택은 제안 기본값으로 기록하고 진행합니다.

## 범위와 실행 경계

- `docs/01_PRD.md`의 제외 기능을 임의 추가하지 않습니다.
- 패키지 도입 시 현재 공식 문서와 라이선스·호환성을 확인하고 lockfile을 남깁니다.
- 루트 npm lockfile 하나를 사용합니다. 비밀값과 환자 파일은 Git에 넣지 않습니다.
- 실제 Cloudflare·Supabase·AWS 원격 자원 변경, 유료 호출, 운영 데이터 변경은 현재 사용자 요청의 허용 범위를 확인합니다. 이미 승인된 범위는 반복해서 묻지 않습니다.
- 접근 통제·자동 승인 거절을 우회하지 않습니다. 자격증명 원문을 출력하지 않습니다.
- Codex와 Claude가 같은 파일을 동시에 수정하지 않도록 순차 작업합니다.
- 사용자 또는 적용되는 별도 지침의 요청 없이 하위 에이전트를 만들지 않습니다.

## 주요 문서

- [업무·권한](docs/03_FLOWS_PERMISSIONS.md)
- [데이터](docs/09_DATA_MODEL.md) / [API](docs/10_API_CONTRACT.md)
- [분석 보류 정책](docs/11_FOOTPRINT_ANALYSIS.md) / [AI](docs/12_AI_ANALYSIS.md)
- [보안·운영](docs/13_SECURITY_OPERATIONS.md) / [검수](docs/14_ACCEPTANCE_TESTS.md)
- [작업 기록](docs/15_TASKS.md) / [협업](docs/17_AGENT_WORKFLOW.md)
- [구조](docs/08_ARCHITECTURE.md) / [플랫폼 이전 경계](docs/19_PLATFORM_MIGRATION.md)
