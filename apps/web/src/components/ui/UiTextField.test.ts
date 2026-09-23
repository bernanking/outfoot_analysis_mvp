import { mount } from "@vue/test-utils";
import PrimeVue from "primevue/config";
import { describe, expect, it } from "vitest";

import UiTextField from "./UiTextField.vue";

describe("UiTextField", () => {
  it("forwards class, placeholder and test id only to the input", () => {
    const wrapper = mount(UiTextField, {
      props: { id: "name", label: "이름" },
      attrs: { class: "test-field", placeholder: "이름 입력", "data-testid": "name-input" },
      global: { plugins: [PrimeVue] },
    });
    const input = wrapper.get("input");

    expect(wrapper.element.classList.contains("test-field")).toBe(false);
    expect(wrapper.attributes("placeholder")).toBeUndefined();
    expect(wrapper.attributes("data-testid")).toBeUndefined();
    expect(input.classes()).toContain("test-field");
    expect(input.attributes("placeholder")).toBe("이름 입력");
    expect(input.attributes("data-testid")).toBe("name-input");
  });
});
