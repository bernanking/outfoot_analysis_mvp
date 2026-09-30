import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installStickyFocusGuard } from "./stickyFocus";

function rect(element: HTMLElement, top: number, bottom: number): void {
  Object.defineProperty(element, "getBoundingClientRect", { configurable: true, value: () => ({ top, bottom, left: 0, right: 300, width: 300, height: bottom - top, x: 0, y: top, toJSON: () => ({}) }) });
}

let uninstall: () => void;
let scrollBy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  document.body.innerHTML = `
    <main><input id="field"><input id="below"></main>
    <div class="work-actions" style="position: sticky"><button id="bar-button">다음</button></div>
    <div role="dialog"><button id="dialog-button">저장하지 않고 이동</button></div>`;
  rect(document.querySelector<HTMLElement>(".work-actions")!, 600, 700);
  rect(document.getElementById("field")!, 620, 664);
  rect(document.getElementById("below")!, 720, 764);
  rect(document.getElementById("dialog-button")!, 640, 684);
  rect(document.getElementById("bar-button")!, 620, 664);
  scrollBy = vi.spyOn(window, "scrollBy").mockImplementation(() => undefined);
  uninstall = installStickyFocusGuard(document);
});

afterEach(() => {
  uninstall();
  scrollBy.mockRestore();
  document.body.innerHTML = "";
});

describe("sticky bar focus guard (V2)", () => {
  it("scrolls a keyboard-focused field out from under the sticky bar by the overlap", () => {
    document.getElementById("field")!.focus();
    expect(scrollBy).toHaveBeenCalledTimes(1);
    expect(scrollBy).toHaveBeenCalledWith({ top: 664 - 600 + 16 });
  });

  it("does not move the background page for focus inside a dialog", () => {
    document.getElementById("dialog-button")!.focus();
    expect(scrollBy).not.toHaveBeenCalled();
  });

  it("does not scroll right after a mouse or touch press", () => {
    document.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    document.getElementById("field")!.focus();
    expect(scrollBy).not.toHaveBeenCalled();
  });

  it("checks keyboard focus right after a pointer press once Tab is pressed (P2-1)", () => {
    document.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true }));
    document.getElementById("field")!.focus();
    expect(scrollBy).toHaveBeenCalledTimes(1);
    expect(scrollBy).toHaveBeenCalledWith({ top: 664 - 600 + 16 });
  });

  it("does the same for Shift+Tab", () => {
    document.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", shiftKey: true, bubbles: true }));
    document.getElementById("field")!.focus();
    expect(scrollBy).toHaveBeenCalledWith({ top: 664 - 600 + 16 });
  });

  it("keeps the pointer exception when no key is pressed, and a later press starts a new exception", () => {
    document.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    document.getElementById("field")!.focus();
    document.getElementById("below")!.focus();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true }));
    document.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    document.getElementById("field")!.focus();
    expect(scrollBy).not.toHaveBeenCalled();
  });

  it("still leaves dialog focus alone after a keyboard switch", () => {
    document.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true }));
    document.getElementById("dialog-button")!.focus();
    expect(scrollBy).not.toHaveBeenCalled();
  });

  it("ignores elements inside the bar and elements below it", () => {
    document.getElementById("bar-button")!.focus();
    document.getElementById("below")!.focus();
    expect(scrollBy).not.toHaveBeenCalled();
  });

  it("stops after uninstalling and removes every listener it added", () => {
    const removed = vi.spyOn(document, "removeEventListener");
    uninstall();
    expect(removed.mock.calls.map(([type]) => type).sort()).toEqual(["focusin", "keydown", "pointerdown"]);
    removed.mockRestore();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true }));
    document.getElementById("field")!.focus();
    expect(scrollBy).not.toHaveBeenCalled();
    uninstall = () => undefined;
  });
});
