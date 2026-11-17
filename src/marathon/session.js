/** session.js: 회차 시간 계산과 극장 목록 만들기 */
import { cgvSites } from './providers.js'

export const endOf = s => s.en ?? s.st + 130
export const nowMin = () => { const n = new Date(); return { date: `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`, m: n.getHours() * 60 + n.getMinutes() } }
export const isOver = s => { const { date, m } = nowMin(); return s.date < date || (s.date === date && endOf(s) <= m) }
const areaOf = name => name.replace(/^(CGV|메가박스|씨네Q)\s*/, '').replace('아이파크몰', '').replace('타임스퀘어', '').replace('월드컵경기장', '').trim()

/** 설정에 맞는 극장 목록 만들기 (CGV는 이름 → 지점번호를 API로 확인) */
export async function buildTheaters(st) {
  let codes = st.cgvCodes
  const missing = st.cgvPicked.filter(n => !codes[n])
  if (missing.length) {
    try {
      const regions = await cgvSites()
      codes = { ...codes }
      regions.forEach(r => r.sites.forEach(s => { codes[s.name] = s.code }))
      st.set({ cgvCodes: codes })
    } catch { /* CGV 목록을 못 받으면 아는 지점만 써요 */ }
  }
  return [
    ...st.cgvPicked.filter(n => codes[n]).map(n => ({ id: `cgv:${codes[n]}`, chain: 'cgv', code: codes[n], name: n.startsWith('씨네드쉐프') ? n : `CGV ${n}`, area: areaOf(n) })),
    ...st.mega.map(t => ({ ...t, id: `mega:${t.code}`, chain: 'mega', area: areaOf(t.name) })),
    ...st.cineq.map(t => ({ ...t, id: `cineq:${t.code}`, chain: 'cineq', area: areaOf(t.name) })),
    ...st.dtryx.map(t => ({ ...t, id: `dtryx:${t.code}`, chain: 'dtryx', area: '연희동' })),
  ]
}

