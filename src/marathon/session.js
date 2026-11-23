/** session.js: 회차 시간 계산과 극장 목록 만들기 */
import { cgvSites } from './providers.js'
import { INDIE, CINEQ, shortName } from './theaters.js'

export const endOf = s => s.en ?? s.st + 130
export const nowMin = () => { const n = new Date(); return { date: `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`, m: n.getHours() * 60 + n.getMinutes() } }
export const isOver = s => { const { date, m } = nowMin(); return s.date < date || (s.date === date && endOf(s) <= m) }
/** 이미 시작한 회차 */
export const isStarted = s => { const { date, m } = nowMin(); return s.date < date || (s.date === date && s.st <= m) }

/** 지금 설정으로 고른 극장들 (CGV는 번호를 아는 지점만) */
export function theaterList(st) {
  const codes = st.cgvCodes || {}
  return [
    ...st.cgvPicked.filter(n => codes[n]).map(n => ({ id: `cgv:${codes[n]}`, chain: 'cgv', code: codes[n], name: n.startsWith('씨네드쉐프') ? n : `CGV ${n}`, area: shortName('cgv', n) })),
    ...st.mega.map(t => ({ ...t, id: `mega:${t.code}`, chain: 'mega', area: shortName('mega', t.name) })),
    ...CINEQ.filter(() => st.cineqOn).map(t => ({ ...t, id: `cineq:${t.code}`, chain: 'cineq', area: shortName('cineq', t.name) })),
    ...INDIE.filter(t => st.indie.includes(t.code)).map(t => ({ ...t, id: `dtryx:${t.code}`, chain: 'dtryx', area: t.name })),
  ]
}

/** 극장 선택을 한 줄로: 바뀌었는지 비교할 때 써요 */
export const pickSig = st => [st.cgvPicked.join(','), st.mega.map(t => t.code).join(','), st.cineqOn ? 'q' : '', st.indie.join(',')].join('|')

/** CGV 지점번호가 빠진 게 있으면 API로 채운 뒤 극장 목록을 돌려줘요 */
export async function buildTheaters(st) {
  const missing = st.cgvPicked.filter(n => !st.cgvCodes[n])
  if (missing.length) {
    try {
      const regions = await cgvSites()
      const codes = { ...st.cgvCodes }
      regions.forEach(r => r.sites.forEach(s => { codes[s.name] = s.code }))
      st.set({ cgvCodes: codes })
      return { list: theaterList({ ...st, cgvCodes: codes }), unknown: missing.filter(n => !codes[n]) }
    } catch { /* CGV 목록을 못 받으면 아는 지점만 써요 */ }
  }
  return { list: theaterList(st), unknown: missing.filter(n => !st.cgvCodes[n]) }
}
