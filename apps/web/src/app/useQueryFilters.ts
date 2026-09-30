import { computed, reactive, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

// 목록 검색·필터를 주소에 함께 저장해 상세 화면에서 돌아와도 조건이 유지되게 합니다.
// 여러 조건을 한 번에 바꿔도 주소가 한 번만 갱신되도록 묶어서 관리합니다.
export function useQueryFilters<T extends Record<string, string>>(defaults: T) {
  const route = useRoute();
  const router = useRouter();
  const keys = Object.keys(defaults) as Array<keyof T & string>;
  const fromQuery = (): T => Object.fromEntries(keys.map((key) => {
    const value = route.query[key];
    return [key, typeof value === "string" ? value : defaults[key]];
  })) as T;
  const filters = reactive({ ...fromQuery() }) as T;

  watch(() => ({ ...filters }), (next) => {
    const query = { ...route.query };
    for (const key of keys) {
      if (next[key] === defaults[key]) delete query[key];
      else query[key] = next[key];
    }
    if (JSON.stringify(query) !== JSON.stringify(route.query)) void router.replace({ query });
  });
  watch(() => route.query, () => Object.assign(filters, fromQuery()));

  const activeKeys = computed(() => keys.filter((key) => filters[key] !== defaults[key]));
  const reset = (): void => { Object.assign(filters, defaults); };
  return { filters, activeKeys, reset };
}
