/**
 * store.js: 마라톤 상태 (zustand, 기기 안에 저장)
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEFAULT_CGV, DEFAULT_MEGA, DEFAULT_CINEQ, DEFAULT_DTRYX } from './theaters.js'
import { ymd } from './providers.js'

const today = () => ymd(new Date(), '-')
const addDays = (d, n) => { const x = new Date(d + 'T00:00:00'); x.setDate(x.getDate() + n); return ymd(x, '-') }

/** 기본 가능 시간: 평일은 아침(07:00-09:50) + 저녁, 주말은 종일. 분 단위 [from, to] */
export function defaultWindows(date) {
  const wd = new Date(date + 'T00:00:00').getDay()
  if (wd === 0 || wd === 6) return [[9 * 60, 27 * 60]]
  return [[7 * 60, 9 * 60 + 50], [14 * 60, 27 * 60]]
}

export const useMarathon = create(persist((set, get) => ({
  /* 설정 */
  start: today(),
  days: 7,
  windows: {},               // { 'YYYY-MM-DD': [[from,to], ...] }
  cgvPicked: DEFAULT_CGV,    // 지점 이름
  cgvCodes: {},              // 이름 → siteNo (API에서 채움)
  mega: DEFAULT_MEGA,
  cineq: DEFAULT_CINEQ,
  dtryx: DEFAULT_DTRYX,
  tmdbKey: '',
  onlyRecent: false,         // 최근 2주 안 개봉작만

  /* 데이터 */
  sessions: [],
  fetchedAt: null,
  source: 'none',            // live | snapshot | none
  fetchErrors: [],
  films: {},                 // key → { title, poster, release, tmdbId }
  hidden: [],                // 안 볼 영화 key

  /* 장바구니와 채점 */
  cart: [],                  // 세션 객체
  rated: {},                 // sessionId → { recordId, total, star }

  set: patch => set(patch),
  dates: () => { const s = get(); return Array.from({ length: s.days }, (_, i) => addDays(s.start, i)) },
  windowsOf: d => get().windows[d] || defaultWindows(d),
  setWindows: (d, w) => set(s => ({ windows: { ...s.windows, [d]: w } })),
  toggleHidden: key => set(s => ({ hidden: s.hidden.includes(key) ? s.hidden.filter(k => k !== key) : [...s.hidden, key] })),
  addCart: sess => set(s => ({ cart: s.cart.some(c => c.id === sess.id) ? s.cart : [...s.cart, sess] })),
  removeCart: id => set(s => ({ cart: s.cart.filter(c => c.id !== id) })),
  clearCart: () => set({ cart: [] }),
  markRated: (id, info) => set(s => ({ rated: { ...s.rated, [id]: info } })),
}), { name: '0zong-marathon', version: 1 }))
