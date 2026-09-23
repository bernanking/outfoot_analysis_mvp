<script setup lang="ts">
import { computed } from "vue";
import { RouterLink, useRouter } from "vue-router";

import UiButton from "../components/ui/UiButton.vue";

const props = defineProps<{ kind: "403" | "404" | "error" }>();
const router = useRouter();
const content = computed(() => ({
  "403": { eyebrow: "403 · 접근 권한 없음", title: "이 화면에 접근할 수 없습니다", body: "현재 계정에 이 화면을 볼 권한이 없습니다. 권한이 필요하면 관리자에게 문의해 주세요." },
  "404": { eyebrow: "404 · 찾을 수 없음", title: "화면 또는 기록을 찾을 수 없습니다", body: "주소를 확인하거나 상담 목록에서 다시 찾아주세요." },
  error: { eyebrow: "일시적인 오류", title: "화면을 불러오지 못했습니다", body: "화면 시안에서는 재시도 기능이 연결되지 않았습니다. 상담 목록에서 다시 시작해 주세요." },
})[props.kind]);

function goBack(): void {
  if (router.options.history.state.back) router.back();
  else void router.push("/consultations");
}
</script>

<template>
  <main class="error-page">
    <div class="error-card">
      <RouterLink class="brand brand--error" to="/consultations"><span class="brand-mark" aria-hidden="true">O</span><span>OUTFOOT</span></RouterLink>
      <p class="eyebrow">{{ content.eyebrow }}</p>
      <h1>{{ content.title }}</h1>
      <p class="muted">{{ content.body }}</p>
      <p v-if="kind === 'error'" class="request-id">요청 ID: 화면 시안에서 제공되지 않음</p>
      <div class="error-actions">
        <UiButton v-if="kind === '404'" label="이전 화면" severity="secondary" outlined @click="goBack" />
        <RouterLink class="primary-link" to="/consultations">상담 목록으로 이동</RouterLink>
      </div>
    </div>
  </main>
</template>
