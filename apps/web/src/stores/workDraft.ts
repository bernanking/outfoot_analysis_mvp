import { defineStore } from "pinia";
import { reactive } from "vue";
import type { ConcernType } from "@outfoot/contracts";
import { consultationFor } from "../data/preview";

// 상담 작업 탭의 입력을 상담별로 보관하는 정적 시안용 로컬 상태입니다. 실제 저장·서버 전송은 하지 않습니다.
// 탭이나 결과 보기를 바꿔도 입력이 남고, 다른 상담의 입력과 섞이지 않습니다.
export interface WorkDraft {
  /** 시술자 확인 유형. 환자 원선택은 항상 포함하며 원선택 자체는 바꾸지 않습니다. */
  confirmedTypes: ConcernType[];
  visit: {
    v02: string; change: string; v04: string;
    safety: Record<string, { value: string; memo: string }>;
    v06: string; v07: string; shoeSize: string; pressure: string; v08: string;
    nv01: string; nv02: string; nv03: string[];
    pv01: string; pv02Now: string; pv02Max: string; pv07Left: string; pv07Right: string; pv07Unmeasured: boolean;
    v09Fact: string; v09Judgement: string;
    decision: string; decisionReason: string; decisionSafety: string;
  };
  result: {
    conclusion: string; reason: string; safetyGuide: string; confirmer: string; careDirection: string;
    customerGuide: string; internalMemo: string; followUp: "DATE" | "UNDECIDED"; followDate: string; followReason: string;
  };
  media: { exceptionReason: string; exceptionMemo: string };
  analysis: { override: string; overrideReason: string };
}

export const safetyQuestionIds = ["C05", "C06", "C08"] as const;
const typeOrder: ConcernType[] = ["NAIL", "PAIN_INSOLE"];

export function initialDraft(consultationId: string): WorkDraft {
  const item = consultationFor(consultationId);
  const patientTypes = item?.types ?? [];
  const confirmed = new Set<ConcernType>([...patientTypes, ...(item?.confirmedTypes ?? [])]);
  return {
    confirmedTypes: typeOrder.filter((type) => confirmed.has(type)),
    visit: {
      v02: "", change: "", v04: "",
      safety: Object.fromEntries(safetyQuestionIds.map((id) => [id, { value: "미확인", memo: "" }])),
      v06: "", v07: "", shoeSize: "", pressure: "", v08: "",
      nv01: "", nv02: "", nv03: [],
      pv01: "", pv02Now: "", pv02Max: "", pv07Left: "", pv07Right: "", pv07Unmeasured: false,
      v09Fact: "", v09Judgement: "",
      decision: "", decisionReason: "", decisionSafety: "",
    },
    result: {
      conclusion: "", reason: "", safetyGuide: "", confirmer: "", careDirection: "",
      customerGuide: "", internalMemo: "", followUp: "DATE", followDate: "", followReason: "",
    },
    media: { exceptionReason: "", exceptionMemo: "" },
    analysis: { override: "", overrideReason: "" },
  };
}

// 체크박스 선택 순서만 다른 경우를 변경으로 보지 않도록 문자열 배열은 정렬해 비교합니다.
const normalized = (value: unknown): string => JSON.stringify(value, (_key, item: unknown) => Array.isArray(item) && item.every((entry) => typeof entry === "string") ? [...item].sort() : item);

export const useWorkDraftStore = defineStore("workDraft", () => {
  const drafts = reactive<Record<string, WorkDraft>>({});
  function ensure(consultationId: string): void {
    if (!drafts[consultationId]) drafts[consultationId] = initialDraft(consultationId);
  }
  function isDirty(consultationId: string): boolean {
    const draft = drafts[consultationId];
    return Boolean(draft) && normalized(draft) !== normalized(initialDraft(consultationId));
  }
  function reset(consultationId: string): void {
    drafts[consultationId] = initialDraft(consultationId);
  }
  function toggleConfirmedType(consultationId: string, type: ConcernType, checked: boolean): void {
    const draft = drafts[consultationId];
    const patientTypes = consultationFor(consultationId)?.types ?? [];
    if (!draft || patientTypes.includes(type)) return;
    const next = new Set(draft.confirmedTypes);
    if (checked) next.add(type); else next.delete(type);
    draft.confirmedTypes = typeOrder.filter((item) => next.has(item));
  }
  return { drafts, ensure, isDirty, reset, toggleConfirmedType };
});
