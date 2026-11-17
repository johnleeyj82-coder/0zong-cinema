/**
 * tickets.js: 발권 티켓과 마라톤 결산 카드를 캔버스로 그려요.
 * 포스터는 TMDB 이미지(이용 조건상 출처 표기)를 쓰고, 없으면 제목 첫 글자로 만든 표지를 그려요.
 */
import { hm } from './providers.js'

const PALETTE = ['#e9b872', '#7fb6e6', '#c98a52', '#9ad17b', '#f2a07b', '#b5c46a', '#8aa0b8', '#c7b299', '#d98ab0', '#7fc9b8']
export const filmColor = key => { let h = 0; for (const c of key || '') h = (h * 33 + c.charCodeAt(0)) | 0; return PALETTE[Math.abs(h) % PALETTE.length] }

const WD_EN = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const WD_KO = ['일', '월', '화', '수', '목', '금', '토']
const dInfo = date => { const d = new Date(date + 'T00:00:00'); return { md: `${d.getMonth() + 1}.${String(d.getDate()).padStart(2, '0')}`, en: WD_EN[d.getDay()], ko: WD_KO[d.getDay()] } }
const endOf = s => s.en ?? s.st + 10 + (s.runtime || 120)

function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath() }
function seeded(n) { let s = n; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280 } }
const shade = hex => { const n = parseInt(hex.slice(1), 16); return `rgb(${(n >> 16) * 0.6 | 0},${(n >> 8 & 255) * 0.6 | 0},${(n & 255) * 0.6 | 0})` }

export function loadImage(url) {
  return new Promise(res => {
    if (!url) return res(null)
    const img = new Image(); img.crossOrigin = 'anonymous'
    img.onload = () => res(img); img.onerror = () => res(null); img.src = url
  })
}
export async function fontsReady() {
  try { await Promise.all(["400 20px 'Bebas Neue'", "700 50px 'IBM Plex Sans KR'", "500 17px 'IBM Plex Sans KR'"].map(f => document.fonts.load(f, '가A1'))) } catch { /* 기본 글꼴로 그려요 */ }
}

function drawArt(c, x, y, w, h, img, s, color) {
  c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip()
  if (img) {
    const r = Math.max(w / img.width, h / img.height)
    c.drawImage(img, x + (w - img.width * r) / 2, y + (h - img.height * r) / 2, img.width * r, img.height * r)
  } else {
    const g = c.createLinearGradient(x, y, x, y + h); g.addColorStop(0, color); g.addColorStop(1, shade(color)); c.fillStyle = g; c.fillRect(x, y, w, h)
    c.fillStyle = 'rgba(21,16,12,.35)'; for (let i = 0; i < 8; i++) { rr(c, x + 14, y + 18 + i * 54, 18, 28, 4); c.fill(); rr(c, x + w - 32, y + 18 + i * 54, 18, 28, 4); c.fill() }
    c.fillStyle = 'rgba(21,16,12,.75)'; c.font = "700 150px 'IBM Plex Sans KR'"; c.textAlign = 'center'; c.fillText([...s.title][0] || '?', x + w / 2, y + h / 2 + 52); c.textAlign = 'left'
  }
  const R = seeded(s.st + 7); for (let i = 0; i < 700; i++) { c.fillStyle = `rgba(255,255,255,${R() * 0.05})`; c.fillRect(x + R() * w, y + R() * h, 1.5, 1.5) }
  c.restore()
}

const TW = 1200, TH = 440
function fit(c, text, font, size, maxW, min = 26) { let f = size; c.font = font.replace('$', f); while (c.measureText(text).width > maxW && f > min) { f -= 2; c.font = font.replace('$', f) } }

export function drawTicket(c, s, ox, oy, { img, idx, total, rating }) {
  const color = filmColor(s.key), d = dInfo(s.date), stubX = ox + 925, ink = '#1d1915', mute = '#7d7262'
  c.save(); c.shadowColor = 'rgba(0,0,0,.45)'; c.shadowBlur = 30; c.shadowOffsetY = 12; rr(c, ox, oy, TW, TH, 26); c.fillStyle = '#f3eadb'; c.fill(); c.restore()
  c.save(); rr(c, ox, oy, TW, TH, 26); c.clip()
  const R = seeded(idx * 31 + 7); for (let i = 0; i < 2200; i++) { c.fillStyle = `rgba(90,70,40,${R() * 0.05})`; c.fillRect(ox + R() * TW, oy + R() * TH, 1.4, 1.4) }
  drawArt(c, ox, oy, 330, TH, img, s, color)
  c.fillStyle = color; c.fillRect(ox + 330, oy, 10, TH)
  c.fillStyle = 'rgba(0,0,0,.035)'; c.fillRect(stubX, oy, TW - 925, TH)
  c.restore()
  c.fillStyle = '#15100c';[oy, oy + TH].forEach(yy => { c.beginPath(); c.arc(stubX, yy, 20, 0, 7); c.fill() })
  c.strokeStyle = 'rgba(60,45,30,.45)'; c.setLineDash([3, 9]); c.lineWidth = 3; c.beginPath(); c.moveTo(stubX, oy + 28); c.lineTo(stubX, oy + TH - 28); c.stroke(); c.setLineDash([])

  const ix = ox + 380
  c.fillStyle = mute; c.font = "400 20px 'Bebas Neue'"; c.fillText(`0ZONG CINEMA MARATHON   ADMIT ONE   No. ${String(idx + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`, ix, oy + 52)
  c.fillStyle = ink; fit(c, s.title, "700 $px 'IBM Plex Sans KR'", 50, 520, 30); c.fillText(s.title, ix, oy + 112)
  c.fillStyle = shade(color); c.font = "400 26px 'Bebas Neue'"; c.fillText([s.original, s.fmt].filter(Boolean).join('   ').toUpperCase().slice(0, 40), ix, oy + 150)

  const fy = oy + TH - 150
  c.strokeStyle = 'rgba(60,45,30,.22)'; c.lineWidth = 2; c.beginPath(); c.moveTo(ix, fy - 18); c.lineTo(ox + 890, fy - 18); c.stroke()
  const field = (lx, lab, val, sub) => { c.fillStyle = mute; c.font = "400 18px 'Bebas Neue'"; c.fillText(lab, lx, fy + 6); c.fillStyle = ink; fit(c, val, "400 $px 'Bebas Neue'", 46, ox + 895 - lx, 28); c.fillText(val, lx, fy + 56); if (sub) { c.fillStyle = mute; c.font = "500 17px 'IBM Plex Sans KR'"; c.fillText(sub, lx, fy + 84) } }
  const dTxt = `${d.md} ${d.en}`; c.font = "400 46px 'Bebas Neue'"; const dW = c.measureText(dTxt).width
  field(ix, 'DATE', dTxt, `${d.ko}요일`)
  field(ix + Math.max(190, dW + 44), 'SHOWTIME', `${hm(s.st)} - ${hm(endOf(s))}`, s.en == null ? '종료 시간은 예상' : '')
  c.fillStyle = mute; c.font = "400 18px 'Bebas Neue'"; c.fillText('THEATER', ix, fy + 122); const lw = c.measureText('THEATER').width
  c.fillStyle = ink; c.font = "700 22px 'IBM Plex Sans KR'"; c.fillText(s.theater, ix + lw + 14, fy + 124)

  const sx = stubX + 34
  c.fillStyle = mute; c.font = "400 18px 'Bebas Neue'"; c.fillText('ADMIT ONE', sx, oy + 50)
  c.fillStyle = ink; c.font = "700 74px 'IBM Plex Sans KR'"; c.fillText(d.ko, sx, oy + 132); const kw = c.measureText(d.ko).width
  c.font = "400 34px 'Bebas Neue'"; c.fillText(d.md, sx + kw + 16, oy + 92); c.fillStyle = shade(color); c.fillText(hm(s.st), sx + kw + 16, oy + 130)
  const B = seeded(s.st + idx * 13); let bx = sx; c.fillStyle = ink
  while (bx < ox + TW - 34) { const bw = 1 + Math.floor(B() * 4); c.fillRect(bx, oy + TH - 150, bw, 92); bx += bw + 1 + Math.floor(B() * 4) }
  c.fillStyle = mute; c.font = "400 16px 'Bebas Neue'"; c.fillText(`0Z${s.date.replace(/-/g, '').slice(2)}${String(s.st).padStart(4, '0')}`, sx, oy + TH - 36)

  if (rating) { // 관람 완료: 펀칭 구멍 + 점수 도장
    c.fillStyle = '#15100c'; c.beginPath(); c.arc(stubX + 136, oy + 196, 16, 0, 7); c.fill()
    c.save(); c.translate(ox + 760, oy + 120); c.rotate(-0.16)
    c.strokeStyle = 'rgba(178,52,40,.85)'; c.fillStyle = 'rgba(178,52,40,.85)'; c.lineWidth = 4; rr(c, -96, -46, 192, 92, 14); c.stroke()
    c.font = "400 20px 'Bebas Neue'"; c.textAlign = 'center'; c.fillText(`WATCHED   ${rating.total} PT`, 0, -14)
    c.font = "400 44px 'Bebas Neue'"; c.fillText(`STAR ${rating.star.toFixed(1)}`, 0, 30); c.textAlign = 'left'; c.restore()
  }
}

export async function ticketsCanvas(items, { posterOf, ratingOf, single } = {}) {
  await fontsReady()
  const imgs = await Promise.all(items.map(s => loadImage(posterOf?.(s))))
  const pad = 60, head = single ? 0 : 230, gap = 44, scale = 2
  const W = TW + pad * 2, H = head + items.length * (TH + gap) - gap + pad * 2 + (single ? 0 : 40)
  const cv = document.createElement('canvas'); cv.width = W * scale; cv.height = H * scale
  const c = cv.getContext('2d'); c.scale(scale, scale); c.fillStyle = '#15100c'; c.fillRect(0, 0, W, H)
  if (!single) {
    const a = dInfo(items[0].date), b = dInfo(items[items.length - 1].date)
    c.fillStyle = '#e9b872'; c.font = "400 26px 'Bebas Neue'"; c.fillText(`0ZONG CINEMA MARATHON   ${a.md} - ${b.md}`, pad, pad + 30)
    c.fillStyle = '#f3eadb'; c.font = "700 64px 'IBM Plex Sans KR'"; c.fillText('영화관에서 살아보기', pad, pad + 108)
    const tot = items.reduce((x, s) => x + (endOf(s) - s.st), 0)
    c.fillStyle = '#cfc3b1'; c.font = "500 22px 'IBM Plex Sans KR'"; c.fillText(`${items.length}편   ${Math.floor(tot / 60)}시간 ${tot % 60}분   ${new Set(items.map(s => s.theater)).size}개 극장`, pad, pad + 150)
  }
  items.forEach((s, i) => drawTicket(c, s, pad, pad + head + i * (TH + gap), { img: imgs[i], idx: single ? single.idx : i, total: single ? single.total : items.length, rating: ratingOf?.(s) }))
  if (!single) { c.fillStyle = '#6f665a'; c.font = "500 15px 'IBM Plex Sans KR'"; c.fillText('Poster images from TMDB. This product uses the TMDB API but is not endorsed or certified by TMDB.', pad, H - 30) }
  return cv
}

/** 마라톤 결산 카드: 순위표 + 통계 */
export async function summaryCanvas(rows, stats) {
  await fontsReady()
  const imgs = await Promise.all(rows.map(r => loadImage(r.poster)))
  const W = 1080, rowH = 150, pad = 64, head = 360
  const H = head + rows.length * rowH + pad + 60
  const cv = document.createElement('canvas'); cv.width = W * 2; cv.height = H * 2
  const c = cv.getContext('2d'); c.scale(2, 2); c.fillStyle = '#15100c'; c.fillRect(0, 0, W, H)
  c.fillStyle = '#e9b872'; c.font = "400 28px 'Bebas Neue'"; c.fillText(`0ZONG CINEMA MARATHON   ${stats.range}`, pad, pad + 20)
  c.fillStyle = '#f3eadb'; c.font = "700 66px 'IBM Plex Sans KR'"; c.fillText('마라톤 결산', pad, pad + 100)
  const box = (x, lab, val) => { c.fillStyle = '#1e1712'; rr(c, x, pad + 140, 300, 120, 16); c.fill(); c.fillStyle = '#958a7b'; c.font = "400 20px 'Bebas Neue'"; c.fillText(lab, x + 24, pad + 178); c.fillStyle = '#f3eadb'; c.font = "400 60px 'Bebas Neue'"; c.fillText(val, x + 24, pad + 238) }
  box(pad, 'FILMS', String(stats.films)); box(pad + 320, 'SCREEN TIME', stats.time); box(pad + 640, 'THEATERS', String(stats.theaters))
  rows.forEach((r, i) => {
    const y = head + i * rowH
    c.fillStyle = i === 0 ? '#e9b872' : '#958a7b'; c.font = "400 64px 'Bebas Neue'"; c.fillText(String(i + 1), pad, y + 92)
    c.save(); rr(c, pad + 70, y + 10, 86, 128, 10); c.clip()
    if (imgs[i]) c.drawImage(imgs[i], pad + 70, y + 10, 86, 128); else { c.fillStyle = filmColor(r.key); c.fillRect(pad + 70, y + 10, 86, 128) }
    c.restore()
    c.fillStyle = '#f3eadb'; fit(c, r.title, "700 $px 'IBM Plex Sans KR'", 34, 560, 22); c.fillText(r.title, pad + 182, y + 62)
    c.fillStyle = '#cfc3b1'; c.font = "500 19px 'IBM Plex Sans KR'"; c.fillText(`${r.when}   ${r.theater}`, pad + 182, y + 100)
    c.fillStyle = r.total != null ? '#e9b872' : '#6f665a'; c.font = "400 48px 'Bebas Neue'"; c.textAlign = 'right'
    c.fillText(r.total != null ? `${r.star.toFixed(1)}` : '-', W - pad, y + 70)
    c.fillStyle = '#958a7b'; c.font = "400 20px 'Bebas Neue'"; c.fillText(r.total != null ? `${r.total} PT` : 'NOT RATED', W - pad, y + 100); c.textAlign = 'left'
    c.strokeStyle = '#33291f'; c.lineWidth = 1; c.beginPath(); c.moveTo(pad, y + rowH - 2); c.lineTo(W - pad, y + rowH - 2); c.stroke()
  })
  c.fillStyle = '#6f665a'; c.font = "500 15px 'IBM Plex Sans KR'"; c.fillText('Poster images from TMDB. This product uses the TMDB API but is not endorsed or certified by TMDB.', pad, H - 30)
  return cv
}
