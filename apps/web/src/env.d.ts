/// <reference types="vite/client" />

import "vue-router";

declare module "vue-router" {
  interface RouteMeta {
    title?: string;
    requiresAdmin?: boolean;
    /** 상세 화면에서도 활성으로 표시할 전역 메뉴 */
    nav?: "consultations" | "consultation-new" | "patients" | "patient-new" | "admin-users" | "admin-consultation-records" | "admin-audit-records";
  }
}
