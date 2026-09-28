import { createRouter, createWebHistory, type RouterHistory } from "vue-router";

import StaffLayout from "../layouts/StaffLayout.vue";
import ConsultationsPage from "../pages/ConsultationsPage.vue";
import ErrorPage from "../pages/ErrorPage.vue";
import LoginPage from "../pages/LoginPage.vue";
import PatientsPage from "../pages/PatientsPage.vue";
import IntakePage from "../pages/IntakePage.vue";
import ConsultationWorkPage from "../pages/ConsultationWorkPage.vue";
import QuestionnairePage from "../pages/QuestionnairePage.vue";
import AdminPage from "../pages/AdminPage.vue";
import PrintPage from "../pages/PrintPage.vue";
import { usePreviewStore } from "../stores/preview";

export function createAppRouter(history: RouterHistory = createWebHistory()) {
  const router = createRouter({
    history,
    routes: [
      { path: "/", name: "root", redirect: "/consultations" },
      { path: "/login", name: "login", component: LoginPage },
      { path: "/403", name: "forbidden", component: ErrorPage, props: { kind: "403" } },
      { path: "/404", name: "not-found", component: ErrorPage, props: { kind: "404" } },
      { path: "/error", name: "error", component: ErrorPage, props: { kind: "error" } },
      { path: "/q/:token", name: "public-questionnaire", component: QuestionnairePage },
      { path: "/q/:token/complete", name: "public-questionnaire-complete", component: QuestionnairePage },
      {
        path: "/", name: "staff-layout", component: StaffLayout, children: [
          { path: "consultations", name: "consultations", component: ConsultationsPage },
          { path: "consultations/new", name: "consultation-new", component: IntakePage },
          { path: "patients", name: "patients", component: PatientsPage },
          { path: "patients/new", name: "patient-new", component: PatientsPage },
          { path: "patients/:patientId", name: "patient-detail", component: PatientsPage },
          { path: "consultations/:consultationId/intake", name: "consultation-intake", component: IntakePage },
          { path: "consultations/:consultationId/questionnaire", name: "consultation-questionnaire", component: ConsultationWorkPage },
          { path: "consultations/:consultationId/visit", name: "consultation-visit", component: ConsultationWorkPage },
          { path: "consultations/:consultationId/media", name: "consultation-media", component: ConsultationWorkPage },
          { path: "consultations/:consultationId/analysis", name: "consultation-analysis", component: ConsultationWorkPage },
          { path: "consultations/:consultationId/result", name: "consultation-result", component: ConsultationWorkPage },
          { path: "consultations/:consultationId/print", name: "consultation-print", component: PrintPage },
          { path: "admin/users", name: "admin-users", component: AdminPage, meta: { requiresAdmin: true } },
          { path: "admin/records", name: "admin-records", redirect: "/admin/records/consultations" },
          { path: "admin/records/consultations", name: "admin-consultation-records", component: AdminPage, meta: { requiresAdmin: true } },
          { path: "admin/records/audit", name: "admin-audit-records", component: AdminPage, meta: { requiresAdmin: true } },
        ],
      },
      { path: "/:pathMatch(.*)*", name: "unknown-path", redirect: "/404" },
    ],
  });
  router.beforeEach((to) => {
    if (to.meta.requiresAdmin && usePreviewStore().role !== "ADMIN") return "/403";
  });
  return router;
}

export const router = createAppRouter();
