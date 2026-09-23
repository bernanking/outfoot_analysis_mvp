<script setup lang="ts">
import InputText from "primevue/inputtext";

defineOptions({ inheritAttrs: false });

defineProps<{
  id: string;
  label: string;
  type?: string;
  autocomplete?: string;
  help?: string;
  error?: string;
}>();

const model = defineModel<string>({ default: "" });
</script>

<template>
  <div class="field">
    <label class="field-label" :for="id">{{ label }}</label>
    <InputText
      :id="id"
      v-model="model"
      :type="type ?? 'text'"
      :autocomplete="autocomplete"
      :invalid="Boolean(error)"
      :aria-describedby="error || help ? `${id}-description` : undefined"
      v-bind="$attrs"
    />
    <p v-if="error || help" :id="`${id}-description`" :class="error ? 'field-error' : 'field-help'">{{ error || help }}</p>
  </div>
</template>
