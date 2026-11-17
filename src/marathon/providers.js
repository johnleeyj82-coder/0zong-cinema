/**
 * providers.js: 극장별 시간표 불러오기
 * 안드로이드 앱에서는 CapacitorHttp가 fetch를 네이티브 요청으로 바꿔서 CORS 제한 없이 동작해요.
 * 웹 브라우저에서는 극장 서버가 막기 때문에 실패하고, 그때는 저장된 시간표(스냅샷)를 써요.
 * 극장 내부 주소라 사이트가 바뀌면 깨질 수 있어요.
 */
import { BOOKING_URL } from './theaters.js'

const UA_HEADERS = { 'Accept': 'application/json, text/plain, */*' }

export const toMin = hhmm => {
  const s = String(hhmm).replace(':', '')
  return +s.slice(0, s.length - 2) * 60 + +s.slice(-2)
}
export const hm = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
export const ymd = (d, sep = '') => {
  const dt = typeof d === 'string' ? new Date(d + 'T00:00:00') : d
  return [dt.getFullYear(), String(dt.getMonth() + 1).padStart(2, '0'), String(dt.getDate()).padStart(2, '0')].join(sep)
}

/** 제목 정리: 앞의 [모닝 반값 특가] 같은 꼬리표 제거, 비교용 키 생성 */
export function cleanTitle(raw) {
  return String(raw || '')
    .replace(/&#40;/g, '(').replace(/&#41;/g, ')').replace(/&amp;/g, '&')
    .replace(/^\s*\[[^\]]*\]\s*/, '')
    .replace(/\((자막|더빙|IMAX|4DX|막차[^)]*)[^)]*\)/g, '')
    .trim()
}
export const titleKey = t => cleanTitle(t).replace(/[\s:·\-–—()[\]'"!?.,]/g, '').toLowerCase()

async function getJson(url, opts = {}) {
  const r = await fetch(url, { ...opts, headers: { ...UA_HEADERS, ...(opts.headers || {}) } })
  if (!r.ok) throw new Error(`${r.status}`)
  return r.json()
}

/* ── CGV ─────────────────────────────────── */
export async function cgvSites() {
  const j = await getJson('https://cgv.co.kr/api/v1/booking/searchRegnList?coCd=A420', {
    headers: { Referer: 'https://cgv.co.kr/cnm/movieBook/cinema' },
  })
  return (j.data || []).map(r => ({
    region: r.regnGrpNm,
    sites: (r.siteList || []).filter(s => s.bzplcOperStusNm === '운영중').map(s => ({ code: s.siteNo, name: s.siteNm })),
  }))
}

async function cgv(t, date) {
  const j = await getJson(
    `https://cgv.co.kr/api/v1/booking/searchMovScnInfo?coCd=A420&siteNo=${t.code}&scnYmd=${ymd(date)}&rtctlScopCd=08`,
    { headers: { Referer: 'https://cgv.co.kr/cnm/movieBook/cinema' } },
  )
  return (j.data || []).map(x => ({
    title: cleanTitle(x.prodNm).replace(/^(.+?)-(.+)$/, '$1: $2'),
    st: toMin(x.scnsrtTm), en: toMin(x.scnendTm),
    fmt: x.movkndDsplNm && x.movkndDsplNm !== '2D' ? x.movkndDsplNm.replace(' 2D', '').replace('LASER', '').trim() : '',
  }))
}

/* ── 메가박스 ─────────────────────────────── */
async function mega(t, date) {
  const j = await getJson('https://www.megabox.co.kr/on/oh/ohc/Brch/schedulePage.do', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json;charset=UTF-8', Referer: 'https://www.megabox.co.kr/booking/timetable' },
    body: JSON.stringify({ masterType: 'brch', detailType: 'area', brchNo: t.code, firstAt: 'N', brchNo1: t.code, crtDe: ymd(new Date()), playDe: ymd(date) }),
  })
  return (j.megaMap?.movieFormList || []).map(x => ({
    title: cleanTitle(x.movieNm),
    st: toMin(x.playStartTime), en: toMin(x.playEndTime),
    fmt: /자막|더빙|2D/.test(x.playKindNm || '') && !/IMAX|4DX|DOLBY|MX/i.test(x.playKindNm) ? '' : cleanTitle(x.playKindNm || ''),
  }))
}

/* ── 씨네Q (HTML 응답) ────────────────────── */
async function cineq(t, date) {
  const r = await fetch('https://www.cineq.co.kr/Theater/MovieTable2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'X-Requested-With': 'XMLHttpRequest' },
    body: `TheaterCode=${t.code}&PlayDate=${ymd(date)}`,
  })
  if (!r.ok) throw new Error(`${r.status}`)
  const doc = new DOMParser().parseFromString(await r.text(), 'text/html')
  const out = []
  doc.querySelectorAll('.each-movie-time').forEach(m => {
    const tEl = m.querySelector('.title')
    const rate = tEl.querySelector('span')?.textContent || ''
    const title = cleanTitle(tEl.textContent.replace(rate, ''))
    m.querySelectorAll('.time a').forEach(a => {
      const start = (a.childNodes[0]?.textContent || a.textContent).match(/\d{1,2}:\d{2}/)?.[0]
      const end = a.querySelector('.to')?.textContent.match(/\d{1,2}:\d{2}/)?.[0]
      if (!start) return
      let st = toMin(start), en = end ? toMin(end) : null
      if (en !== null && en < st) en += 1440
      out.push({ title, st, en, fmt: '' })
    })
  })
  return out
}

/* ── 디트릭스 (독립영화관) ─────────────────── */
async function dtryx(t, date) {
  const j = await getJson(
    `https://www.dtryx.com/cinema/showseq_list.do?cgid=${t.cgid}&ssid=&tokn=&BrandCd=${t.brand}&CinemaCd=${t.code}&PlaySDT=${ymd(date, '-')}&_=${Date.now()}`,
  )
  return (j.Showseqlist || []).map(x => {
    const st = toMin(x.StartTime); let en = toMin(x.EndTime); if (en < st) en += 1440
    return { title: cleanTitle(x.MovieNm), st, en, fmt: /애트머스|ATMOS/i.test(x.ScreenTypeNm || '') ? 'ATMOS' : '' }
  })
}

const FETCHERS = { cgv, mega, cineq, dtryx }

/** 극장 하나, 날짜 하나 → 세션 목록 */
export async function fetchTheaterDay(t, date) {
  const rows = await FETCHERS[t.chain](t, date)
  const d = ymd(date, '-')
  return rows
    .filter(r => r.title && Number.isFinite(r.st))
    .map(r => ({
      id: `${t.id}|${d}|${r.st}|${titleKey(r.title)}`,
      key: titleKey(r.title), title: r.title,
      theaterId: t.id, theater: t.name, area: t.area || '', chain: t.chain,
      url: BOOKING_URL[t.chain](t),
      date: d, st: r.st, en: r.en ?? null, fmt: r.fmt || '',
    }))
}

/** 여러 극장 × 여러 날짜를 동시에 4개씩 불러오기 */
export async function fetchAll(theaters, dates, onProgress) {
  const jobs = []
  theaters.forEach(t => dates.forEach(d => jobs.push([t, d])))
  const results = [], errors = []
  let done = 0, i = 0
  async function worker() {
    while (i < jobs.length) {
      const [t, d] = jobs[i++]
      try { results.push(...await fetchTheaterDay(t, d)) }
      catch { errors.push(`${t.name} ${ymd(d, '-')}`) }
      onProgress?.(++done, jobs.length)
    }
  }
  await Promise.all(Array.from({ length: 4 }, worker))
  return { sessions: results, errors }
}
