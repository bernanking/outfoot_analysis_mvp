<script setup lang="ts">
import { computed, ref } from "vue";
import { RouterLink, useRoute } from "vue-router";
import UiNotice from "../components/ui/UiNotice.vue";
import UiStatusBadge from "../components/ui/UiStatusBadge.vue";
import { consultationFor, patientFor, statusLabel, typeLabel } from "../data/preview";
import { previewQuestions } from "../data/questionnairePreview";
import { usePreviewStore } from "../stores/preview";

const route = useRoute();
const preview = usePreviewStore();
const consultation = computed(() => consultationFor(route.params.consultationId));
const tab = computed(() => route.path.split("/").at(-1) || "questionnaire");
const base = computed(() => `/consultations/${route.params.consultationId}`);
const editable = computed(() => consultation.value ? preview.canEdit(consultation.value.owner) : false);
const canFinalize = computed(() => consultation.value ? preview.canFinalize(consultation.value.owner) : false);
const footprintRequirement = computed(() => consultation.value?.types.includes("PAIN_INSOLE") ? "기본 필요" : consultation.value?.types.includes("NAIL") ? "선택" : "유형 확인 후 결정");
const previewState = ref("DEFAULT");
const selectedRun = ref("NONE");
const selectedRevision = ref("CURRENT");
const summaryOpen = ref(true);
function imageState(side: string): string {
  if (!consultation.value) return "미등록";
  if (consultation.value.image === "왼쪽만 등록") return side === "왼쪽" ? "로컬 미리보기 예시" : "미등록";
  if (consultation.value.image === "품질 확인 필요") return side === "왼쪽" ? "품질 확인 필요" : "로컬 미리보기 예시";
  return consultation.value.image === "좌우 등록 예시" ? "로컬 미리보기 예시" : "미등록";
}
const tabs = [
  { key: "questionnaire", label: "사전답변" }, { key: "visit", label: "방문상담" },
  { key: "media", label: "사진·발도장" }, { key: "analysis", label: "분석·보완" }, { key: "result", label: "최종결과" },
];
const questionGroups = [
  { title: "공통", text: "상담 유형 · 가장 불편한 점 · 시작 시점 · 현재 불편 정도 · 주의신호 · 건강상태 · 신발·생활 · 목표" },
  { title: "발톱", text: "관심 발·발가락(L1~L5, R1~R5) · 대표 부위 · 증상 · 경과 · 이전 관리 · 선택 사진" },
  { title: "통증·인솔", text: "좌우 관심 부위 · 대표 부위 · 현재/최고 불편 정도 · 보행·신발 · 인솔 사용 · 좌우 발도장" },
];
function questionsForGroup(title: string) {
  if (title === "공통") return [...previewQuestions["상담 내용"], ...previewQuestions["안전 확인"], ...previewQuestions["생활과 목표"]];
  return previewQuestions[title === "발톱" ? "발톱 질문" : "통증·인솔 질문"];
}
const commonVisitFields = ["V01 · 환자 주호소 원문", "V02 · 오늘의 주호소·대표 목표", "V03 · 사전 이후 변화", "V04 · 현재 불편점수", "V05 · 안전정보 재확인", "V06 · 생활·업무·운동", "V07 · 주사용 신발·착화", "V08 · 이전 진료·관리 반응", "V09 · 현장 관찰: 사실과 판단 분리", "V10 · 오늘 진행 결정"];
const nailVisitFields = ["NV01 · 대상·대표 발톱", "NV02 · 통증·압박", "NV03 · 형태", "NV04 · 색·표면", "NV05 · 주변조직·피부", "NV06 · 진균 관련 검사·진단", "NV07 · 기계적 요인", "NV08 · 관리 적합성 초안", "NV09 · 예정 관리·홈케어", "NV10 · 추후 확인"];
const painVisitFields = ["PV01 · 관심·대표 부위", "PV02 · 불편·유발·제한", "PV03 · 정적 관찰", "PV04 · 피부·압박 흔적", "PV05 · 선택 검사", "PV06 · 보행 관찰", "PV07 · 수동 실측 또는 미측정", "PV08 · 신발 적합성", "PV09 · 좌우 발도장 상태", "PV10 · 분석 결과·보완", "PV11 · 인솔 검토", "PV12 · 추후 확인"];
</script>

<template>
  <div v-if="consultation" class="page-stack">
    <div class="page-heading"><div><p class="breadcrumb">상담 관리 / {{ patientFor(consultation).name }} / {{ tabs.find(t => t.key === tab)?.label }}</p><h1>{{ patientFor(consultation).name }} · {{ consultation.round }}회 상담</h1><p class="muted">{{ consultation.date }} · {{ patientFor(consultation).phone }} · {{ typeLabel(consultation.types) }}</p></div><RouterLink class="secondary-link" :to="`/patients/${consultation.patientId}`">환자 상세</RouterLink></div>
    <div class="context-strip"><span>담당 {{ consultation.owner }}</span><span>{{ editable ? '수정 가능 예시' : '조회 전용' }}</span><UiStatusBadge :label="statusLabel[consultation.status]" tone="info" /><span>주의신호 {{ consultation.safety }}</span><span>저장 상태: 시안 · 실제 저장 없음</span></div>
    <UiNotice v-if="!editable" title="조회 전용 · 담당자만 수정할 수 있습니다" tone="warning">같은 기관의 기록을 살펴보는 역할 시안입니다.</UiNotice>
    <nav class="work-tabs" aria-label="상담 작업 단계"><RouterLink v-for="item in tabs" :key="item.key" :to="`${base}/${item.key}`" :aria-current="tab === item.key ? 'page' : undefined">{{ item.label }}</RouterLink></nav>
    <div class="work-grid">
      <div class="page-stack">
        <div class="filter-grid"><label>상태 미리보기<select v-model="previewState"><option value="DEFAULT">기본</option><option value="LOADING">처리 중</option><option value="ERROR">오류</option><option value="CONFLICT">수정 충돌</option><option value="STALE">오래됨</option></select></label></div>
        <UiNotice v-if="previewState === 'LOADING'" title="처리 중 상태 예시">중복 실행을 막고 작업 진행 상태를 표시할 예정입니다.</UiNotice>
        <UiNotice v-else-if="previewState === 'ERROR'" title="오류 상태 예시" tone="danger">입력 부족·타임아웃·공급자 제한·출력 형식 오류·안전 거부를 구분해 안내할 예정입니다.</UiNotice>
        <UiNotice v-else-if="previewState === 'CONFLICT'" title="수정 충돌 상태 예시" tone="warning">다른 사용자가 먼저 수정했습니다. 최신 내용을 다시 확인한 뒤 저장해야 합니다.</UiNotice>
        <UiNotice v-else-if="previewState === 'STALE'" title="오래된 분석 상태 예시" tone="warning">입력이 바뀌어 이 분석은 최신 결과로 확정할 수 없습니다.</UiNotice>

        <template v-if="tab === 'questionnaire'">
          <UiNotice title="환자 원답과 시술자 확인값은 별도 기록">합성 답변의 구조를 보여주는 화면입니다. 원답 수정이나 임시저장은 아직 연결되지 않았습니다.</UiNotice>
          <section class="surface-card"><div class="surface-heading"><h2>제출 정보</h2><UiStatusBadge :label="consultation.questionnaire" tone="info" /></div><dl class="detail-grid"><div><dt>질문지 버전</dt><dd>시안 v1 · 확정 전</dd></div><div><dt>동의 버전</dt><dd>확정 예정</dd></div><div><dt>환자 선택 유형</dt><dd>{{ typeLabel(consultation.types) }}</dd></div><div><dt>시술자 확인 유형</dt><dd>미확인</dd></div></dl><RouterLink class="text-link" :to="`${base}/intake`">질문지 링크 관리 →</RouterLink></section>
          <section v-for="group in questionGroups.filter(g => g.title === '공통' || (g.title === '발톱' && consultation!.types.includes('NAIL')) || (g.title === '통증·인솔' && consultation!.types.includes('PAIN_INSOLE')))" :key="group.title" class="surface-card"><h2>{{ group.title }} 답변</h2><p>{{ group.text }}</p><div class="compare-grid"><div><h3>환자 원답</h3><p class="muted">합성 원답 구조 예시 · 읽기 전용</p></div><div><h3>시술자 확인값</h3><p class="muted">확인값 · 정정 이유 · 확인자 · 확인시각 별도 기록</p><button class="secondary-button" disabled>확인값 입력 · 기능 연결 예정</button></div></div><ul class="field-inventory"><li v-for="question in questionsForGroup(group.title)" :key="question.id">{{ question.id }} · {{ question.label }} <span>원답·확인값 자리</span></li></ul></section>
          <UiNotice title="주의신호 확인">{{ consultation.safety }} · 해당 질문과 확인 메모를 기록하는 영역입니다.</UiNotice>
          <div class="action-row"><button class="secondary-button" disabled>임시저장 · 기능 연결 예정</button><RouterLink class="primary-link" :to="`${base}/visit`">방문상담으로</RouterLink></div>
        </template>

        <template v-else-if="tab === 'visit'">
          <UiNotice title="방문 확인값 시안">환자 원답은 보존하고 대면 확인값, 관찰, 판단을 분리합니다. 의료기관 우선·보류는 사유와 안내가 필요합니다.</UiNotice>
          <section class="surface-card form-stack"><h2>공통 확인 · V01~V10</h2><div class="compare-grid"><div><h3>환자 원답</h3><p class="muted">질문지 제출 내용 예시 · 원본 보존</p></div><div><h3>대면 확인값</h3><label class="stacked-label">확인 상태<select disabled><option>미확인</option><option>없음</option><option>모름</option><option>미측정</option><option>해당없음</option></select></label></div></div><ul class="field-inventory"><li v-for="field in commonVisitFields" :key="field">{{ field }} <span>확인값 기능 연결 예정</span></li></ul></section>
          <section v-if="consultation.types.includes('NAIL')" class="surface-card"><h2>발톱 상담 · NV01~NV10</h2><p>대표 발가락(L1~L5, R1~R5), 관찰 소견, 사진과 시술자 판단을 분리합니다.</p><ul class="field-inventory"><li v-for="field in nailVisitFields" :key="field">{{ field }} <span>확인값 기능 연결 예정</span></li></ul></section>
          <section v-if="consultation.types.includes('PAIN_INSOLE')" class="surface-card"><h2>통증·인솔 상담 · PV01~PV12</h2><p>좌우 대표 부위, 현재/최고 불편 정도, 보행·신발·인솔 정보를 확인합니다. 미측정은 0으로 표시하지 않습니다.</p><ul class="field-inventory"><li v-for="field in painVisitFields" :key="field">{{ field }} <span>확인값 기능 연결 예정</span></li></ul></section>
          <div class="action-row"><button class="secondary-button" disabled>임시저장 · 기능 연결 예정</button><RouterLink class="primary-link" :to="`${base}/media`">사진·발도장으로</RouterLink></div>
        </template>

        <template v-else-if="tab === 'media'">
          <UiNotice title="파일 등록 기능 연결 예정">휴대폰 촬영 파일을 좌우로 구분해 올릴 예정입니다. 현재 카드는 업로드 완료 증거가 아닌 합성 상태 예시입니다.</UiNotice>
          <section class="surface-card"><h2>촬영 안내</h2><p>발 전체가 보이게 촬영하고 좌우를 확인합니다. 형식·용량 제한은 운영 확인 전 제안값입니다.</p><p class="muted">품질 실패 시 재촬영·다른 파일 선택·수동 확인 기록 경로를 제공합니다.</p></section>
          <div class="slot-grid"><section v-for="side in ['왼쪽', '오른쪽']" :key="side" class="surface-card media-slot"><h2>{{ side }} 발도장</h2><div class="action-row"><UiStatusBadge :label="footprintRequirement" tone="info" /><UiStatusBadge :label="imageState(side)" tone="warning" /></div><p>원본 미리보기 · 품질 · 등록자 · 시각을 표시하는 자리</p><button class="secondary-button" disabled>파일 선택 · 기능 연결 예정</button></section></div>
          <section v-if="consultation.types.includes('NAIL')" class="surface-card"><h2>발톱 사진 · 선택</h2><p>전체 발·대표 발가락 사진. 발가락은 L1~L5·R1~R5로 표시합니다.</p><button class="secondary-button" disabled>사진 추가 · 기능 연결 예정</button></section>
          <div class="action-row"><RouterLink class="primary-link" :to="`${base}/analysis`">분석·보완으로</RouterLink></div>
        </template>

        <template v-else-if="tab === 'analysis'">
          <UiNotice title="발도장 분석 방식 미구성 · 측정값 없음">실제 샘플과 기준값으로 기술을 결정하기 전까지 길이·압력·아치 지표나 점수를 산출하지 않습니다.</UiNotice>
          <section class="surface-card"><h2>실행 전 점검</h2><ul class="check-list"><li>사전답변: {{ consultation.questionnaire }}</li><li>방문상담: 확인값 연결 예정</li><li>좌우 이미지: {{ consultation.image }}</li><li>주의신호: {{ consultation.safety }}</li></ul><div class="action-row"><RouterLink class="text-link" :to="`${base}/questionnaire`">사전답변 확인</RouterLink><RouterLink class="text-link" :to="`${base}/media`">이미지 확인</RouterLink></div></section>
          <section class="surface-card"><div class="surface-heading"><h2>발도장 분석</h2><UiStatusBadge :label="consultation.analysis" tone="warning" /></div><p>좌우 결과, 공급자·버전·입력 버전·실행시각·품질을 표시할 자리입니다.</p><p class="muted">상태: NOT_CONFIGURED · NOT_MEASURABLE · NOT_PROVIDED · 성공을 구분합니다.</p><button class="secondary-button" disabled>분석 실행 · 샘플 검증 후 연결</button></section>
          <section class="surface-card"><h2>시술자 보완</h2><p>자동 원본은 읽기 전용으로 두고 보완값·근거·작성자·시각을 따로 기록합니다.</p><button class="secondary-button" disabled>보완 기록 · 기능 연결 예정</button></section>
          <section class="surface-card"><h2>AI 상담 검토 · SUMMARY_ONLY</h2><p>상담 요약, 근거, 누락정보, 추가질문, 주의사항, 한계의 구조를 검토합니다.</p><p class="muted">모델·프롬프트·지식·스키마 버전과 입력 스냅샷은 실행 이력별로 보존합니다. 식별정보 전송 범위는 확정 전입니다.</p><button class="secondary-button" disabled>AI 검토 실행 · 기능 연결 예정</button></section>
          <section class="surface-card form-stack"><h2>실행 이력 예시</h2><label class="stacked-label">실행 상태 선택<select v-model="selectedRun"><option value="NONE">미구성</option><option value="RUNNING">실행 중</option><option value="FAILED">공급자 실패</option><option value="INVALID">출력 형식 오류</option><option value="STALE">오래됨</option><option value="STRUCTURE">완료 구조 예시</option></select></label><UiNotice v-if="selectedRun === 'STALE'" title="오래된 입력" tone="warning">최신 결과로 확정할 수 없습니다. 입력을 검토한 뒤 재실행이 필요합니다.</UiNotice><UiNotice v-else-if="selectedRun === 'FAILED' || selectedRun === 'INVALID'" title="실패 상태 예시" tone="danger">원본은 보존하고 이유를 보여줍니다. 재시도 또는 수동 보완 경로를 제공합니다.</UiNotice><UiNotice v-else-if="selectedRun === 'STRUCTURE'" title="완료 구조 예시 · 측정값 없음">왼쪽·오른쪽 결과, 근거 참조, 제공 여부, 한계, 공급자·입력 버전을 표시합니다. 임상 수치나 정상 판정은 없습니다.</UiNotice><p class="muted">합성 상태의 구조 예시이며 실제 발도장·AI 실행 내역은 없습니다.</p></section>
          <RouterLink class="primary-link" :to="`${base}/result`">최종결과로</RouterLink>
        </template>

        <template v-else-if="tab === 'result'">
          <UiNotice title="최종확정 기능 연결 예정">AI 원본과 시술자 최종본은 별도 기록입니다. 현재 표시는 합성 초안·상태 예시입니다. 발도장 분석 방식은 미구성이며 측정값 없음 상태입니다.</UiNotice>
          <section class="surface-card"><h2>참고 · AI 원본</h2><p class="muted">원본 요약·근거를 읽기 전용으로 표시할 자리입니다. 현재 승인된 AI 결과는 없습니다.</p><RouterLink class="text-link" :to="`${base}/analysis`">분석·실행 이력 보기 →</RouterLink></section>
          <section class="surface-card form-stack"><h2>시술자 최종본</h2><div class="field-grid"><label>최종 결론<select disabled><option>미선택</option><option>관리 검토</option><option>추가 확인 필요</option><option>의료기관 우선</option><option>보류</option></select></label><label>추후 확인<input disabled placeholder="날짜 또는 미정 사유"></label></div><label class="stacked-label">내부 메모<textarea disabled placeholder="고객 안내와 분리" /></label><label class="stacked-label">고객 안내<textarea disabled placeholder="확정된 쉬운 표현만 인쇄" /></label><p class="muted">의료기관 우선·보류에는 사유, 안전 안내, 확인 담당자를 기록합니다. 일반 관리 계획의 확정 기준은 보류 중입니다.</p><div class="action-row"><button class="secondary-button" disabled>임시저장 · 기능 연결 예정</button><button class="secondary-button" disabled>{{ canFinalize ? '최종확정 · 기능 연결 예정' : '최종확정 권한 없음' }}</button></div></section>
          <section class="surface-card form-stack"><h2>개정 이력</h2><label class="stacked-label">개정 선택<select v-model="selectedRevision"><option value="CURRENT">현재 개정 구조 예시</option><option value="PAST">이전 개정 구조 예시</option></select></label><p>{{ selectedRevision === 'PAST' ? '이전 개정' : consultation.result }} · 개정 번호·확정자·시각·사용 분석 버전을 표시할 자리입니다.</p><p class="muted">과거 개정을 덮어쓰지 않습니다. 실제 확정 이력은 없습니다.</p><RouterLink class="text-link" :to="`${base}/print`">고객 안내 인쇄 화면 →</RouterLink></section>
        </template>
      </div><aside class="summary-panel surface-card"><button class="summary-toggle" type="button" :aria-expanded="summaryOpen" @click="summaryOpen = !summaryOpen">상담 요약 {{ summaryOpen ? '접기' : '펼치기' }}</button><div v-if="summaryOpen"><p><strong>환자 선택 유형</strong><br>{{ typeLabel(consultation.types) }}</p><p><strong>주호소</strong><br>합성 상담 내용 예시</p><p><strong>현재 불편 정도</strong><br>미확인</p><p><strong>대표 부위</strong><br>미확인</p><p><strong>주의신호</strong><br>{{ consultation.safety }}</p><p><strong>이전 회차</strong><br>환자 상세에서 확인</p></div></aside>
    </div>
  </div>
  <div v-else class="page-stack"><h1>상담을 찾을 수 없습니다</h1><RouterLink class="text-link" to="/consultations">상담 목록으로</RouterLink></div>
</template>
