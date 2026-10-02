# 플랫폼 이전 경계 (Supabase → AWS 후보)

2026-10-02 사용자 결정 D26의 실행 기준입니다. MVP는 Cloudflare 정적 웹 + Supabase로 출시하고, 서비스 지속이 확인되면 AWS(Vue + Node.js + PostgreSQL, EC2·RDS·S3)로 옮길 수 있게 준비합니다. **이전 일정·여부는 미정(O14)이며 지금 AWS 자원을 만들지 않습니다.** 이전 대비는 작은 경계와 기록으로만 하고, 아직 쓰지 않는 범용 계층이나 모든 공급자용 구현을 미리 만들지 않습니다.

## 교체 관계

| 현재(MVP) | 이전 후보 | 유지되는 것 | 바뀌는 것 |
| --- | --- | --- | --- |
| Cloudflare Workers Static Assets | S3+CloudFront 또는 EC2의 정적 제공(이전 시 결정) | `apps/web` 빌드 결과 전체, SPA 대체 응답 규칙 | 배포 설정·명령, 도메인 |
| Supabase PostgreSQL | AWS RDS PostgreSQL | `supabase/migrations`의 표준 SQL(테이블·인덱스·제약·DB 함수), 데이터 | Supabase 전용 스키마·확장 의존 부분, 백업·복구 방식, 접속 정보 |
| Supabase Storage(비공개 버킷) | AWS S3(비공개 버킷) | `StoredObjectRef`(저장소·버킷·객체 경로) 기준 메타데이터, 권한 확인 후 짧은 URL 발급 흐름 | `ObjectStorage` 구현(Storage SDK → S3 SDK·사전 서명 URL), 객체 복사, `storageProvider` 값 |
| Supabase Edge Functions(Deno) | Node.js API 서버 + 분석 작업 프로세스 | `packages/api-core`(웹 표준 Request/Response 처리기, 업무 규칙, 설정 검증), `packages/contracts` | 진입점(`Deno.serve` → Node HTTP 서버 어댑터), 환경변수 읽기, 로그 전송, 작업 실행 주기(pg_cron → Node 스케줄러·워커) |
| Supabase Auth | 유지(외부 인증으로 계속 사용) 또는 별도 인증 체계 | 업무 사용자 ID·권한·기관·활성 상태(업무 DB), `StaffAuthenticator` 경계 | 토큰 검증 구현, 로그인 화면의 SDK 호출, 사용자 이전(아래 쟁점) |

## 유지할 코드와 교체할 코드

- 유지: `apps/web`의 화면·컴포넌트·스토어, `services/` 이하 기능별 서비스(기준 주소만 교체), `packages/contracts`, `packages/questionnaire-definitions`, `packages/api-core`의 업무 규칙·라우팅·설정 검증, 표준 SQL 마이그레이션.
- 교체: `supabase/functions/*` 진입점과 그 안의 Supabase SDK·DB 연결·Storage 구현, `apps/web/src/services`의 인증 SDK 연동(인증 전환 시), Supabase 전용 SQL(아래), 배포 설정(`apps/web/wrangler.jsonc`, `supabase/config.toml`).
- 이를 지키기 위한 규칙: `packages/api-core`는 Supabase SDK·Deno·Node 전용 API를 import하지 않습니다(ESLint `no-restricted-imports`·`no-restricted-globals`). 웹 화면은 `services/` 밖에서 Supabase SDK를 쓰지 않습니다. 공용 코드 의존성은 Node(Vitest)와 Deno(`npm run functions:check`) 양쪽에서 확인합니다.

## Supabase 전용 기능과 대체

사용 여부는 해당 작업에서 쓰기 시작할 때 이 표를 갱신합니다.

| 기능 | 사용 계획 | 필요한 이유 | 이전 시 대체 |
| --- | --- | --- | --- |
| `auth` 스키마·`auth.uid()` | 업무 테이블 외래키로 쓰지 않음. RLS 정책에서 쓸 경우 해당 정책만 | 인증 사용자 확인 | 업무 API 권한 검사로 대체, `authUserId` 재매핑 |
| RLS 정책 | 업무 테이블 기본 차단(정책 최소화) | Data API 직접 호출 방어 | RDS에서도 RLS는 표준 PostgreSQL 기능이나 Data API가 없으므로 앱 권한 검사가 주 방어선 |
| Data API(PostgREST) 노출 | 업무 테이블 미노출(P19) | — | 해당 없음 |
| Storage 스키마·서명 URL | T09 | 비공개 파일 | S3 사전 서명 URL |
| pg_cron | T10A(1분 주기 작업 회수) | 별도 서버 없이 지속 실행 | RDS PostgreSQL의 pg_cron 지원 여부를 이전 시 확인하거나 Node 스케줄러·워커로 대체 |
| pg_net | T10A(cron에서 함수 호출) | DB에서 함수 HTTP 호출 | Node 워커가 DB 작업 테이블을 직접 폴링 |
| Vault | T10A(작업 실행 키 보관) | cron 호출 키 비밀 보관 | AWS Secrets Manager 등 |
| pgTAP·`supabase test db` | T02 DB 검사(`supabase/tests/database`) | RLS·권한·제약 회귀 검사 | pgTAP은 PostgreSQL 확장이므로 RDS 지원 여부를 이전 시 확인하고, 실행은 `pg_prove` 등 일반 도구로 대체 |
| Data API(PostgREST) 접근 검사 스크립트 | T02(`scripts/check-data-api-access.mjs`) | Supabase Data API로 업무 테이블에 접근할 수 없음을 확인 | Data API가 없는 RDS에서는 불필요(DB 권한 검사는 pgTAP으로 유지) |
| Edge Function 자동 주입 변수 | `SUPABASE_URL`, `SUPABASE_*_KEY(S)`, `SUPABASE_DB_URL` | 연결 정보 | 진입점에서 일반 환경변수로 대체(`EnvReader`) |

## 인증 이전 쟁점

인증 이전은 DB 복사만으로 끝나지 않습니다. 이전 착수 전(O14) 다음을 따로 결정합니다.

- **비밀번호**: Supabase Auth가 보관한 비밀번호 해시를 새 체계가 같은 알고리즘으로 검증할 수 있는지, 내보내기가 가능한지 확인해야 합니다. 불가하면 전원 비밀번호 재설정(관리자 발급 임시 비밀번호) 절차가 필요합니다.
- **세션**: 기존 접근·갱신 토큰은 이전 후 무효가 됩니다. 전환 시점에 모든 직원이 다시 로그인하도록 공지·전환 시간을 정합니다.
- **사용자 ID**: 업무 데이터는 업무 사용자 ID를 참조하므로 그대로 두고, 새 인증 ID를 `authUserId`에 다시 연결합니다. 매핑 누락·중복을 이전 전 점검합니다.
- **권한 정책**: 역할·기관·활성 상태는 업무 DB에 있으므로 유지됩니다. RLS 정책에 `auth.uid()`를 쓴 부분은 새 체계에서 다시 작성해야 합니다.
- **아이디 로그인**: 내부 인증 이메일 매핑(P20)을 쓰는 경우 새 체계에서 아이디 로그인을 그대로 지원할지, 매핑을 걷어낼지 정합니다(O13 결과에 따름).
- **감사 기록**: 이전 전후 로그인 기록의 행위자 ID가 이어지는지 확인합니다.

## 운영비 발생 항목과 추정에 필요한 사용량

금액은 요금제·환율·약관이 바뀌므로 문서에 고정하지 않고, 계정·예산 결정(O08) 때 공식 요금표로 계산합니다.

| 항목 | 비용 발생 요인 | 추정에 필요한 사용량 |
| --- | --- | --- |
| Supabase 요금제 | 프로젝트 기본 요금, 무료 등급의 일시정지·한도 조건(공식 요금표로 확인)과 운영 적합성 | 운영 프로젝트 수(스테이징 포함), 백업 보존 필요 기간 |
| Supabase DB | 컴퓨트 크기, 디스크 용량 | 기관당 월 상담 수, 회차당 행 수, 보관 기간 |
| Supabase Storage | 저장 용량, 내보내기 트래픽 | 회차당 사진·발도장 수와 평균 크기(P09 제안 10MiB 이하), 조회 빈도, 보관 기간 |
| Edge Functions | 호출 수 | 일 업무 요청 수, 작업 회수 주기(1분 = 월 약 4.3만 회 기본 발생) |
| Auth | 월간 활성 사용자 | 직원 계정 수 |
| Cloudflare 정적 제공 | 정적 자산 요청은 무료·무제한(2026-10-02 공식 문서). 도메인 비용은 별도 | 도메인 보유 여부 |
| 외부 AI(O06·O07 이후) | 호출당 입력·출력 토큰, 이미지 전송 여부, 재시도 | 회차당 분석 횟수, 건당 토큰, 실패·재시도율 |
| 발도장 분석 서버(필요 시) | 외부 실행 서버 상시 비용 | 분석 방식 결정(O01·O02) 후 처리 시간·빈도 |
| AWS 이전 시 | EC2·RDS·S3·전송·백업 | 위 사용량 실측값(MVP 운영 데이터) |
