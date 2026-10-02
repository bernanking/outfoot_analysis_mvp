-- T02 기본 구조 검사(pgTAP). 실행: npm run db:test (로컬 Supabase 필요)
-- 모든 변경은 트랜잭션 안에서 하고 마지막에 되돌립니다. 합성 값만 씁니다.
begin;
create extension if not exists pgtap with schema extensions;
select plan(55);

-- 테이블
select has_table('public', 'organizations', '기관 테이블');
select has_table('public', 'app_users', '업무 사용자 테이블');
select has_table('public', 'patients', '환자 테이블');
select has_table('public', 'consultations', '상담 테이블');
select has_table('public', 'consultation_concern_types', '상담 유형 테이블');
select hasnt_column('public', 'app_users', 'password_hash', '업무 DB에 비밀번호 해시 없음(Supabase Auth 관리)');
select col_not_null('public', 'consultation_concern_types', 'organization_id', '상담 유형에 기관 ID 필수');

-- RLS 기본 차단: 업무 테이블마다 RLS가 켜져 있고, public 전체에도 RLS가 꺼진 테이블·정책이 없음(이후 테이블도 이 검사에 걸림)
select ok((select relrowsecurity from pg_class where oid = 'public.organizations'::regclass), 'organizations RLS 켜짐');
select ok((select relrowsecurity from pg_class where oid = 'public.app_users'::regclass), 'app_users RLS 켜짐');
select ok((select relrowsecurity from pg_class where oid = 'public.patients'::regclass), 'patients RLS 켜짐');
select ok((select relrowsecurity from pg_class where oid = 'public.consultations'::regclass), 'consultations RLS 켜짐');
select ok((select relrowsecurity from pg_class where oid = 'public.consultation_concern_types'::regclass), 'consultation_concern_types RLS 켜짐');
select is((select count(*)::int from pg_tables where schemaname = 'public' and not rowsecurity), 0, 'public 테이블 모두 RLS 켜짐');
select is((select count(*)::int from pg_policies where schemaname = 'public'), 0, 'public 테이블에 RLS 정책 없음(기본 차단)');

-- Data API 역할의 실효 권한: 직접 부여뿐 아니라 PUBLIC·상속 역할로 받은 권한까지 has_*_privilege로 확인합니다.
-- 테이블 권한(조회·추가·수정·삭제·비우기·참조·트리거, PostgreSQL 17의 MAINTAIN)과 열 단위 권한을 함께 셉니다.
create temporary table t02_privilege_probe on commit drop as
  select r.rolname, c.oid as relid, c.relname
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  cross join (values ('anon'), ('authenticated'), ('service_role')) as r(rolname)
  where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm', 'f');
select is((select count(*)::int from t02_privilege_probe where rolname = 'anon' and (
    has_table_privilege(rolname, relid, 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN')
    or has_any_column_privilege(rolname, relid, 'SELECT, INSERT, UPDATE, REFERENCES'))),
  0, 'anon 실효 테이블·열 권한 없음(PUBLIC·상속 포함)');
select is((select count(*)::int from t02_privilege_probe where rolname = 'authenticated' and (
    has_table_privilege(rolname, relid, 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN')
    or has_any_column_privilege(rolname, relid, 'SELECT, INSERT, UPDATE, REFERENCES'))),
  0, 'authenticated 실효 테이블·열 권한 없음(PUBLIC·상속 포함)');
select is((select count(*)::int from t02_privilege_probe where rolname = 'service_role' and (
    has_table_privilege(rolname, relid, 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN')
    or has_any_column_privilege(rolname, relid, 'SELECT, INSERT, UPDATE, REFERENCES'))),
  0, 'service_role 실효 테이블·열 권한 없음(PUBLIC·상속 포함)');

-- 트리거 함수 실행 권한(세 역할)과 public의 모든 함수
select ok(not has_function_privilege('anon', 'public.set_updated_at()', 'execute'), 'anon은 트리거 함수 실행 불가');
select ok(not has_function_privilege('authenticated', 'public.set_updated_at()', 'execute'), 'authenticated는 트리거 함수 실행 불가');
select ok(not has_function_privilege('service_role', 'public.set_updated_at()', 'execute'), 'service_role은 트리거 함수 실행 불가');
select is((select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    cross join (values ('anon'), ('authenticated'), ('service_role')) as r(rolname)
    where n.nspname = 'public' and has_function_privilege(r.rolname, p.oid, 'execute')),
  0, 'public 함수 모두 Data API 역할 실행 불가');

-- 역할을 바꿔 직접 조회·변경이 거부되는지 확인(권한 없음 42501)
set local role anon;
select throws_ok('select count(*) from public.patients', '42501', null, 'anon 환자 조회 거부');
select throws_ok($$insert into public.organizations (name) values ('합성')$$, '42501', null, 'anon 기관 추가 거부');
reset role;
set local role authenticated;
select throws_ok('select count(*) from public.consultations', '42501', null, 'authenticated 상담 조회 거부');
select throws_ok($$update public.app_users set role = 'ADMIN'$$, '42501', null, 'authenticated 역할 변경 거부');
select throws_ok($$update public.consultations set deleted_at = now()$$, '42501', null, 'authenticated 삭제 상태 변경 거부');
reset role;
set local role service_role;
select throws_ok('select count(*) from public.app_users', '42501', null, 'service_role도 업무 테이블 권한 없음');
reset role;

-- 합성 seed
select is((select count(*)::int from public.organizations), 1, 'seed 기관 1');
select is((select count(*)::int from public.app_users where auth_user_id is null), 4, 'seed 직원 4(인증 연결 전)');
select is((select count(*)::int from public.consultations where deleted_at is not null), 1, 'seed 논리삭제 상담 1');

-- 검사용 합성 데이터: 다른 기관과 그 환자·직원, 삭제 검사용 상담
insert into public.organizations (id, name) values ('00000000-0000-4000-8000-0000000000f2', '합성 기관 2');
insert into public.patients (id, organization_id, name) values ('00000000-0000-4000-8000-0000000000f3', '00000000-0000-4000-8000-0000000000f2', '합성 환자 타기관');
insert into public.app_users (id, organization_id, login_id, display_name, role)
  values ('00000000-0000-4000-8000-0000000000f4', '00000000-0000-4000-8000-0000000000f2', 'synthetic.other', '합성 타기관 직원', 'PRACTITIONER');
insert into public.consultations (id, organization_id, patient_id, practitioner_id, sequence)
  values ('00000000-0000-4000-8000-0000000000d1', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000a3', '00000000-0000-4000-8000-000000000012', 2);

-- 상담의 기관 경계(복합 외래키)
select throws_ok(
  $$insert into public.consultations (organization_id, patient_id, practitioner_id, sequence)
    values ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000f3', '00000000-0000-4000-8000-000000000011', 1)$$,
  '23503', null, '다른 기관 환자로 상담 생성 거부');
select throws_ok(
  $$insert into public.consultations (organization_id, patient_id, practitioner_id, sequence)
    values ('00000000-0000-4000-8000-0000000000f2', '00000000-0000-4000-8000-0000000000f3', '00000000-0000-4000-8000-000000000011', 1)$$,
  '23503', null, '다른 기관 직원을 담당자로 지정 거부');

-- 상담 유형: 값, 출처 구분, 기관 경계, 확인자
select throws_ok(
  $$insert into public.consultation_concern_types (organization_id, consultation_id, source, concern_type)
    values ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000101', 'PATIENT_SELECTED', 'BOTH')$$,
  '23514', null, 'BOTH 유형 거부');
select throws_ok(
  $$insert into public.consultation_concern_types (organization_id, consultation_id, source, concern_type)
    values ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000101', 'UNKNOWN', 'NAIL')$$,
  '23514', null, '알 수 없는 출처 거부');
select lives_ok(
  $$insert into public.consultation_concern_types (organization_id, consultation_id, source, concern_type) values
    ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000101', 'PATIENT_SELECTED', 'NAIL'),
    ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000101', 'PATIENT_SELECTED', 'PAIN_INSOLE')$$,
  '한 상담에 두 유형 동시 저장(두 행)');
select lives_ok(
  $$insert into public.consultation_concern_types (organization_id, consultation_id, source, concern_type, recorded_by)
    values ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000101', 'PRACTITIONER_CONFIRMED', 'NAIL', '00000000-0000-4000-8000-000000000011')$$,
  '같은 기관 직원이 시술자 확인 유형 기록');
select is(
  (select count(distinct source)::int from public.consultation_concern_types
   where consultation_id = '00000000-0000-4000-8000-000000000101' and concern_type = 'NAIL'),
  2, '같은 유형도 환자 원선택과 시술자 확인값이 별도 행으로 남음');
select throws_ok(
  $$insert into public.consultation_concern_types (organization_id, consultation_id, source, concern_type)
    values ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000101', 'PATIENT_SELECTED', 'NAIL')$$,
  '23505', null, '같은 상담·출처·유형 중복 거부');
select throws_ok(
  $$insert into public.consultation_concern_types (organization_id, consultation_id, source, concern_type, recorded_by)
    values ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000101', 'PRACTITIONER_CONFIRMED', 'PAIN_INSOLE', '00000000-0000-4000-8000-0000000000f4')$$,
  '23503', null, '다른 기관 직원을 기록자로 지정 거부');
select throws_ok(
  $$insert into public.consultation_concern_types (organization_id, consultation_id, source, concern_type, recorded_by)
    values ('00000000-0000-4000-8000-0000000000f2', '00000000-0000-4000-8000-000000000101', 'PRACTITIONER_CONFIRMED', 'PAIN_INSOLE', '00000000-0000-4000-8000-0000000000f4')$$,
  '23503', null, '상담과 다른 기관 ID로 기록 거부');
select throws_ok(
  $$insert into public.consultation_concern_types (organization_id, consultation_id, source, concern_type)
    values ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000101', 'PRACTITIONER_CONFIRMED', 'PAIN_INSOLE')$$,
  '23514', null, '확인자 없는 시술자 확인 유형 거부');

-- 논리삭제: 시각·삭제자·사유를 함께, 사유는 NULL·빈 값·공백류만으로는 안 됨, 삭제자는 같은 기관
-- 각 검사는 세 열을 모두 직접 지정해 앞 검사의 결과(예상 밖 성공 포함)에 영향받지 않게 합니다.
select throws_ok(
  $$update public.consultations set deleted_at = now(), deleted_by = '00000000-0000-4000-8000-000000000013', deletion_reason = null
    where id = '00000000-0000-4000-8000-0000000000d1'$$,
  '23514', null, '사유 NULL 삭제 거부');
select throws_ok(
  $$update public.consultations set deleted_at = now(), deleted_by = '00000000-0000-4000-8000-000000000013', deletion_reason = ''
    where id = '00000000-0000-4000-8000-0000000000d1'$$,
  '23514', null, '빈 사유 삭제 거부');
select throws_ok(
  $$update public.consultations set deleted_at = now(), deleted_by = '00000000-0000-4000-8000-000000000013', deletion_reason = '   '
    where id = '00000000-0000-4000-8000-0000000000d1'$$,
  '23514', null, '공백 사유 삭제 거부');
select throws_ok(
  $$update public.consultations set deleted_at = now(), deleted_by = '00000000-0000-4000-8000-000000000013', deletion_reason = E'\t\n'
    where id = '00000000-0000-4000-8000-0000000000d1'$$,
  '23514', null, '탭·줄바꿈 사유 삭제 거부');
select throws_ok(
  $$update public.consultations set deleted_at = now(), deleted_by = '00000000-0000-4000-8000-000000000013', deletion_reason = U&'\3000\00A0'
    where id = '00000000-0000-4000-8000-0000000000d1'$$,
  '23514', null, '전각 공백·NBSP 사유 삭제 거부');
select throws_ok(
  $$update public.consultations set deleted_at = now(), deleted_by = null, deletion_reason = '합성 사유'
    where id = '00000000-0000-4000-8000-0000000000d1'$$,
  '23514', null, '삭제자 없는 삭제 거부');
select throws_ok(
  $$update public.consultations set deleted_at = null, deleted_by = '00000000-0000-4000-8000-000000000013', deletion_reason = '합성 사유'
    where id = '00000000-0000-4000-8000-0000000000d1'$$,
  '23514', null, '삭제 시각 없는 삭제 거부');
select throws_ok(
  $$update public.consultations set deleted_at = now(), deleted_by = '00000000-0000-4000-8000-0000000000f4', deletion_reason = '합성 사유'
    where id = '00000000-0000-4000-8000-0000000000d1'$$,
  '23503', null, '다른 기관 직원을 삭제자로 지정 거부');
select lives_ok(
  $$update public.consultations set deleted_at = now(), deleted_by = '00000000-0000-4000-8000-000000000013', deletion_reason = '합성 중복 정리 사유'
    where id = '00000000-0000-4000-8000-0000000000d1'$$,
  '시각·같은 기관 삭제자·사유를 함께 남긴 삭제 허용');

-- 회차 번호: 삭제되지 않은 상담 사이에서만 유일(삭제 후 재사용 정책은 T06)
select throws_ok(
  $$insert into public.consultations (organization_id, patient_id, practitioner_id, sequence)
    values ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-000000000011', 1)$$,
  '23505', null, '같은 환자의 활성 회차 번호 중복 거부');
select lives_ok(
  $$insert into public.consultations (organization_id, patient_id, practitioner_id, sequence)
    values ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-000000000011', 2)$$,
  '삭제된 회차 번호는 DB 제약상 다시 쓸 수 있음(정책은 T06)');

-- 로그인 아이디 정규화, 역할 값
select throws_ok(
  $$insert into public.app_users (organization_id, login_id, display_name, role) values ('00000000-0000-4000-8000-000000000001', 'Practitioner.New', '합성', 'PRACTITIONER')$$,
  '23514', null, '대문자 로그인 아이디 거부');
select throws_ok(
  $$insert into public.app_users (organization_id, login_id, display_name, role) values ('00000000-0000-4000-8000-000000000001', 'practitioner.kim', '합성', 'PRACTITIONER')$$,
  '23505', null, '로그인 아이디 중복 거부');
select throws_ok(
  $$insert into public.app_users (organization_id, login_id, display_name, role) values ('00000000-0000-4000-8000-000000000001', 'synthetic.owner', '합성', 'OWNER')$$,
  '23514', null, '정의되지 않은 역할 거부');

select * from finish();
rollback;
