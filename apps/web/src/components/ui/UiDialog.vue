<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, useId } from "vue";

// 영향이 큰 작업의 대상 확인 화면입니다. 열리면 제목으로 포커스를 옮기고, Tab을 대화상자 안에 가두며,
// Esc·바깥 클릭·닫기로 닫힌 뒤에는 연 버튼으로 포커스를 돌려줍니다.
defineProps<{ title: string }>();
const emit = defineEmits<{ close: [] }>();
const titleId = useId();
const panel = ref<HTMLElement | null>(null);
const heading = ref<HTMLElement | null>(null);
let returnFocus: HTMLElement | null = null;

const focusable = (): HTMLElement[] => [...(panel.value?.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])") ?? [])];

function onKeydown(event: KeyboardEvent): void {
  if (event.key === "Escape") {
    event.preventDefault();
    emit("close");
    return;
  }
  if (event.key !== "Tab") return;
  const items = focusable();
  if (items.length === 0) { event.preventDefault(); return; }
  const first = items[0];
  const last = items[items.length - 1];
  if (event.shiftKey && (document.activeElement === first || document.activeElement === heading.value)) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
}

onMounted(async () => {
  returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  await nextTick();
  heading.value?.focus();
});
onUnmounted(() => { if (returnFocus?.isConnected) returnFocus.focus(); });
</script>

<template>
  <div class="dialog-backdrop" @click.self="emit('close')">
    <div ref="panel" class="dialog-panel" role="dialog" aria-modal="true" :aria-labelledby="titleId" @keydown="onKeydown">
      <h2 :id="titleId" ref="heading" tabindex="-1">{{ title }}</h2>
      <slot />
    </div>
  </div>
</template>
