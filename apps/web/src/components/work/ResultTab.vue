<script setup lang="ts">
import { computed, ref } from "vue";
import { RouterLink } from "vue-router";
import UiStatusBadge from "../ui/UiStatusBadge.vue";
import { resultRevisions, type PreviewConsultation } from "../../data/preview";
import { usePreviewStore } from "../../stores/preview";
import { useWorkDraftStore } from "../../stores/workDraft";

// 시술자 최종본을 먼저 두고 AI 원본은 접이식 참고로 둡니다. 초안·현재 확정본·이전 결과는 보기 상태로 구분합니다.
// 결론별 입력 자리만 정하며 임상 판단 기준이나 안내 문구는 만들지 않습니다.
const props = defineProps<{ consultation: PreviewConsultation; base: string; editable: boolean; canFinalize: boolean }>();
const preview = usePreviewStore();
// 초안 입력은 상담별 로컬 상태에 두어 결과 보기(초안·현재 확정본·이전 결과)를 바꿔도 사라지지 않습니다.
// 보기 전환 자체는 입력 변경이 아닙니다.
const drafts = useWorkDraftStore();
const draft = computed(() => drafts.drafts[props.consultation.id].result);
type View = "DRAFT" | "CURRENT" | "PREVIOUS";
const view = ref<View>(props.consultation.status === "FINALIZED" ? "CURRENT" : "DRAFT");
const closesWithoutCare = computed(() => draft.value.conclusion === "의료기관 우선" || draft.value.conclusion === "보류");
const draftEditable = computed(() => props.editable && view.value === "DRAFT");
const finalizeReason = computed(() => {
  if (props.consultation.deleted) return "삭제된 상담은 확정할 수 없습니다.";
  if (preview.role === "ADMIN") return "관리자의 최종확정 권한은 O11 결정 전까지 제공하지 않습니다.";
  if (!props.canFinalize) return "담당 시술자만 최종확정할 수 있습니다.";
  return "확정 전 확인 대화상자를 거칩니다. 확정 후에는 새 결과로만 고칠 수 있습니다.";
});
// 확정 결과는 종결 상담에만 있는 합성 예시입니다. 고객 안내 인쇄와 같은 기준(resultRevisions)을 씁니다.
const history = computed(() => resultRevisions(props.consultation));
const shownResult = computed(() => history.value.find((item) => item.current === (view.value === "CURRENT")));
</script>

<template>
  <div class="result-view-switch" role="radiogroup" aria-label="결과 보기">
    <label v-for="option in ([['DRAFT', '초안'], ['CURRENT', '현재 확정본'], ['PREVIOUS', '이전 결과']] as const)" :key="option[0]" class="segment"><input v-model="view" type="radio" name="result-view" :value="option[0]"> {{ option[1] }}</label>
  </div>

  <section v-if="view === 'DRAFT'" class="surface-card form-stack" aria-labelledby="draft-title">
    <div class="surface-heading"><h2 id="draft-title">시술자 최종본 · 초안</h2><UiStatusBadge :label="consultation.result" tone="neutral" /></div>
    <fieldset class="visit-form" :disabled="!draftEditable">
      <legend class="sr-only">최종본 작성</legend>
      <fieldset class="choice-fieldset"><legend>최종 결론 <span class="required-mark">필수</span></legend><div class="segmented"><label v-for="option in ['관리 검토', '추가 확인 필요', '의료기관 우선', '보류']" :key="option" class="checkbox-row"><input v-model="draft.conclusion" type="radio" name="result-conclusion" :value="option"> {{ option }}</label></div></fieldset>
      <div v-if="closesWithoutCare" class="conditional-fields" aria-live="polite">
        <p class="muted">의료기관 우선·보류는 AI 케어 초안과 추후 확인 날짜 없이 아래 내용으로 종결할 수 있습니다.</p>
        <label class="stacked-label"><span class="label-row">사유<span class="required-mark">필수</span></span><textarea v-model="draft.reason" placeholder="판단 이유" /></label>
        <label class="stacked-label"><span class="label-row">안전 안내<span class="required-mark">필수</span></span><textarea v-model="draft.safetyGuide" placeholder="고객에게 전달할 안전 안내" /></label>
        <label class="stacked-label field-medium"><span class="label-row">확인 담당자<span class="required-mark">필수</span></span><input v-model="draft.confirmer" placeholder="확인한 담당자"></label>
      </div>
      <div v-else-if="draft.conclusion" class="conditional-fields" aria-live="polite">
        <label class="stacked-label">관리 방향<textarea v-model="draft.careDirection" placeholder="시술자가 정한 관리 방향" /></label>
        <p class="muted">일반 관리 확정에는 최신 AI 검토본이 필요하며, 세부 차단 조건은 O04·O05 결정 전입니다. 오래된 분석이나 미확인 주의신호가 있으면 <RouterLink class="text-link" :to="`${base}/analysis`">분석·보완</RouterLink> 또는 <RouterLink class="text-link" :to="`${base}/visit#visit-safety`">안전정보 확인</RouterLink>에서 먼저 해결합니다.</p>
      </div>
      <label class="stacked-label">고객 안내 · 인쇄됨<textarea v-model="draft.customerGuide" placeholder="확정된 쉬운 표현만 인쇄합니다" /></label>
      <label class="stacked-label">내부 메모 · 인쇄 안 됨<textarea v-model="draft.internalMemo" placeholder="고객 안내와 분리됩니다" /></label>
      <fieldset class="choice-fieldset">
        <legend>추후 확인</legend>
        <div class="segmented"><label class="checkbox-row"><input v-model="draft.followUp" type="radio" name="follow-up" value="DATE"> 날짜 지정</label><label class="checkbox-row"><input v-model="draft.followUp" type="radio" name="follow-up" value="UNDECIDED"> 미정</label></div>
        <label v-if="draft.followUp === 'DATE'" class="stacked-label field-medium">확인 날짜<input v-model="draft.followDate" type="date"></label>
        <label v-else class="stacked-label">미정 사유<input v-model="draft.followReason" placeholder="날짜를 정하지 않은 이유"></label>
      </fieldset>
    </fieldset>
    <div class="finalize-row">
      <button class="primary-button" type="button" disabled>{{ canFinalize ? '최종확정' : '최종확정 권한 없음' }}</button>
      <p class="muted">{{ finalizeReason }}</p>
      <p v-if="canFinalize" class="pending-note">확정 기능 연결 예정</p>
    </div>
  </section>

  <section v-else-if="!shownResult" class="surface-card form-stack" aria-labelledby="final-view-title">
    <h2 id="final-view-title">{{ view === 'CURRENT' ? '현재 확정본' : '이전 결과' }}</h2>
    <div class="empty-panel"><strong>{{ view === 'CURRENT' ? '아직 확정된 결과가 없습니다' : '이전 결과가 없습니다' }}</strong><p>초안을 작성하고 최종확정하면 이곳에 읽기 전용으로 표시됩니다.</p></div>
  </section>

  <section v-else class="surface-card form-stack" aria-labelledby="final-view-title">
    <div class="surface-heading"><h2 id="final-view-title">{{ view === 'CURRENT' ? '현재 확정본' : '이전 결과' }}</h2><UiStatusBadge :label="view === 'CURRENT' ? '읽기 전용 · 현재' : '읽기 전용 · 현재 아님'" :tone="view === 'CURRENT' ? 'success' : 'neutral'" /></div>
    <p v-if="view === 'PREVIOUS'" class="print-previous">이전 결과입니다. 현재 확정본과 다를 수 있으며 수정할 수 없습니다.</p>
    <dl class="detail-grid"><div><dt>결과 번호</dt><dd>{{ shownResult.number }} · 합성 예시</dd></div><div><dt>확정자·확정시각</dt><dd>실제 확정 정보 없음</dd></div><div><dt>사용한 분석</dt><dd>없음 · 분석 방식 미구성</dd></div><div><dt>최종 결론</dt><dd>{{ consultation.result }}</dd></div></dl>
    <p class="muted">확정된 내용은 덮어쓰지 않습니다. 고치려면 새 결과를 작성합니다.</p>
    <div class="action-row"><button class="secondary-button" type="button" disabled>새 결과 작성</button><span class="pending-note">기능 연결 예정</span><RouterLink class="quiet-link" :to="`${base}/print`">고객 안내 인쇄 화면</RouterLink></div>
  </section>

  <section class="surface-card" aria-labelledby="result-history-title">
    <h2 id="result-history-title">결과 이력</h2>
    <p v-if="history.length === 0" class="muted">확정된 결과가 없습니다.</p>
    <ul v-else class="confirm-list"><li v-for="item in history" :key="item.number"><div><strong>{{ item.number }}</strong><small>확정자 {{ item.by }} · {{ item.at }}</small></div><UiStatusBadge :label="item.current ? '현재' : '이전'" :tone="item.current ? 'success' : 'neutral'" /></li></ul>
    <p v-if="history.length" class="muted">합성 구조 예시이며 실제 확정 이력은 없습니다.</p>
  </section>

  <details class="surface-card reference-box">
    <summary>AI 참고 · 원본 요약 (읽기 전용)</summary>
    <p class="muted">원본 요약과 근거를 수정 없이 보여줄 자리입니다. 현재 승인된 AI 결과는 없습니다. 발도장 분석 방식은 미구성이며 측정값 없음 상태입니다.</p>
    <RouterLink class="text-link" :to="`${base}/analysis`">분석·실행 이력 보기</RouterLink>
  </details>
</template>
