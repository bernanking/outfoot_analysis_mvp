import type { ConsultationStatus, ConcernType } from "@outfoot/contracts";

export interface PreviewPatient {
  id: string;
  name: string;
  phone: string;
  birth: string;
  sex: string;
  registered: string;
}

export interface PreviewConsultation {
  id: string;
  patientId: string;
  date: string;
  round: number;
  types: ConcernType[];
  status: ConsultationStatus;
  questionnaire: string;
  owner: string;
  safety: string;
  link: "미발급" | "활성" | "만료" | "제출 완료";
  image: string;
  analysis: string;
  result: string;
  /** 방문 시 시술자가 확인·추가한 유형의 합성 예시. 환자 원선택(types)은 바꾸지 않습니다. */
  confirmedTypes?: ConcernType[];
  deleted?: boolean;
  deletionReason?: string;
  deletedBy?: string;
  deletedAt?: string;
}

export const patients: PreviewPatient[] = [
  { id: "p-a", name: "합성 환자 가", phone: "010-****-1201", birth: "1984", sex: "여성", registered: "2026-09-01" },
  { id: "p-b", name: "합성 환자 나", phone: "010-****-5402", birth: "1972", sex: "남성", registered: "2026-08-20" },
  { id: "p-c", name: "합성 환자 다", phone: "010-****-7833", birth: "1990", sex: "여성", registered: "2026-08-02" },
  { id: "p-d", name: "합성 환자 라", phone: "010-****-2364", birth: "1968", sex: "남성", registered: "2026-07-17" },
  { id: "p-e", name: "합성 환자 마", phone: "010-****-8555", birth: "1987", sex: "여성", registered: "2026-07-01" },
];

export const consultations: PreviewConsultation[] = [
  { id: "c-106-deleted", patientId: "p-a", date: "2026-09-24", round: 2, types: [], status: "INTAKE", questionnaire: "미제출", owner: "시술자 김", safety: "미확인", link: "만료", image: "미등록", analysis: "미구성", result: "미작성", deleted: true, deletionReason: "합성 중복 접수 정리 예시", deletedBy: "관리자 박", deletedAt: "2026-09-24 11:00" },
  { id: "c-101", patientId: "p-a", date: "2026-09-23", round: 1, types: [], status: "INTAKE", questionnaire: "미제출", owner: "시술자 김", safety: "미확인", link: "활성", image: "미등록", analysis: "미구성", result: "미작성" },
  { id: "c-102", patientId: "p-b", date: "2026-09-22", round: 2, types: ["PAIN_INSOLE"], status: "QUESTIONNAIRE", questionnaire: "제출 완료", owner: "시술자 김", safety: "확인 필요", link: "제출 완료", image: "왼쪽만 등록", analysis: "입력 부족", result: "미작성" },
  { id: "c-103", patientId: "p-c", date: "2026-09-21", round: 1, types: ["NAIL", "PAIN_INSOLE"], status: "IN_VISIT", questionnaire: "제출 완료", owner: "시술자 이", safety: "확인 완료", link: "제출 완료", image: "좌우 등록 예시", analysis: "미구성", result: "미작성" },
  { id: "c-104", patientId: "p-d", date: "2026-09-17", round: 3, types: ["PAIN_INSOLE"], status: "ANALYSIS_REVIEW", questionnaire: "제출 완료", owner: "시술자 김", safety: "확인 완료", link: "제출 완료", image: "품질 확인 필요", analysis: "오래됨", result: "임시 초안", confirmedTypes: ["PAIN_INSOLE", "NAIL"] },
  { id: "c-105", patientId: "p-e", date: "2026-09-12", round: 1, types: ["NAIL"], status: "FINALIZED", questionnaire: "제출 완료", owner: "시술자 이", safety: "확인 완료", link: "제출 완료", image: "선택 사진 없음", analysis: "미구성", result: "보류 종결 예시" },
  { id: "c-102-prev", patientId: "p-b", date: "2026-08-25", round: 1, types: ["NAIL"], status: "FINALIZED", questionnaire: "제출 완료", owner: "시술자 김", safety: "없음", link: "제출 완료", image: "선택 사진 없음", analysis: "미구성", result: "보류 종결 예시" },
  { id: "c-104-prev-2", patientId: "p-d", date: "2026-08-18", round: 2, types: ["PAIN_INSOLE"], status: "FINALIZED", questionnaire: "제출 완료", owner: "시술자 김", safety: "확인 완료", link: "제출 완료", image: "미등록", analysis: "미구성", result: "보류 종결 예시" },
  { id: "c-104-prev-1", patientId: "p-d", date: "2026-07-19", round: 1, types: ["NAIL"], status: "FINALIZED", questionnaire: "제출 완료", owner: "시술자 이", safety: "없음", link: "제출 완료", image: "선택 사진 없음", analysis: "미구성", result: "보류 종결 예시" },
];

export const users = [
  { id: "u-kim", name: "시술자 김", login: "practitioner.kim", role: "시술자", status: "활성", recent: "2026-09-23" },
  { id: "u-lee", name: "시술자 이", login: "practitioner.lee", role: "시술자", status: "활성", recent: "2026-09-22" },
  { id: "u-admin", name: "관리자 박", login: "admin.park", role: "관리자", status: "활성", recent: "2026-09-23" },
  { id: "u-off", name: "시술자 최", login: "practitioner.choi", role: "시술자", status: "비활성", recent: "이력 없음" },
];

export const patientFor = (consultation: PreviewConsultation) => patients.find((patient) => patient.id === consultation.patientId)!;
export const consultationFor = (id: unknown) => consultations.find((item) => item.id === id);
export const patientById = (id: unknown) => patients.find((item) => item.id === id);
export const typeLabel = (types: ConcernType[]) => types.length === 0 ? "환자 미선택" : types.length === 2 ? "발톱 + 통증·인솔" : types[0] === "NAIL" ? "발톱" : "통증·인솔";
export const statusLabel: Record<ConsultationStatus, string> = {
  INTAKE: "접수",
  QUESTIONNAIRE: "사전질문",
  IN_VISIT: "방문상담",
  ANALYSIS_REVIEW: "분석 검토",
  FINALIZED: "종결",
};
// 진행 상태는 글자를 유지하면서 대기·진행·완료를 색으로 보조합니다. 주의(warning)는 주의신호에만 씁니다.
export const statusTone: Record<ConsultationStatus, "neutral" | "info" | "success"> = {
  INTAKE: "neutral",
  QUESTIONNAIRE: "neutral",
  IN_VISIT: "info",
  ANALYSIS_REVIEW: "info",
  FINALIZED: "success",
};
export const safetyTone = (safety: string): "neutral" | "warning" | "success" => safety === "미확인" || safety === "확인 필요" ? "warning" : safety === "확인 완료" ? "success" : "neutral";
export type WorkTab = "questionnaire" | "visit" | "media" | "analysis" | "result";
export const workTabs: Array<{ key: WorkTab; label: string }> = [
  { key: "questionnaire", label: "사전답변" }, { key: "visit", label: "방문상담" },
  { key: "media", label: "사진·발도장" }, { key: "analysis", label: "분석·보완" }, { key: "result", label: "최종결과" },
];
// 탭별 업무 상태는 각 탭의 합성 데이터(질문지·이미지·분석·결과)에서 따로 계산하는 예시입니다(T04B 제안).
// 상담 단계만으로 이전 탭을 모두 완료 처리하지 않고, 미등록·선택 항목·미구성·보완 필요를 완료와 구분합니다.
// 실제 기준은 기능 개발 때 확인값·저장 기록으로 계산하며, 새로운 진행 차단 규칙이 아닙니다.
export type TabProgressTone = "done" | "doing" | "todo" | "attention";
export interface TabProgress { label: string; tone: TabProgressTone }
const stageOrder: ConsultationStatus[] = ["INTAKE", "QUESTIONNAIRE", "IN_VISIT", "ANALYSIS_REVIEW", "FINALIZED"];
const reached = (item: PreviewConsultation, stage: ConsultationStatus) => stageOrder.indexOf(item.status) >= stageOrder.indexOf(stage);
// confirmedTypes를 넘기면 사진·발도장 탭의 필요 여부를 본문과 같은 시술자 확인 유형 기준으로 계산합니다.
export function tabProgress(item: PreviewConsultation, tab: WorkTab, confirmedTypes?: ConcernType[]): TabProgress {
  if (tab === "questionnaire") {
    if (item.questionnaire !== "제출 완료") return { label: "제출 대기", tone: "todo" };
    return reached(item, "IN_VISIT") ? { label: "확인 완료", tone: "done" } : { label: "확인 필요", tone: "doing" };
  }
  if (tab === "visit") {
    if (!reached(item, "IN_VISIT")) return { label: "시작 전", tone: "todo" };
    return item.status === "IN_VISIT" ? { label: "작성 중", tone: "doing" } : { label: "확인 완료", tone: "done" };
  }
  if (tab === "media") {
    const types = new Set([...item.types, ...(confirmedTypes ?? item.confirmedTypes ?? [])]);
    if (item.image === "좌우 등록 예시") return { label: "확인 완료", tone: "done" };
    if (item.image === "왼쪽만 등록") return { label: "한쪽 누락", tone: "attention" };
    if (item.image === "품질 확인 필요") return { label: "보완 필요", tone: "attention" };
    if (types.has("PAIN_INSOLE")) return { label: "미등록", tone: "todo" };
    if (types.has("NAIL")) return { label: "선택 항목", tone: "todo" };
    return { label: "유형 확인 전", tone: "todo" };
  }
  if (tab === "analysis") {
    if (item.analysis === "입력 부족") return { label: "보완 필요", tone: "attention" };
    if (item.analysis === "오래됨") return { label: "재실행 필요", tone: "attention" };
    return { label: "미구성", tone: "todo" };
  }
  if (item.status === "FINALIZED") return { label: "종결", tone: "done" };
  return item.result === "임시 초안" ? { label: "작성 중", tone: "doing" } : { label: "미작성", tone: "todo" };
}
export const workPath = (item: PreviewConsultation) => `/consultations/${item.id}/${item.status === "INTAKE" ? "intake" : item.status === "QUESTIONNAIRE" ? "questionnaire" : item.status === "IN_VISIT" ? "visit" : item.status === "ANALYSIS_REVIEW" ? "analysis" : "result"}`;
