// 플랫폼 연동 경계(타입만 있음). 업무 규칙은 이 타입에만 의존하고 Supabase SDK·Deno·Node 전용 API를 직접 쓰지 않습니다.
// 구현체는 실행환경 진입점(현재 supabase/functions/*)에 두고, 해당 기능 작업 때 필요한 것만 만듭니다.
// 아직 어떤 구현도 연결되어 있지 않습니다. AWS 이전 시 같은 타입으로 RDS·S3·Node 구현을 붙입니다(docs/19_PLATFORM_MIGRATION.md).

/**
 * 요청한 직원. 인증 사용자 ID(authUserId, 예: Supabase auth.users.id)와 업무 사용자 ID(appUserId)를 분리합니다.
 * 역할·기관·활성 상태는 JWT 클레임이 아니라 요청마다 업무 DB의 현재 값으로 채웁니다(T03).
 */
export interface StaffPrincipal {
  authUserId: string;
  appUserId: string;
  organizationId: string;
  role: "PRACTITIONER" | "ADMIN";
}

/** 직원 인증. 토큰이 없거나 무효이거나 계정이 비활성이면 null입니다. 공개 질문지 토큰은 다루지 않습니다(별도 경로). */
export interface StaffAuthenticator {
  authenticate(request: Request): Promise<StaffPrincipal | null>;
}

/**
 * 저장 객체의 기준 데이터. 공개 URL이나 만료되는 서명 URL을 저장하지 않고 저장소·버킷·객체 경로를 저장합니다.
 * provider 값은 이전 시 기존 행을 구분하기 위한 것입니다.
 */
export interface StoredObjectRef {
  provider: "SUPABASE_STORAGE" | "S3";
  bucket: string;
  objectPath: string;
}

/** 비공개 파일 접근. 호출 전에 업무 권한 검사를 끝내야 하며, 발급한 URL은 짧게 만료되고 DB에 저장하지 않습니다. */
export interface ObjectStorage {
  createReadUrl(ref: StoredObjectRef, expiresInSeconds: number): Promise<{ url: string; expiresAt: string }>;
}
