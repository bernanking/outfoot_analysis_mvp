import type { RouterScrollBehavior } from "vue-router";

// 탭처럼 같은 화면 안에서 이동하는 링크는 포커스를 그대로 둡니다.
export const KEEP_FOCUS_ATTRIBUTE = "data-keep-focus-on-navigation";

export function focusPageHeading(): void {
  const heading = document.querySelector<HTMLElement>("main h1");
  if (!heading) return;
  if (!heading.hasAttribute("tabindex")) heading.setAttribute("tabindex", "-1");
  heading.focus({ preventScroll: true });
}

// 뒤로가기·앞으로가기는 이전 위치를 복원하고, 새 이동은 맨 위에서 제목부터 읽게 합니다.
export const scrollBehavior: RouterScrollBehavior = (to, from, savedPosition) => {
  if (savedPosition) return savedPosition;
  if (to.hash) return { el: to.hash };
  // 검색·필터처럼 같은 화면에서 주소 조건만 바뀐 경우에는 위치와 포커스를 유지합니다.
  if (to.path === from.path) return false;
  const isFirstNavigation = from.matched.length === 0;
  const keepFocus = document.activeElement?.closest(`[${KEEP_FOCUS_ATTRIBUTE}]`);
  if (!isFirstNavigation && !keepFocus) focusPageHeading();
  return { top: 0 };
};
