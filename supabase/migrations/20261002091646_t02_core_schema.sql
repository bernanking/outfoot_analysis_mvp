-- T02 기본 구조: 기관, 업무 사용자(인증 사용자 매핑), 환자, 상담, 상담 유형
-- 근거: docs/09_DATA_MODEL.md, docs/10_API_CONTRACT.md, docs/02_DECISIONS.md(D25·P19)
--
-- 원칙
-- - 표준 PostgreSQL만 사용합니다(AWS RDS로 옮길 수 있게). Supabase 전용 auth 스키마로 외래키를 걸지 않습니다.
-- - 업무 테이블은 Data API에 노출하지 않습니다. RLS를 켜고 정책을 두지 않으며, anon·authenticated·service_role 권한을 회수합니다.
--   config.toml의 auto_expose_new_tables=false는 로컬 설정이므로 원격 환경과 무관하게 이 파일에서 직접 회수합니다.
--   브라우저는 업무 데이터를 Edge Function(api)으로만 다루고, 서버의 DB 접근 방식은 T03·T05에서 정합니다(docs/09).
-- - 상태·역할 값은 Postgres enum 대신 text + CHECK로 둡니다(값 추가·이전이 쉬움).
-- - 삭제는 논리삭제만 합니다(외래키에 ON DELETE CASCADE 없음).
-- - 낙관적 잠금 version은 애플리케이션이 UPDATE ... WHERE version = ? 로 올립니다(T05~T08).

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- 트리거 전용 함수입니다. Data API의 RPC로 부를 수 없게 실행 권한을 회수합니다.
revoke execute on function public.set_updated_at() from public, anon, authenticated, service_role;

-- 기관: MVP는 1개 기관(P01)이지만 모든 업무 데이터의 소유 경계입니다.
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) > 0),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 업무 사용자(직원). 업무 사용자 ID(id)와 인증 사용자 ID(auth_user_id)를 분리합니다.
-- auth_user_id는 Supabase auth.users.id를 가리키지만 이식성을 위해 외래키를 걸지 않습니다. 연결은 T03에서 합니다.
-- 비밀번호 해시는 두지 않습니다(Supabase Auth가 관리, P20). 로그인 아이디 형식 규칙은 O13 결정 전이라 정규화(소문자·앞뒤 공백 없음)만 검사합니다.
create table public.app_users (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  auth_user_id uuid unique,
  login_id text not null check (length(login_id) > 0 and login_id = lower(btrim(login_id))),
  display_name text not null check (length(btrim(display_name)) > 0),
  role text not null check (role in ('PRACTITIONER', 'ADMIN')),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE')),
  password_change_required boolean not null default false,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id)
);
-- 로그인 아이디는 인증 이메일 매핑(P20)과 1:1이라 기관과 관계없이 유일합니다.
create unique index app_users_login_id_key on public.app_users (login_id);

-- 환자 기본정보. 상담 회차와 분리합니다(D03).
-- 전화번호는 표시용 암호문과 중복검색용 해시를 분리하는 제안(docs/09)에 따라 두 열만 두고, 암호화 방식은 T05에서 정합니다.
-- 성별 허용값은 화면·문항 확정(O03) 전이라 제약을 두지 않습니다.
create table public.patients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  name text not null check (length(btrim(name)) > 0),
  phone_encrypted bytea,
  phone_lookup_hash text,
  sex text,
  birth_year smallint check (birth_year between 1900 and 2100),
  age_at_registration smallint check (age_at_registration between 0 and 150),
  version integer not null default 1 check (version > 0),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id)
);
create index patients_org_name_idx on public.patients (organization_id, name) where deleted_at is null;
create index patients_org_phone_lookup_idx on public.patients (organization_id, phone_lookup_hash)
  where deleted_at is null and phone_lookup_hash is not null;

-- 상담 회차. 기관 경계를 DB에서도 지키도록 환자·담당자·삭제자를 (기관, ID) 복합 외래키로 묶습니다.
-- 회차 번호는 삭제되지 않은 상담 사이에서만 유일하게 둡니다. 삭제 후 번호 재사용 여부는 T06에서 정합니다(이 제약은 두 정책 모두 허용).
-- 논리삭제는 관리자만 하며(D03·P07) 삭제 시각·삭제자·사유를 함께 남깁니다. 삭제자의 역할 확인은 서버가 합니다.
create table public.consultations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  patient_id uuid not null,
  practitioner_id uuid not null,
  sequence integer not null check (sequence > 0),
  status text not null default 'INTAKE'
    check (status in ('INTAKE', 'QUESTIONNAIRE', 'IN_VISIT', 'ANALYSIS_REVIEW', 'FINALIZED')),
  final_decision text check (final_decision in ('CARE_PLANNED', 'NEEDS_MORE_INFO', 'REFER_MEDICAL', 'ON_HOLD')),
  version integer not null default 1 check (version > 0),
  deleted_at timestamptz,
  deleted_by uuid,
  deletion_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (organization_id, patient_id) references public.patients (organization_id, id),
  foreign key (organization_id, practitioner_id) references public.app_users (organization_id, id),
  foreign key (organization_id, deleted_by) references public.app_users (organization_id, id),
  constraint consultations_deletion_complete check (
    (deleted_at is null and deleted_by is null and deletion_reason is null)
    or (deleted_at is not null and deleted_by is not null and length(btrim(deletion_reason)) > 0)
  )
);
create unique index consultations_patient_sequence_active_key on public.consultations (patient_id, sequence)
  where deleted_at is null;
create index consultations_org_status_idx on public.consultations (organization_id, status) where deleted_at is null;
create index consultations_practitioner_idx on public.consultations (practitioner_id) where deleted_at is null;

-- 상담 유형. 두 유형 함께는 세 번째 유형이 아니라 두 행입니다(D06).
-- 환자 원선택(PATIENT_SELECTED)과 시술자 확인 유형(PRACTITIONER_CONFIRMED)을 분리해 원선택을 덮어쓰지 않습니다.
create table public.consultation_concern_types (
  consultation_id uuid not null references public.consultations (id),
  source text not null check (source in ('PATIENT_SELECTED', 'PRACTITIONER_CONFIRMED')),
  concern_type text not null check (concern_type in ('NAIL', 'PAIN_INSOLE')),
  recorded_by uuid references public.app_users (id),
  created_at timestamptz not null default now(),
  primary key (consultation_id, source, concern_type)
);

create trigger organizations_set_updated_at before update on public.organizations
  for each row execute function public.set_updated_at();
create trigger app_users_set_updated_at before update on public.app_users
  for each row execute function public.set_updated_at();
create trigger patients_set_updated_at before update on public.patients
  for each row execute function public.set_updated_at();
create trigger consultations_set_updated_at before update on public.consultations
  for each row execute function public.set_updated_at();

-- RLS 기본 차단: 정책을 두지 않습니다. 필요한 접근은 이후 마이그레이션에서 이유와 함께 정책·GRANT로 엽니다.
alter table public.organizations enable row level security;
alter table public.app_users enable row level security;
alter table public.patients enable row level security;
alter table public.consultations enable row level security;
alter table public.consultation_concern_types enable row level security;

-- Data API 역할의 권한 회수. service_role은 RLS를 우회하지만 테이블 권한이 없으면 접근할 수 없습니다.
revoke all on table
  public.organizations,
  public.app_users,
  public.patients,
  public.consultations,
  public.consultation_concern_types
from anon, authenticated, service_role;
