<script setup lang="ts">
import Button from "primevue/button";
import type { ButtonProps } from "primevue/button";
import type { PropType } from "vue";

defineOptions({ inheritAttrs: false });

const props = defineProps({
  label: { type: String, required: true },
  severity: { type: String as PropType<ButtonProps["severity"]>, default: undefined },
  outlined: Boolean,
  loading: Boolean,
  type: { type: String as PropType<ButtonProps["type"]>, default: "button" },
  disabled: Boolean,
});
</script>

<template>
  <Button
    :label="props.label"
    :severity="props.severity"
    :outlined="props.outlined"
    :loading="props.loading"
    :type="props.type"
    :disabled="props.disabled"
    v-bind="$attrs"
  />
</template>
