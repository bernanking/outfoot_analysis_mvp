<script setup lang="ts">
withDefaults(defineProps<{
  title: string;
  tone?: "info" | "warning" | "danger" | "success";
}>(), { tone: "info" });
</script>

<template>
  <div class="notice" :class="`notice--${tone}`" :role="tone === 'danger' ? 'alert' : 'status'">
    <strong>{{ title }}</strong>
    <div class="notice-body"><slot /></div>
  </div>
</template>
