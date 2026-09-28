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
  return { role, currentUser, canEdit, canFinalize };
});
