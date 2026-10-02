/// <reference types="vite/client" />

import "vue-router";

// 이 파일은 vue-router를 import하는 모듈이므로, 전역 ImportMetaEnv 병합은 declare global 안에 둡니다.
// 웹 번들에 들어가는 공개 설정만 선언합니다. 타입 선언은 오타·형식 실수를 줄이는 장치일 뿐 비밀값 유출을 막지 않습니다
// (유출 방지는 VITE_ 이름 규칙과 scripts/check-web-bundle.mjs 검사).
declare global {
  interface ImportMetaEnv {
    readonly VITE_APP_NAME?: string;
    readonly VITE_API_BASE_URL?: string;
  }
}

declare module "vue-router" {
  interface RouteMeta {
    title?: string;
    requiresAdmin?: boolean;
    /** 상세 화면에서도 활성으로 표시할 전역 메뉴 */
    nav?: "consultations" | "consultation-new" | "patients" | "patient-new" | "admin-users" | "admin-consultation-records" | "admin-audit-records";
  }
}
