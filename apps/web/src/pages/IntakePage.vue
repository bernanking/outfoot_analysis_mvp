<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";
import UiNotice from "../components/ui/UiNotice.vue";
import UiPreviewTools from "../components/ui/UiPreviewTools.vue";
import UiBreadcrumb from "../components/ui/UiBreadcrumb.vue";
import UiStatusBadge from "../components/ui/UiStatusBadge.vue";
import { consultationFor, consultations, patientById, patients, patientFor, statusLabel, statusTone, typeLabel } from "../data/preview";
import { usePreviewStore } from "../stores/preview";

const preview = usePreviewStore();
const route = useRoute();
const isNew = computed(() => route.path === "/consultations/new");
const consultation = computed(() => consultationFor(route.params.consultationId));

// 신규 접수: 환자 상세에서 들어오면 환자 요약을, 아니면 이름·연락처 검색으로 환자를 고릅니다.
const selectedPatient = ref(String(route.query.patientId || ""));
const changingPatient = ref(false);
watch(() => route.query.patientId, (value) => { selectedPatient.value = typeof value === "string" ? value : ""; changingPatient.value = false; });
const patientQuery = ref("");
const patientMatches = computed(() => patients.filter((item) => `${item.name} ${item.phone.slice(-4)}`.includes(patientQuery.value.trim())));
const chosen = computed(() => patientById(selectedPatient.value));
const nextRound = computed(() => chosen.value ? consultations.filter((item) => item.patientId === chosen.value!.id && !item.deleted).length + 1 : null);
const owner = ref(preview.role === "ADMIN" ? "시술자 김" : preview.currentUser.name);
watch(() => preview.role, (role) => { owner.value = role === "ADMIN" ? "시술자 김" : preview.currentUser.name; });

// 접수 상세: 질문지 링크 상태마다 주요 행동을 하나로 정합니다.
type LinkState = "NONE" | "ACTIVE" | "EXPIRED" | "REVOKED" | "SUBMITTED";
const linkPreview = ref<"DEFAULT" | LinkState>("DEFAULT");
const fromFixture: Record<string, LinkState> = { "미발급": "NONE", "활성": "ACTIVE", "만료": "EXPIRED", "제출 완료": "SUBMITTED" };
const linkState = computed<LinkState>(() => linkPreview.value !== "DEFAULT" ? linkPreview.value : fromFixture[consultation.value?.link ?? "미발급"] ?? "NONE");
const linkInfo: Record<LinkState, { label: string; tone: "neutral" | "info" | "warning" | "success" | "danger"; guide: string; primary: string }> = {
  NONE: { label: "미발급", tone: "neutral", guide: "아직 질문지 링크가 없습니다. 링크를 발급해 환자에게 전달합니다.", primary: "질문지 링크 발급" },
  ACTIVE: { label: "작성 대기", tone: "info", guide: "유효한 링크가 있습니다. 링크를 복사해 환자에게 전달합니다.", primary: "링크 복사" },
  EXPIRED: { label: "만료", tone: "warning", guide: "기존 링크는 유효기간이 지나 사용할 수 없습니다. 새 링크를 발급해 전달합니다.", primary: "새 링크 발급" },
  REVOKED: { label: "폐기", tone: "warning", guide: "재발급으로 기존 링크가 폐기되었습니다. 현재 유효한 링크가 없으면 새 링크를 발급합니다.", primary: "새 링크 발급" },
  SUBMITTED: { label: "제출 완료", tone: "success", guide: "환자가 질문지를 제출했습니다. 제출된 링크로는 다시 제출할 수 없습니다.", primary: "사전답변 확인" },
};
</script>

<template>
  <div class="page-stack">
    <template v-if="isNew">
      <div class="page-heading"><div><UiBreadcrumb :items="[{ label: '상담 관리', to: '/consultations' }, { label: '신규 상담 접수' }]" /><h1>신규 상담 접수</h1><p class="muted">환자와 담당자를 정해 새 상담 회차를 만듭니다. 상담 유형은 환자가 질문지에서 선택합니다.</p></div></div>
      <section class="surface-card form-stack" aria-labelledby="intake-patient-title">
        <h2 id="intake-patient-title">환자</h2>
        <div v-if="chosen && !changingPatient" class="candidate-row"><div><strong>{{ chosen.name }}</strong><p class="muted">{{ chosen.phone }} · {{ chosen.birth }}년생 · 새 상담은 {{ nextRound }}회차</p></div><button class="secondary-button" type="button" @click="changingPatient = true">환자 변경</button></div>
        <template v-else>
          <label class="stacked-label">이름·전화번호 뒤 네 자리로 찾기<input v-model="patientQuery" type="search" placeholder="예: 합성 환자 가 또는 1201" aria-controls="intake-patient-results"></label>
          <fieldset id="intake-patient-results" class="choice-fieldset">
            <legend class="sr-only">검색된 환자</legend>
            <p v-if="patientMatches.length === 0" class="muted">조건에 맞는 환자가 없습니다.</p>
            <label v-for="person in patientMatches" :key="person.id" class="checkbox-row patient-option"><input v-model="selectedPatient" type="radio" name="intake-patient" :value="person.id" @change="changingPatient = false"> {{ person.name }} · {{ person.phone }} · {{ person.birth }}년생</label>
          </fieldset>
          <RouterLink class="text-link" to="/patients/new?from=intake">찾는 환자가 없으면 신규 환자 등록</RouterLink>
        </template>
      </section>
      <section class="surface-card form-stack" aria-labelledby="intake-owner-title">
        <h2 id="intake-owner-title">담당자</h2>
        <label v-if="preview.role === 'ADMIN'" class="stacked-label">담당 시술자<select v-model="owner"><option>시술자 김</option><option>시술자 이</option></select></label>
        <p v-else>{{ owner }} <span class="muted">· 로그인한 시술자가 담당합니다.</span></p>
      </section>
      <div class="action-bar">
        <RouterLink class="secondary-link" to="/consultations">취소</RouterLink>
        <p class="muted action-bar-summary">{{ chosen ? `${chosen.name} · ${nextRound}회차 · ${owner}` : '환자를 선택해 주세요' }}</p>
        <p class="pending-note">접수 기능 연결 예정</p>
        <button class="primary-button" type="button" disabled>상담 접수</button>
      </div>
    </template>

    <template v-else-if="consultation">
      <div class="page-heading"><div><UiBreadcrumb :items="[{ label: '상담 관리', to: '/consultations' }, { label: patientFor(consultation).name, to: `/patients/${consultation.patientId}` }, { label: '접수 상세' }]" /><h1>{{ patientFor(consultation).name }} · {{ consultation.round }}회 접수</h1><p class="muted">{{ consultation.date }} · 담당 {{ consultation.owner }} · {{ typeLabel(consultation.types) }}</p></div><UiStatusBadge :label="statusLabel[consultation.status]" :tone="statusTone[consultation.status]" /></div>
      <UiNotice v-if="consultation.deleted" title="삭제된 상담 · 조회 전용" tone="danger">관리자 조회용 화면입니다. 링크 발급과 수정은 할 수 없습니다. 사유: {{ consultation.deletionReason }}</UiNotice>
      <section class="surface-card form-stack link-card" aria-labelledby="link-title">
        <div class="surface-heading"><h2 id="link-title">질문지 링크</h2><UiStatusBadge :label="linkInfo[linkState].label" :tone="linkInfo[linkState].tone" /></div>
        <p>{{ linkInfo[linkState].guide }}</p>
        <dl class="detail-grid">
          <div><dt>만료시각</dt><dd>{{ linkState === 'ACTIVE' ? '발급 후 72시간 · 제안값' : linkState === 'NONE' ? '—' : '예시 없음' }}</dd></div>
          <div><dt>최근 발급</dt><dd>{{ linkState === 'NONE' ? '—' : '합성 예시' }}</dd></div>
          <div><dt>제출</dt><dd>{{ linkState === 'SUBMITTED' ? '제출 완료 · 합성 예시' : '미제출' }}</dd></div>
          <div><dt>제출 가능 횟수</dt><dd>1회 · 제안값</dd></div>
        </dl>
        <div class="action-row">
          <RouterLink v-if="linkState === 'SUBMITTED'" class="primary-link" :to="`/consultations/${consultation.id}/questionnaire`">사전답변 확인</RouterLink>
          <button v-else class="primary-button" type="button" disabled>{{ linkInfo[linkState].primary }}</button>
          <button v-if="linkState === 'ACTIVE'" class="secondary-button" type="button" disabled>재발급</button>
          <span v-if="linkState !== 'SUBMITTED'" class="pending-note">링크 기능 연결 예정</span>
        </div>
        <p class="muted">재발급하면 이전 링크는 폐기됩니다. 자동 문자·카카오·이메일 발송은 제공하지 않으며 복사한 링크를 직원이 전달합니다.</p>
      </section>
      <UiPreviewTools>
        <label class="preview-tools-field">링크 상태 예시<select v-model="linkPreview"><option value="DEFAULT">현재 예시</option><option value="NONE">미발급</option><option value="ACTIVE">작성 대기</option><option value="EXPIRED">만료</option><option value="REVOKED">폐기</option><option value="SUBMITTED">제출 완료</option></select></label>
        <div class="action-row"><RouterLink class="secondary-link" to="/q/preview-active">환자 질문지 시안</RouterLink><RouterLink class="secondary-link" to="/q/preview-expired">만료 화면</RouterLink><RouterLink class="secondary-link" to="/q/preview-revoked">폐기 화면</RouterLink><RouterLink class="secondary-link" to="/q/preview-submitted">이미 제출 화면</RouterLink></div>
        <p class="muted">미리보기 토큰은 화면 확인용 이름이며 실제 접근 권한이 아닙니다.</p>
      </UiPreviewTools>
    </template>
    <template v-else><div class="page-heading"><h1>상담을 찾을 수 없습니다</h1></div><RouterLink class="text-link" to="/consultations">상담 목록으로</RouterLink></template>
  </div>
</template>
