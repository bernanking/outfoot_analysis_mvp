<script setup lang="ts">
import { computed, ref } from "vue";
import { RouterLink, useRoute } from "vue-router";
import UiNotice from "../components/ui/UiNotice.vue";
import UiBreadcrumb from "../components/ui/UiBreadcrumb.vue";
import { consultationFor, patientFor, typeLabel } from "../data/preview";

const route = useRoute();
const consultation = computed(() => consultationFor(route.params.consultationId));
const revision = ref<"current" | "previous">("current");
// 임상 내용이 아닌 길이 확인용 중립 문장입니다. 긴 안내문과 여러 페이지 배치를 검토하기 위해 반복합니다.
const lengthSample = "레이아웃 확인용 예시 문장입니다. 실제 안내 문구가 아니며 임상 내용을 담지 않습니다. 줄바꿈과 문단 간격, 여러 페이지로 나뉘는 모습을 확인하기 위해 반복합니다.";
const paragraphs = (count: number) => Array.from({ length: count }, () => lengthSample);
</script>

<template>
  <div v-if="consultation" class="page-stack print-page">
    <div class="page-heading print-controls"><div><UiBreadcrumb :items="[{ label: '상담 관리', to: '/consultations' }, { label: patientFor(consultation).name, to: `/patients/${consultation.patientId}` }, { label: '최종결과', to: `/consultations/${consultation.id}/result` }, { label: '고객 안내 인쇄' }]" /><h1>고객 안내 인쇄</h1><p class="muted">확정된 고객 안내만 인쇄합니다. AI 원본·내부 메모·확정되지 않은 분석 수치는 포함하지 않습니다.</p></div><RouterLink class="secondary-link" :to="`/consultations/${consultation.id}/result`">최종결과로 돌아가기</RouterLink></div>
    <UiNotice v-if="consultation.deleted" title="삭제된 상담 · 조회 전용" tone="danger">관리자 조회용 화면입니다. 인쇄할 수 없습니다.</UiNotice>
    <div class="action-bar print-controls">
      <label class="preview-tools-field">결과 선택<select v-model="revision"><option value="current">현재 확정본 예시</option><option value="previous">이전 결과 예시</option></select></label>
      <button class="primary-button" type="button" disabled>인쇄 · 확정본 연결 후 제공</button>
    </div>
    <article class="surface-card print-document" aria-labelledby="print-title">
      <div class="surface-heading"><h2 id="print-title">OUTFOOT · 고객 안내</h2><span class="preview-pill">{{ revision === 'previous' ? '이전 결과 · 현재 확정본 아님' : '현재 확정본 예시' }}</span></div>
      <p v-if="revision === 'previous'" class="print-previous">이 문서는 이전 결과입니다. 현재 확정본과 다를 수 있습니다.</p>
      <dl class="detail-grid"><div><dt>고객</dt><dd>{{ patientFor(consultation).name }}</dd></div><div><dt>상담일·회차</dt><dd>{{ consultation.date }} · {{ consultation.round }}회</dd></div><div><dt>상담 유형</dt><dd>{{ typeLabel(consultation.types) }}</dd></div><div><dt>확정자·확정일·결과 번호</dt><dd>합성 예시 · 실제 확정 정보 없음</dd></div></dl>
      <p class="muted">아래 문단은 길이 확인용 예시입니다. 실제 안내문은 시술자 확정 후 표시됩니다.</p>
      <section><h3>현재 상태 요약</h3><p v-for="(text, index) in paragraphs(2)" :key="`summary-${index}`">{{ text }}</p></section>
      <section><h3>관리 방향과 홈케어</h3><p v-for="(text, index) in paragraphs(4)" :key="`care-${index}`">{{ text }}</p></section>
      <section><h3>주의사항과 의료기관 확인 안내</h3><p v-for="(text, index) in paragraphs(2)" :key="`caution-${index}`">{{ text }}</p></section>
      <section><h3>추후 확인</h3><p>날짜 또는 미정 사유가 표시됩니다.</p></section>
    </article>
  </div>
  <div v-else class="page-stack"><div class="page-heading"><h1>상담을 찾을 수 없습니다</h1></div><RouterLink class="text-link" to="/consultations">상담 목록으로</RouterLink></div>
</template>
