<script setup lang="ts">
import { RouterLink } from "vue-router";

import UiNotice from "../components/ui/UiNotice.vue";
import UiStatusBadge from "../components/ui/UiStatusBadge.vue";
</script>

<template>
  <div class="page-stack">
    <div class="page-heading">
      <div><p class="breadcrumb">상담 관리 / 상담 목록</p><h1>상담 관리</h1><p class="muted">상담 접수부터 최종 결과까지 한곳에서 확인합니다.</p></div>
      <RouterLink class="primary-link" to="/consultations/new">신규 상담 접수</RouterLink>
    </div>
    <UiNotice title="T04 공통 화면 구성 중">상담 목록·검색·필터와 회차별 작업 화면은 T04A에서 합성 데이터로 연결합니다.</UiNotice>
    <section class="surface-card" aria-labelledby="consultations-preview-title">
      <div class="surface-heading"><h2 id="consultations-preview-title">상담 목록</h2><UiStatusBadge label="화면 시안" tone="info" /></div>
      <div class="empty-panel"><strong>목록 화면이 준비되고 있습니다</strong><p>여기에는 진행 상태, 담당자, 주의신호를 확인할 수 있는 상담 목록이 들어갑니다.</p></div>
    </section>
  </div>
</template>
