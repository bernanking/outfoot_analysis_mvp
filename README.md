# OUTFOOT 족부 상담 분석 MVP 개발 문서

문서 버전: 1.1 · 작성일: 2026-09-22 · 상태: 기술 기준 확정·T01·T04 완료

이 저장소는 지금까지의 대화와 클라이언트 질문지 원문을 정리한 개발 문서와 TypeScript·Vue 3·Cloudflare Workers 기반 스캐폴드를 포함합니다. 실제 Cloudflare 원격 자원과 승인된 임상 분석 기준은 포함하지 않습니다. Codex와 Claude Code가 같은 요구사항을 읽고 단계별로 개발하도록 작성했습니다.

## 먼저 알아둘 결정

- 핵심 흐름: 상담 접수 → 환자 사전질문 → 대면 상담 → 좌우 발도장 등록·분석 → 시술자 보완 → AI 종합분석 → 시술자 최종확정 → 회차별 조회.
- 사용자: 시술자, 환자, 관리자. AI는 시술자 업무지원 기능입니다.
- 사전질문: `NAIL`, `PAIN_INSOLE`, 두 유형 함께. 두 유형 함께는 세 번째 독립 유형이 아닙니다.
- 발도장 분석: **OpenCV / OpenAI API / 병행 방식 및 자동 산출 항목 모두 실제 샘플 검증 후 결정**합니다. 일반 A4 네 점 사진과 실제 접촉 발도장은 구분합니다.
- 개발 기준: TypeScript, Vue 3·Vite, Cloudflare Workers, D1(SQL), R2를 사용합니다.
- 디자인: PrimeVue에 OUTFOOT 자체 테마를 적용하고 토스의 명료한 정보계층과 입력 원칙을 참고합니다. 공식 TDS 자산을 직접 이식하지 않습니다.
- 초기 데이터: 합성 데이터와 mock AI만 사용합니다. 실제 환자정보와 유료 AI 호출은 별도 승인·운영 기준 확정 후 연결합니다.
- 기술구조·상태값·문항 세부 선택지는 본 문서의 구현 제안입니다. 확정된 고객 요구사항과 혼동하지 않습니다.
- T01 개발환경과 T04 공통 레이아웃·로그인·오류 화면 시안까지 완료했습니다. 다음은 T04A 전체 정적 화면과 페이지 연결이며, 실제 업무 기능은 아직 연결되지 않았습니다. 자세한 상태는 [작업 목록](docs/15_TASKS.md)을 따릅니다.

## 로컬 실행

Node.js `^22.22.2 || ^24.15.0 || >=26.0.0`이 필요합니다(jsdom 30.1.1 기준). 현재 검증 환경은 Node.js 24.15.0입니다.

```bash
npm install
npm run dev
```

기본 주소는 `http://127.0.0.1:5173`이며 Vue 화면과 Workers API가 함께 실행됩니다. 원격 Cloudflare 자원을 만들지 않고 로컬 D1·R2 바인딩을 사용합니다.

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## 파일을 넣는 방법

1. PC의 문서 폴더 안에 `outfoot_analysis_mvp` 폴더를 준비합니다.
2. ZIP 안의 `outfoot_analysis_mvp` **내부 파일과 폴더**를 그 안에 넣습니다. 같은 이름의 폴더가 두 번 중첩되지 않게 합니다.
3. 기존 파일이 있다면 덮어쓰기 전에 비교하거나 별도 사본을 남깁니다.
4. VS Code에서 `outfoot_analysis_mvp` 폴더 자체를 엽니다.
5. `npm install` 후 위 로컬 실행 명령으로 개발 화면을 확인합니다.

## 문서 읽기 순서

| 순서 | 문서 | 용도 |
| --- | --- | --- |
| 1 | [확정 사항과 보류 사항](docs/02_DECISIONS.md) | 과거 요구와 최신 합의의 충돌 해소 |
| 2 | [PRD](docs/01_PRD.md) | 목적, MVP 범위, 기능 요구 |
| 3 | [업무 흐름과 권한](docs/03_FLOWS_PERMISSIONS.md) | 상태 전이, 역할별 허용 동작 |
| 4 | [화면 명세](docs/04_SCREENS.md) | 메뉴, 화면, 입력·오류 상태 |
| 5 | [사전질문지](docs/05_QUESTIONNAIRES.md), [대면 상담](docs/06_VISIT_FIELDS.md) | 문항, 분기, 원문 매핑 |
| 6 | [디자인](docs/07_DESIGN_SYSTEM.md), [구조](docs/08_ARCHITECTURE.md) | UI 원칙과 기술 제안 |
| 7 | [데이터](docs/09_DATA_MODEL.md), [API](docs/10_API_CONTRACT.md) | 저장 구조와 인터페이스 |
| 8 | [발도장](docs/11_FOOTPRINT_ANALYSIS.md), [AI](docs/12_AI_ANALYSIS.md) | 미정 기술의 경계와 분석 규약 |
| 9 | [보안·운영](docs/13_SECURITY_OPERATIONS.md), [검수](docs/14_ACCEPTANCE_TESTS.md) | 실제 운영 전 충족 조건 |
| 10 | [개발 작업](docs/15_TASKS.md), [폴더 구조](docs/16_PROJECT_STRUCTURE.md), [에이전트 협업](docs/17_AGENT_WORKFLOW.md) | 구현 순서와 작업 방식 |
| 11 | [프론트 화면별 내용 구성](docs/18_FRONTEND_SCREEN_CONTENT_PLAN.md) | 정적 화면의 내용·행동·상태와 클라이언트 검토 항목 |

전체 문서를 매 작업마다 다시 읽을 필요는 없습니다. 처음에는 핵심 문서를 읽고 이후에는 해당 작업과 관련된 문서만 읽습니다.

## 다음 작업 요청 예시

```text
AGENTS.md, README.md, docs/02_DECISIONS.md, docs/01_PRD.md,
docs/08_ARCHITECTURE.md, docs/15_TASKS.md, docs/16_PROJECT_STRUCTURE.md를 읽어줘.
현재 폴더와 도구 설치 상태를 확인하고, 기존 파일을 보존하면서 T04A를 진행해줘.
이번 작업은 전체 정적 화면·역할별 메뉴·페이지 링크와 합성 데이터 상태 구현이야.
실제 환자정보, 유료 API 호출, Cloudflare 원격 자원 생성·배포는 이번 작업에 포함하지 않아.
발도장 분석은 구현체 미정 상태를 유지하고 실제 측정값처럼 보이는 가짜 수치는 만들지 마.
완료 후 변경 파일, 실행 방법, 검증 결과, 남은 문제를 정리해줘.
```

## 문서와 원본의 관리

원본 자료는 [참고자료 안내](references/README.md)에 따라 넣습니다. 최신 사용자 지시가 본 문서와 충돌하면 해당 지시와 영향받는 문서를 먼저 갱신합니다. 원본 자료 속 예시 점수·의학적 표현을 곧바로 구현 기준으로 삼지 않습니다.

공식 계약 산출물은 화면설계서, 시스템 소스코드, 데이터베이스 설계서 3종입니다. 이 문서 세트는 개발을 위한 작업 기준이며 최종 산출물 완료를 의미하지 않습니다.
