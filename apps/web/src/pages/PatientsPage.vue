<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";
import UiNotice from "../components/ui/UiNotice.vue";
import UiPreviewTools from "../components/ui/UiPreviewTools.vue";
import UiBreadcrumb from "../components/ui/UiBreadcrumb.vue";
import UiStatusBadge from "../components/ui/UiStatusBadge.vue";
import { useQueryFilters } from "../app/useQueryFilters";
import { consultations, patientById, patients, statusLabel, statusTone, typeLabel, workPath } from "../data/preview";
import { usePreviewStore } from "../stores/preview";

const preview = usePreviewStore();
const route = useRoute();
const state = ref("READY");
const person = computed(() => patientById(route.params.patientId));
const isNew = computed(() => route.path === "/patients/new");
const fromIntake = computed(() => route.query.from === "intake");
const cancelPath = computed(() => fromIntake.value ? "/consultations/new" : "/patients");
const ageInput = ref<"BIRTH_YEAR" | "AGE">("BIRTH_YEAR");
const notDuplicate = ref(false);

const { filters, activeKeys, reset } = useQueryFilters({ q: "" });
watch(() => route.fullPath, (path) => { if (route.path === "/patients") preview.lastPatientListPath = path; }, { immediate: true });
const activeConsultations = (patientId: string) => consultations.filter((item) => item.patientId === patientId && !item.deleted).sort((a, b) => b.date.localeCompare(a.date));
const matches = computed(() => patients.filter((item) => `${item.name} ${item.phone.slice(-4)}`.includes(filters.q.trim())));
const history = computed(() => person.value ? [...activeConsultations(person.value.id)].sort((a, b) => b.round - a.round) : []);
</script>

<template>
  <div class="page-stack">
    <template v-if="isNew">
      <div class="page-heading"><div><UiBreadcrumb :items="fromIntake ? [{ label: '상담 관리', to: '/consultations' }, { label: '신규 상담 접수', to: '/consultations/new' }, { label: '신규 환자 등록' }] : [{ label: '환자 관리', to: '/patients' }, { label: '신규 환자 등록' }]" /><h1>신규 환자 등록</h1><p class="muted">{{ fromIntake ? '등록한 환자로 상담 접수를 이어갑니다.' : '기본정보를 입력하고 전화번호 중복 후보를 확인합니다.' }}</p></div></div>
      <UiNotice v-if="fromIntake" title="상담 접수에서 이동했습니다">등록을 마치면 이 환자가 선택된 상태로 상담 접수 화면으로 돌아갑니다.</UiNotice>
      <section class="surface-card form-stack" aria-labelledby="patient-basic-title">
        <div class="surface-heading"><h2 id="patient-basic-title">기본정보</h2><span class="field-help">필수·선택 구분은 확정 전 제안입니다</span></div>
        <p class="field-help">입력값은 저장되지 않습니다. 합성 정보만 입력해 주세요.</p>
        <div class="field-grid field-grid--short">
          <label><span class="label-row">이름<span class="required-mark">필수</span></span><input required autocomplete="off" placeholder="합성 이름만 입력"></label>
          <label><span class="label-row">전화번호<span class="required-mark">필수</span></span><input required inputmode="tel" autocomplete="off" placeholder="010-0000-0000"></label>
          <label><span class="label-row">성별<span class="required-mark required-mark--optional">선택</span></span><select><option value="">선택 안 함</option><option>여성</option><option>남성</option><option>응답 안 함</option></select></label>
        </div>
        <fieldset class="choice-fieldset">
          <legend>나이 정보 <span class="required-mark required-mark--optional">선택</span></legend>
          <div class="segmented"><label class="checkbox-row"><input v-model="ageInput" type="radio" name="age-input" value="BIRTH_YEAR"> 출생연도로 입력</label><label class="checkbox-row"><input v-model="ageInput" type="radio" name="age-input" value="AGE"> 현재 나이로 입력</label></div>
          <label v-if="ageInput === 'BIRTH_YEAR'" class="stacked-label field-short">출생연도<input inputmode="numeric" maxlength="4" placeholder="예: 1984"></label>
          <label v-else class="stacked-label field-short">현재 나이<input inputmode="numeric" maxlength="3" placeholder="예: 42"><span class="field-help">등록 시점의 나이로 저장하는 방식입니다.</span></label>
        </fieldset>
      </section>
      <section class="surface-card form-stack" aria-labelledby="duplicate-title">
        <h2 id="duplicate-title">전화번호 중복 후보 예시</h2>
        <p class="muted">같은 전화번호로 등록된 환자가 있으면 기존 기록을 먼저 확인합니다.</p>
        <div class="candidate-row"><div><strong>합성 환자 가</strong><p class="muted">010-****-1201 · 1984년생 · 최근 상담 2026-09-23</p></div><RouterLink class="secondary-link" to="/patients/p-a">기존 환자 열기</RouterLink></div>
        <label class="checkbox-row"><input v-model="notDuplicate" type="checkbox"> 다른 사람이 맞습니다. 중복이 아님을 확인하고 등록을 계속합니다.</label>
      </section>
      <div class="action-bar">
        <RouterLink class="secondary-link" :to="cancelPath">취소</RouterLink>
        <p class="pending-note">등록 기능 연결 예정</p>
        <template v-if="fromIntake">
          <button class="primary-button" type="button" disabled>등록 후 상담 접수 계속</button>
        </template>
        <template v-else>
          <button class="secondary-button" type="button" disabled>등록 후 상담 접수</button>
          <button class="primary-button" type="button" disabled>환자 등록</button>
        </template>
      </div>
    </template>

    <template v-else-if="route.params.patientId && person">
      <div class="page-heading"><div><UiBreadcrumb :items="[{ label: '환자 관리', to: preview.lastPatientListPath }, { label: person.name }]" /><h1>{{ person.name }}</h1><p class="muted">합성 데이터 · {{ person.phone }} · {{ person.birth }}년생</p></div><div class="heading-actions"><RouterLink class="quiet-link" :to="preview.lastPatientListPath">환자 목록으로</RouterLink><RouterLink class="primary-link" :to="`/consultations/new?patientId=${person.id}`">새 상담 접수</RouterLink></div></div>
      <section id="consultation-history" class="surface-card" aria-labelledby="history-title">
        <div class="surface-heading"><h2 id="history-title">상담 회차</h2><span class="muted">{{ history.length }}회</span></div>
        <div v-if="history.length === 0" class="empty-panel"><strong>상담 이력이 없습니다</strong><p>새 상담 접수로 첫 회차를 시작합니다.</p></div>
        <div v-else class="table-scroll">
          <table class="data-table">
            <thead><tr><th>회차·상담일</th><th>유형</th><th>담당자</th><th>진행 상태</th><th>결과</th><th><span class="sr-only">이동</span></th></tr></thead>
            <tbody><tr v-for="item in history" :key="item.id"><td class="nowrap num">{{ item.round }}회 · {{ item.date }}</td><td>{{ typeLabel(item.types) }}</td><td>{{ item.owner }}<small>{{ preview.canEdit(item.owner) ? '수정 가능 예시' : '조회 전용' }}</small></td><td><UiStatusBadge :label="statusLabel[item.status]" :tone="statusTone[item.status]" /></td><td>{{ item.result }}</td><td class="nowrap"><RouterLink class="text-link" :to="workPath(item)">상담 열기</RouterLink></td></tr></tbody>
          </table>
        </div>
      </section>
      <section class="surface-card" aria-labelledby="patient-info-title"><div class="surface-heading"><h2 id="patient-info-title">기본정보</h2><span class="action-row"><span class="pending-note">수정 기능 연결 예정</span><button class="secondary-button" type="button" disabled>정보 수정</button></span></div><dl class="detail-grid"><div><dt>연락처</dt><dd>{{ person.phone }}</dd></div><div><dt>성별</dt><dd>{{ person.sex }}</dd></div><div><dt>출생연도</dt><dd>{{ person.birth }}</dd></div><div><dt>등록일</dt><dd>{{ person.registered }}</dd></div></dl></section>
    </template>

    <template v-else-if="route.params.patientId"><div class="page-heading"><h1>환자를 찾을 수 없습니다</h1></div><RouterLink class="text-link" to="/patients">환자 목록으로</RouterLink></template>

    <template v-else>
      <div class="page-heading"><div><UiBreadcrumb :items="[{ label: '환자 관리' }, { label: '환자 목록' }]" /><h1>환자 관리</h1><p class="muted">환자 이름으로 이력을 확인하고, 새 상담 접수로 바로 시작합니다.</p></div><RouterLink class="primary-link" to="/patients/new">신규 환자 등록</RouterLink></div>
      <section class="surface-card list-card" aria-labelledby="patient-list-title">
        <div class="surface-heading"><h2 id="patient-list-title">환자 목록</h2></div>
        <div class="filter-bar"><label>이름·전화번호 뒤 네 자리<input v-model="filters.q" type="search" placeholder="예: 합성 환자 가 또는 1201"></label></div>
        <div class="result-summary" aria-live="polite">
          <p><strong>{{ state === 'EMPTY' ? 0 : matches.length }}명</strong> <span class="muted">/ 전체 {{ state === 'EMPTY' ? 0 : patients.length }}명 · 입력하면 목록이 바로 바뀝니다.</span></p>
          <button v-if="activeKeys.length" class="text-button" type="button" @click="reset">검색어 지우기</button>
        </div>
        <UiNotice v-if="state === 'ERROR'" live title="조회 오류 상태 예시" tone="danger">목록을 가져오지 못했습니다. 기능 연결 후 다시 시도를 제공합니다.</UiNotice>
        <UiNotice v-else-if="state === 'LOADING'" live title="불러오는 중인 상태 예시">네트워크 요청은 없습니다.</UiNotice>
        <div v-else-if="state === 'EMPTY'" class="empty-panel"><strong>등록된 환자가 없는 상태 예시</strong><p>첫 환자를 등록하면 이곳에 표시됩니다.</p><RouterLink class="secondary-link" to="/patients/new">신규 환자 등록</RouterLink></div>
        <div v-else-if="matches.length === 0" class="empty-panel"><strong>조건에 맞는 환자가 없습니다</strong><p>이름이나 전화번호 뒤 네 자리를 다시 확인해 주세요.</p><button class="secondary-button" type="button" @click="reset">검색어 지우기</button></div>
        <template v-else>
          <div class="table-scroll desktop-only">
            <table class="data-table">
              <thead><tr><th>환자</th><th>성별·출생</th><th>최근 상담</th><th><span class="sr-only">행동</span></th></tr></thead>
              <tbody><tr v-for="item in matches" :key="item.id"><td class="primary-cell"><RouterLink class="text-link" :to="`/patients/${item.id}`">{{ item.name }}</RouterLink><small>{{ item.phone }}</small></td><td>{{ item.sex }} · {{ item.birth }}</td><td class="nowrap num">{{ activeConsultations(item.id)[0]?.date || '없음' }}<small>{{ activeConsultations(item.id).length }}회</small></td><td class="nowrap"><RouterLink class="text-link" :to="`/consultations/new?patientId=${item.id}`">새 상담 접수</RouterLink></td></tr></tbody>
            </table>
          </div>
          <ul class="record-cards mobile-only" aria-label="환자 목록">
            <li v-for="item in matches" :key="item.id" class="record-card">
              <div class="record-card-head"><RouterLink class="text-link" :to="`/patients/${item.id}`">{{ item.name }}</RouterLink><span class="muted">{{ item.phone }}</span></div>
              <p class="muted">최근 상담 {{ activeConsultations(item.id)[0]?.date || '없음' }} · {{ activeConsultations(item.id).length }}회</p>
              <RouterLink class="secondary-link" :to="`/consultations/new?patientId=${item.id}`">새 상담 접수</RouterLink>
            </li>
          </ul>
        </template>
      </section>
      <UiPreviewTools><label class="preview-tools-field">목록 상태 예시<select v-model="state"><option value="READY">목록</option><option value="LOADING">로딩</option><option value="ERROR">오류</option><option value="EMPTY">등록된 환자 없음</option></select></label><p class="muted">화면 시안 · 합성 데이터입니다. 실제 환자를 조회하지 않습니다.</p></UiPreviewTools>
    </template>
  </div>
</template>
