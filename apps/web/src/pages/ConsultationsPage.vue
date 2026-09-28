<script setup lang="ts">
import { computed, ref } from "vue";
import { RouterLink } from "vue-router";
import UiNotice from "../components/ui/UiNotice.vue";
import UiStatusBadge from "../components/ui/UiStatusBadge.vue";
import { consultations, patientFor, statusLabel, typeLabel, workPath } from "../data/preview";
import { usePreviewStore } from "../stores/preview";

const preview = usePreviewStore();
const query = ref("");
const scope = ref("ALL");
const type = ref("ALL");
const owner = ref("ALL");
const safety = ref("ALL");
const previewState = ref("READY");
const visible = computed(() => consultations.filter((item) => {
  if (item.deleted) return false;
  const patient = patientFor(item);
  const term = query.value.trim().toLowerCase();
  return (!term || `${patient.name} ${patient.phone.slice(-4)}`.toLowerCase().includes(term))
    && (scope.value === "ALL" || (scope.value === "OPEN" ? item.status !== "FINALIZED" : item.status === "FINALIZED"))
    && (type.value === "ALL" || (type.value === "UNSELECTED" ? item.types.length === 0 : item.types.includes(type.value as "NAIL" | "PAIN_INSOLE")))
    && (owner.value === "ALL" || item.owner === owner.value)
    && (safety.value === "ALL" || item.safety === safety.value);
}));
</script>

<template>
  <div class="page-stack">
    <div class="page-heading"><div><p class="breadcrumb">상담 관리 / 상담 목록</p><h1>상담 관리</h1><p class="muted">상담 접수부터 최종 결과까지 회차별로 확인합니다.</p></div><RouterLink class="primary-link" to="/consultations/new">신규 상담 접수</RouterLink></div>
    <UiNotice title="화면 시안 · 합성 데이터">검색과 필터는 이 화면의 예시 데이터만 바꿉니다. 실제 상담 기록을 조회하지 않습니다.</UiNotice>
    <section class="surface-card" aria-labelledby="consultation-list-title">
      <div class="surface-heading"><h2 id="consultation-list-title">상담 목록</h2><span class="muted">{{ visible.length }}건</span></div>
      <div class="filter-grid">
        <label>환자명·전화번호 뒤 네 자리<input v-model="query" type="search" placeholder="예: 합성 환자 가 또는 1201"></label>
        <label>범위<select v-model="scope"><option value="ALL">전체</option><option value="OPEN">진행 중</option><option value="CLOSED">종결</option></select></label>
        <label>상담 유형<select v-model="type"><option value="ALL">전체</option><option value="UNSELECTED">환자 미선택</option><option value="NAIL">발톱</option><option value="PAIN_INSOLE">통증·인솔</option></select></label>
        <label>담당자<select v-model="owner"><option value="ALL">전체</option><option>시술자 김</option><option>시술자 이</option></select></label>
        <label>주의신호<select v-model="safety"><option value="ALL">전체</option><option>없음</option><option>미확인</option><option>확인 필요</option><option>확인 완료</option></select></label>
        <label>상태 예시<select v-model="previewState"><option value="READY">목록</option><option value="LOADING">로딩</option><option value="ERROR">오류</option><option value="EMPTY">빈 목록</option></select></label>
      </div>
      <UiNotice v-if="previewState === 'LOADING'" title="목록을 불러오는 중인 상태 예시">실제 네트워크 요청은 없습니다.</UiNotice>
      <UiNotice v-else-if="previewState === 'ERROR'" title="목록 조회 오류 상태 예시" tone="danger">기능 연결 후 재시도와 요청 ID를 제공할 예정입니다.</UiNotice>
      <div v-else-if="previewState === 'EMPTY' || visible.length === 0" class="empty-panel"><strong>{{ previewState === 'EMPTY' ? '등록된 상담이 없는 상태 예시' : '조건에 맞는 상담이 없습니다' }}</strong><p>검색어와 필터를 바꾸거나 새 상담 접수 화면을 확인하세요.</p></div>
      <div v-else class="table-scroll"><table class="data-table"><thead><tr><th>환자</th><th>회차·상담일</th><th>유형</th><th>현재 단계</th><th>질문지</th><th>담당자</th><th>주의신호</th><th>이동</th></tr></thead><tbody><tr v-for="item in visible" :key="item.id"><td><RouterLink class="text-link" :to="`/patients/${item.patientId}`">{{ patientFor(item).name }}</RouterLink><small>{{ patientFor(item).phone }}</small></td><td>{{ item.round }}회 · {{ item.date }}</td><td>{{ typeLabel(item.types) }}</td><td><UiStatusBadge :label="statusLabel[item.status]" tone="info" /></td><td>{{ item.questionnaire }}</td><td>{{ item.owner }}<small>{{ preview.canEdit(item.owner) ? '수정 가능 예시' : '조회 전용 예시' }}</small></td><td>{{ item.safety }}</td><td><RouterLink class="text-link" :to="workPath(item)">상담 열기</RouterLink></td></tr></tbody></table></div>
    </section>
  </div>
</template>
