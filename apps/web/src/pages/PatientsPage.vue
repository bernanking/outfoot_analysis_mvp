<script setup lang="ts">
import { computed, ref } from "vue";
import { RouterLink, useRoute } from "vue-router";
import UiNotice from "../components/ui/UiNotice.vue";
import { consultations, patientById, patients, statusLabel, typeLabel, workPath } from "../data/preview";
import { usePreviewStore } from "../stores/preview";

const preview = usePreviewStore();
const route = useRoute();
const query = ref("");
const state = ref("READY");
const person = computed(() => patientById(route.params.patientId));
const isNew = computed(() => route.path === "/patients/new");
const matches = computed(() => patients.filter((item) => `${item.name} ${item.phone.slice(-4)}`.includes(query.value.trim())));
const history = computed(() => consultations.filter((item) => item.patientId === person.value?.id && !item.deleted).sort((a, b) => b.round - a.round));
</script>

<template>
  <div class="page-stack">
    <template v-if="isNew">
      <div class="page-heading"><div><p class="breadcrumb">환자 관리 / 신규 등록</p><h1>신규 환자 등록</h1><p class="muted">중복 후보를 확인하는 등록 화면 시안입니다.</p></div></div>
      <UiNotice title="등록 기능 개발 단계에서 연결 예정">입력값은 저장되지 않습니다. 실제 환자정보를 입력하지 마세요.</UiNotice>
      <section class="surface-card form-stack"><h2>기본정보</h2><div class="field-grid"><label>이름<input placeholder="합성 이름만 입력"></label><label>전화번호<input placeholder="010-0000-0000"></label><label>성별<select><option>선택</option><option>여성</option><option>남성</option><option>응답 안 함</option></select></label><label>출생연도 또는 나이<input placeholder="예: 1984"></label></div><p class="muted">필수값 오류·중복 확인·등록 중 상태는 기능 연결 시 입력값을 보존하며 표시합니다.</p></section>
      <section class="surface-card"><h2>전화번호 중복 후보 예시</h2><p class="muted">정규화된 전화번호가 같은 환자가 있으면 선택할 수 있도록 표시합니다.</p><RouterLink class="text-link" to="/patients/p-a">합성 환자 가 · 기존 기록 열기</RouterLink></section>
      <div class="action-row"><RouterLink class="secondary-link" to="/patients">취소</RouterLink><button class="secondary-button" disabled>등록 후 상세 보기 · 기능 연결 예정</button><button class="secondary-button" disabled>등록 후 상담 접수 · 기능 연결 예정</button></div>
    </template>
    <template v-else-if="route.params.patientId && person">
      <div class="page-heading"><div><p class="breadcrumb">환자 관리 / 환자 상세</p><h1>{{ person.name }}</h1><p class="muted">합성 데이터 · {{ person.phone }} · {{ person.birth }}년생</p></div><RouterLink class="primary-link" :to="`/consultations/new?patientId=${person.id}`">새 상담 접수</RouterLink></div>
      <UiNotice title="정보 수정 기능 연결 예정">이 화면은 환자별 회차 이동을 검토하는 시안입니다. 수정 충돌 시에는 최신값 재확인 안내가 표시될 예정입니다.</UiNotice>
      <section class="surface-card"><div class="surface-heading"><h2>기본정보</h2><button class="secondary-button" disabled>정보 수정 · 기능 연결 예정</button></div><dl class="detail-grid"><div><dt>연락처</dt><dd>{{ person.phone }}</dd></div><div><dt>성별</dt><dd>{{ person.sex }}</dd></div><div><dt>출생연도</dt><dd>{{ person.birth }}</dd></div><div><dt>등록일</dt><dd>{{ person.registered }}</dd></div></dl></section>
      <section class="surface-card"><h2>상담 회차</h2><div v-if="history.length === 0" class="empty-panel">상담 이력이 없는 상태 예시</div><div v-else class="table-scroll"><table class="data-table"><thead><tr><th>회차·상담일</th><th>유형</th><th>담당자</th><th>상태</th><th>결과</th><th>권한</th><th>이동</th></tr></thead><tbody><tr v-for="item in history" :key="item.id"><td>{{ item.round }}회 · {{ item.date }}</td><td>{{ typeLabel(item.types) }}</td><td>{{ item.owner }}</td><td>{{ statusLabel[item.status] }}</td><td>{{ item.result }}</td><td>{{ preview.canEdit(item.owner) ? '수정 가능 예시' : '조회 전용' }}</td><td><RouterLink class="text-link" :to="workPath(item)">상담 열기</RouterLink></td></tr></tbody></table></div></section>
    </template>
    <template v-else-if="route.params.patientId"><div class="page-heading"><h1>환자를 찾을 수 없습니다</h1></div><RouterLink class="text-link" to="/patients">환자 목록으로</RouterLink></template>
    <template v-else>
      <div class="page-heading"><div><p class="breadcrumb">환자 관리 / 환자 목록</p><h1>환자 관리</h1><p class="muted">환자 기본정보와 상담 회차로 이동합니다.</p></div><RouterLink class="primary-link" to="/patients/new">신규 환자 등록</RouterLink></div>
      <UiNotice title="화면 시안 · 합성 데이터">실제 환자 검색이나 등록은 아직 연결되지 않았습니다.</UiNotice>
      <section class="surface-card"><div class="surface-heading"><h2>환자 목록</h2><span class="muted">{{ matches.length }}명</span></div><div class="filter-grid"><label>이름·전화번호 뒤 네 자리<input v-model="query" type="search" placeholder="합성 환자 가"></label><label>상태 예시<select v-model="state"><option value="READY">목록</option><option value="LOADING">로딩</option><option value="ERROR">오류</option><option value="EMPTY">빈 목록</option></select></label></div><UiNotice v-if="state === 'ERROR'" title="조회 오류 상태 예시" tone="danger">목록을 가져오지 못했습니다.</UiNotice><UiNotice v-else-if="state === 'LOADING'" title="불러오는 중인 상태 예시">네트워크 요청은 없습니다.</UiNotice><div v-else-if="state === 'EMPTY' || matches.length === 0" class="empty-panel">조건에 맞는 환자가 없습니다.</div><div v-else class="table-scroll"><table class="data-table"><thead><tr><th>환자</th><th>연락처</th><th>성별·출생</th><th>최근 상담</th><th>회차</th><th>이동</th></tr></thead><tbody><tr v-for="item in matches" :key="item.id"><td><RouterLink class="text-link" :to="`/patients/${item.id}`">{{ item.name }}</RouterLink></td><td>{{ item.phone }}</td><td>{{ item.sex }} · {{ item.birth }}</td><td>{{ consultations.find(c => c.patientId === item.id && !c.deleted)?.date || '없음' }}</td><td>{{ consultations.filter(c => c.patientId === item.id && !c.deleted).length }}회</td><td><RouterLink class="text-link" :to="`/consultations/new?patientId=${item.id}`">새 상담</RouterLink></td></tr></tbody></table></div></section>
    </template>
  </div>
</template>
