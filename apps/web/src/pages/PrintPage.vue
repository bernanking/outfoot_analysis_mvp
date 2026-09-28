<script setup lang="ts">
import { computed, ref } from "vue";
import { RouterLink, useRoute } from "vue-router";
import UiNotice from "../components/ui/UiNotice.vue";
import { consultationFor, patientFor, typeLabel } from "../data/preview";

const route = useRoute();
const consultation = computed(() => consultationFor(route.params.consultationId));
const revision = ref("current");
</script>

<template>
  <div v-if="consultation" class="page-stack print-page">
    <div class="page-heading print-controls"><div><p class="breadcrumb">상담 관리 / 최종결과 / 인쇄</p><h1>고객 안내 인쇄</h1></div><RouterLink class="secondary-link" :to="`/consultations/${consultation.id}/result`">최종결과로 돌아가기</RouterLink></div>
    <UiNotice title="인쇄 화면 시안">실제 확정본이 연결되지 않았으므로 고객 안내를 인쇄하지 않습니다. 아래 문서는 정보 배치 검토용입니다.</UiNotice>
    <div class="action-row print-controls"><label>개정 선택<select v-model="revision"><option value="current">현재 개정 예시</option><option value="old">이전 개정 예시</option></select></label><button class="secondary-button" disabled>인쇄 · 확정본 연결 후 제공</button></div>
    <article class="surface-card print-document"><div class="surface-heading"><h2>OUTFOOT · 고객 안내</h2><span class="preview-pill">{{ revision === 'old' ? '이전 개정 예시' : '합성 문서 예시' }}</span></div><dl class="detail-grid"><div><dt>고객</dt><dd>{{ patientFor(consultation).name }}</dd></div><div><dt>상담일·회차</dt><dd>{{ consultation.date }} · {{ consultation.round }}회</dd></div><div><dt>상담 유형</dt><dd>{{ typeLabel(consultation.types) }}</dd></div><div><dt>확정자·시각·개정</dt><dd>실제 확정 정보 없음</dd></div></dl><section><h3>현재 상태 요약</h3><p>확정된 안내가 없습니다.</p></section><section><h3>관리 방향과 홈케어</h3><p>시술자 확정 후 표시됩니다.</p></section><section><h3>주의사항과 추후 확인</h3><p>확정된 안전 안내와 일정 또는 미정 사유가 표시됩니다.</p></section></article>
  </div>
  <div v-else class="page-stack"><h1>상담을 찾을 수 없습니다</h1><RouterLink class="text-link" to="/consultations">상담 목록으로</RouterLink></div>
</template>
