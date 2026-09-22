<script setup lang="ts">
import type { DemoConsultation, HealthResponse } from "@outfoot/contracts";
import Button from "primevue/button";
import { computed, onMounted, ref } from "vue";

import { getDemoConsultations, getHealth } from "../services/api";

const health = ref<HealthResponse | null>(null);
const consultations = ref<DemoConsultation[]>([]);
const errorMessage = ref("");
const isLoading = ref(false);

const activeCount = computed(
  () => consultations.value.filter((item) => item.status !== "FINALIZED").length,
);

async function loadDashboard(): Promise<void> {
  isLoading.value = true;
  errorMessage.value = "";

  try {
    const [healthResult, consultationResult] = await Promise.all([
      getHealth(),
      getDemoConsultations(),
    ]);
    health.value = healthResult;
    consultations.value = consultationResult;
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : "데이터를 불러오지 못했습니다.";
  } finally {
    isLoading.value = false;
  }
}

onMounted(loadDashboard);
</script>

<template>
  <div class="app-shell">
    <header class="topbar">
      <a class="brand" href="/" aria-label="OUTFOOT 홈">
        <span class="brand-mark" aria-hidden="true">O</span>
        <span>OUTFOOT</span>
      </a>
      <span class="demo-badge">합성 데이터 데모</span>
    </header>

    <main class="page-content">
      <section class="hero" aria-labelledby="page-title">
        <div>
          <p class="eyebrow">족부 상담 분석 MVP</p>
          <h1 id="page-title">오늘 확인할 상담을 한눈에</h1>
          <p class="hero-description">
            현재 화면의 환자명과 상담 내용은 개발 검증을 위한 합성 데이터입니다.
          </p>
        </div>
        <Button
          label="데이터 새로고침"
          :loading="isLoading"
          @click="loadDashboard"
        />
      </section>

      <p v-if="errorMessage" class="error-message" role="alert">
        {{ errorMessage }}
      </p>

      <section class="summary-grid" aria-label="상담 요약">
        <article class="summary-card">
          <span class="summary-label">진행 중</span>
          <strong>{{ activeCount }}건</strong>
          <span>방문·분석 검토 포함</span>
        </article>
        <article class="summary-card">
          <span class="summary-label">전체 데모 상담</span>
          <strong>{{ consultations.length }}건</strong>
          <span>실제 환자정보 없음</span>
        </article>
        <article class="summary-card">
          <span class="summary-label">API 상태</span>
          <strong>{{ health?.ok ? "정상" : "확인 중" }}</strong>
          <span>{{ health?.dataMode ?? "synthetic" }}</span>
        </article>
      </section>

      <section class="consultation-section" aria-labelledby="consultation-title">
        <div class="section-heading">
          <div>
            <p class="eyebrow">상담 목록</p>
            <h2 id="consultation-title">최근 상담</h2>
          </div>
          <span class="section-note">T01 스캐폴드 미리보기</span>
        </div>

        <div v-if="consultations.length" class="consultation-list">
          <article
            v-for="consultation in consultations"
            :key="consultation.id"
            class="consultation-card"
          >
            <div>
              <span class="synthetic-label">SYNTHETIC</span>
              <h3>{{ consultation.patientLabel }}</h3>
              <p>{{ consultation.concernLabel }}</p>
            </div>
            <span class="status-pill">{{ consultation.statusLabel }}</span>
          </article>
        </div>

        <p v-else-if="!isLoading" class="empty-state">표시할 합성 상담이 없습니다.</p>
      </section>
    </main>
  </div>
</template>
