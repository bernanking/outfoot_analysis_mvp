import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import UiNotice from "./UiNotice.vue";

describe("UiNotice", () => {
  it("does not announce static guidance", () => {
    const wrapper = mount(UiNotice, { props: { title: "안내", tone: "danger" } });
    expect(wrapper.attributes("role")).toBeUndefined();
  });

  it("announces live state changes by tone", () => {
    expect(mount(UiNotice, { props: { title: "오류", tone: "danger", live: true } }).attributes("role")).toBe("alert");
    expect(mount(UiNotice, { props: { title: "처리 중", live: true } }).attributes("role")).toBe("status");
  });
});
