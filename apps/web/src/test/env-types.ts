// 타입 검사 전용 파일입니다(번들·테스트 실행에 쓰지 않음). npm run typecheck가 실제 사용 지점의 환경변수 타입을 확인합니다.
// 선언이 전역에 병합되지 않아 any가 되면 아래 @ts-expect-error가 "오류 없음"으로 실패합니다.
const apiBaseUrl: string | undefined = import.meta.env.VITE_API_BASE_URL;
// @ts-expect-error VITE_API_BASE_URL은 string | undefined여야 하며 number에 대입할 수 없습니다.
const notNumber: number = import.meta.env.VITE_API_BASE_URL;
const routeTitle: string | undefined = ({} as import("vue-router").RouteMeta).title;

export { apiBaseUrl, notNumber, routeTitle };
