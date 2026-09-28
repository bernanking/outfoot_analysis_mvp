import { createPinia, setActivePinia } from "pinia";
import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { createMemoryHistory } from "vue-router";
import AdminPage from "./AdminPage.vue";
import ConsultationWorkPage from "./ConsultationWorkPage.vue";
import ConsultationsPage from "./ConsultationsPage.vue";
import IntakePage from "./IntakePage.vue";
import PatientsPage from "./PatientsPage.vue";
import { createAppRouter } from "../router";
import { usePreviewStore } from "../stores/preview";

const mounted: Array<ReturnType<typeof mount>> = [];
afterEach(() => { mounted.forEach((wrapper) => wrapper.unmount()); mounted.length = 0; document.body.innerHTML = ""; });

async function open(component: Parameters<typeof mount>[0], path: string, role: "PRACTITIONER" | "ADMIN" = "PRACTITIONER") {
  const pinia = createPinia();
  setActivePinia(pinia);
  usePreviewStore(pinia).role = role;
  const router = createAppRouter(createMemoryHistory());
  await router.push(path);
  await router.isReady();
  const wrapper = mount(component, { attachTo: document.body, global: { plugins: [pinia, router] } });
  mounted.push(wrapper);
  return { wrapper, router };
}

describe("T04A preview review fixes", () => {
  it("clears administrator selection and search when switching sections in either direction", async () => {
    const { wrapper, router } = await open(AdminPage, "/admin/users", "ADMIN");
    await wrapper.get('input[type="search"]').setValue("시술자 김");
    await wrapper.get("button.text-button").trigger("click");
    expect(wrapper.text()).toContain("계정 변경 확인 화면 예시");
    await router.push("/admin/records/consultations");
    await flushPromises();
    expect(wrapper.text()).not.toContain("상담 삭제 확인 화면 예시");
    expect((wrapper.get('input[type="search"]').element as HTMLInputElement).value).toBe("");
    await wrapper.findAll("tbody tr").find((row) => row.text().includes("합성 환자 가 · 1회"))!.get("button.text-button").trigger("click");
    expect(wrapper.text()).toContain("상담 삭제 확인 화면 예시");
    await router.push("/admin/users");
    await flushPromises();
    expect(wrapper.text()).not.toContain("계정 변경 확인 화면 예시");
  });

  it("applies administrator preview filters", async () => {
    const { wrapper, router } = await open(AdminPage, "/admin/users", "ADMIN");
    await wrapper.get("select").setValue("ADMIN");
    expect(wrapper.findAll("tbody tr")).toHaveLength(1);
    expect(wrapper.text()).toContain("관리자 박");
    await router.push("/admin/records/consultations");
    await flushPromises();
    expect(wrapper.findAll("tbody tr")).toHaveLength(9);
    await wrapper.get("select").setValue("DELETED");
    expect(wrapper.findAll("tbody tr")).toHaveLength(1);
    const deletedRow = wrapper.get("tbody tr");
    expect(deletedRow.text()).toContain("합성 환자 가 · 2회");
    expect(deletedRow.text()).toContain("삭제됨 · 예시");
    expect(deletedRow.text()).toContain("합성 중복 접수 정리 예시");
    expect(deletedRow.find("button").text()).toBe("삭제 정보 보기");
    await deletedRow.get("button").trigger("click");
    expect(wrapper.text()).toContain("삭제자: 관리자 박");
    expect(wrapper.text()).toContain("삭제시각: 2026-09-24 11:00");
    expect(wrapper.text()).not.toContain("상담 삭제 확인 화면 예시");
    await wrapper.get("select").setValue("ACTIVE");
    expect(wrapper.findAll("tbody tr")).toHaveLength(8);
    expect(wrapper.text()).not.toContain("합성 중복 접수 정리 예시");
    await wrapper.get("select").setValue("ALL");
    expect(wrapper.findAll("tbody tr")).toHaveLength(9);
    expect(wrapper.text()).toContain("합성 중복 접수 정리 예시");
  });

  it("excludes deleted consultation from regular list and patient history", async () => {
    const list = await open(ConsultationsPage, "/consultations");
    expect(list.wrapper.findAll("tbody tr")).toHaveLength(8);
    expect(list.wrapper.text()).not.toContain("2026-09-24");
    const patients = await open(PatientsPage, "/patients");
    const patientRow = patients.wrapper.findAll("tbody tr").find((row) => row.text().includes("합성 환자 가"))!;
    expect(patientRow.text()).toContain("2026-09-23");
    expect(patientRow.text()).toContain("1회");
    expect(patientRow.text()).not.toContain("2026-09-24");
    const detail = await open(PatientsPage, "/patients/p-a");
    expect(detail.wrapper.findAll("tbody tr")).toHaveLength(1);
    expect(detail.wrapper.text()).not.toContain("2026-09-24");
  });

  it("shows unsubmitted type as unselected in list, header, and questionnaire", async () => {
    const list = await open(ConsultationsPage, "/consultations");
    const firstRow = list.wrapper.get("tbody tr");
    expect(firstRow.text()).toContain("환자 미선택");
    expect(firstRow.text()).not.toContain("발톱");
    const work = await open(ConsultationWorkPage, "/consultations/c-101/questionnaire");
    const typeTerm = work.wrapper.findAll("dt").find((item) => item.text() === "환자 선택 유형")!;
    expect(typeTerm.element.nextElementSibling?.textContent).toBe("환자 미선택");
    expect(work.wrapper.get(".page-heading").text()).toContain("환자 미선택");
    expect(work.wrapper.get(".summary-panel").text()).toContain("환자 미선택");
  });

  it("uses current user for read-only and editable consultation states", async () => {
    const readonly = await open(ConsultationWorkPage, "/consultations/c-103/visit");
    expect(readonly.wrapper.text()).toContain("조회 전용 · 담당자만 수정할 수 있습니다");
    const editable = await open(ConsultationWorkPage, "/consultations/c-101/questionnaire");
    expect(editable.wrapper.text()).toContain("수정 가능 예시");
    expect(editable.wrapper.text()).not.toContain("조회 전용 · 담당자만 수정할 수 있습니다");
    const admin = await open(ConsultationWorkPage, "/consultations/c-101/result", "ADMIN");
    expect(admin.wrapper.text()).toContain("최종확정 권한 없음");
  });

  it("distinguishes optional, required, and unknown footprint status", async () => {
    const nail = await open(ConsultationWorkPage, "/consultations/c-105/media");
    expect(nail.wrapper.get(".media-slot").text()).toContain("선택");
    const pain = await open(ConsultationWorkPage, "/consultations/c-102/media");
    expect(pain.wrapper.get(".media-slot").text()).toContain("기본 필요");
    const unknown = await open(ConsultationWorkPage, "/consultations/c-101/media");
    expect(unknown.wrapper.get(".media-slot").text()).toContain("유형 확인 후 결정");
  });

  it("keeps unconfigured analysis and no-measurement example visible", async () => {
    const analysis = await open(ConsultationWorkPage, "/consultations/c-101/analysis");
    expect(analysis.wrapper.text()).toContain("발도장 분석 방식 미구성");
    expect(analysis.wrapper.text()).toContain("측정값 없음");
    await analysis.wrapper.get(".surface-card.form-stack select").setValue("STRUCTURE");
    expect(analysis.wrapper.text()).toContain("측정값 없음");
    const result = await open(ConsultationWorkPage, "/consultations/c-101/result");
    expect(result.wrapper.text()).toContain("현재 승인된 AI 결과는 없습니다");
    expect(result.wrapper.text()).toContain("미구성이며 측정값 없음");
  });

  it("shows matching synthetic consultation rounds in patient history", async () => {
    const { wrapper } = await open(PatientsPage, "/patients/p-d");
    expect(wrapper.findAll("tbody tr")).toHaveLength(3);
    expect(wrapper.text()).toContain("3회");
    expect(wrapper.text()).toContain("2회");
    expect(wrapper.text()).toContain("1회");
  });

  it("updates intake patient selection when patientId is removed from the same route", async () => {
    const { wrapper, router } = await open(IntakePage, "/consultations/new?patientId=p-a");
    expect((wrapper.get("select").element as HTMLSelectElement).value).toBe("p-a");
    await router.push("/consultations/new");
    await flushPromises();
    expect((wrapper.get("select").element as HTMLSelectElement).value).toBe("");
  });
});
