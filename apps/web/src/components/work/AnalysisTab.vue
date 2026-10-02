<script setup lang="ts">
import { computed, ref } from "vue";
import { RouterLink } from "vue-router";
import UiNotice from "../ui/UiNotice.vue";
import UiStatusBadge from "../ui/UiStatusBadge.vue";
import { footprintNeed, type PreviewConsultation } from "../../data/preview";
import { useWorkDraftStore } from "../../stores/workDraft";

// 준비 상태 → 확인할 항목 → 가능한 다음 행동 순서로 보여주고, 내부 상태 코드와 버전 정보는 기술 정보로 접어 둡니다.
const props = defineProps<{ consultation: PreviewConsultation; base: string; editable: boolean }>();
const selectedRun = ref("NONE");
const drafts = useWorkDraftStore();
const draft = computed(() => drafts.drafts[props.consultation.id].analysis);
// 확인할 항목은 준비 상태(state)로 나눕니다. READY는 갖춰짐, OPTIONAL은 선택 항목이라 누락이 아님, PENDING만 확인할 항목 수에 넣습니다.
// 발도장 필요 여부는 사진·발도장 탭과 같은 시술자 확인 유형(환자 원선택 포함) 기준입니다. 새로운 실행·확정 차단 조건이 아닙니다.
type CheckState = "READY" | "OPTIONAL" | "PENDING";
interface ReadinessCheck { label: string; value: string; state: CheckState; readyLabel?: string; to: string; action: string }
const footprintCheck = computed<ReadinessCheck>(() => {
  const image = props.consultation.image;
  const registered = image === "좌우 등록 예시";
  const need = footprintNeed(drafts.drafts[props.consultation.id].confirmedTypes);
  const media = { label: "좌우 발도장", to: `${props.base}/media`, action: "사진·발도장으로", readyLabel: "확인됨" };
  if (need === "UNDECIDED") return { ...media, value: "필요 여부 미정 · 상담 유형 확인 전", state: "PENDING", to: `${props.base}/visit#visit-type`, action: "방문상담에서 유형 확인" };
  if (need === "OPTIONAL") return { ...media, value: `발도장 선택 · ${image}`, state: registered ? "READY" : "OPTIONAL" };
  return { ...media, value: `발도장 기본 필요 · ${image}`, state: registered ? "READY" : "PENDING" };
});
const checks = computed<ReadinessCheck[]>(() => [
  { label: "사전답변", value: props.consultation.questionnaire, state: props.consultation.questionnaire === "제출 완료" ? "READY" : "PENDING", readyLabel: "제출됨", to: `${props.base}/questionnaire`, action: "사전답변 보기" },
  { label: "안전정보 확인", value: props.consultation.safety, state: props.consultation.safety === "확인 완료" || props.consultation.safety === "없음" ? "READY" : "PENDING", readyLabel: "확인됨", to: `${props.base}/visit#visit-safety`, action: "방문상담에서 확인" },
  footprintCheck.value,
]);
const pending = computed(() => checks.value.filter((item) => item.state === "PENDING"));
</script>

<template>
  <section class="surface-card form-stack" aria-labelledby="readiness-title">
    <div class="surface-heading"><h2 id="readiness-title">현재 준비 상태</h2><UiStatusBadge label="발도장 분석 방식 준비 중" tone="neutral" /></div>
    <p>발도장 분석 방식은 실제 샘플 검증 전이라 아직 사용할 수 없습니다. 길이·압력·아치 지표나 점수는 만들지 않으며 현재 <strong>측정값 없음</strong> 상태입니다.</p>
    <h3>확인할 항목 {{ pending.length }}건</h3>
    <ul class="confirm-list">
      <li v-for="item in checks" :key="item.label" :data-check-state="item.state"><div><strong>{{ item.label }}</strong><small>{{ item.value }}</small></div><UiStatusBadge v-if="item.state === 'READY'" :label="item.readyLabel ?? '확인됨'" tone="success" /><UiStatusBadge v-else-if="item.state === 'OPTIONAL'" label="선택 항목" tone="neutral" /><RouterLink v-else class="text-link" :to="item.to">{{ item.action }}</RouterLink></li>
    </ul>
    <h3>가능한 다음 행동</h3>
    <ul class="check-list"><li>방문상담 기록과 시술자 보완은 분석 없이도 계속 작성할 수 있습니다.</li><li>의료기관 우선·보류 결론은 사유·안전 안내·확인 담당자를 기록해 종결할 수 있습니다.</li><li>일반 관리 확정에 필요한 조건은 O04·O05 결정 전입니다.</li></ul>
  </section>

  <section class="surface-card form-stack" aria-labelledby="footprint-analysis-title">
    <div class="surface-heading"><h2 id="footprint-analysis-title">발도장 분석</h2><UiStatusBadge :label="consultation.analysis === '미구성' ? '준비 중' : consultation.analysis" :tone="consultation.analysis === '오래됨' ? 'warning' : 'neutral'" /></div>
    <p>왼쪽·오른쪽 결과와 좌우 비교가 표시될 자리입니다. 값마다 측정·추정·미제공·측정불가·해당없음을 구분합니다.</p>
    <div class="action-row"><button class="secondary-button" type="button" disabled>분석 실행</button><span class="pending-note">샘플 검증 후 연결</span></div>
    <details class="reference-box"><summary>기술 정보</summary><p class="muted">내부 상태: NOT_CONFIGURED · NOT_MEASURABLE · NOT_PROVIDED · 성공을 구분합니다. 공급자·버전·입력 버전·실행시각·품질은 실행 이력별로 보존합니다.</p></details>
  </section>

  <section class="surface-card form-stack" aria-labelledby="override-title">
    <h2 id="override-title">시술자 보완</h2>
    <p>자동 원본은 읽기 전용입니다. 보완값·근거·작성자·시각을 따로 기록합니다.</p>
    <div class="field-grid"><label>보완 내용<textarea v-model="draft.override" :disabled="!editable" placeholder="이미지로 판단하기 어려운 사항, 실측값 등" /></label><label>근거·이유<textarea v-model="draft.overrideReason" :disabled="!editable" placeholder="보완한 이유" /></label></div>
  </section>

  <section class="surface-card form-stack" aria-labelledby="ai-review-title">
    <div class="surface-heading"><h2 id="ai-review-title">AI 상담 요약 검토</h2><UiStatusBadge label="요약 전용" tone="neutral" /></div>
    <p>상담 요약, 근거, 누락정보, 추가질문, 주의사항, 한계를 보여줍니다. 케어 방향 제안은 전문 기준 승인 전까지 제공하지 않습니다.</p>
    <p class="muted">실행 전 전달 범위를 먼저 보여주고 식별정보는 제외합니다. 전송 범위는 확정 전입니다.</p>
    <div class="action-row"><button class="secondary-button" type="button" disabled>AI 요약 실행</button><span class="pending-note">기능 연결 예정</span></div>
    <details class="reference-box"><summary>기술 정보</summary><p class="muted">모드: SUMMARY_ONLY. 모델·promptVersion·knowledgeVersion·schemaVersion과 입력 스냅샷, 실행자·시각을 실행 이력별로 보존합니다.</p></details>
  </section>

  <section class="surface-card form-stack run-history" aria-labelledby="run-history-title">
    <h2 id="run-history-title">실행 이력 예시</h2>
    <label class="stacked-label">실행 상태 선택<select v-model="selectedRun"><option value="NONE">준비 중</option><option value="RUNNING">실행 중</option><option value="FAILED">공급자 실패</option><option value="INVALID">출력 형식 오류</option><option value="STALE">오래됨</option><option value="STRUCTURE">완료 구조 예시</option></select></label>
    <UiNotice v-if="selectedRun === 'RUNNING'" live title="실행 중">중복 실행을 막고 진행 상태를 표시합니다.</UiNotice>
    <UiNotice v-else-if="selectedRun === 'STALE'" live title="오래된 입력" tone="warning">최신 결과로 확정할 수 없습니다. 입력을 확인한 뒤 다시 실행합니다.</UiNotice>
    <UiNotice v-else-if="selectedRun === 'FAILED' || selectedRun === 'INVALID'" live title="실패 상태 예시" tone="danger">원본은 보존하고 이유를 보여줍니다. 다시 실행하거나 시술자 보완으로 진행합니다.</UiNotice>
    <UiNotice v-else-if="selectedRun === 'STRUCTURE'" live title="완료 구조 예시 · 측정값 없음">왼쪽·오른쪽 결과, 근거 참조, 제공 여부, 한계, 공급자·입력 버전을 표시합니다. 임상 수치나 정상 판정은 없습니다.</UiNotice>
    <p class="muted">합성 상태의 구조 예시이며 실제 발도장·AI 실행 내역은 없습니다.</p>
  </section>
</template>
