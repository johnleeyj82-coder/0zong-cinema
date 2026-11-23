/**
 * store.js: 마라톤 상태 (zustand, 기기 안에 저장)
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEFAULT_CGV, CGV_CODES, DEFAULT_MEGA, DEFAULT_INDIE } from './theaters.js'
import { ymd } from './providers.js'

export const today = () => ymd(new Date(), '-')
const addDays = (d, n) => { const x = new Date(d + 'T00:00:00'); x.setDate(x.getDate() + n); return ymd(x, '-') }

/** 기본 가능 시간: 종일(첫 회부터 다음 날 새벽 막차까지). 분 단위 [from, to] */
export const FULL_DAY = [0, 30 * 60]
export const isFullDay = w => w.length === 1 && w[0][0] === FULL_DAY[0] && w[0][1] === FULL_DAY[1]
export const defaultWindows = () => [[...FULL_DAY]]
export const MAX_DAYS = 7

export const useMarathon = create(persist((set, get) => ({
  /* 설정 */
  days: 3,                   // 오늘부터 며칠 (1~7)
  windows: {},               // { 'YYYY-MM-DD': [[from,to], ...] }
  cgvPicked: DEFAULT_CGV,    // 지점 이름
  cgvCodes: CGV_CODES,       // 이름 → siteNo (빠진 건 API에서 채움)
  mega: DEFAULT_MEGA,
  cineqOn: true,
  indie: DEFAULT_INDIE,      // 디트릭스 극장 코드
  tmdbKey: '',
  onlyRecent: false,         // 최근 2주 안 개봉작만
  pinned: [],                // 고정한 극장 theaterId (비어 있으면 전체)
  mode: 'film',              // film | time

  /* 데이터 */
  sessions: [],
  source: 'none',            // live | snapshot | none
  dayAt: {},                 // 'YYYY-MM-DD' → { at, sig } 마지막으로 불러온 때
  dayErr: {},                // 'YYYY-MM-DD' → 못 불러온 극장 이름들
  films: {},                 // key → { title, poster, release, tmdbId }
  hidden: [],                // 안 볼 영화 key

  /* 장바구니와 채점 */
  cart: [],                  // 세션 객체
  rated: {},                 // sessionId → { recordId, total, star }

  set: patch => set(patch),
  dates: () => { const n = Math.max(1, Math.min(MAX_DAYS, get().days || 3)); const t = today(); return Array.from({ length: n }, (_, i) => addDays(t, i)) },
  /** 하루치 불러온 결과 합치기: 성공한 극장만 바꾸고, 실패한 극장은 예전 회차를 둬요 */
  mergeDay: (date, ok, failed, sig) => set(s => {
    const t = today()
    const keep = s.sessions.filter(x => x.date >= t && !x.theaterId.startsWith('snap:') && !(x.date === date && ok.has(x.theaterId)))
    return {
      sessions: [...keep, ...[...ok.values()].flat()], source: 'live',
      dayAt: { ...s.dayAt, [date]: { at: Date.now(), sig } }, dayErr: { ...s.dayErr, [date]: failed },
    }
  }),
  windowsOf: d => get().windows[d] || defaultWindows(d),
  setWindows: (d, w) => set(s => ({ windows: { ...s.windows, [d]: w } })),
  togglePin: id => set(s => ({ pinned: s.pinned.includes(id) ? s.pinned.filter(x => x !== id) : [...s.pinned, id] })),
  toggleHidden: key => set(s => ({ hidden: s.hidden.includes(key) ? s.hidden.filter(k => k !== key) : [...s.hidden, key] })),
  addCart: sess => set(s => ({ cart: s.cart.some(c => c.id === sess.id) ? s.cart : [...s.cart, sess] })),
  removeCart: id => set(s => ({ cart: s.cart.filter(c => c.id !== id) })),
  clearCart: () => set({ cart: [] }),
  markRated: (id, info) => set(s => ({ rated: { ...s.rated, [id]: info } })),
}), {
  name: '0zong-marathon', version: 2,
  partialize: ({ dayAt, ...rest }) => rest, // eslint-disable-line no-unused-vars
  migrate: (old, v) => {
    if (v < 2) {
      const { start, dtryx, fetchedAt, fetchErrors, cineq, ...rest } = old || {} // eslint-disable-line no-unused-vars
      return { ...rest, days: 3, windows: {}, sessions: [], source: 'none', cineqOn: true, indie: DEFAULT_INDIE, cgvCodes: { ...CGV_CODES, ...(old?.cgvCodes || {}) } }
    }
    return old
  },
}))
