<script setup lang="ts">
import { computed, nextTick, ref } from "vue";
import { RouterLink } from "vue-router";

import UiButton from "../components/ui/UiButton.vue";
import UiNotice from "../components/ui/UiNotice.vue";
import UiPreviewTools from "../components/ui/UiPreviewTools.vue";
import UiTextField from "../components/ui/UiTextField.vue";

type PreviewState = "DEFAULT" | "LOADING" | "INVALID" | "INACTIVE";
const previewState = ref<PreviewState>("DEFAULT");
const loginId = ref("");
const password = ref("");
const showPassword = ref(false);
const showRequired = ref(false);
const loginIdError = computed(() => showRequired.value && !loginId.value.trim() ? "아이디를 입력해 주세요." : "");
const passwordError = computed(() => showRequired.value && !password.value ? "비밀번호를 입력해 주세요." : "");

async function previewSubmit(): Promise<void> {
  previewState.value = "DEFAULT";
  showRequired.value = true;
  await nextTick();
  if (!loginId.value.trim()) {
    document.getElementById("login-id")?.focus();
    return;
  }
  if (!password.value) {
    document.getElementById("password")?.focus();
    return;
  }
  previewState.value = "INVALID";
}
</script>

<template>
  <main class="auth-page">
    <div class="auth-intro">
      <RouterLink class="brand brand--auth" to="/login"><span class="brand-mark" aria-hidden="true">O</span><span>OUTFOOT</span></RouterLink>
      <p class="eyebrow">족부 상담 기록</p>
      <h1>상담 기록을 한곳에서 관리하세요</h1>
      <p>시술자와 관리자를 위한 업무 화면입니다. 환자는 상담별 질문지 링크로 접근합니다.</p>
    </div>
    <section class="auth-card" aria-labelledby="login-title">
      <span class="preview-pill">화면 시안 · 인증 기능 미연결</span>
      <h2 id="login-title">로그인</h2>
      <p class="muted">계정 발급과 초기화는 관리자에게 요청해 주세요.</p>
      <form class="login-form" novalidate @submit.prevent="previewSubmit">
        <UiTextField id="login-id" v-model="loginId" label="아이디" autocomplete="username" :error="loginIdError" />
        <UiTextField id="password" v-model="password" label="비밀번호" :type="showPassword ? 'text' : 'password'" autocomplete="current-password" :error="passwordError" />
        <label class="checkbox-row"><input v-model="showPassword" type="checkbox"> 비밀번호 표시</label>
        <UiNotice v-if="previewState === 'INVALID'" live title="로그인 실패 상태 예시" tone="danger">입력 정보를 확인해 주세요. 실제 인증은 기능 개발 단계에서 연결됩니다.</UiNotice>
        <UiNotice v-if="previewState === 'INACTIVE'" live title="사용 중지된 계정 상태 예시" tone="warning">관리자에게 계정 상태 확인을 요청해 주세요.</UiNotice>
        <UiNotice v-if="previewState === 'LOADING'" live title="로그인 처리 중 상태 예시">로그인 요청 상태를 표시하는 화면 시안입니다.</UiNotice>
        <UiButton class="full-width" type="submit" label="로그인" :loading="previewState === 'LOADING'" />
      </form>
      <UiPreviewTools class="login-preview-tools">
        <label class="preview-tools-field" for="login-preview-state">로그인 상태 예시
          <select id="login-preview-state" v-model="previewState">
            <option value="DEFAULT">기본</option><option value="LOADING">처리 중</option><option value="INVALID">로그인 실패</option><option value="INACTIVE">비활성 계정</option>
          </select>
        </label>
      </UiPreviewTools>
      <RouterLink class="text-link" to="/consultations">직원 화면 시안 보기 →</RouterLink>
      <p class="auth-footnote">운영기관·개인정보 안내 문구는 확정 전입니다.</p>
    </section>
  </main>
</template>
