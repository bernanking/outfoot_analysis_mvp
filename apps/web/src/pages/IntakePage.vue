<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";
import UiNotice from "../components/ui/UiNotice.vue";
import { consultationFor, patientById, patients, patientFor, statusLabel, typeLabel } from "../data/preview";

const route = useRoute();
const isNew = computed(() => route.path === "/consultations/new");
const consultation = computed(() => consultationFor(route.params.consultationId));
const selectedPatient = ref(String(route.query.patientId || ""));
watch(() => route.query.patientId, (value) => { selectedPatient.value = typeof value === "string" ? value : ""; });
const owner = ref("시술자 김");
const linkState = ref("DEFAULT");
</script>

<template>
  <div class="page-stack">
    <template v-if="isNew">
      <div class="page-heading"><div><p class="breadcrumb">상담 관리 / 신규 상담 접수</p><h1>신규 상담 접수</h1><p class="muted">환자와 담당자를 선택해 상담 회차를 만드는 화면 시안입니다.</p></div></div>
      <UiNotice title="접수 기능 연결 예정">선택해도 상담이나 질문지 링크가 생성되지 않습니다. 상담 유형은 환자가 질문지에서 선택합니다.</UiNotice>
      <section class="surface-card form-stack"><h2>1. 환자 선택</h2><label class="stacked-label">기존 환자<select v-model="selectedPatient"><option value="">환자를 선택하세요</option><option v-for="person in patients" :key="person.id" :value="person.id">{{ person.name }} · {{ person.phone }}</option></select></label><RouterLink class="text-link" to="/patients/new">신규 환자 등록 화면으로 →</RouterLink></section>
      <section class="surface-card form-stack"><h2>2. 담당자 선택</h2><label class="stacked-label">담당 시술자<select v-model="owner"><option>시술자 김</option><option>시술자 이</option></select></label></section>
      <section class="surface-card"><h2>3. 접수 확인</h2><p>{{ patientById(selectedPatient)?.name || '환자 미선택' }} · {{ owner }} · 새 상담 회차</p><p class="muted">접수 후 질문지 링크를 별도로 발급해 직원이 복사·전달합니다.</p><button class="secondary-button" disabled>상담 생성 · 기능 개발 단계에서 연결 예정</button></section>
      <RouterLink class="text-link" to="/consultations">상담 목록으로 돌아가기</RouterLink>
    </template>
    <template v-else-if="consultation">
      <div class="page-heading"><div><p class="breadcrumb">상담 관리 / 접수 상세</p><h1>{{ patientFor(consultation).name }} · {{ consultation.round }}회 접수</h1><p class="muted">{{ consultation.date }} · {{ consultation.owner }} · {{ statusLabel[consultation.status] }} · {{ typeLabel(consultation.types) }}</p></div><RouterLink class="primary-link" :to="`/consultations/${consultation.id}/questionnaire`">사전답변 보기</RouterLink></div>
      <UiNotice title="합성 링크 상태 예시">실제 유효 토큰은 발급되지 않습니다. 자동 문자·카카오·이메일 전송 기능도 없습니다.</UiNotice>
      <section class="surface-card form-stack"><div class="surface-heading"><h2>질문지 링크</h2><span class="status-badge status-badge--info">{{ consultation.link }}</span></div><label class="stacked-label">상태 예시<select v-model="linkState"><option value="DEFAULT">현재 예시</option><option value="NONE">미발급</option><option value="ACTIVE">활성</option><option value="EXPIRED">만료</option><option value="SUBMITTED">제출 완료</option></select></label><p>현재 표시: {{ linkState === 'DEFAULT' ? consultation.link : ({ NONE: '미발급', ACTIVE: '활성', EXPIRED: '만료', SUBMITTED: '제출 완료' } as Record<string, string>)[linkState] }}</p><p class="muted">72시간·1회 제출은 운영 확인 전 제안값입니다. 재발급 시 이전 링크가 폐기된다는 확인이 필요합니다.</p><div class="action-row"><button class="secondary-button" disabled>링크 발급 · 기능 연결 예정</button><button class="secondary-button" disabled>링크 복사 · 기능 연결 예정</button><button class="secondary-button" disabled>재발급 · 기능 연결 예정</button></div></section>
      <section class="surface-card"><h2>질문지 상태 화면 검토</h2><div class="action-row"><RouterLink class="secondary-link" to="/q/preview-active">환자 질문지 시안</RouterLink><RouterLink class="secondary-link" to="/q/preview-expired">만료 상태</RouterLink><RouterLink class="secondary-link" to="/q/preview-submitted">중복 제출 상태</RouterLink></div><p class="muted">이 경로의 토큰은 화면 미리보기용 이름이며 실제 접근 권한이 아닙니다.</p></section>
    </template>
    <template v-else><h1>상담을 찾을 수 없습니다</h1><RouterLink class="text-link" to="/consultations">상담 목록으로</RouterLink></template>
  </div>
</template>
