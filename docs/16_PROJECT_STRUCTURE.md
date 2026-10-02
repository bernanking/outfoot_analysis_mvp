# 프로젝트 폴더 구조

2026-10-02 기술 전환(D25, T01A)으로 `apps/api`(Cloudflare Workers API)를 제거하고 서버 코드를 런타임 중립 코어와 Supabase 진입점으로 나눴습니다.

## 현재 구조

```text
outfoot_analysis_mvp/
├─ AGENTS.md                 # Codex 포함 공통 규칙
├─ CLAUDE.md                 # Claude 진입점, 공통 규칙 링크
├─ README.md
├─ package.json              # npm workspace와 공통 개발 명령
├─ package-lock.json         # 하나의 잠금파일(Deno lockfile은 끔)
├─ .env.example              # 웹 공개 설정(VITE_*) 예시
├─ eslint.config.js          # 플랫폼 경계 규칙 포함
├─ apps/
│  └─ web/                   # Vue 3 SPA
│     ├─ wrangler.jsonc      # Cloudflare 정적 제공 전용(Worker 스크립트 없음)
│     └─ src/{app,assets,components,composables,data,features,layouts,pages,router,services,stores,styles,test}/
├─ packages/
│  ├─ contracts/             # Zod 계약·enum·응답 형식(웹·서버 공용)
│  ├─ api-core/              # 런타임 중립 서버 코어: 라우팅, 설정 검증, 업무 규칙, 플랫폼 경계 타입
│  └─ questionnaire-definitions/ # 버전된 고정 문항·검증
├─ supabase/
│  ├─ config.toml            # 로컬 Supabase 설정(공개가입 차단, Data API 자동 노출 해제 등)
│  ├─ migrations/            # 테이블·인덱스·DB 함수·RLS·GRANT SQL(T02부터)
│  ├─ seed.sql               # 로컬 합성 seed(원격 적용 금지)
│  ├─ tests/database/        # pgTAP DB 검사(npm run db:test)
│  └─ functions/
│     ├─ .env.example        # 함수 비밀값 예시(실제 .env는 Git 제외)
│     └─ api/                # Edge Function 진입점(Deno): index.ts, deno.json
├─ scripts/                  # 반복 가능한 검증 작업(예: check-web-bundle.mjs)
├─ docs/                     # PRD·설계·검수·작업 문서
├─ references/
│  ├─ client-originals/      # 원본, 기본 Git 제외
│  └─ anonymized-samples/    # 비식별 샘플, 기본 Git 제외
├─ experiments/              # 분석 PoC; 프로덕션 코드와 분리
├─ tests/{e2e,fixtures}/     # 합성 fixture만 커밋
└─ infra/cloudflare/         # 대시보드 수동 설정 기록용(현재 비어 있음)
```

T01에서 기존 AI 호출 실험 코드를 제거하고 workspace를 만들었습니다. 사용자가 직접 파일을 넣을 때 `client-originals`는 원본 보존, `anonymized-samples`는 비식별 분석용, `tests/fixtures`는 공개 가능한 합성 데이터로 구분합니다. `apps/web/dist/` 아래 빌드 결과는 `dist/client`이며, 그 밖의 파일은 빌드가 지우지 않습니다.

## 웹 내부 규칙

업무 기능은 `features/auth`, `patients`, `consultations`, `questionnaires`, `media`, `footprints`, `ai-analysis`, `reports`, `admin`으로 나눕니다. 페이지·컴포넌트는 fetch나 Supabase SDK를 직접 쓰지 않고 `services/`의 기능별 서비스 모듈을 거칩니다. `services/config.ts`가 공개 설정을, `services/http.ts`가 업무 API 호출·계약 검증·오류 변환을 맡습니다. Supabase SDK(로그인)는 T03에서 `services/` 안에만 둡니다(ESLint로 강제). 범용 UI만 `components/ui`에 두고 업무 컴포넌트는 해당 feature에 둡니다.

## 서버 내부 규칙

- `packages/api-core`: 업무 모듈은 `src/modules/<이름>`에 두고(후속 작업), route·service·schema·tests를 가집니다. 저장소·인증·파일 접근은 `src/ports.ts`의 타입으로만 의존하고 구현은 진입점에서 주입합니다. Supabase SDK·`Deno`·`process`·`node:*`를 쓰지 않습니다.
- `supabase/functions/api`: 환경변수 읽기, 로그 출력, Supabase SDK·DB 연결·토큰 검증·Storage 구현 같은 실행환경 연동만 둡니다. 업무 규칙을 이곳에 다시 구현하지 않습니다.
- 외부 분석과 AI는 공급자 어댑터를 거쳐 모듈이 SDK에 직접 결합하지 않게 합니다.

## 파일 배치 규칙

- 요구·결정·업무규칙: `docs/`.
- 실제 질문 정의: `packages/questionnaire-definitions/versions/`.
- 공유 API schema·enum: `packages/contracts/`.
- DB 구조·RLS: `supabase/migrations/`(대시보드에서만 바꾸지 않음).
- 화면 캡처·클라이언트 문서: `references/client-originals/`, Git 제외.
- 비식별 발도장: `references/anonymized-samples/`, 접근 제한.
- 합성 테스트: `tests/fixtures/`, 실제 이름·전화·이미지 금지.
- 분석 실험: `experiments/<date>-<approach>/`, 결과 요약과 실행법 포함.
- Cloudflare·Supabase 대시보드에서만 한 수동 설정을 방치하지 말고 가능한 범위는 `apps/web/wrangler.jsonc`, `supabase/config.toml`, 마이그레이션에 코드화합니다.

## 피해야 할 구조

web·api마다 별도 lockfile을 두거나, 모든 코드를 `utils`에 모으거나, 질문지 문구를 Vue 화면에 흩뿌리거나, 환자 이미지와 `.env`를 저장소에 넣거나, 실험 코드를 운영 요청 경로에서 직접 실행하지 않습니다. Cloudflare에 Workers 업무 API·Pages Functions를 추가해 Supabase 함수와 서버 처리 경로를 중복시키지 않습니다.
