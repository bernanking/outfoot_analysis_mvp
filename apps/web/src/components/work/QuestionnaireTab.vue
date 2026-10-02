<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";
import UiStatusBadge from "../ui/UiStatusBadge.vue";
import { questionnaireChecks, typeLabel, type PreviewConsultation } from "../../data/preview";
import { previewQuestions } from "../../data/questionnairePreview";
import { useWorkDraftStore } from "../../stores/workDraft";

// 사전답변은 환자 원답을 읽는 화면입니다. 확인값 입력은 방문상담으로 모았습니다(T04B 제안).
const props = defineProps<{ consultation: PreviewConsultation; base: string }>();
const drafts = useWorkDraftStore();
const confirmedTypes = computed(() => drafts.drafts[props.consultation.id]?.confirmedTypes ?? []);
const submitted = computed(() => props.consultation.questionnaire === "제출 완료");
const groups = computed(() => [
  { title: "공통 답변", questions: [...previewQuestions["상담 내용"], ...previewQuestions["안전 확인"], ...previewQuestions["생활과 목표"]] },
  ...(props.consultation.types.includes("NAIL") ? [{ title: "발톱 답변", questions: previewQuestions["발톱 질문"] }] : []),
  ...(props.consultation.types.includes("PAIN_INSOLE") ? [{ title: "통증·인솔 답변", questions: previewQuestions["통증·인솔 질문"] }] : []),
]);
// 방문 시 다시 확인할 항목과 저장된 방문 기록의 확인값입니다. 탭 상태와 같은 목록을 씁니다.
// 저장하지 않은 방문상담 입력은 반영하지 않습니다.
const toConfirm = computed(() => questionnaireChecks(props.consultation));
const pendingChecks = computed(() => toConfirm.value.filter((item) => !item.confirmed).length);
</script>

<template>
  <section v-if="!submitted" class="surface-card form-stack" aria-labelledby="q-pending-title">
    <div class="surface-heading"><h2 id="q-pending-title">사전질문지가 아직 제출되지 않았습니다</h2><UiStatusBadge :label="consultation.questionnaire" tone="neutral" /></div>
    <p>환자가 질문지를 제출하면 원답과 확인할 항목이 이곳에 표시됩니다. 링크 상태를 먼저 확인해 주세요.</p>
    <dl class="detail-grid"><div><dt>질문지 링크</dt><dd>{{ consultation.link }}</dd></div><div><dt>환자 선택 유형</dt><dd>{{ typeLabel(consultation.types) }}</dd></div></dl>
    <RouterLink class="primary-link" :to="`${base}/intake`">질문지 링크 관리</RouterLink>
  </section>
  <template v-else>
    <section class="surface-card form-stack" aria-labelledby="q-confirm-title">
      <div class="surface-heading"><h2 id="q-confirm-title">방문 시 확인할 항목</h2><UiStatusBadge :label="pendingChecks ? `${pendingChecks}건 확인 필요 · 합성 예시` : '모두 확인됨 · 합성 예시'" :tone="pendingChecks ? 'warning' : 'success'" /></div>
      <p class="muted">확인값은 방문상담에서 입력하고, 저장된 확인값만 이곳에 표시합니다. 환자 원답은 바뀌지 않습니다.</p>
      <ul class="confirm-list">
        <li v-for="item in toConfirm" :key="item.id"><div><strong>{{ item.label }}</strong><small><span class="field-code">{{ item.id }}</span> {{ item.reason }} · 환자 원답: 합성 예시</small></div><UiStatusBadge v-if="item.confirmed" :label="item.savedText" tone="success" /><RouterLink v-else class="text-link" :to="`${base}/visit#${item.anchor}`">방문상담에서 확인</RouterLink></li>
      </ul>
    </section>
    <section class="surface-card" aria-labelledby="q-submission-title">
      <div class="surface-heading"><h2 id="q-submission-title">제출 정보</h2><UiStatusBadge :label="consultation.questionnaire" tone="success" /></div>
      <dl class="detail-grid"><div><dt>제출시각</dt><dd>합성 예시</dd></div><div><dt>질문지 버전</dt><dd>시안 v1 · 확정 전</dd></div><div><dt>동의 버전</dt><dd>확정 예정</dd></div><div><dt>환자 선택 유형</dt><dd>{{ typeLabel(consultation.types) }}</dd></div><div><dt>시술자 확인 유형</dt><dd>{{ confirmedTypes.length ? typeLabel(confirmedTypes) : '미확인' }} · 방문상담에서 확인</dd></div></dl>
    </section>
    <details v-for="group in groups" :key="group.title" class="surface-card answer-group">
      <summary><span>{{ group.title }}</span><span class="muted">{{ group.questions.length }}문항 · 읽기 전용</span></summary>
      <ul class="field-inventory"><li v-for="question in group.questions" :key="question.id"><span><span class="field-code">{{ question.id }}</span> {{ question.label }}</span> <span>환자 원답: 합성 예시</span></li></ul>
    </details>
  </template>
</template>
