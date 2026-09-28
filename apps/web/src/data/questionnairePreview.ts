export interface PreviewQuestion {
  id: string;
  label: string;
  required: boolean;
  options?: string[];
  multiple?: boolean;
  note?: string;
}

const none = "없음";
const unknown = "모름";
export const toeOptions = ["L1 · 왼쪽 엄지", "L2 · 왼쪽 둘째", "L3 · 왼쪽 셋째", "L4 · 왼쪽 넷째", "L5 · 왼쪽 새끼", "R1 · 오른쪽 엄지", "R2 · 오른쪽 둘째", "R3 · 오른쪽 셋째", "R4 · 오른쪽 넷째", "R5 · 오른쪽 새끼"];
export const scoreOptions = Array.from({ length: 11 }, (_, index) => `${index}`);

const questionDefinitions: Record<string, Omit<PreviewQuestion, "required">[]> = {
  "상담 내용": [
    { id: "C02", label: "가장 불편한 점" },
    { id: "C03", label: "시작 시점", options: ["1주 이내", "1개월 이내", "1~3개월", "3~12개월", "1년 이상", unknown] },
    { id: "C04", label: "현재 불편 정도", options: scoreOptions, note: "0은 불편 없음, 10은 가장 심한 상태를 뜻합니다." },
  ],
  "안전 확인": [
    { id: "C05", label: "출혈·고름·상처·심한 붓기·열감", options: [none, "출혈", "고름", "상처", "심한 붓기", "열감"], multiple: true },
    { id: "C06", label: "갑작스러운 색·온도 변화 또는 체중부하 어려움", options: [none, "색 변화", "온도 변화", "체중부하 어려움"], multiple: true },
    { id: "C07", label: "최근 외상·골절 의심", options: ["예", "아니오", unknown] },
    { id: "C08", label: "진단·치료 중 건강상태", options: [none, "당뇨", "감각저하", "순환 문제", "면역 관련", "출혈 관련", "기타", unknown], multiple: true },
    { id: "C09", label: "관련 복용약", options: [none, "항응고·항혈소판", "스테로이드·면역억제", "항진균", "기타", unknown], multiple: true },
    { id: "C10", label: "발·발목·하지 수술·입원·큰 외상", options: [none, "있음", unknown] },
  ],
  "생활과 목표": [
    { id: "C11", label: "주로 신는 신발", options: ["운동화", "구두", "안전화", "등산화", "슬리퍼", "기타"], multiple: true },
    { id: "C12", label: "하루 서기·걷기 시간", options: ["2시간 미만", "2~4시간", "4~8시간", "8시간 이상", unknown] },
    { id: "C13", label: "상담 목표", options: ["불편 줄이기", "상태 확인", "신발 상담", "인솔 상담", "관리 방법", "기타"], multiple: true, note: "유형별 선택지 확정 전" },
  ],
  "발톱 질문": [
    { id: "N01", label: "불편한 발톱", options: toeOptions, multiple: true, note: "좌우와 발가락 번호를 구분합니다. 대표 발톱은 방문 시 다시 확인합니다." },
    { id: "N02", label: "현재 불편", options: ["통증", "눌림", "붉음", "붓기", "출혈", "고름·진물", "냄새", "가려움", "외관만"], multiple: true },
    { id: "N03", label: "발톱 변화", options: ["두꺼움", "변색", "들뜸", "갈라짐", "부스러짐", "말림", "눌림", "검붉음", "기타"], multiple: true },
    { id: "N04", label: "이후 변화", options: ["호전", "악화", "반복", "변화 없음", unknown] },
    { id: "N05", label: "통증 유발", options: ["신발", "걷기·운동", "누름", "휴식", "정리 후", "기타"], multiple: true, note: "N02에서 통증을 고르면 확인하는 문항입니다." },
    { id: "N06", label: "최근 발톱 외상", options: ["예", "아니오", unknown] },
    { id: "N07", label: "발톱 정리 습관", options: ["일자", "둥글게", "양옆 깊게", "뜯음", "전문관리", "기타"] },
    { id: "N08", label: "자가 처치", options: [none, "파냄", "도구", "약·제품", "민간요법", "기타"], multiple: true },
    { id: "N09", label: "진균 검사·진단", options: [none, "검사 음성", "검사 확인", "진단만 들음", unknown] },
    { id: "N10", label: "이전 관리·치료", options: [none, "먹는약", "바르는약", "레이저", "교정", "스케일링", "수술·제거", "민간요법"], multiple: true },
    { id: "N11", label: "동반 피부 변화", options: [none, "가려움", "벗겨짐", "수포", "갈라짐", "짓무름", "냄새"], multiple: true },
    { id: "N12", label: "땀·습기", options: ["전혀", "가끔", "자주", "매우 자주", unknown] },
    { id: "N13", label: "신발 앞부분", options: ["넉넉", "적당", "발가락 닿음", "양옆 눌림", unknown] },
  ],
  "통증·인솔 질문": [
    { id: "P01", label: "불편 부위", options: ["왼쪽 발가락", "왼쪽 발바닥", "왼쪽 뒤꿈치", "왼쪽 발목", "오른쪽 발가락", "오른쪽 발바닥", "오른쪽 뒤꿈치", "오른쪽 발목", "기타"], multiple: true },
    { id: "P02", label: "대표 불편 부위", note: "P01에서 고른 부위 중 하나를 방문 시 확인합니다." },
    { id: "P03", label: "시작 양상", options: ["갑자기", "서서히", "외상", "운동 증가", "신발 변경", unknown] },
    { id: "P04", label: "느낌", options: ["찌름", "욱신", "화끈", "저림", "당김", "뻣뻣", "피로", "불안정", "기타"], multiple: true },
    { id: "P05", label: "가장 심할 때 불편 정도", options: scoreOptions, note: "현재 불편 정도(C04)와 별도로 기록합니다." },
    { id: "P06", label: "유발 상황", options: ["첫발", "서기", "걷기", "달리기·운동", "계단", "휴식", "하루 말", "특정 신발"], multiple: true },
    { id: "P07", label: "휴식 반응", options: ["호전", "일부 호전", "차이 없음", "악화", unknown] },
    { id: "P08", label: "붓기·열감·멍·변색·감각", options: [none, "붓기", "열감", "멍", "변색", "감각 변화"], multiple: true },
    { id: "P09", label: "활동 제한", options: [none, "업무", "보행", "운동", "수면", "기타"], multiple: true },
    { id: "P10", label: "관련 검사·진단", options: [none, "X-ray", "초음파", "MRI", "기타", unknown], multiple: true },
    { id: "P11", label: "평소 활동", options: ["걷기", "달리기", "운동", "장시간 서기", "기타"], multiple: true, note: "주당 횟수를 함께 적을 수 있습니다." },
    { id: "P12", label: "신발 사이즈·알고 있는 발길이", note: "mm 또는 모름. 환자가 알고 있는 값이며 실제 측정 결과가 아닙니다." },
    { id: "P13", label: "신발 불편", options: [none, "앞쪽", "뒤꿈치 들림", "발등", "한쪽 마모", "안·바깥 쏠림", "기타"], multiple: true },
    { id: "P14", label: "인솔 경험", options: [none, "기성 인솔", "맞춤 인솔"] },
    { id: "P15", label: "목표 신발", options: ["운동화", "구두", "안전화", "등산화", "골프화", "기타"], note: "인솔 상담 목표를 선택했을 때 확인합니다." },
  ],
};

const optionalQuestionIds = new Set(["C09", "C12", "N11", "N12", "P07", "P11", "P12"]);
export const previewQuestions: Record<string, PreviewQuestion[]> = Object.fromEntries(
  Object.entries(questionDefinitions).map(([step, questions]) => [step, questions.map((question) => ({ ...question, required: !optionalQuestionIds.has(question.id) }))]),
);

export function toggleExclusiveChoice(current: string[], option: string): string[] {
  if (current.includes(option)) return current.filter((value) => value !== option);
  if (option === none) return [none];
  return [...current.filter((value) => value !== none), option];
}
