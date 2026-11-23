/**
 * theaters.js: 극장 목록, 체인 색, 기본 선택값
 * CGV는 지점 목록을 API로 불러오고, 자주 쓰는 지점 번호는 여기 미리 둬요(목록을 못 받아도 바로 불러오게).
 */

/** 체인 표시: 이름표 글자와 색 */
export const CHAINS = {
  cgv: { label: 'CGV', short: 'CGV', color: '#e5483d' },
  mega: { label: '메가박스', short: '메가', color: '#9b7bea' },
  cineq: { label: '씨네Q', short: '씨네Q', color: '#2fb5a3' },
  dtryx: { label: '독립·예술영화관', short: '독립', color: '#9ac46b' },
}
export const CHAIN_ORDER = ['cgv', 'mega', 'cineq', 'dtryx']

export const DEFAULT_CGV = [
  '용산아이파크몰', '씨네드쉐프 용산', '영등포타임스퀘어', '홍대',
  '신촌아트레온', '연남', '여의도', '구로', '불광',
]
/** 이름 → 지점번호(siteNo). 비어 있는 지점은 API로 찾아 채워요. */
export const CGV_CODES = {
  '용산아이파크몰': '0013', '영등포타임스퀘어': '0059', '홍대': '0191',
  '신촌아트레온': '0150', '연남': '0292', '여의도': '0112', '구로': '0010',
}

/** 메가박스 지점 번호 (brchNo). 설정에서 번호로 더 추가할 수 있어요. */
export const DEFAULT_MEGA = [
  { code: '1581', name: '메가박스 목동' },
  { code: '1211', name: '메가박스 상암월드컵경기장' },
  { code: '1212', name: '메가박스 홍대' },
]

export const CINEQ = [{ code: '1001', name: '씨네Q 신도림' }]

/** 디트릭스(독립·예술영화관 공용 예매 시스템)를 쓰는 서울 극장 */
export const INDIE = [
  { brand: 'spacedog', code: '000072', name: '라이카시네마', where: '연희동', cgid: 'FE8EF4D2-F22D-4802-A39A-D58F23A29C1E' },
  { brand: 'indieart', code: '000067', name: '아트하우스모모', where: '이대' },
  { brand: 'indieart', code: '000069', name: '에무시네마', where: '광화문' },
  { brand: 'indieart', code: '000065', name: '더숲아트시네마', where: '노원' },
  { brand: 'etc', code: '000088', name: '아리랑시네센터', where: '성북' },
  { brand: 'etc', code: '000115', name: '허리우드클래식', where: '종로' },
  { brand: 'etc', code: '000113', name: '낭만극장', where: '종로' },
]
export const DEFAULT_INDIE = ['000072', '000067', '000069']

export const BOOKING_URL = {
  cgv: () => 'https://cgv.co.kr/cnm/movieBook/cinema',
  mega: t => `https://www.megabox.co.kr/theater/time?brchNo=${t.code}`,
  cineq: t => `https://www.cineq.co.kr/Theater/Movie?TheaterCode=${t.code}`,
  dtryx: t => `https://www.dtryx.com/cinema/main.do?${t.cgid ? `cgid=${t.cgid}&` : ''}BrandCd=${t.brand}&CinemaCd=${t.code}`,
}

/** 화면에 쓸 짧은 지점 이름: '영등포타임스퀘어' → '영등포' */
export const shortName = (chain, name) => chain === 'dtryx' ? name
  : name.replace(/^(CGV|메가박스|씨네Q)\s*/, '').replace('아이파크몰', '').replace('타임스퀘어', '').replace('월드컵경기장', '').trim()
