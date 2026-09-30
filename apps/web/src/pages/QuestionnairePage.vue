<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import UiNotice from "../components/ui/UiNotice.vue";
import { detailPrompts, patientHelp, patientSteps, questionById, toggleExclusiveChoice, type PreviewQuestion } from "../data/questionnairePreview";

const route = useRoute();
const router = useRouter();
const step = ref(0);
const stepHeading = ref<HTMLElement | null>(null);
const showTypeError = ref(false);
const unknownLength = ref(false);
const returnToReview = ref(false);
const nail = ref(false);
const pain = ref(false);
const typeChoice = computed({
  get: () => nail.value && pain.value ? "BOTH" : nail.value ? "NAIL" : pain.value ? "PAIN_INSOLE" : "",
  set: (value: string) => { nail.value = value === "NAIL" || value === "BOTH"; pain.value = value === "PAIN_INSOLE" || value === "BOTH"; },
});
watch(typeChoice, (value) => { if (value) showTypeError.value = false; });
const state = computed(() => String(route.params.token).replace("preview-", ""));
const complete = computed(() => route.path.endsWith("/complete"));

const steps = computed(() => patientSteps(nail.value, pain.value));
const current = computed(() => steps.value[Math.min(step.value, steps.value.length - 1)]);
const isLast = computed(() => step.value >= steps.value.length - 1);
// 유형을 고르기 전에는 전체 단계 수가 정해지지 않으므로 표시하지 않습니다.
const progressKnown = computed(() => Boolean(typeChoice.value));
const addedStepCount = computed(() => steps.value.filter((item) => item.group === "nail" || item.group === "pain").length);

const singleAnswers = reactive<Record<string, string>>({});
const multiAnswers = reactive<Record<string, string[]>>({});
const visible = (question: PreviewQuestion) => (question.id !== "N05" || (multiAnswers.N02 || []).includes("통증"))
  && (question.id !== "P15" || (multiAnswers.C13 || []).includes("인솔 상담"));
const stepQuestions = computed(() => current.value.ids.map((id) => questionById[id]).filter(visible));
const answerOf = (question: PreviewQuestion) => question.multiple ? multiAnswers[question.id] : singleAnswers[question.id];
const isScore = (question: PreviewQuestion) => question.id === "C04" || question.id === "P05";
// 선택지가 적은 단일 선택은 한 번에 보이도록 라디오로, 점수·동적 선택지는 선택 상자로 둡니다.
const asRadio = (question: PreviewQuestion) => !question.multiple && Boolean(question.options?.length) && question.options!.length <= 6 && !isScore(question);

function choices(id: string, options?: string[]): string[] {
  if (id === "P02") return multiAnswers.P01 || [];
  return options || [];
}
function toggle(id: string, option: string) {
  multiAnswers[id] = toggleExclusiveChoice(multiAnswers[id] || [], option);
  if (id === "P01" && !multiAnswers.P01?.includes(singleAnswers.P02)) singleAnswers.P02 = "";
}
async function focusStep(): Promise<void> {
  await nextTick();
  stepHeading.value?.focus();
  document.scrollingElement?.scrollTo?.({ top: 0, behavior: "instant" });
}
async function moveStep(direction: 1 | -1): Promise<void> {
  if (direction === 1 && current.value.title === "상담 내용" && !typeChoice.value) {
    showTypeError.value = true;
    await nextTick();
    document.getElementById("consultation-type-nail")?.focus();
    return;
  }
  step.value = Math.max(0, Math.min(step.value + direction, steps.value.length - 1));
  await focusStep();
}
async function editStep(index: number): Promise<void> {
  returnToReview.value = true;
  step.value = index;
  await focusStep();
}
async function backToReview(): Promise<void> {
  returnToReview.value = false;
  step.value = steps.value.length - 1;
  await focusStep();
}
function submit(): void { void router.push(`${route.path.replace(/\/$/, "")}/complete`); }

// 답변 확인: 단계별로 고른 답을 보여주고 해당 단계로 돌아가 고칠 수 있게 합니다.
const answerText = (question: PreviewQuestion): string => {
  if (question.id === "P12") return [singleAnswers.P12_SHOE && `사이즈 ${singleAnswers.P12_SHOE}`, unknownLength.value ? "발길이 모름" : singleAnswers.P12_LENGTH && `발길이 ${singleAnswers.P12_LENGTH}mm`].filter(Boolean).join(" · ") || "미응답";
  const answer = answerOf(question);
  if (Array.isArray(answer)) return answer.length ? answer.join(", ") : "미응답";
  return answer || "미응답";
};
// 확인 화면에는 문항 답과 함께, 지금 화면에 보이는 조건에 해당하는 보조 답변(상담 유형·대표 발톱·주당 횟수·상세 설명)을 보여줍니다.
// 보조 답변은 필수 여부를 새로 정하지 않으며 필수 미응답 수에 넣지 않습니다. 숨은 답변의 제출 정리는 T07 범위입니다.
interface ReviewRow { id: string; label: string; text: string; required: boolean; supplementary: boolean }
const typeChoiceLabel: Record<string, string> = { NAIL: "발톱", PAIN_INSOLE: "통증·인솔", BOTH: "발톱 + 통증·인솔" };
// 숫자 입력의 v-model은 실제로 숫자(0 포함)를, 비우면 빈 문자열을 넘깁니다. 0은 응답이므로 빈 값과 구분합니다.
function weeklyText(): string {
  const weekly: unknown = singleAnswers.P11_WEEKLY;
  if (weekly === undefined || weekly === null || String(weekly).trim() === "") return "미응답";
  return `주 ${weekly}회`;
}
function rowsFor(question: PreviewQuestion): ReviewRow[] {
  const rows: ReviewRow[] = [{ id: question.id, label: question.label, text: answerText(question), required: question.required, supplementary: false }];
  if (question.id === "N01" && (multiAnswers.N01 || []).length) {
    const representative = (multiAnswers.N01 || []).includes(singleAnswers.N01_REP) ? singleAnswers.N01_REP : "";
    rows.push({ id: "N01_REP", label: "가장 불편한 발톱 하나", text: representative || "미응답", required: false, supplementary: true });
  }
  if (question.id === "P11") rows.push({ id: "P11_WEEKLY", label: "주당 횟수", text: weeklyText(), required: false, supplementary: true });
  const detail = detailPrompts[question.id];
  if (detail?.when(answerOf(question))) rows.push({ id: `${question.id}_DETAIL`, label: detail.label, text: singleAnswers[`${question.id}_DETAIL`]?.trim() || "미응답", required: false, supplementary: true });
  return rows;
}
const reviewSections = computed(() => steps.value.map((item, index) => ({ ...item, index })).filter((item) => item.ids.length > 0).map((item) => ({
  ...item,
  rows: [
    ...(item.title === "상담 내용" ? [{ id: "C01", label: "상담받고 싶은 내용", text: typeChoiceLabel[typeChoice.value] ?? "미응답", required: true, supplementary: false }] : []),
    ...item.ids.map((id) => questionById[id]).filter(visible).flatMap(rowsFor),
  ],
})));
const missingRequired = computed(() => reviewSections.value.flatMap((section) => section.rows).filter((row) => row.required && row.text === "미응답").length);

const closedStates: Record<string, { title: string; body: string; tone: "info" | "warning" | "success" }> = {
  submitted: { title: "이미 제출한 질문지입니다", body: "답변은 접수되어 있어 다시 작성할 필요가 없습니다. 고칠 내용이 있으면 방문하실 때 담당자에게 말씀해 주세요.", tone: "success" },
  expired: { title: "링크 사용 기간이 지났습니다", body: "이 링크로는 더 이상 작성할 수 없습니다. 상담 기관에 새 링크를 요청해 주세요. 문의 방법은 운영 확정 후 안내합니다.", tone: "warning" },
  revoked: { title: "사용할 수 없는 링크입니다", body: "새 링크가 발급되어 이 링크는 사용할 수 없습니다. 가장 최근에 받은 링크로 작성해 주세요.", tone: "warning" },
};
</script>

<template>
  <main class="questionnaire-page">
    <header class="questionnaire-header"><div class="brand"><span class="brand-mark" aria-hidden="true">O</span>OUTFOOT</div><span class="preview-pill">환자 질문지 시안 · 합성 데이터</span></header>
    <div class="questionnaire-body">
      <template v-if="complete">
        <h1>답변이 접수되었습니다</h1>
        <p>방문하시면 담당자가 답변을 함께 다시 확인합니다. 다시 작성하지 않아도 되며, 이 창을 닫아도 됩니다.</p>
        <dl class="detail-grid"><div><dt>제출시각</dt><dd>시안 · 표시 예정</dd></div></dl>
        <UiNotice title="화면 시안 · 실제로 제출되지 않았습니다">기능 연결 후 실제 제출시각이 표시됩니다.</UiNotice>
      </template>
      <template v-else-if="closedStates[state]">
        <h1>{{ closedStates[state].title }}</h1>
        <UiNotice :title="closedStates[state].title" :tone="closedStates[state].tone">{{ closedStates[state].body }}</UiNotice>
        <p class="muted">화면 시안입니다. 기존 답변은 변경되지 않습니다.</p>
      </template>
      <template v-else>
        <p class="eyebrow">{{ progressKnown ? `${step + 1} / ${steps.length} 단계` : `${step + 1}단계` }}</p>
        <progress v-if="progressKnown" :value="step + 1" :max="steps.length">{{ step + 1 }} / {{ steps.length }}</progress>
        <h1 ref="stepHeading" tabindex="-1">{{ current.title }}</h1>

        <section v-if="current.group === 'intro'" class="surface-card form-stack">
          <h2>작성 안내</h2>
          <p>상담 유형에 따라 질문이 달라집니다. 방문하시면 담당자가 답변을 다시 확인합니다.</p>
          <UiNotice title="작성 화면 시안 · 문항 문구와 선택지 확정 전">입력값은 저장·전송되지 않습니다. 실제 개인정보나 사진을 입력하지 마세요.</UiNotice>
          <p class="muted">상담 대상 확인 방식, 개인정보·외부 AI 전송 범위, 동의 문구는 확정 예정입니다.</p>
          <label class="checkbox-row"><input type="checkbox" disabled> 동의 문구 확정 후 제공 예정</label>
        </section>

        <section v-else-if="current.group === 'photo'" class="surface-card form-stack">
          <h2>발톱 사진 · 선택</h2>
          <p>전체 발과 불편한 발톱 사진을 올리면 상담 준비에 도움이 됩니다. 올리지 않아도 제출할 수 있습니다.</p>
          <div class="action-row"><button class="secondary-button" type="button" disabled>사진 선택</button><span class="pending-note">사진 올리기 기능 연결 예정</span></div>
          <p class="muted">JPG·PNG·WEBP, 파일당 10MiB, 최대 4장은 운영 확정 전 제안값입니다.</p>
        </section>

        <section v-else-if="current.group === 'review'" class="form-stack">
          <p>제출 전에 답변을 확인해 주세요. 고칠 단계의 '수정'을 누르면 그 단계로 이동합니다.</p>
          <UiNotice v-if="missingRequired" title="아직 답하지 않은 필수 질문이 있습니다" tone="warning">필수 질문 {{ missingRequired }}개가 비어 있습니다. 시안에서는 그대로 제출 화면을 볼 수 있습니다.</UiNotice>
          <section v-for="section in reviewSections" :key="section.title" class="surface-card review-section" :aria-label="`${section.title} 답변`">
            <div class="surface-heading"><h2>{{ section.title }}</h2><button class="secondary-button" type="button" @click="editStep(section.index)">수정<span class="sr-only"> · {{ section.title }}</span></button></div>
            <dl class="review-list"><div v-for="row in section.rows" :key="row.id" :data-question-id="row.id" :class="{ 'review-sub': row.supplementary }"><dt>{{ row.label }}</dt><dd :class="{ 'review-missing': row.text === '미응답' && row.required }">{{ row.text }}</dd></div></dl>
          </section>
        </section>

        <section v-else class="form-stack">
          <fieldset v-if="current.title === '상담 내용'" class="surface-card form-stack choice-fieldset" :aria-describedby="showTypeError ? 'consultation-type-error' : 'consultation-type-help'">
            <legend>상담받고 싶은 내용 <span class="required-mark">필수</span></legend>
            <label class="checkbox-row"><input id="consultation-type-nail" v-model="typeChoice" type="radio" name="consultation-type" value="NAIL"> 발톱</label>
            <label class="checkbox-row"><input v-model="typeChoice" type="radio" name="consultation-type" value="PAIN_INSOLE"> 통증·인솔</label>
            <label class="checkbox-row"><input v-model="typeChoice" type="radio" name="consultation-type" value="BOTH"> 발톱 + 통증·인솔</label>
            <p v-if="showTypeError" id="consultation-type-error" class="field-error">상담 유형을 선택해 주세요.</p>
            <p id="consultation-type-help" class="muted">{{ typeChoice ? `선택한 유형에 맞는 질문 ${addedStepCount}단계가 이어집니다. 공통 질문은 한 번만 작성합니다.` : '선택한 유형에 맞는 질문이 뒤에 추가됩니다.' }}</p>
          </fieldset>
          <UiNotice v-if="current.title === '안전 확인'" title="방문 시 함께 확인합니다">해당하는 것이 없으면 '없음'을 골라 주세요.</UiNotice>
          <div v-for="question in stepQuestions" :key="question.id" class="surface-card form-stack question-card" :data-question-id="question.id">
            <fieldset v-if="question.multiple" class="choice-fieldset" :aria-required="question.required"><legend>{{ question.label }} <span class="required-mark" :class="{ 'required-mark--optional': !question.required }">{{ question.required ? '필수' : '선택' }}</span></legend><p v-if="patientHelp[question.id]" class="muted">{{ patientHelp[question.id] }}</p><div class="choice-grid"><label v-for="option in question.options" :key="option" class="checkbox-row"><input type="checkbox" :checked="(multiAnswers[question.id] || []).includes(option)" @change="toggle(question.id, option)"> {{ option }}</label></div><p v-if="question.options?.includes('없음')" class="field-help">‘없음’을 고르면 다른 선택은 해제됩니다.</p></fieldset>
            <fieldset v-else-if="asRadio(question)" class="choice-fieldset" :aria-required="question.required"><legend>{{ question.label }} <span class="required-mark" :class="{ 'required-mark--optional': !question.required }">{{ question.required ? '필수' : '선택' }}</span></legend><p v-if="patientHelp[question.id]" class="muted">{{ patientHelp[question.id] }}</p><div class="choice-grid"><label v-for="option in question.options" :key="option" class="checkbox-row"><input v-model="singleAnswers[question.id]" type="radio" :name="`answer-${question.id}`" :value="option"> {{ option }}</label></div></fieldset>
            <fieldset v-else-if="question.id === 'P12'" class="choice-fieldset"><legend>{{ question.label }} <span class="required-mark required-mark--optional">선택</span></legend><p class="muted">{{ patientHelp.P12 }}</p><div class="field-grid"><label>신발 사이즈<input v-model="singleAnswers.P12_SHOE" inputmode="numeric" placeholder="예: 250"></label><label>알고 있는 발길이 (mm)<input v-model="singleAnswers.P12_LENGTH" type="number" min="0" :disabled="unknownLength" placeholder="mm"></label></div><label class="checkbox-row"><input v-model="unknownLength" type="checkbox" @change="singleAnswers.P12_LENGTH = ''"> 발길이 모름</label></fieldset>
            <label v-else class="stacked-label"><span class="label-row">{{ question.label }} <span class="required-mark" :class="{ 'required-mark--optional': !question.required }">{{ question.required ? '필수' : '선택' }}</span></span><select v-if="question.id === 'P02' || choices(question.id, question.options).length" v-model="singleAnswers[question.id]" :required="question.required" :disabled="question.id === 'P02' && !choices(question.id, question.options).length"><option value="">{{ question.id === 'P02' && !choices(question.id, question.options).length ? '먼저 불편 부위를 선택하세요' : '선택하세요' }}</option><option v-for="option in choices(question.id, question.options)" :key="option">{{ option }}</option></select><textarea v-else v-model="singleAnswers[question.id]" :required="question.required" placeholder="합성 내용만 입력" /></label>
            <p v-if="!question.multiple && !asRadio(question) && question.id !== 'P12' && patientHelp[question.id]" class="muted">{{ patientHelp[question.id] }}</p>
            <label v-if="question.id === 'N01'" class="stacked-label">가장 불편한 발톱 하나<select v-model="singleAnswers.N01_REP"><option value="">선택하세요</option><option v-for="option in multiAnswers.N01 || []" :key="option">{{ option }}</option></select></label>
            <label v-if="question.id === 'P11'" class="stacked-label">주당 횟수 · 선택<input v-model="singleAnswers.P11_WEEKLY" type="number" min="0" placeholder="예: 3"></label>
            <label v-if="detailPrompts[question.id]?.when(answerOf(question))" class="stacked-label conditional-fields"><span class="label-row">{{ detailPrompts[question.id].label }}<span class="required-mark required-mark--optional">선택</span></span><textarea v-model="singleAnswers[`${question.id}_DETAIL`]" placeholder="합성 내용만 입력" /></label>
          </div>
        </section>

        <div class="questionnaire-actions">
          <button class="secondary-button" type="button" :disabled="step === 0" @click="moveStep(-1)">이전</button>
          <button v-if="returnToReview && !isLast" class="secondary-button" type="button" @click="backToReview">답변 확인으로</button>
          <button v-if="!isLast" class="primary-button" type="button" @click="moveStep(1)">다음</button>
          <button v-else class="primary-button" type="button" @click="submit">제출하기</button>
        </div>
      </template>
    </div>
  </main>
</template>
