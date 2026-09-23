<script setup lang="ts">
import { RouterLink, useRoute } from "vue-router";

import UiNotice from "../components/ui/UiNotice.vue";

const route = useRoute();
</script>

<template>
  <div class="page-stack">
    <div class="page-heading"><div><p class="breadcrumb">화면 시안</p><h1>{{ route.meta.title }}</h1><p class="muted">이 화면은 T04A에서 구성합니다.</p></div></div>
    <UiNotice title="기능 개발 단계에서 연결됩니다">현재는 페이지 위치만 확인할 수 있습니다. 저장·조회·계정 변경은 처리되지 않습니다.</UiNotice>
    <RouterLink class="text-link" to="/consultations">상담 관리로 돌아가기 →</RouterLink>
  </div>
</template>
