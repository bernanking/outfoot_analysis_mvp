<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { RouterLink, useRoute, useRouter, type RouteLocationRaw } from "vue-router";
import UiNotice from "../components/ui/UiNotice.vue";
import UiPreviewTools from "../components/ui/UiPreviewTools.vue";
import UiBreadcrumb from "../components/ui/UiBreadcrumb.vue";
import UiDialog from "../components/ui/UiDialog.vue";
import UiStatusBadge from "../components/ui/UiStatusBadge.vue";
import QuestionnaireTab from "../components/work/QuestionnaireTab.vue";
import VisitTab from "../components/work/VisitTab.vue";
import MediaTab from "../components/work/MediaTab.vue";
import AnalysisTab from "../components/work/AnalysisTab.vue";
import ResultTab from "../components/work/ResultTab.vue";
import { consultationFor, consultations, patientFor, safetyTone, statusLabel, statusTone, tabProgress, typeLabel, workTabs, type WorkTab } from "../data/preview";
import { usePreviewStore } from "../stores/preview";
import { useWorkDraftStore } from "../stores/workDraft";

const route = useRoute();
const router = useRouter();
const preview = usePreviewStore();
const consultation = computed(() => consultationFor(route.params.consultationId));
const tab = computed(() => (route.path.split("/").at(-1) || "questionnaire") as WorkTab);
const tabIndex = computed(() => workTabs.findIndex((item) => item.key === tab.value));
const nextTab = computed(() => workTabs[tabIndex.value + 1]);
const base = computed(() => `/consultations/${route.params.consultationId}`);
const editable = computed(() => consultation.value && !consultation.value.deleted ? preview.canEdit(consultation.value.owner) : false);
const canFinalize = computed(() => consultation.value && !consultation.value.deleted ? preview.canFinalize(consultation.value.owner) : false);
const previousRounds = computed(() => consultation.value ? consultations.filter((item) => item.patientId === consultation.value!.patientId && !item.deleted && item.round < consultation.value!.round).length : 0);

// 입력은 상담별 로컬 초안(workDraft)에 두고, 초기값과 달라지면 "저장하지 않은 변경"으로 표시합니다.
// 저장 중·저장됨·저장 실패는 시안 검토 도구로 바꾸는 예시입니다. 자동저장은 하지 않습니다.
const drafts = useWorkDraftStore();
const consultationId = computed(() => String(route.params.consultationId));
const workState = ref("DEFAULT");
type SaveState = "CLEAN" | "DIRTY" | "SAVING" | "SAVED" | "FAILED";
const saveExample = ref<SaveState>("CLEAN");
watch(consultationId, (id) => {
  if (consultationFor(id)) drafts.ensure(id);
  saveExample.value = "CLEAN";
  workState.value = "DEFAULT";
}, { immediate: true });
const draftReady = computed(() => Boolean(drafts.drafts[consultationId.value]));
const isDirty = computed(() => drafts.isDirty(consultationId.value) || saveExample.value === "DIRTY");
const saveState = computed<SaveState>(() => isDirty.value ? "DIRTY" : saveExample.value);
const saveText: Record<SaveState, string> = {
  CLEAN: "저장할 변경 없음", DIRTY: "저장하지 않은 변경 있음", SAVING: "저장 중", SAVED: "저장됨 · 10:24 예시", FAILED: "저장 실패 · 입력 내용은 화면에 남아 있습니다",
};
// 변경 취소는 이 상담의 입력(선택·체크·날짜·조건부 입력 포함)을 초기값으로 되돌립니다.
function discardChanges(): void {
  drafts.reset(consultationId.value);
  saveExample.value = "CLEAN";
}
const confirmedTypes = computed(() => drafts.drafts[consultationId.value]?.confirmedTypes ?? []);

// 저장하지 않은 변경이 있으면 탭·다음 단계·경로 안내·목록으로 이동하기 전에 확인합니다.
// 가드는 이 화면이 떠 있는 동안에만 등록되고, 이 상담 경로에서 떠날 때만 동작합니다.
const pendingRoute = ref<RouteLocationRaw | null>(null);
let removeGuard: (() => void) | null = null;
onMounted(() => {
  removeGuard = router.beforeEach((to, from) => {
    if (!isDirty.value || to.fullPath === from.fullPath || !from.path.startsWith(base.value)) return;
    pendingRoute.value = to.fullPath;
    return false;
  });
});
onUnmounted(() => removeGuard?.());
function leaveWithoutSaving(): void {
  const target = pendingRoute.value;
  pendingRoute.value = null;
  discardChanges();
  if (target) void router.push(target);
}

const summaryOpen = ref(typeof window.matchMedia === "function" ? window.matchMedia("(min-width: 1081px)").matches : true);
</script>

<template>
  <div v-if="consultation && draftReady" class="page-stack work-page">
    <div class="page-heading">
      <div><UiBreadcrumb :items="[{ label: '상담 관리', to: preview.lastConsultationListPath }, { label: patientFor(consultation).name, to: `/patients/${consultation.patientId}` }, { label: workTabs[tabIndex]?.label ?? '상담 작업' }]" /><h1>{{ patientFor(consultation).name }} · {{ consultation.round }}회 상담</h1><p class="muted">{{ consultation.date }} · {{ patientFor(consultation).phone }} · {{ typeLabel(consultation.types) }}</p></div>
      <div class="heading-actions"><RouterLink class="quiet-link" :to="preview.lastConsultationListPath">상담 목록으로</RouterLink><RouterLink class="quiet-link" :to="`/patients/${consultation.patientId}`">환자 상세</RouterLink></div>
    </div>
    <div class="context-strip" aria-label="상담 상태">
      <span>담당 {{ consultation.owner }} · {{ editable ? '수정 가능' : '조회 전용' }}</span>
      <UiStatusBadge :label="statusLabel[consultation.status]" :tone="statusTone[consultation.status]" />
      <UiStatusBadge :label="`주의신호 ${consultation.safety}`" :tone="safetyTone(consultation.safety)" />
      <span class="save-status" :class="`save-status--${saveState.toLowerCase()}`">{{ saveText[saveState] }}</span>
    </div>
    <UiNotice v-if="consultation.deleted" title="삭제된 상담 · 조회 전용" tone="danger">관리자 조회용 화면입니다. 입력·실행·확정을 할 수 없습니다. 사유: {{ consultation.deletionReason }}</UiNotice>
    <UiNotice v-else-if="!editable" title="조회 전용 · 담당자만 수정할 수 있습니다" tone="warning">같은 기관의 기록을 살펴볼 수 있지만 입력과 실행은 담당 시술자와 관리자만 할 수 있습니다.</UiNotice>
    <nav class="work-tabs" aria-label="상담 작업 단계" data-keep-focus-on-navigation>
      <RouterLink v-for="item in workTabs" :key="item.key" :to="`${base}/${item.key}`" :aria-current="tab === item.key ? 'page' : undefined"><span>{{ item.label }}</span><small :class="`tab-progress tab-progress--${tabProgress(consultation, item.key, confirmedTypes).tone}`">{{ tabProgress(consultation, item.key, confirmedTypes).label }}</small></RouterLink>
    </nav>
    <div class="work-grid">
      <aside class="summary-panel surface-card" aria-label="상담 요약">
        <button class="summary-toggle" type="button" :aria-expanded="summaryOpen" aria-controls="consultation-summary" @click="summaryOpen = !summaryOpen">상담 요약 {{ summaryOpen ? '접기' : '펼치기' }}</button>
        <dl v-show="summaryOpen" id="consultation-summary" class="summary-list">
          <div><dt>환자 선택 유형</dt><dd>{{ typeLabel(consultation.types) }}</dd></div>
          <div><dt>확인 유형</dt><dd>{{ confirmedTypes.length ? typeLabel(confirmedTypes) : '미확인' }}</dd></div>
          <div><dt>주호소</dt><dd>합성 상담 내용 예시</dd></div>
          <div><dt>현재 불편 정도</dt><dd>미확인</dd></div>
          <div><dt>대표 부위</dt><dd>미확인</dd></div>
          <div><dt>주의신호</dt><dd>{{ consultation.safety }}</dd></div>
          <div><dt>이전 회차</dt><dd><RouterLink class="text-link" :to="`/patients/${consultation.patientId}#consultation-history`">{{ previousRounds ? `이전 ${previousRounds}회 이력 보기` : '이전 회차 없음 · 환자 상세' }}</RouterLink></dd></div>
        </dl>
      </aside>
      <div class="page-stack work-main">
        <UiNotice v-if="workState === 'LOADING'" live title="처리 중 상태 예시">중복 실행을 막고 작업 진행 상태를 표시합니다. 같은 요청을 다시 보내도 결과가 중복 생성되지 않게 할 예정입니다.</UiNotice>
        <UiNotice v-else-if="workState === 'ERROR'" live title="오류 상태 예시" tone="danger">입력 부족·시간 초과·공급자 제한·출력 형식 오류·안전 거부를 구분해 안내할 예정입니다.</UiNotice>
        <UiNotice v-else-if="workState === 'CONFLICT'" live title="수정 충돌 상태 예시" tone="warning">다른 사용자가 먼저 수정했습니다. 입력 내용은 그대로 두고, 최신 내용을 확인한 뒤 다시 저장합니다.</UiNotice>
        <UiNotice v-else-if="workState === 'STALE'" live title="오래된 분석 상태 예시" tone="warning">입력이 바뀌어 이 분석은 최신 결과로 확정할 수 없습니다.</UiNotice>
        <UiNotice v-if="saveState === 'FAILED'" live title="저장하지 못했습니다" tone="danger">입력 내용은 화면에 남아 있습니다. 연결 상태를 확인한 뒤 다시 저장해 주세요.</UiNotice>

        <QuestionnaireTab v-if="tab === 'questionnaire'" :consultation="consultation" :base="base" />
        <VisitTab v-else-if="tab === 'visit'" :consultation="consultation" :editable="editable" />
        <MediaTab v-else-if="tab === 'media'" :consultation="consultation" :base="base" :editable="editable" />
        <AnalysisTab v-else-if="tab === 'analysis'" :consultation="consultation" :base="base" :editable="editable" />
        <ResultTab v-else-if="tab === 'result'" :consultation="consultation" :base="base" :editable="editable" :can-finalize="canFinalize" />

        <div class="action-bar work-actions">
          <template v-if="editable && tab !== 'questionnaire'">
            <button class="secondary-button" type="button" :disabled="!isDirty" @click="discardChanges">변경 취소</button>
            <button class="secondary-button" type="button" disabled>임시저장</button>
            <p class="pending-note">저장 기능 연결 예정</p>
          </template>
          <p v-else class="muted action-bar-summary">{{ editable ? '사전답변은 읽기 전용입니다. 확인값은 방문상담에서 입력합니다.' : '조회 전용이라 저장할 수 없습니다.' }}</p>
          <RouterLink v-if="nextTab" class="primary-link" :to="`${base}/${nextTab.key}`">다음: {{ nextTab.label }}</RouterLink>
          <RouterLink v-else class="secondary-link" :to="`${base}/print`">고객 안내 인쇄 화면</RouterLink>
        </div>
      </div>
    </div>
    <UiPreviewTools>
      <label class="preview-tools-field">작업 상태 예시<select v-model="workState"><option value="DEFAULT">기본</option><option value="LOADING">처리 중</option><option value="ERROR">오류</option><option value="CONFLICT">수정 충돌</option><option value="STALE">오래됨</option></select></label>
      <label class="preview-tools-field">저장 상태 예시<select v-model="saveExample"><option value="CLEAN">변경 없음</option><option value="DIRTY">저장하지 않은 변경</option><option value="SAVING">저장 중</option><option value="SAVED">저장됨</option><option value="FAILED">저장 실패</option></select></label>
      <p class="muted">탭 옆 업무 상태는 각 탭의 합성 데이터로 계산한 예시입니다.</p>
    </UiPreviewTools>
    <UiDialog v-if="pendingRoute" title="저장하지 않은 변경이 있습니다" @close="pendingRoute = null">
      <p>이 화면에서 바꾼 내용이 아직 저장되지 않았습니다. 자동으로 저장되지 않습니다.</p>
      <div class="action-bar">
        <button class="secondary-button" type="button" @click="pendingRoute = null">계속 작성</button>
        <button class="secondary-button" type="button" @click="leaveWithoutSaving">저장하지 않고 이동</button>
        <button class="primary-button" type="button" disabled>저장하고 이동</button>
        <p class="pending-note">저장 기능 연결 예정</p>
      </div>
    </UiDialog>
  </div>
  <div v-else class="page-stack"><div class="page-heading"><h1>상담을 찾을 수 없습니다</h1></div><RouterLink class="text-link" to="/consultations">상담 목록으로</RouterLink></div>
</template>
