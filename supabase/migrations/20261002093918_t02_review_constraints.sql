-- T02 검토 보완(2026-10-02). 앞선 마이그레이션은 로컬 DB에 적용되어 있으므로 고치지 않고 이 후속 마이그레이션으로 바꿉니다.
-- 기존 행을 보존합니다(새 열은 기존 관계에서 채운 뒤 NOT NULL로 바꿈). 표준 PostgreSQL만 사용합니다.

-- 1) 상담 논리삭제 사유
--    이전 제약은 사유가 NULL이면 식 전체가 NULL이 되어 CHECK를 통과했고(PostgreSQL은 NULL을 위반으로 보지 않음),
--    btrim이 일반 공백만 지워 탭·줄바꿈·전각 공백만 있는 사유도 통과했습니다.
--    사유가 NULL이 아니고, 공백류(일반·탭·줄바꿈·NBSP·폭 없는 공백·전각 공백 등)가 아닌 글자를 하나 이상 포함해야 합니다.
alter table public.consultations drop constraint consultations_deletion_complete;
alter table public.consultations add constraint consultations_deletion_complete check (
  (deleted_at is null and deleted_by is null and deletion_reason is null)
  or (
    deleted_at is not null
    and deleted_by is not null
    and deletion_reason is not null
    and deletion_reason ~ '[^[:space:]  -​    　﻿]'
  )
);

-- 2) 상담 유형의 기관 경계
--    기록자(recorded_by)가 app_users(id)만 가리켜 다른 기관 직원을 연결할 수 있었습니다.
--    organization_id를 더해 상담과 기록자를 모두 (기관, ID) 복합 외래키로 묶습니다.
alter table public.consultations add constraint consultations_organization_id_id_key unique (organization_id, id);

alter table public.consultation_concern_types add column organization_id uuid;
update public.consultation_concern_types as t
  set organization_id = c.organization_id
  from public.consultations as c
  where c.id = t.consultation_id;
alter table public.consultation_concern_types alter column organization_id set not null;

alter table public.consultation_concern_types drop constraint consultation_concern_types_consultation_id_fkey;
alter table public.consultation_concern_types drop constraint consultation_concern_types_recorded_by_fkey;
alter table public.consultation_concern_types
  add constraint consultation_concern_types_consultation_fkey
    foreign key (organization_id, consultation_id) references public.consultations (organization_id, id),
  add constraint consultation_concern_types_recorder_fkey
    foreign key (organization_id, recorded_by) references public.app_users (organization_id, id);

-- 3) 시술자 확인 유형은 확인자를 남깁니다(구현 제안: 확인값에는 확인자를 함께 기록한다는 docs/09·18 원칙을 따름).
--    환자 원선택은 링크 제출이라 기록자가 없을 수 있어 비워 둘 수 있습니다. 직원이 대신 입력하는 경우의 기록 방식은 정하지 않았습니다.
alter table public.consultation_concern_types add constraint consultation_concern_types_confirmed_recorder
  check (source <> 'PRACTITIONER_CONFIRMED' or recorded_by is not null);

-- 새 열도 테이블 단위 권한 회수 대상입니다(앞선 마이그레이션의 revoke가 테이블 전체에 적용됨). RLS 상태는 바뀌지 않습니다.
