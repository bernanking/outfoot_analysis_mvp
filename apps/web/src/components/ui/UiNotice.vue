<script setup lang="ts">
// 정적 안내는 역할 없이 읽히게 하고, 화면 상태가 바뀌며 나타나는 안내만 live로 알립니다.
withDefaults(defineProps<{
  title: string;
  tone?: "info" | "warning" | "danger" | "success";
  live?: boolean;
}>(), { tone: "info", live: false });
</script>

<template>
  <div class="notice" :class="`notice--${tone}`" :role="live ? (tone === 'danger' ? 'alert' : 'status') : undefined">
    <strong>{{ title }}</strong>
    <div class="notice-body"><slot /></div>
  </div>
</template>
