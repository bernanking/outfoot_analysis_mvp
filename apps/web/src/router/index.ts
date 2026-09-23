import { createRouter, createWebHistory, type RouterHistory } from "vue-router";

import StaffLayout from "../layouts/StaffLayout.vue";
import ConsultationsPage from "../pages/ConsultationsPage.vue";
import ErrorPage from "../pages/ErrorPage.vue";
import LoginPage from "../pages/LoginPage.vue";
import PlannedPage from "../pages/PlannedPage.vue";

export function createAppRouter(history: RouterHistory = createWebHistory()) {
  return createRouter({
    history,
    routes: [
      { path: "/", name: "root", redirect: "/consultations" },
      { path: "/login", name: "login", component: LoginPage },
      { path: "/403", name: "forbidden", component: ErrorPage, props: { kind: "403" } },
      { path: "/404", name: "not-found", component: ErrorPage, props: { kind: "404" } },
      { path: "/error", name: "error", component: ErrorPage, props: { kind: "error" } },
      {
        path: "/", name: "staff-layout", component: StaffLayout, children: [
          { path: "consultations", name: "consultations", component: ConsultationsPage },
          { path: "consultations/new", name: "consultation-new", component: PlannedPage, meta: { title: "신규 상담 접수" } },
          { path: "patients", name: "patients", component: PlannedPage, meta: { title: "환자 관리" } },
          { path: "patients/new", name: "patient-new", component: PlannedPage, meta: { title: "신규 환자 등록" } },
          { path: "admin/users", name: "admin-users", component: PlannedPage, meta: { title: "사용자 관리" } },
          { path: "admin/records", name: "admin-records", redirect: "/admin/records/consultations" },
          { path: "admin/records/consultations", name: "admin-consultation-records", component: PlannedPage, meta: { title: "상담 기록" } },
          { path: "admin/records/audit", name: "admin-audit-records", component: PlannedPage, meta: { title: "감사 기록" } },
        ],
      },
      { path: "/:pathMatch(.*)*", name: "unknown-path", redirect: "/404" },
    ],
  });
}

export const router = createAppRouter();
