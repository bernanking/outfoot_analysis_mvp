<script setup lang="ts">
// 역할·화면 상태 예시처럼 시안 검토에만 쓰는 조작을 업무 필터와 분리해 접어 둡니다.
// shortLabel은 좁은 상단 영역에서만 보이는 짧은 이름이며, 화면낭독기는 항상 전체 이름을 읽습니다.
withDefaults(defineProps<{ label?: string; shortLabel?: string }>(), { label: "시안 검토 도구", shortLabel: undefined });
</script>

<template>
  <details class="preview-tools">
    <summary><span class="preview-tools-label-full">{{ label }}</span><span v-if="shortLabel" class="preview-tools-label-short" aria-hidden="true">{{ shortLabel }}</span></summary>
    <div class="preview-tools-body"><slot /></div>
  </details>
</template>
