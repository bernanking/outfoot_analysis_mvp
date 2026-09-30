// 하단 고정 행동 영역 뒤로 키보드 포커스가 숨지 않도록, 가려진 만큼만 본문을 스크롤합니다.
// 다음 경우에는 스크롤하지 않습니다.
// - 대화상자 안의 포커스(배경 페이지를 움직이지 않음)
// - 마우스·터치 직후의 포커스(사용자가 보고 누른 위치). 단, 그 뒤 키보드(Tab·Shift+Tab·방향키 등)를 누르면
//   예외를 바로 해제해 키보드로 옮긴 포커스는 정상적으로 가림 여부를 검사합니다.
// - 고정 영역 안의 요소, 고정 영역보다 아래에 있는 요소
const STICKY_BARS = ".work-actions, .action-bar";
const POINTER_WINDOW_MS = 800;

export function installStickyFocusGuard(doc: Document = document): () => void {
  let lastPointer = Number.NEGATIVE_INFINITY;
  const onPointer = (): void => { lastPointer = performance.now(); };
  // 입력 방식이 키보드로 바뀌면 포인터 예외를 즉시 끝냅니다. 캡처 단계라 포커스 이동보다 먼저 실행됩니다.
  const onKey = (): void => { lastPointer = Number.NEGATIVE_INFINITY; };
  const onFocus = (event: FocusEvent): void => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (performance.now() - lastPointer < POINTER_WINDOW_MS) return;
    if (target.closest('[role="dialog"], .dialog-backdrop')) return;
    const bar = [...doc.querySelectorAll<HTMLElement>(STICKY_BARS)]
      .find((element) => getComputedStyle(element).position === "sticky" && !element.contains(target) && !element.closest('[role="dialog"]'));
    if (!bar) return;
    const rect = target.getBoundingClientRect();
    const barRect = bar.getBoundingClientRect();
    if (rect.top >= barRect.bottom) return;
    const overlap = rect.bottom - barRect.top;
    if (overlap > -8) doc.defaultView?.scrollBy({ top: overlap + 16 });
  };
  doc.addEventListener("pointerdown", onPointer, true);
  doc.addEventListener("keydown", onKey, true);
  doc.addEventListener("focusin", onFocus);
  return () => {
    doc.removeEventListener("pointerdown", onPointer, true);
    doc.removeEventListener("keydown", onKey, true);
    doc.removeEventListener("focusin", onFocus);
  };
}
