<script setup lang="ts">
import { RouterLink, type RouteLocationRaw } from "vue-router";

// 마지막 항목이 현재 화면이며, 이동 경로가 있는 상위 항목만 링크로 표시합니다.
defineProps<{ items: Array<{ label: string; to?: RouteLocationRaw }> }>();
</script>

<template>
  <nav class="breadcrumb" aria-label="현재 위치">
    <ol>
      <li v-for="(item, index) in items" :key="`${index}-${item.label}`">
        <span v-if="index === items.length - 1" aria-current="page">{{ item.label }}</span>
        <RouterLink v-else-if="item.to" :to="item.to">{{ item.label }}</RouterLink>
        <span v-else>{{ item.label }}</span>
      </li>
    </ol>
  </nav>
</template>
