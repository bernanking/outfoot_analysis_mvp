// jsdom은 window.scrollTo를 구현하지 않아 라우터 스크롤 복원 시 경고를 남기므로 테스트에서만 대체합니다.
window.scrollTo = () => undefined;
