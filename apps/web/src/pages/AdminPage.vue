<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";
import UiBreadcrumb from "../components/ui/UiBreadcrumb.vue";
import UiDialog from "../components/ui/UiDialog.vue";
import UiStatusBadge from "../components/ui/UiStatusBadge.vue";
import { consultationFor, consultations, patientFor, statusLabel, statusTone, typeLabel, users, workPath } from "../data/preview";
import { usePreviewStore } from "../stores/preview";

const preview = usePreviewStore();
const route = useRoute();
const section = computed(() => route.path.endsWith("/users") ? "users" : route.path.endsWith("/audit") ? "audit" : "records");
const sectionLabel = computed(() => section.value === "users" ? "사용자 관리" : section.value === "audit" ? "감사 기록" : "상담 기록");
const query = ref("");
const selected = ref<string | null>(null);
const userFilter = ref("ALL");
const deletionFilter = ref("ALL");
const auditActor = ref("ALL");
const auditAction = ref("ALL");
const auditFrom = ref("");
watch(section, () => { selected.value = null; query.value = ""; userFilter.value = "ALL"; deletionFilter.value = "ALL"; auditActor.value = "ALL"; auditAction.value = "ALL"; auditFrom.value = ""; });
watch(deletionFilter, () => { selected.value = null; });

const userList = computed(() => users.filter((item) => `${item.name} ${item.login}`.includes(query.value)
  && (userFilter.value === "ALL" || (userFilter.value === "INACTIVE" ? item.status === "비활성" : item.role === (userFilter.value === "ADMIN" ? "관리자" : "시술자")))));
const selectedUser = computed(() => users.find((item) => item.id === selected.value));
const isSelf = computed(() => selectedUser.value?.name === preview.currentUser.name);

const recordList = computed(() => consultations.filter((item) => `${patientFor(item).name} ${item.owner}`.includes(query.value)
  && (deletionFilter.value === "ALL" || (deletionFilter.value === "DELETED" ? item.deleted === true : !item.deleted))));
const selectedRecord = computed(() => consultations.find((item) => item.id === selected.value));

const consultationName = (id: string) => { const item = consultationFor(id); return item ? `${patientFor(item).name} · ${item.round}회 상담` : id; };
const audit = [
  { id: "a-1", requestId: "req-preview-0001", time: "2026-09-23 10:20", actor: "시술자 김", action: "상담 조회", targetId: "c-101", target: consultationName("c-101"), result: "성공 예시", summary: "상담 접수 상세를 열었습니다.", path: "/consultations/c-101/intake" },
  { id: "a-2", requestId: "req-preview-0002", time: "2026-09-22 16:40", actor: "관리자 박", action: "계정 상태 확인", targetId: "u-off", target: "시술자 최 계정", result: "성공 예시", summary: "계정 상태를 조회했습니다. 변경은 없었습니다.", path: "/admin/users" },
  { id: "a-3", requestId: "req-preview-0003", time: "2026-09-21 09:10", actor: "시술자 이", action: "질문지 상태 확인", targetId: "c-103", target: consultationName("c-103"), result: "성공 예시", summary: "질문지 제출 상태를 확인했습니다.", path: "/consultations/c-103/questionnaire" },
];
const auditActors = [...new Set(audit.map((item) => item.actor))];
const auditActions = [...new Set(audit.map((item) => item.action))];
const auditList = computed(() => audit.filter((item) => (auditActor.value === "ALL" || item.actor === auditActor.value)
  && (auditAction.value === "ALL" || item.action === auditAction.value)
  && (!auditFrom.value || item.time.slice(0, 10) >= auditFrom.value)));
const selectedAudit = computed(() => audit.find((item) => item.id === selected.value));
</script>

<template>
  <div class="page-stack">
    <div class="page-heading"><div><UiBreadcrumb :items="[{ label: '운영 관리' }, { label: sectionLabel }]" /><h1>{{ sectionLabel }}</h1><p class="muted">관리자 전용 화면 시안입니다. 합성 데이터이며 계정 변경·삭제·감사 기록 저장은 처리되지 않습니다.</p></div></div>
    <nav class="local-tabs" aria-label="운영 관리 화면" data-keep-focus-on-navigation><RouterLink to="/admin/users">사용자 관리</RouterLink><RouterLink to="/admin/records/consultations">상담 기록</RouterLink><RouterLink to="/admin/records/audit">감사 기록</RouterLink></nav>

    <section v-if="section === 'users'" class="surface-card" aria-labelledby="user-list-title">
      <div class="surface-heading"><h2 id="user-list-title">사용자 목록</h2><span class="action-row"><span class="pending-note">기능 연결 예정</span><button class="secondary-button" type="button" disabled>사용자 등록</button></span></div>
      <div class="filter-bar"><label>이름·로그인 아이디<input v-model="query" type="search"></label><label>역할·상태<select v-model="userFilter"><option value="ALL">전체</option><option value="PRACTITIONER">시술자</option><option value="ADMIN">관리자</option><option value="INACTIVE">사용 중지</option></select></label></div>
      <div v-if="userList.length === 0" class="empty-panel"><strong>조건에 맞는 사용자가 없습니다</strong></div>
      <div v-else class="table-scroll">
        <table class="data-table">
          <thead><tr><th>이름</th><th>로그인 아이디</th><th>역할</th><th>상태</th><th>최근 로그인</th><th><span class="sr-only">행동</span></th></tr></thead>
          <tbody><tr v-for="item in userList" :key="item.id"><td>{{ item.name }}</td><td>{{ item.login }}</td><td>{{ item.role }}</td><td><UiStatusBadge :label="item.status === '활성' ? '사용 중' : '사용 중지'" :tone="item.status === '활성' ? 'success' : 'neutral'" /></td><td>{{ item.recent }}</td><td class="nowrap"><button class="text-button" type="button" :aria-label="`${item.name} 계정 관리`" @click="selected = item.id">계정 관리</button></td></tr></tbody>
        </table>
      </div>
      <UiDialog v-if="selectedUser" :title="`${selectedUser.name} 계정 관리`" @close="selected = null">
        <dl class="detail-grid dialog-target"><div><dt>이름</dt><dd>{{ selectedUser.name }}</dd></div><div><dt>로그인 아이디</dt><dd>{{ selectedUser.login }}</dd></div><div><dt>역할</dt><dd>{{ selectedUser.role }}</dd></div><div><dt>현재 상태</dt><dd>{{ selectedUser.status === '활성' ? '사용 중' : '사용 중지' }}</dd></div></dl>
        <section class="dialog-section"><h3>{{ selectedUser.status === '활성' ? '계정 사용 중지' : '계정 다시 사용' }}</h3><p class="muted">{{ selectedUser.status === '활성' ? '사용 중지하면 이 사용자의 기존 로그인 세션이 즉시 종료되고 다시 로그인할 수 없습니다.' : '다시 사용하면 이 사용자가 기존 아이디로 로그인할 수 있습니다.' }}</p><p v-if="isSelf" class="field-error">현재 로그인한 본인 계정은 사용 중지할 수 없도록 제한할 예정입니다.</p><button :class="selectedUser.status === '활성' ? 'danger-button' : 'secondary-button'" type="button" disabled>{{ selectedUser.status === '활성' ? '계정 사용 중지' : '계정 다시 사용' }}</button></section>
        <section class="dialog-section"><h3>비밀번호 초기화</h3><p class="muted">초기화한 비밀번호는 관리자가 안전한 경로로 직접 전달합니다. 이메일 자동발송은 제공하지 않습니다.</p><button class="secondary-button" type="button" disabled>비밀번호 초기화</button></section>
        <div class="action-bar"><p class="pending-note">계정 변경 기능 연결 예정</p><button class="secondary-button" type="button" @click="selected = null">닫기</button></div>
      </UiDialog>
    </section>

    <section v-else-if="section === 'records'" class="surface-card" aria-labelledby="record-list-title">
      <h2 id="record-list-title">전체 상담 기록</h2>
      <div class="filter-bar"><label>환자·담당자<input v-model="query" type="search"></label><label>삭제 여부<select v-model="deletionFilter"><option value="ALL">전체</option><option value="ACTIVE">일반</option><option value="DELETED">삭제됨</option></select></label></div>
      <div v-if="recordList.length === 0" class="empty-panel"><strong>조건에 맞는 상담 기록이 없습니다</strong></div>
      <div v-else class="table-scroll">
        <table class="data-table">
          <thead><tr><th>환자·회차</th><th>담당자</th><th>진행 상태</th><th>최종 결론</th><th>삭제 상태</th><th>삭제 사유</th><th><span class="sr-only">행동</span></th></tr></thead>
          <tbody>
            <tr v-for="item in recordList" :key="item.id">
              <td>{{ patientFor(item).name }} · {{ item.round }}회<small>{{ item.date }} · {{ typeLabel(item.types) }}</small></td>
              <td>{{ item.owner }}</td>
              <td><UiStatusBadge :label="statusLabel[item.status]" :tone="statusTone[item.status]" /></td>
              <td>{{ item.result }}</td>
              <td><UiStatusBadge :label="item.deleted ? '삭제됨 · 예시' : '일반'" :tone="item.deleted ? 'danger' : 'neutral'" /></td>
              <td>{{ item.deleted ? item.deletionReason : '—' }}</td>
              <td class="row-actions"><RouterLink class="text-link" :to="workPath(item)">상담 열기</RouterLink><button class="text-button" :class="{ 'text-button--danger': !item.deleted }" type="button" :aria-label="`${patientFor(item).name} ${item.round}회 ${item.deleted ? '삭제 정보 보기' : '삭제 확인'}`" @click="selected = item.id">{{ item.deleted ? '삭제 정보 보기' : '삭제 확인' }}</button></td>
            </tr>
          </tbody>
        </table>
      </div>
      <UiDialog v-if="selectedRecord?.deleted" title="상담 삭제 정보" @close="selected = null">
        <dl class="detail-grid dialog-target"><div><dt>환자</dt><dd>{{ patientFor(selectedRecord).name }}</dd></div><div><dt>회차·상담일</dt><dd>{{ selectedRecord.round }}회 · {{ selectedRecord.date }}</dd></div><div><dt>삭제자</dt><dd>{{ selectedRecord.deletedBy }}</dd></div><div><dt>삭제시각</dt><dd>{{ selectedRecord.deletedAt }}</dd></div></dl>
        <p>사유: {{ selectedRecord.deletionReason }}</p>
        <p class="muted">이미 삭제된 합성 예시입니다. 일반 상담 목록과 환자 이력에서는 보이지 않습니다.</p>
        <div class="action-bar"><button class="secondary-button" type="button" @click="selected = null">닫기</button></div>
      </UiDialog>
      <UiDialog v-else-if="selectedRecord" title="상담 삭제 확인" @close="selected = null">
        <dl class="detail-grid dialog-target"><div><dt>환자</dt><dd>{{ patientFor(selectedRecord).name }}</dd></div><div><dt>회차·상담일</dt><dd>{{ selectedRecord.round }}회 · {{ selectedRecord.date }}</dd></div><div><dt>담당자</dt><dd>{{ selectedRecord.owner }}</dd></div><div><dt>진행 상태</dt><dd>{{ statusLabel[selectedRecord.status] }}</dd></div></dl>
        <p>이 상담에 연결된 질문지 답변, 이미지, 분석, 최종본이 함께 숨겨집니다. 논리삭제이며 보유정책에 따른 실제 파기와는 다릅니다.</p>
        <label class="stacked-label"><span class="label-row">삭제 사유<span class="required-mark">필수</span></span><textarea required placeholder="기능 연결 전에는 기록되지 않습니다" /></label>
        <div class="action-bar"><button class="secondary-button" type="button" @click="selected = null">취소</button><button class="danger-button" type="button" disabled>상담 삭제</button><p class="pending-note">삭제 기능 연결 예정</p></div>
      </UiDialog>
    </section>

    <section v-else class="surface-card" aria-labelledby="audit-title">
      <h2 id="audit-title">감사 기록 예시</h2>
      <p class="muted">민감 원문·비밀번호·토큰·공급자 키는 표시하지 않습니다.</p>
      <div class="filter-bar filter-bar--short"><label>시작일<input v-model="auditFrom" type="date"></label><label>작업 종류<select v-model="auditAction"><option value="ALL">전체</option><option v-for="action in auditActions" :key="action">{{ action }}</option></select></label><label>작업자<select v-model="auditActor"><option value="ALL">전체</option><option v-for="actor in auditActors" :key="actor">{{ actor }}</option></select></label></div>
      <div v-if="auditList.length === 0" class="empty-panel"><strong>조건에 맞는 감사 기록이 없습니다</strong></div>
      <div v-else class="table-scroll">
        <table class="data-table">
          <thead><tr><th>발생시각</th><th>작업자</th><th>작업</th><th>대상</th><th>결과</th><th><span class="sr-only">상세</span></th></tr></thead>
          <tbody><tr v-for="item in auditList" :key="item.id"><td class="nowrap">{{ item.time }}</td><td>{{ item.actor }}</td><td>{{ item.action }}</td><td><RouterLink class="text-link" :to="item.path">{{ item.target }}</RouterLink><small>{{ item.targetId }}</small></td><td>{{ item.result }}</td><td><button class="text-button" type="button" :aria-label="`${item.time} ${item.action} 상세`" @click="selected = item.id">상세</button></td></tr></tbody>
        </table>
      </div>
      <UiDialog v-if="selectedAudit" title="감사 기록 상세" @close="selected = null">
        <dl class="detail-grid dialog-target"><div><dt>발생시각</dt><dd>{{ selectedAudit.time }}</dd></div><div><dt>작업자</dt><dd>{{ selectedAudit.actor }}</dd></div><div><dt>작업</dt><dd>{{ selectedAudit.action }}</dd></div><div><dt>대상</dt><dd>{{ selectedAudit.target }}</dd></div><div><dt>대상 ID</dt><dd>{{ selectedAudit.targetId }}</dd></div><div><dt>요청 ID</dt><dd>{{ selectedAudit.requestId }} · 합성</dd></div></dl>
        <p>{{ selectedAudit.summary }}</p>
        <div class="action-bar"><RouterLink class="secondary-link" :to="selectedAudit.path">대상 화면 열기</RouterLink><button class="secondary-button" type="button" @click="selected = null">닫기</button></div>
      </UiDialog>
    </section>
  </div>
</template>
