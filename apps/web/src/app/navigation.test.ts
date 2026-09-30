import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { afterEach, describe, expect, it } from "vitest";
import { createMemoryHistory, RouterView, type RouteLocationNormalized } from "vue-router";

import { createAppRouter } from "../router";
import { KEEP_FOCUS_ATTRIBUTE, scrollBehavior } from "./navigation";

let screenCount = 0;
function location(matchedCount: number, hash = "", path = `/screen-${++screenCount}`): RouteLocationNormalized {
  return { matched: Array.from({ length: matchedCount }, () => ({})), hash, path } as unknown as RouteLocationNormalized;
}

function renderPage(): HTMLElement {
  document.body.innerHTML = `<main><nav ${KEEP_FOCUS_ATTRIBUTE}><a id="tab" href="#">탭</a></nav><h1>새 화면</h1></main><button id="origin">이전 행동</button>`;
  return document.querySelector("h1")!;
}

afterEach(() => { document.body.innerHTML = ""; });

describe("navigation scroll and focus", () => {
  it("restores the saved position on back and forward without moving focus", () => {
    renderPage();
    document.getElementById("origin")!.focus();
    expect(scrollBehavior(location(1), location(1), { left: 0, top: 640 })).toEqual({ left: 0, top: 640 });
    expect(document.activeElement?.id).toBe("origin");
  });

  it("starts a new screen at the top and focuses its heading", () => {
    const heading = renderPage();
    document.getElementById("origin")!.focus();
    expect(scrollBehavior(location(1), location(1), null)).toEqual({ top: 0 });
    expect(document.activeElement).toBe(heading);
    expect(heading.getAttribute("tabindex")).toBe("-1");
  });

  it("does not move focus on the first navigation or from a same-screen tab", () => {
    renderPage();
    document.getElementById("origin")!.focus();
    scrollBehavior(location(1), location(0), null);
    expect(document.activeElement?.id).toBe("origin");
    document.getElementById("tab")!.focus();
    expect(scrollBehavior(location(1), location(1), null)).toEqual({ top: 0 });
    expect(document.activeElement?.id).toBe("tab");
  });

  it("keeps position and focus when only the query of the same screen changes", () => {
    renderPage();
    document.getElementById("origin")!.focus();
    expect(scrollBehavior(location(1, "", "/consultations"), location(1, "", "/consultations"), null)).toBe(false);
    expect(document.activeElement?.id).toBe("origin");
  });

  it("scrolls to a hash target such as the skip link", () => {
    renderPage();
    expect(scrollBehavior(location(1, "#main-content"), location(1), null)).toEqual({ el: "#main-content" });
  });

  it("focuses the next screen heading after an in-app link", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const router = createAppRouter(createMemoryHistory());
    await router.push("/consultations/c-101/questionnaire");
    await router.isReady();
    const wrapper = mount({ components: { RouterView }, template: "<main><RouterView /></main>" }, { attachTo: document.body, global: { plugins: [pinia, router] } });
    await router.push("/consultations/c-101/visit");
    await flushPromises();
    expect(document.activeElement?.tagName).toBe("H1");
    expect(document.activeElement?.textContent).toContain("합성 환자 가");
    wrapper.unmount();
  });
});
