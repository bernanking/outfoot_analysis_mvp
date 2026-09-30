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
  it("links breadcrumb parents and marks the current screen", async () => {
    const { wrapper } = await open(ConsultationWorkPage, "/consultations/c-103/visit");
    const crumb = wrapper.get('nav[aria-label="현재 위치"]');
    expect(crumb.findAll("a").map((link) => link.attributes("href"))).toEqual(["/consultations", "/patients/p-c"]);
    expect(crumb.get('[aria-current="page"]').text()).toBe("방문상담");
  });

  it("keeps page state examples inside collapsed preview tools", async () => {
    const { wrapper } = await open(ConsultationsPage, "/consultations");
    const tools = wrapper.get<HTMLDetailsElement>("details.preview-tools");
    expect(tools.element.open).toBe(false);
    expect(wrapper.get(".filter-bar").text()).not.toContain("상태 예시");
    await tools.get("select").setValue("ERROR");
    expect(wrapper.get('[role="alert"]').text()).toContain("목록 조회 오류 상태 예시");
    expect(tools.text()).toContain("화면 시안 · 합성 데이터");
  });

  it("clears administrator selection and search when switching sections in either direction", async () => {
    const { wrapper, router } = await open(AdminPage, "/admin/users", "ADMIN");
    await wrapper.get('input[type="search"]').setValue("시술자 김");
    await wrapper.get("button.text-button").trigger("click");
    expect(wrapper.get('[role="dialog"]').text()).toContain("시술자 김 계정 관리");
    await router.push("/admin/records/consultations");
    await flushPromises();
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
    expect((wrapper.get('input[type="search"]').element as HTMLInputElement).value).toBe("");
    await wrapper.findAll("tbody tr").find((row) => row.text().includes("합성 환자 가 · 1회"))!.get("button.text-button").trigger("click");
    const confirm = wrapper.get('[role="dialog"]');
    expect(confirm.text()).toContain("상담 삭제 확인");
    expect(confirm.text()).toContain("합성 환자 가");
    expect(confirm.text()).toContain("1회 · 2026-09-23");
    await router.push("/admin/users");
    await flushPromises();
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
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
    const info = wrapper.get('[role="dialog"]');
    expect(info.text()).toContain("상담 삭제 정보");
    expect(info.text()).toContain("관리자 박");
    expect(info.text()).toContain("2026-09-24 11:00");
    expect(info.text()).not.toContain("상담 삭제 확인");
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
    expect(editable.wrapper.get(".context-strip").text()).toContain("담당 시술자 김 · 수정 가능");
    expect(editable.wrapper.text()).not.toContain("조회 전용 · 담당자만 수정할 수 있습니다");
    const admin = await open(ConsultationWorkPage, "/consultations/c-101/result", "ADMIN");
    expect(admin.wrapper.text()).toContain("최종확정 권한 없음");
  });

  it("distinguishes optional, required, and unknown footprint status", async () => {
    // 좌우 발도장 칸을 묶는 영역 제목 옆에 한 번만 표시합니다.
    const requirement = (wrapper: ReturnType<typeof mount>) => wrapper.get('section[aria-labelledby="footprint-title"] .surface-heading .status-badge').text();
    const nail = await open(ConsultationWorkPage, "/consultations/c-105/media");
    expect(requirement(nail.wrapper)).toBe("발도장 선택");
    const pain = await open(ConsultationWorkPage, "/consultations/c-102/media");
    expect(requirement(pain.wrapper)).toBe("발도장 기본 필요");
    expect(pain.wrapper.findAll('section[aria-labelledby="footprint-title"] .media-slot')).toHaveLength(2);
    const unknown = await open(ConsultationWorkPage, "/consultations/c-101/media");
    expect(requirement(unknown.wrapper)).toBe("발도장 유형 확인 후 결정");
  });

  it("keeps unconfigured analysis and no-measurement example visible", async () => {
    const analysis = await open(ConsultationWorkPage, "/consultations/c-101/analysis");
    expect(analysis.wrapper.text()).toContain("발도장 분석 방식 준비 중");
    expect(analysis.wrapper.text()).toContain("측정값 없음");
    expect(analysis.wrapper.text()).not.toMatch(/\d+(\.\d+)?\s?(mm|점|%)/);
    await analysis.wrapper.get(".run-history select").setValue("STRUCTURE");
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
    expect(wrapper.get(".candidate-row").text()).toContain("합성 환자 가");
    expect(wrapper.get(".candidate-row").text()).toContain("새 상담은 2회차");
    await router.push("/consultations/new");
    await flushPromises();
    expect(wrapper.find(".candidate-row").exists()).toBe(false);
    expect(wrapper.findAll('input[name="intake-patient"]').some((input) => (input.element as HTMLInputElement).checked)).toBe(false);
    expect(wrapper.get(".action-bar").text()).toContain("환자를 선택해 주세요");
  });
});

describe("T04B registration, intake, and admin flows", () => {
  it("searches patients in intake and lets a preselected patient be changed", async () => {
    const { wrapper } = await open(IntakePage, "/consultations/new?patientId=p-b");
    await wrapper.get(".candidate-row button").trigger("click");
    await wrapper.get('input[type="search"]').setValue("7833");
    expect(wrapper.find('a[href="/patients/new?from=intake"]').exists()).toBe(true);
    const options = wrapper.findAll('input[name="intake-patient"]');
    expect(options).toHaveLength(1);
    await options[0].setValue(true);
    expect(wrapper.get(".candidate-row").text()).toContain("합성 환자 다");
  });

  it.each([
    ["NONE", "질문지 링크 발급"], ["ACTIVE", "링크 복사"], ["EXPIRED", "새 링크 발급"], ["REVOKED", "새 링크 발급"], ["SUBMITTED", "사전답변 확인"],
  ])("shows one primary action for the %s link state", async (state, action) => {
    const { wrapper } = await open(IntakePage, "/consultations/c-101/intake");
    await wrapper.get("details.preview-tools select").setValue(state);
    const primary = wrapper.get(".link-card .primary-button, .link-card .primary-link");
    expect(primary.text()).toContain(action);
    expect(wrapper.findAll(".link-card .primary-button, .link-card .primary-link")).toHaveLength(1);
  });

  it("returns registration opened from intake to the intake flow", async () => {
    const { wrapper } = await open(PatientsPage, "/patients/new?from=intake");
    expect(wrapper.get(".action-bar .primary-button").text()).toContain("등록 후 상담 접수 계속");
    expect(wrapper.get(".action-bar a").attributes("href")).toBe("/consultations/new");
    await wrapper.get('input[value="AGE"]').setValue(true);
    expect(wrapper.text()).toContain("현재 나이");
    const general = await open(PatientsPage, "/patients/new");
    expect(general.wrapper.get(".action-bar .primary-button").text()).toContain("환자 등록");
    expect(general.wrapper.get(".action-bar a").attributes("href")).toBe("/patients");
  });

  it("hides deleted consultations from practitioners and marks them for administrators", async () => {
    const practitioner = await open(IntakePage, "/consultations/c-106-deleted/intake");
    expect(practitioner.router.currentRoute.value.path).toBe("/404");
    const admin = await open(IntakePage, "/consultations/c-106-deleted/intake", "ADMIN");
    expect(admin.router.currentRoute.value.path).toBe("/consultations/c-106-deleted/intake");
    expect(admin.wrapper.text()).toContain("삭제된 상담 · 조회 전용");
  });

  it("focuses the dialog title, closes on Escape, and returns focus to the row action", async () => {
    const { wrapper } = await open(AdminPage, "/admin/users", "ADMIN");
    const trigger = wrapper.get<HTMLButtonElement>('button[aria-label="시술자 이 계정 관리"]');
    trigger.element.focus();
    await trigger.trigger("click");
    await flushPromises();
    const dialog = wrapper.get('[role="dialog"]');
    expect(dialog.attributes("aria-modal")).toBe("true");
    expect(document.activeElement?.textContent).toBe("시술자 이 계정 관리");
    expect(dialog.text()).toContain("practitioner.lee");
    expect(dialog.text()).toContain("계정 사용 중지");
    expect(dialog.text()).toContain("비밀번호 초기화");
    await dialog.trigger("keydown", { key: "Escape" });
    await flushPromises();
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
    expect(document.activeElement).toBe(trigger.element);
  });
});
