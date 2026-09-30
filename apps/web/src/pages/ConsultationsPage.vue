<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";
import UiNotice from "../components/ui/UiNotice.vue";
import UiPreviewTools from "../components/ui/UiPreviewTools.vue";
import UiBreadcrumb from "../components/ui/UiBreadcrumb.vue";
import UiStatusBadge from "../components/ui/UiStatusBadge.vue";
import { useQueryFilters } from "../app/useQueryFilters";
import { consultations, patientFor, safetyTone, statusLabel, statusTone, typeLabel, workPath } from "../data/preview";
import { usePreviewStore } from "../stores/preview";

const preview = usePreviewStore();
const route = useRoute();
watch(() => route.fullPath, (path) => { if (route.path === "/consultations") preview.lastConsultationListPath = path; }, { immediate: true });
const previewState = ref("READY");
const { filters, activeKeys, reset } = useQueryFilters({ q: "", status: "ALL", owner: "ALL", type: "ALL", safety: "ALL" });

const statusOptions = [
  { value: "ALL", label: "전체" }, { value: "OPEN", label: "진행 중 전체" }, { value: "CLOSED", label: "종결" },
  ...Object.entries(statusLabel).filter(([key]) => key !== "FINALIZED").map(([value, label]) => ({ value, label })),
];
const ownerOptions = computed(() => [
  { value: "ALL", label: "전체" }, { value: "MINE", label: `내 담당 (${preview.currentUser.name})` },
  { value: "시술자 김", label: "시술자 김" }, { value: "시술자 이", label: "시술자 이" },
]);
const typeOptions = [{ value: "ALL", label: "전체" }, { value: "UNSELECTED", label: "환자 미선택" }, { value: "NAIL", label: "발톱" }, { value: "PAIN_INSOLE", label: "통증·인솔" }];
const safetyOptions = ["ALL", "없음", "미확인", "확인 필요", "확인 완료"].map((value) => ({ value, label: value === "ALL" ? "전체" : value }));
const filterLabels: Record<string, { name: string; options?: () => Array<{ value: string; label: string }> }> = {
  q: { name: "검색" }, status: { name: "진행 상태", options: () => statusOptions }, owner: { name: "담당자", options: () => ownerOptions.value },
  type: { name: "상담 유형", options: () => typeOptions }, safety: { name: "주의신호", options: () => safetyOptions },
};
const appliedFilters = computed(() => activeKeys.value.map((key) => {
  const value = filters[key as keyof typeof filters];
  const option = filterLabels[key].options?.().find((item) => item.value === value);
  return { key, text: `${filterLabels[key].name}: ${option?.label ?? value}` };
}));
const extraFilterCount = computed(() => activeKeys.value.filter((key) => key === "type" || key === "safety").length);

const active = computed(() => consultations.filter((item) => !item.deleted));
const visible = computed(() => active.value.filter((item) => {
  const patient = patientFor(item);
  const term = filters.q.trim().toLowerCase();
  const owner = filters.owner === "MINE" ? preview.currentUser.name : filters.owner;
  return (!term || `${patient.name} ${patient.phone.slice(-4)}`.toLowerCase().includes(term))
    && (filters.status === "ALL" || (filters.status === "OPEN" ? item.status !== "FINALIZED" : filters.status === "CLOSED" ? item.status === "FINALIZED" : item.status === filters.status))
    && (owner === "ALL" || item.owner === owner)
    && (filters.type === "ALL" || (filters.type === "UNSELECTED" ? item.types.length === 0 : item.types.includes(filters.type as "NAIL" | "PAIN_INSOLE")))
    && (filters.safety === "ALL" || item.safety === filters.safety);
}));
const hasNoRecords = computed(() => previewState.value === "EMPTY");
</script>

<template>
  <div class="page-stack">
    <div class="page-heading"><div><UiBreadcrumb :items="[{ label: '상담 관리' }, { label: '상담 목록' }]" /><h1>상담 관리</h1><p class="muted">처리할 상담을 찾아 현재 단계의 작업 화면으로 이동합니다.</p></div><RouterLink class="primary-link" to="/consultations/new">신규 상담 접수</RouterLink></div>
    <section class="surface-card list-card" aria-labelledby="consultation-list-title">
      <div class="surface-heading"><h2 id="consultation-list-title">상담 목록</h2></div>
      <div class="filter-bar">
        <label>환자명·전화번호 뒤 네 자리<input v-model="filters.q" type="search" placeholder="예: 합성 환자 가 또는 1201"></label>
        <label>진행 상태<select v-model="filters.status"><option v-for="option in statusOptions" :key="option.value" :value="option.value">{{ option.label }}</option></select></label>
        <label>담당자<select v-model="filters.owner"><option v-for="option in ownerOptions" :key="option.value" :value="option.value">{{ option.label }}</option></select></label>
      </div>
      <details class="more-filters" :open="extraFilterCount > 0 || undefined">
        <summary>추가 필터<span v-if="extraFilterCount"> · {{ extraFilterCount }}개 적용</span></summary>
        <div class="filter-bar">
          <label>상담 유형<select v-model="filters.type"><option v-for="option in typeOptions" :key="option.value" :value="option.value">{{ option.label }}</option></select></label>
          <label>주의신호<select v-model="filters.safety"><option v-for="option in safetyOptions" :key="option.value" :value="option.value">{{ option.label }}</option></select></label>
        </div>
      </details>
      <div class="result-summary" aria-live="polite">
        <p><strong>{{ hasNoRecords ? 0 : visible.length }}건</strong> <span class="muted">/ 전체 {{ hasNoRecords ? 0 : active.length }}건</span> <span class="muted result-hint">· 조건을 바꾸면 바로 반영됩니다</span></p>
        <ul v-if="appliedFilters.length" class="applied-filters" aria-label="적용한 조건"><li v-for="item in appliedFilters" :key="item.key">{{ item.text }}</li></ul>
        <button v-if="appliedFilters.length" class="text-button" type="button" @click="reset">조건 전체 초기화</button>
      </div>
      <UiNotice v-if="previewState === 'LOADING'" live title="목록을 불러오는 중인 상태 예시">실제 네트워크 요청은 없습니다.</UiNotice>
      <UiNotice v-else-if="previewState === 'ERROR'" live title="목록 조회 오류 상태 예시" tone="danger">기능 연결 후 다시 시도와 요청 ID를 제공할 예정입니다.</UiNotice>
      <div v-else-if="hasNoRecords" class="empty-panel"><strong>등록된 상담이 없는 상태 예시</strong><p>첫 상담을 접수하면 이곳에 표시됩니다.</p><RouterLink class="secondary-link" to="/consultations/new">신규 상담 접수</RouterLink></div>
      <div v-else-if="visible.length === 0" class="empty-panel"><strong>조건에 맞는 상담이 없습니다</strong><p>검색어나 필터를 바꾸거나 조건을 초기화해 주세요.</p><button class="secondary-button" type="button" @click="reset">조건 전체 초기화</button></div>
      <template v-else>
        <div class="table-scroll desktop-only">
          <table class="data-table">
            <thead><tr><th>환자·회차</th><th>상담일</th><th>진행 상태</th><th>확인할 점</th><th>담당자</th><th><span class="sr-only">이동</span></th></tr></thead>
            <tbody>
              <tr v-for="item in visible" :key="item.id">
                <td class="primary-cell"><RouterLink class="text-link" :to="`/patients/${item.patientId}`">{{ patientFor(item).name }}</RouterLink><small>{{ item.round }}회 · {{ typeLabel(item.types) }} · {{ patientFor(item).phone }}</small></td>
                <td class="nowrap num">{{ item.date }}</td>
                <td><UiStatusBadge :label="statusLabel[item.status]" :tone="statusTone[item.status]" /></td>
                <td><UiStatusBadge :label="`주의신호 ${item.safety}`" :tone="safetyTone(item.safety)" /><small>질문지 {{ item.questionnaire }}</small></td>
                <td>{{ item.owner }}<small>{{ preview.canEdit(item.owner) ? '수정 가능 예시' : '조회 전용 예시' }}</small></td>
                <td class="nowrap"><RouterLink class="text-link" :to="workPath(item)">상담 열기</RouterLink></td>
              </tr>
            </tbody>
          </table>
        </div>
        <ul class="record-cards mobile-only" aria-label="상담 목록">
          <li v-for="item in visible" :key="item.id" class="record-card">
            <div class="record-card-head"><RouterLink class="text-link" :to="`/patients/${item.patientId}`">{{ patientFor(item).name }}</RouterLink><UiStatusBadge :label="statusLabel[item.status]" :tone="statusTone[item.status]" /></div>
            <p class="muted"><span class="num">{{ item.date }}</span> · {{ item.round }}회 · {{ typeLabel(item.types) }}</p>
            <p><UiStatusBadge :label="`주의신호 ${item.safety}`" :tone="safetyTone(item.safety)" /> <span class="muted">질문지 {{ item.questionnaire }}</span></p>
            <p class="muted">담당 {{ item.owner }} · {{ preview.canEdit(item.owner) ? '수정 가능 예시' : '조회 전용 예시' }}</p>
            <RouterLink class="secondary-link" :to="workPath(item)">상담 열기</RouterLink>
          </li>
        </ul>
      </template>
    </section>
    <UiPreviewTools><label class="preview-tools-field">목록 상태 예시<select v-model="previewState"><option value="READY">목록</option><option value="LOADING">로딩</option><option value="ERROR">오류</option><option value="EMPTY">등록된 상담 없음</option></select></label><p class="muted">화면 시안 · 합성 데이터입니다. 실제 상담 기록을 조회하지 않습니다.</p></UiPreviewTools>
  </div>
</template>
