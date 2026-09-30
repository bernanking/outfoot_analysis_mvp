<script setup lang="ts">
import { computed, ref } from "vue";
import UiPreviewTools from "../ui/UiPreviewTools.vue";
import UiStatusBadge from "../ui/UiStatusBadge.vue";
import type { PreviewConsultation } from "../../data/preview";
import { useWorkDraftStore } from "../../stores/workDraft";

// 좌우 등록 칸을 먼저 보여주고 촬영 안내는 접어 둡니다. 파일 상태는 로컬 시안이며 R2 저장 완료가 아닙니다.
const props = defineProps<{ consultation: PreviewConsultation; base: string; editable: boolean }>();
type SlotState = "EMPTY" | "UPLOADING" | "QUALITY" | "RESELECT" | "READY";
const slotInfo: Record<SlotState, { label: string; tone: "neutral" | "info" | "warning" | "danger" | "success"; next: string; action: string }> = {
  EMPTY: { label: "미등록", tone: "neutral", next: "휴대폰으로 촬영한 파일을 선택합니다.", action: "파일 선택" },
  UPLOADING: { label: "전송 중 예시", tone: "info", next: "전송이 끝날 때까지 기다립니다. 중복으로 올리지 않습니다.", action: "전송 취소" },
  QUALITY: { label: "품질 확인 필요", tone: "warning", next: "흐림·잘림 여부를 확인하고 다시 촬영하거나 수동 확인을 기록합니다.", action: "다시 촬영한 파일 선택" },
  RESELECT: { label: "다시 선택 필요", tone: "danger", next: "형식 또는 용량이 맞지 않습니다. 다른 파일을 선택합니다.", action: "다른 파일 선택" },
  READY: { label: "로컬 미리보기 예시", tone: "success", next: "좌우가 맞는지 확인합니다. 필요하면 교체합니다.", action: "파일 교체" },
};
const slotExample = ref<"DEFAULT" | SlotState>("DEFAULT");
function fixtureState(side: "왼쪽" | "오른쪽"): SlotState {
  const image = props.consultation.image;
  if (image === "왼쪽만 등록") return side === "왼쪽" ? "READY" : "EMPTY";
  if (image === "품질 확인 필요") return side === "왼쪽" ? "QUALITY" : "READY";
  return image === "좌우 등록 예시" ? "READY" : "EMPTY";
}
const slotState = (side: "왼쪽" | "오른쪽"): SlotState => slotExample.value === "DEFAULT" ? fixtureState(side) : slotExample.value;
// 필요 여부와 발톱 사진 칸은 방문상담의 시술자 확인 유형(환자 원선택 포함)을 기준으로 표시합니다.
const drafts = useWorkDraftStore();
const draft = computed(() => drafts.drafts[props.consultation.id]);
const types = computed(() => draft.value.confirmedTypes);
const footprintRequirement = computed(() => types.value.includes("PAIN_INSOLE") ? "기본 필요" : types.value.includes("NAIL") ? "선택" : "유형 확인 후 결정");
const isNail = computed(() => types.value.includes("NAIL"));
</script>

<template>
  <section class="surface-card form-stack" aria-labelledby="footprint-title">
    <div class="surface-heading"><h2 id="footprint-title">좌우 발도장</h2><UiStatusBadge :label="`발도장 ${footprintRequirement}`" :tone="footprintRequirement === '기본 필요' ? 'info' : 'neutral'" /></div>
    <div class="slot-grid">
      <section v-for="side in (['왼쪽', '오른쪽'] as const)" :key="side" class="media-slot" :aria-label="`${side} 발도장`">
        <h3><span class="side-mark" aria-hidden="true">{{ side === '왼쪽' ? 'L' : 'R' }}</span>{{ side }} 발도장</h3>
        <div class="action-row"><UiStatusBadge :label="slotInfo[slotState(side)].label" :tone="slotInfo[slotState(side)].tone" /></div>
        <div class="slot-preview"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="10" r="1.8" /><path d="m21 16-5-5-8 8" /></svg><span>이미지 미리보기 자리 · 합성 시안</span></div>
        <p>{{ slotInfo[slotState(side)].next }}</p>
        <button class="secondary-button" type="button" disabled>{{ editable ? slotInfo[slotState(side)].action : '원본 보기만 가능' }}</button>
      </section>
    </div>
  </section>
  <section v-if="isNail" class="surface-card form-stack" aria-labelledby="nail-photo-title">
    <div class="surface-heading"><h2 id="nail-photo-title">발톱 사진</h2><UiStatusBadge label="선택" tone="neutral" /></div>
    <div class="slot-grid">
      <section class="media-slot" aria-label="전체 발 사진"><h3>전체 발</h3><div class="action-row"><UiStatusBadge label="미등록" tone="neutral" /></div><div class="slot-preview"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="10" r="1.8" /><path d="m21 16-5-5-8 8" /></svg><span>이미지 미리보기 자리 · 합성 시안</span></div><p>발 전체가 보이게 촬영한 사진입니다.</p><button class="secondary-button" type="button" disabled>{{ editable ? '사진 추가' : '원본 보기만 가능' }}</button></section>
      <section class="media-slot" aria-label="대표 발가락 사진"><h3>대표 발가락</h3><div class="action-row"><UiStatusBadge label="미등록" tone="neutral" /></div><div class="slot-preview"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="10" r="1.8" /><path d="m21 16-5-5-8 8" /></svg><span>이미지 미리보기 자리 · 합성 시안</span></div><p>발가락은 L1~L5·R1~R5로 표시합니다.</p><button class="secondary-button" type="button" disabled>{{ editable ? '사진 추가' : '원본 보기만 가능' }}</button></section>
    </div>
  </section>
  <section class="surface-card form-stack" aria-labelledby="media-exception-title">
    <h2 id="media-exception-title">촬영하지 못했거나 한쪽이 없을 때</h2>
    <div class="field-grid"><label>사유<select v-model="draft.media.exceptionReason" :disabled="!editable"><option value="">해당 없음</option><option>촬영 불가</option><option>한쪽 누락</option><option>품질 부족</option><option>기타</option></select></label><label>메모<input v-model="draft.media.exceptionMemo" :disabled="!editable" placeholder="상황 설명"></label></div>
  </section>
  <details class="surface-card guide-box">
    <summary>촬영 안내 · 발 전체가 보이게, 좌우를 나눠 촬영</summary>
    <ul class="check-list"><li>발 전체가 화면에 들어오게 위에서 촬영합니다.</li><li>왼쪽과 오른쪽을 각각 다른 파일로 올립니다. 칸 제목의 L/R과 글자를 함께 확인합니다.</li><li>JPG·PNG·WEBP 우선, 파일당 10MiB는 운영 확인 전 제안값입니다.</li><li>품질이 부족하면 다시 촬영, 다른 파일 선택, 수동 확인 기록 중 하나로 진행합니다.</li></ul>
  </details>
  <UiPreviewTools label="파일 상태 예시"><label class="preview-tools-field">발도장 칸 상태<select v-model="slotExample"><option value="DEFAULT">현재 예시</option><option value="EMPTY">미등록</option><option value="UPLOADING">전송 중</option><option value="QUALITY">품질 확인 필요</option><option value="RESELECT">다시 선택 필요</option><option value="READY">로컬 미리보기</option></select></label></UiPreviewTools>
</template>
