<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";
import UiNotice from "../components/ui/UiNotice.vue";
import { consultations, patientFor, statusLabel, typeLabel, users, workPath } from "../data/preview";

const route = useRoute();
const section = computed(() => route.path.endsWith("/users") ? "users" : route.path.endsWith("/audit") ? "audit" : "records");
const query = ref("");
const selected = ref<string | null>(null);
const userFilter = ref("ALL");
const deletionFilter = ref("ALL");
watch(section, () => { selected.value = null; query.value = ""; userFilter.value = "ALL"; deletionFilter.value = "ALL"; });
watch(deletionFilter, () => { selected.value = null; });
const userList = computed(() => users.filter((item) => `${item.name} ${item.login}`.includes(query.value)
  && (userFilter.value === "ALL" || (userFilter.value === "INACTIVE" ? item.status === "비활성" : item.role === (userFilter.value === "ADMIN" ? "관리자" : "시술자")))));
const recordList = computed(() => consultations.filter((item) => `${patientFor(item).name} ${item.owner}`.includes(query.value)
  && (deletionFilter.value === "ALL" || (deletionFilter.value === "DELETED" ? item.deleted === true : !item.deleted))));
const selectedRecord = computed(() => consultations.find((item) => item.id === selected.value));
const audit = [
  { id: "a-1", time: "2026-09-23 10:20", actor: "시술자 김", action: "상담 조회", target: "c-101", result: "예시", path: "/consultations/c-101/intake" },
  { id: "a-2", time: "2026-09-22 16:40", actor: "관리자 박", action: "사용자 상태 확인", target: "u-off", result: "예시", path: "/admin/users" },
  { id: "a-3", time: "2026-09-21 09:10", actor: "시술자 이", action: "질문지 상태 확인", target: "c-103", result: "예시", path: "/consultations/c-103/questionnaire" },
];
</script>

<template>
  <div class="page-stack">
    <div class="page-heading"><div><p class="breadcrumb">운영 관리 / {{ section === 'users' ? '사용자 관리' : section === 'audit' ? '감사 기록' : '상담 기록' }}</p><h1>{{ section === 'users' ? '사용자 관리' : section === 'audit' ? '감사 기록' : '상담 기록' }}</h1><p class="muted">관리자 전용 화면 시안입니다.</p></div></div>
    <UiNotice title="운영 기능 연결 예정">표시 내용은 합성 데이터입니다. 계정 변경·삭제·감사 기록 저장은 처리되지 않습니다.</UiNotice>
    <nav class="local-tabs" aria-label="운영 관리 화면"><RouterLink to="/admin/users">사용자 관리</RouterLink><RouterLink to="/admin/records/consultations">상담 기록</RouterLink><RouterLink to="/admin/records/audit">감사 기록</RouterLink></nav>
    <section v-if="section === 'users'" class="surface-card"><div class="surface-heading"><h2>사용자 목록</h2><button class="secondary-button" disabled>사용자 등록 · 기능 연결 예정</button></div><div class="filter-grid"><label>이름·로그인 아이디<input v-model="query" type="search"></label><label>역할·상태<select v-model="userFilter"><option value="ALL">전체</option><option value="PRACTITIONER">시술자</option><option value="ADMIN">관리자</option><option value="INACTIVE">비활성</option></select></label></div><div v-if="userList.length === 0" class="empty-panel">검색 결과가 없습니다.</div><div v-else class="table-scroll"><table class="data-table"><thead><tr><th>이름</th><th>로그인 아이디</th><th>역할</th><th>상태</th><th>최근 로그인</th><th>행동</th></tr></thead><tbody><tr v-for="item in userList" :key="item.id"><td>{{ item.name }}</td><td>{{ item.login }}</td><td>{{ item.role }}</td><td>{{ item.status }}</td><td>{{ item.recent }}</td><td><button class="text-button" type="button" @click="selected = item.id">상세·상태 확인</button></td></tr></tbody></table></div><div v-if="selected" class="inline-dialog"><h3>계정 변경 확인 화면 예시</h3><p>비활성화하면 기존 세션을 즉시 종료해야 합니다. 비밀번호 초기화 결과는 관리자가 안전한 경로로 전달합니다.</p><button class="secondary-button" disabled>상태 변경 · 기능 연결 예정</button><button class="text-button" @click="selected = null">닫기</button></div></section>
    <section v-else-if="section === 'records'" class="surface-card">
      <h2>전체 상담 기록</h2>
      <div class="filter-grid"><label>환자·담당자<input v-model="query" type="search"></label><label>삭제 여부<select v-model="deletionFilter"><option value="ALL">전체</option><option value="ACTIVE">일반</option><option value="DELETED">삭제됨</option></select></label></div>
      <div v-if="recordList.length === 0" class="empty-panel">검색 결과가 없습니다.</div>
      <div v-else class="table-scroll">
        <table class="data-table">
          <thead><tr><th>환자·회차</th><th>유형</th><th>담당자</th><th>상태</th><th>최종 결론</th><th>삭제 상태·사유</th><th>이동</th></tr></thead>
          <tbody>
            <tr v-for="item in recordList" :key="item.id"><td>{{ patientFor(item).name }} · {{ item.round }}회</td><td>{{ typeLabel(item.types) }}</td><td>{{ item.owner }}</td><td>{{ statusLabel[item.status] }}</td><td>{{ item.result }}</td><td>{{ item.deleted ? '삭제됨 · 예시' : '일반' }}<small v-if="item.deleted">{{ item.deletionReason }}</small><button class="text-button" @click="selected = item.id">{{ item.deleted ? '삭제 정보 보기' : '삭제 확인' }}</button></td><td><RouterLink class="text-link" :to="workPath(item)">상담 열기</RouterLink></td></tr>
          </tbody>
        </table>
      </div>
      <div v-if="selectedRecord?.deleted" class="inline-dialog"><h3>상담 삭제 정보 예시</h3><p>사유: {{ selectedRecord.deletionReason }}</p><p>삭제자: {{ selectedRecord.deletedBy }}</p><p>삭제시각: {{ selectedRecord.deletedAt }}</p><button class="text-button" @click="selected = null">닫기</button></div>
      <div v-else-if="selected" class="inline-dialog"><h3>상담 삭제 확인 화면 예시</h3><p>질문지·이미지·분석·최종본이 연결된 기록입니다. 논리삭제는 실제 파기와 다릅니다.</p><label class="stacked-label">삭제 사유<textarea placeholder="기능 연결 전에는 기록되지 않습니다" /></label><div class="action-row"><button class="secondary-button" disabled>상담 삭제 · 기능 연결 예정</button><button class="text-button" @click="selected = null">취소</button></div></div>
    </section>
    <section v-else class="surface-card"><h2>감사 기록 예시</h2><p class="muted">민감 원문·비밀번호·토큰·공급자 키는 표시하지 않습니다.</p><div class="table-scroll"><table class="data-table"><thead><tr><th>발생시각</th><th>행위자</th><th>행위</th><th>대상</th><th>결과</th><th>요청 ID</th></tr></thead><tbody><tr v-for="item in audit" :key="item.id"><td>{{ item.time }}</td><td>{{ item.actor }}</td><td>{{ item.action }}</td><td><RouterLink class="text-link" :to="item.path">{{ item.target }}</RouterLink></td><td>{{ item.result }}</td><td>{{ item.id }} · 합성</td></tr></tbody></table></div></section>
  </div>
</template>
