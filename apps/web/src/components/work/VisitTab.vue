<script setup lang="ts">
import { computed } from "vue";
import type { ConcernType } from "@outfoot/contracts";
import { typeLabel, visitRecordLabel, type PreviewConsultation } from "../../data/preview";
import { scoreOptions, toeOptions } from "../../data/questionnairePreview";
import { useWorkDraftStore } from "../../stores/workDraft";

// 방문상담 입력 시안입니다. 대표 항목에 실제로 쓸 입력 형태를 배치했고, 값은 상담별 로컬 상태에만 남으며 저장되지 않습니다.
const props = defineProps<{ consultation: PreviewConsultation; editable: boolean }>();
const store = useWorkDraftStore();
const draft = computed(() => store.drafts[props.consultation.id]);
const locked = computed(() => !props.editable);
const confirmed = computed(() => draft.value.confirmedTypes);
const typeOptions: Array<{ value: ConcernType; label: string }> = [{ value: "NAIL", label: "발톱" }, { value: "PAIN_INSOLE", label: "통증·인솔" }];
const statusOptions = ["미확인", "없음", "있음", "모름", "해당없음"];
const safetyRows = [
  { id: "C05", label: "출혈·고름·상처·심한 붓기·열감" },
  { id: "C06", label: "갑작스러운 색·온도 변화 또는 체중부하 어려움" },
  { id: "C08", label: "진단·치료 중 건강상태" },
];
const nailRemaining = ["NV04 · 색·표면", "NV05 · 주변조직·피부", "NV06 · 진균 관련 검사·진단", "NV07 · 기계적 요인", "NV08 · 관리 적합성 초안", "NV09 · 예정 관리·홈케어", "NV10 · 추후 확인"];
const painRemaining = ["PV03 · 정적 관찰", "PV04 · 피부·압박 흔적", "PV05 · 선택 검사", "PV06 · 보행 관찰", "PV08 · 신발 적합성", "PV09 · 좌우 발도장 상태", "PV10 · 분석 결과·보완", "PV11 · 인솔 검토", "PV12 · 추후 확인"];
</script>

<template>
  <fieldset class="visit-form" :disabled="locked">
    <legend class="sr-only">방문상담 입력</legend>
    <section id="visit-type" class="surface-card form-stack" aria-labelledby="visit-type-title">
      <h2 id="visit-type-title">상담 유형 확인</h2>
      <dl class="detail-grid">
        <div><dt>환자 원선택</dt><dd data-testid="patient-types">{{ typeLabel(consultation.types) }}</dd></div>
        <div><dt>시술자 확인 유형</dt><dd data-testid="confirmed-types">{{ confirmed.length ? typeLabel(confirmed) : '미확인' }}</dd></div>
        <!-- 저장된 기록의 상태입니다. 이 화면에서 바꾼 값은 저장 전까지 여기에 반영되지 않습니다. -->
        <div><dt>저장된 방문 기록</dt><dd data-testid="visit-record">{{ visitRecordLabel(consultation) }}</dd></div>
      </dl>
      <fieldset class="choice-fieldset">
        <legend>시술자 확인 유형</legend>
        <div class="segmented">
          <label v-for="option in typeOptions" :key="option.value" class="checkbox-row"><input type="checkbox" :value="option.value" :checked="confirmed.includes(option.value)" :disabled="locked || consultation.types.includes(option.value)" @change="store.toggleConfirmedType(consultation.id, option.value, ($event.target as HTMLInputElement).checked)"> {{ option.label }}<span v-if="consultation.types.includes(option.value)" class="field-code">환자 선택</span></label>
        </div>
        <p class="field-help">환자 원선택은 바뀌지 않습니다. 확인 유형에 추가한 유형의 관찰 항목이 아래에 나타나고, 사진·발도장 필요 여부도 확인 유형을 기준으로 표시합니다.</p>
      </fieldset>
    </section>

    <section class="surface-card form-stack" aria-labelledby="visit-today-title">
      <h2 id="visit-today-title">1. 오늘 달라진 점</h2>
      <details class="reference-box"><summary>환자 원답 보기 <span class="field-code">V01 주호소 원문</span></summary><p class="muted">사전질문 C02 원답이 읽기 전용으로 표시됩니다. 합성 예시입니다.</p></details>
      <label class="stacked-label"><span class="label-row"><span class="field-code">V02</span>오늘의 주호소·대표 목표<span class="required-mark">필수</span></span><textarea v-model="draft.visit.v02" placeholder="오늘 가장 먼저 다룰 불편과 목표" /></label>
      <fieldset class="choice-fieldset"><legend><span class="field-code">V03</span> 사전 이후 변화 <span class="required-mark">필수</span></legend><div class="segmented"><label v-for="option in ['호전', '동일', '악화', '새 증상']" :key="option" class="checkbox-row"><input v-model="draft.visit.change" type="radio" name="visit-change" :value="option"> {{ option }}</label></div></fieldset>
      <div class="field-grid"><label><span class="label-row"><span class="field-code">V04</span>현재 불편점수<span class="required-mark">필수</span></span><select v-model="draft.visit.v04"><option value="">선택</option><option v-for="score in scoreOptions" :key="score">{{ score }}</option></select><span class="field-help">사전 점수: 합성 예시</span></label></div>
    </section>

    <section id="visit-safety" class="surface-card form-stack" aria-labelledby="visit-safety-title">
      <h2 id="visit-safety-title">2. 안전정보 확인 <span class="field-code">V05</span></h2>
      <p class="muted">환자 원답은 그대로 두고 확인값과 메모를 따로 기록합니다. 확인자·확인시각은 저장 시 함께 남습니다.</p>
      <div v-for="row in safetyRows" :key="row.id" class="confirm-row">
        <div><strong :id="`safety-${row.id}-name`">{{ row.label }}</strong><small><span class="field-code">{{ row.id }}</span> 환자 원답: 합성 예시</small></div>
        <!-- 입력 이름에 항목명을 함께 연결해 세 행의 확인값·메모를 서로 구분할 수 있게 합니다. -->
        <label class="stacked-label"><span :id="`safety-${row.id}-value-label`">확인값</span><select v-model="draft.visit.safety[row.id].value" :aria-labelledby="`safety-${row.id}-name safety-${row.id}-value-label`"><option v-for="option in statusOptions" :key="option">{{ option }}</option></select></label>
        <label class="stacked-label"><span :id="`safety-${row.id}-memo-label`">확인 메모</span><input v-model="draft.visit.safety[row.id].memo" :aria-labelledby="`safety-${row.id}-name safety-${row.id}-memo-label`" placeholder="정정 이유 등"></label>
      </div>
    </section>

    <section class="surface-card form-stack" aria-labelledby="visit-life-title">
      <h2 id="visit-life-title">3. 생활·신발</h2>
      <div class="field-grid">
        <label><span class="label-row"><span class="field-code">V06</span>생활·업무·운동<span class="required-mark required-mark--optional">선택</span></span><select v-model="draft.visit.v06"><option value="">선택</option><option>주로 서서 일함</option><option>주로 앉아서 일함</option><option>운동 많음</option><option>모름</option></select></label>
        <label><span class="label-row"><span class="field-code">V07</span>주사용 신발<span class="required-mark">필수</span></span><input v-model="draft.visit.v07" placeholder="종류"></label>
        <label>신발 사이즈<input v-model="draft.visit.shoeSize" inputmode="numeric" placeholder="mm 또는 모름"></label>
        <label>압박·마모<input v-model="draft.visit.pressure" placeholder="예: 앞코 압박"></label>
      </div>
      <label class="stacked-label"><span class="label-row"><span class="field-code">V08</span>이전 진료·관리 반응<span class="required-mark required-mark--optional">선택</span></span><textarea v-model="draft.visit.v08" placeholder="환자가 전달한 내용" /></label>
    </section>

    <section class="surface-card form-stack" aria-labelledby="visit-observe-title">
      <h2 id="visit-observe-title">4. 부위별 관찰</h2>
      <template v-if="confirmed.includes('NAIL')">
        <h3>발톱</h3>
        <div class="field-grid">
          <label><span class="label-row"><span class="field-code">NV01</span>대표 발톱</span><select v-model="draft.visit.nv01"><option value="">선택</option><option v-for="toe in toeOptions" :key="toe">{{ toe }}</option></select></label>
          <label><span class="label-row"><span class="field-code">NV02</span>현재 통증점수</span><select v-model="draft.visit.nv02"><option value="">선택</option><option v-for="score in scoreOptions" :key="score">{{ score }}</option><option>미측정</option></select></label>
        </div>
        <fieldset class="choice-fieldset"><legend><span class="field-code">NV03</span> 형태</legend><div class="choice-grid"><label v-for="option in ['두께', '만곡', '파고듦', '들뜸', '갈라짐']" :key="option" class="checkbox-row"><input v-model="draft.visit.nv03" type="checkbox" :value="option"> {{ option }}</label></div></fieldset>
        <details class="reference-box"><summary>나머지 발톱 항목 {{ nailRemaining.length }}개</summary><ul class="field-inventory"><li v-for="field in nailRemaining" :key="field"><span><span class="field-code">{{ field.split(' · ')[0] }}</span> {{ field.split(' · ').slice(1).join(' · ') }}</span> <span>입력 배치 확정 전</span></li></ul></details>
      </template>
      <template v-if="confirmed.includes('PAIN_INSOLE')">
        <h3>통증·인솔</h3>
        <div class="field-grid">
          <label><span class="label-row"><span class="field-code">PV01</span>대표 부위</span><select v-model="draft.visit.pv01"><option value="">선택</option><option v-for="part in ['왼쪽 발바닥', '왼쪽 뒤꿈치', '오른쪽 발바닥', '오른쪽 뒤꿈치', '기타']" :key="part">{{ part }}</option></select></label>
          <label><span class="label-row"><span class="field-code">PV02</span>현재 점수</span><select v-model="draft.visit.pv02Now"><option value="">선택</option><option v-for="score in scoreOptions" :key="score">{{ score }}</option></select></label>
          <label><span class="label-row"><span class="field-code">PV02</span>최고 점수</span><select v-model="draft.visit.pv02Max"><option value="">선택</option><option v-for="score in scoreOptions" :key="score">{{ score }}</option></select></label>
        </div>
        <fieldset class="choice-fieldset"><legend><span class="field-code">PV07</span> 수동 실측 · 좌우 길이 mm</legend><div class="field-grid"><label>왼쪽<input v-model="draft.visit.pv07Left" inputmode="numeric" :disabled="draft.visit.pv07Unmeasured" placeholder="mm"></label><label>오른쪽<input v-model="draft.visit.pv07Right" inputmode="numeric" :disabled="draft.visit.pv07Unmeasured" placeholder="mm"></label></div><label class="checkbox-row"><input v-model="draft.visit.pv07Unmeasured" type="checkbox"> 미측정 · 0으로 기록하지 않습니다</label></fieldset>
        <details class="reference-box"><summary>나머지 통증·인솔 항목 {{ painRemaining.length }}개</summary><ul class="field-inventory"><li v-for="field in painRemaining" :key="field"><span><span class="field-code">{{ field.split(' · ')[0] }}</span> {{ field.split(' · ').slice(1).join(' · ') }}</span> <span>입력 배치 확정 전</span></li></ul></details>
      </template>
      <p v-if="confirmed.length === 0" class="muted">확인된 상담 유형이 없습니다. 위의 ‘상담 유형 확인’에서 유형을 고르면 해당 관찰 항목이 표시됩니다.</p>
      <div class="field-grid">
        <label><span class="label-row"><span class="field-code">V09</span>현장 관찰 (사실)</span><textarea v-model="draft.visit.v09Fact" placeholder="보이는 사실만 기록" /></label>
        <label><span class="label-row"><span class="field-code">V09</span>시술자 판단</span><textarea v-model="draft.visit.v09Judgement" placeholder="관찰에 대한 판단은 따로 기록" /></label>
      </div>
    </section>

    <section class="surface-card form-stack" aria-labelledby="visit-decision-title">
      <h2 id="visit-decision-title">5. 오늘의 진행 결정 <span class="field-code">V10</span> <span class="required-mark">필수</span></h2>
      <fieldset class="choice-fieldset"><legend class="sr-only">오늘 진행 결정</legend><div class="segmented"><label v-for="option in ['관리 검토', '추가 확인', '의료기관 우선', '보류']" :key="option" class="checkbox-row"><input v-model="draft.visit.decision" type="radio" name="visit-decision" :value="option"> {{ option }}</label></div></fieldset>
      <div v-if="draft.visit.decision === '의료기관 우선' || draft.visit.decision === '보류'" class="conditional-fields">
        <label class="stacked-label"><span class="label-row">사유<span class="required-mark">필수</span></span><textarea v-model="draft.visit.decisionReason" placeholder="판단 이유" /></label>
        <label class="stacked-label"><span class="label-row">안전 안내<span class="required-mark">필수</span></span><textarea v-model="draft.visit.decisionSafety" placeholder="환자에게 전달할 안전 안내" /></label>
      </div>
      <p class="muted">세부 확인값의 필수 기준과 일반 관리 확정 조건은 O04·O05 확정 전입니다.</p>
    </section>
  </fieldset>
</template>
