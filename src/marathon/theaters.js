/**
 * theaters.js: 극장 목록과 기본 선택값
 * CGV는 지점 목록을 API로 불러오고, 여기서는 기본으로 켤 지점 이름만 둬요.
 */

export const DEFAULT_CGV = [
  '용산아이파크몰', '씨네드쉐프 용산', '영등포타임스퀘어', '홍대',
  '신촌아트레온', '연남', '여의도', '구로', '불광',
]

/** 메가박스 지점 번호 (brchNo). 설정에서 번호로 더 추가할 수 있어요. */
export const DEFAULT_MEGA = [
  { code: '1581', name: '메가박스 목동' },
  { code: '1211', name: '메가박스 상암월드컵경기장' },
  { code: '1212', name: '메가박스 홍대' },
]

export const DEFAULT_CINEQ = [{ code: '1001', name: '씨네Q 신도림' }]

/** 디트릭스(독립영화관 예매 시스템) 극장 */
export const DEFAULT_DTRYX = [
  {
    brand: 'spacedog', code: '000072', name: '라이카시네마',
    cgid: 'FE8EF4D2-F22D-4802-A39A-D58F23A29C1E',
  },
]

export const BOOKING_URL = {
  cgv: () => 'https://cgv.co.kr/cnm/movieBook/cinema',
  mega: t => `https://www.megabox.co.kr/theater/time?brchNo=${t.code}`,
  cineq: t => `https://www.cineq.co.kr/Theater/Movie?TheaterCode=${t.code}`,
  dtryx: t => `https://www.dtryx.com/cinema/main.do?cgid=${t.cgid}&BrandCd=${t.brand}&CinemaCd=${t.code}`,
}
