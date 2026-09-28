<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";
import UiNotice from "../components/ui/UiNotice.vue";
import { previewQuestions, toggleExclusiveChoice } from "../data/questionnairePreview";

const route = useRoute();
const step = ref(0);
const stepHeading = ref<HTMLElement | null>(null);
const showTypeError = ref(false);
const unknownLength = ref(false);
const nail = ref(false);
const pain = ref(false);
const typeChoice = computed({
  get: () => nail.value && pain.value ? "BOTH" : nail.value ? "NAIL" : pain.value ? "PAIN_INSOLE" : "",
  set: (value: string) => { nail.value = value === "NAIL" || value === "BOTH"; pain.value = value === "PAIN_INSOLE" || value === "BOTH"; },
});
watch(typeChoice, (value) => { if (value) showTypeError.value = false; });
const state = computed(() => String(route.params.token).replace("preview-", ""));
const complete = computed(() => route.path.endsWith("/complete"));
const steps = computed(() => ["안내와 동의", "상담 내용", "안전 확인", "생활과 목표", ...(nail.value ? ["발톱 질문"] : []), ...(pain.value ? ["통증·인솔 질문"] : []), "사진과 확인"]);
const current = computed(() => steps.value[Math.min(step.value, steps.value.length - 1)]);
const singleAnswers = reactive<Record<string, string>>({});
const multiAnswers = reactive<Record<string, string[]>>({});
const stepQuestions = computed(() => (previewQuestions[current.value] || []).filter((question) => question.id !== "N05" || (multiAnswers.N02 || []).includes("통증")).filter((question) => question.id !== "P15" || (multiAnswers.C13 || []).includes("인솔 상담")));
const detailsIds = new Set(["C07", "C10", "N06", "N08", "N10", "P10", "P14"]);
function choices(id: string, options?: string[]): string[] {
  if (id === "P02") return multiAnswers.P01 || [];
  return options || [];
}
function toggle(id: string, option: string) {
  multiAnswers[id] = toggleExclusiveChoice(multiAnswers[id] || [], option);
  if (id === "P01" && !multiAnswers.P01?.includes(singleAnswers.P02)) singleAnswers.P02 = "";
}
async function moveStep(direction: 1 | -1): Promise<void> {
  if (direction === 1 && current.value === "상담 내용" && !typeChoice.value) {
    showTypeError.value = true;
    await nextTick();
    document.getElementById("consultation-type-nail")?.focus();
    return;
  }
  step.value = Math.max(0, Math.min(step.value + direction, steps.value.length - 1));
  await nextTick();
  stepHeading.value?.focus();
  document.scrollingElement?.scrollTo?.({ top: 0, behavior: "instant" });
}
</script>

<template>
  <main class="questionnaire-page">
    <header class="questionnaire-header"><div class="brand"><span class="brand-mark">O</span>OUTFOOT</div><span class="preview-pill">환자 질문지 시안 · 합성 데이터</span></header>
    <div class="questionnaire-body">
      <template v-if="complete"><h1>제출 완료 화면 예시</h1><UiNotice title="실제 제출되지 않았습니다">방문 시 답변을 다시 확인한다는 안내와 제출시각이 표시될 자리입니다.</UiNotice><p>이 화면은 시안입니다. 창을 닫아도 됩니다.</p></template>
      <template v-else-if="state === 'expired' || state === 'revoked' || state === 'submitted'"><h1>{{ state === 'expired' ? '만료된 링크' : state === 'revoked' ? '폐기된 링크' : '이미 제출한 질문지' }} 상태 예시</h1><UiNotice title="질문지를 작성할 수 없습니다" tone="warning">상담 담당자에게 새 링크 또는 제출 내용을 확인해 주세요. 기존 답변은 변경되지 않습니다.</UiNotice></template>
      <template v-else>
        <p class="eyebrow">{{ step + 1 }} / {{ steps.length }} 단계</p><progress :value="step + 1" :max="steps.length">{{ step + 1 }} / {{ steps.length }}</progress><h1 ref="stepHeading" tabindex="-1">{{ current }}</h1>
        <UiNotice title="작성 화면 시안 · 문항 문구와 선택지 확정 전">입력값은 저장·전송되지 않습니다. 실제 개인정보나 환자 사진을 입력하지 마세요.</UiNotice>
        <section v-if="current === '안내와 동의'" class="surface-card form-stack"><h2>작성 안내</h2><p>상담 유형에 따라 문항이 달라집니다. 방문 시 시술자가 답변을 다시 확인합니다.</p><p class="muted">상담 대상 확인 방식, 개인정보·외부 AI 전송 범위, 동의 문구는 확정 예정입니다.</p><label class="checkbox-row"><input type="checkbox" disabled> 동의 문구 확정 후 제공 예정</label></section>
        <section v-else-if="current !== '사진과 확인'" class="form-stack">
          <fieldset v-if="current === '상담 내용'" class="surface-card form-stack choice-fieldset" :aria-describedby="showTypeError ? 'consultation-type-error' : undefined"><legend>상담 유형 · C01 · 필수</legend><label class="checkbox-row"><input id="consultation-type-nail" v-model="typeChoice" type="radio" name="consultation-type" value="NAIL"> 발톱</label><label class="checkbox-row"><input v-model="typeChoice" type="radio" name="consultation-type" value="PAIN_INSOLE"> 통증·인솔</label><label class="checkbox-row"><input v-model="typeChoice" type="radio" name="consultation-type" value="BOTH"> 발톱 + 통증·인솔</label><p v-if="showTypeError" id="consultation-type-error" class="field-error">상담 유형을 선택해 주세요.</p><p class="muted">둘 다 선택해도 공통 질문은 한 번만 작성합니다.</p></fieldset>
          <UiNotice v-if="current === '안전 확인'" title="주의신호 후보">답변은 방문 시 확인합니다. 임상 차단 기준은 확정 전입니다.</UiNotice>
          <div v-for="question in stepQuestions" :key="question.id" class="surface-card form-stack question-card">
            <fieldset v-if="question.multiple" class="choice-fieldset" :aria-required="question.required"><legend>{{ question.id }} · {{ question.label }} · {{ question.required ? '필수' : '선택' }}</legend><p v-if="question.note" class="muted">{{ question.note }}</p><div class="choice-grid"><label v-for="option in question.options" :key="option" class="checkbox-row"><input type="checkbox" :checked="(multiAnswers[question.id] || []).includes(option)" @change="toggle(question.id, option)"> {{ option }}</label></div><p v-if="question.options?.includes('없음')" class="field-help">‘없음’을 고르면 다른 선택은 해제됩니다.</p></fieldset>
            <div v-else-if="question.id === 'P12'" class="form-stack"><h2>P12 · 신발 사이즈·알고 있는 발길이 · 선택</h2><label class="stacked-label">신발 사이즈<input v-model="singleAnswers.P12_SHOE" inputmode="numeric" placeholder="알고 있는 신발 사이즈"></label><label class="stacked-label">알고 있는 발길이 (mm)<input v-model="singleAnswers.P12_LENGTH" type="number" min="0" :disabled="unknownLength" placeholder="mm"></label><label class="checkbox-row"><input v-model="unknownLength" type="checkbox" @change="singleAnswers.P12_LENGTH = ''"> 발길이 모름</label></div>
            <label v-else class="stacked-label">{{ question.id }} · {{ question.label }} · {{ question.required ? '필수' : '선택' }}<select v-if="question.id === 'P02' || choices(question.id, question.options).length" v-model="singleAnswers[question.id]" :required="question.required" :disabled="question.id === 'P02' && !choices(question.id, question.options).length"><option value="">{{ question.id === 'P02' && !choices(question.id, question.options).length ? '먼저 P01을 선택하세요' : '선택하세요' }}</option><option v-for="option in choices(question.id, question.options)" :key="option">{{ option }}</option></select><textarea v-else v-model="singleAnswers[question.id]" :required="question.required" placeholder="합성 내용만 입력" /></label>
            <p v-if="question.note && !question.multiple" class="muted">{{ question.note }}</p>
            <label v-if="question.id === 'N01'" class="stacked-label">대표 발톱 하나<select v-model="singleAnswers.N01_REP"><option value="">선택하세요</option><option v-for="option in multiAnswers.N01 || []" :key="option">{{ option }}</option></select></label>
            <label v-if="question.id === 'P11'" class="stacked-label">주당 횟수 · 선택<input v-model="singleAnswers.P11_WEEKLY" type="number" min="0" placeholder="주당 횟수"></label>
            <label v-if="detailsIds.has(question.id)" class="stacked-label">시기·부위·효과 등 추가 설명<textarea v-model="singleAnswers[`${question.id}_DETAIL`]" placeholder="합성 내용만 입력" /></label>
          </div>
        </section>
        <section v-else class="surface-card form-stack"><h2>사진과 확인</h2><p>발톱 사진은 선택 사항입니다. 통증·인솔 상담은 방문 시 좌우 발도장을 기본으로 확인합니다.</p><button class="secondary-button" disabled>사진 선택 · 기능 연결 예정</button><p class="muted">파일당 10MiB·최대 4개는 운영 확정 전 제안값입니다. 제출 전 답변을 다시 확인합니다.</p><RouterLink class="primary-link" :to="`${route.path}/complete`">제출 완료 화면 예시 보기</RouterLink></section>
        <div class="questionnaire-actions"><button class="secondary-button" type="button" :disabled="step === 0" @click="moveStep(-1)">이전</button><button v-if="step < steps.length - 1" class="primary-button" type="button" @click="moveStep(1)">다음</button></div>
      </template>
    </div>
  </main>
</template>
