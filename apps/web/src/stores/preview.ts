import { defineStore } from "pinia";
import { computed, ref } from "vue";

export type PreviewRole = "PRACTITIONER" | "ADMIN";

export const usePreviewStore = defineStore("preview", () => {
  const role = ref<PreviewRole>("PRACTITIONER");
  const currentUser = computed(() => role.value === "ADMIN"
    ? { name: "관리자 박", role: "ADMIN" as const, roleLabel: "관리자" }
    : { name: "시술자 김", role: "PRACTITIONER" as const, roleLabel: "시술자" });
  const canEdit = (owner: string) => role.value === "ADMIN" || currentUser.value.name === owner;
  const canFinalize = (owner: string) => role.value === "PRACTITIONER" && currentUser.value.name === owner;
  // 상담 상세에서 목록으로 돌아갈 때 마지막 검색·필터 조건을 유지합니다.
  const lastConsultationListPath = ref("/consultations");
  // 환자 상세에서 목록으로 돌아갈 때도 마지막 검색 조건을 유지합니다. 상세로 바로 들어오면 기본 목록입니다.
  const lastPatientListPath = ref("/patients");
  return { role, currentUser, canEdit, canFinalize, lastConsultationListPath, lastPatientListPath };
});
