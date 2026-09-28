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
  { id: "c-104", patientId: "p-d", date: "2026-09-17", round: 3, types: ["PAIN_INSOLE"], status: "ANALYSIS_REVIEW", questionnaire: "제출 완료", owner: "시술자 김", safety: "확인 완료", link: "제출 완료", image: "품질 확인 필요", analysis: "오래됨", result: "임시 초안" },
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
export const workPath = (item: PreviewConsultation) => `/consultations/${item.id}/${item.status === "INTAKE" ? "intake" : item.status === "QUESTIONNAIRE" ? "questionnaire" : item.status === "IN_VISIT" ? "visit" : item.status === "ANALYSIS_REVIEW" ? "analysis" : "result"}`;
