# 프로젝트 폴더 구조

## 권장 구조

```text
outfoot_analysis_mvp/
├─ AGENTS.md                 # Codex 포함 공통 규칙
├─ CLAUDE.md                 # Claude 진입점, 공통 규칙 링크
├─ README.md
├─ package.json              # npm workspace와 공통 개발 명령
├─ package-lock.json         # 하나의 잠금파일
├─ .env.example
├─ .gitignore
├─ apps/
│  ├─ web/                   # Vue 3 SPA
│  │  └─ src/{app,assets,components,composables,features,layouts,pages,router,services,stores,styles}/
│  └─ api/                   # Cloudflare Workers HTTP API
│     ├─ migrations/         # D1 SQL 마이그레이션
│     └─ src/{config,db,http,jobs,middleware,modules,providers}/
├─ packages/
│  ├─ contracts/             # OpenAPI, JSON schema, 공용 enum·fixture
│  └─ questionnaire-definitions/ # 버전된 고정 문항 JSON·검증
├─ docs/                     # PRD·설계·검수·작업 문서
├─ references/
│  ├─ client-originals/      # 원본, 기본 Git 제외
│  └─ anonymized-samples/    # 비식별 샘플, 기본 Git 제외
├─ experiments/              # 분석 PoC; 프로덕션 코드와 분리
├─ tests/{e2e,fixtures}/     # 합성 fixture만 커밋
├─ infra/cloudflare/         # Wrangler 환경·배포 정의, 비밀값 금지
└─ scripts/                  # 반복 가능한 개발·검증 작업
```

T01에서 기존 AI 호출 실험 코드를 제거하고 Vue·Workers workspace, 공용 계약, 질문지 정의 패키지를 생성했습니다. 사용자가 직접 파일을 넣을 때 `client-originals`는 원본 보존, `anonymized-samples`는 비식별 분석용, `tests/fixtures`는 공개 가능한 합성 데이터로 구분합니다.

## 웹 내부 규칙

업무 기능은 `features/auth`, `patients`, `consultations`, `questionnaires`, `media`, `footprints`, `ai-analysis`, `reports`, `admin`으로 나눕니다. 페이지가 직접 HTTP를 호출하지 않고 `services` 또는 기능 API를 사용합니다. 범용 UI만 `components/ui`에 두고 업무 컴포넌트는 해당 feature에 둡니다.

## API 내부 규칙

각 module은 route, controller, service, repository, schema, tests를 가집니다. controller는 Workers 요청·응답 변환, service는 업무규칙, repository는 D1 접근을 담당합니다. 외부 분석과 AI는 `providers` 어댑터를 거쳐 module이 SDK에 직접 결합하지 않게 합니다.

## 파일 배치 규칙

- 요구·결정·업무규칙: `docs/`.
- 실제 질문 정의: `packages/questionnaire-definitions/versions/`.
- 공유 API schema·enum: `packages/contracts/`.
- 화면 캡처·클라이언트 문서: `references/client-originals/`, Git 제외.
- 비식별 발도장: `references/anonymized-samples/`, 접근 제한.
- 합성 테스트: `tests/fixtures/`, 실제 이름·전화·이미지 금지.
- 분석 실험: `experiments/<date>-<approach>/`, 결과 요약과 실행법 포함.
- Cloudflare 대시보드에서만 한 수동 설정을 방치하지 말고 가능한 범위는 Wrangler 설정과 `infra`에 코드화합니다.

## 피해야 할 구조

web·api마다 별도 lockfile을 두거나, 모든 코드를 `utils`에 모으거나, 질문지 문구를 Vue 화면에 흩뿌리거나, 환자 이미지와 `.env`를 저장소에 넣거나, 실험 코드를 운영 요청 경로에서 직접 실행하지 않습니다.
