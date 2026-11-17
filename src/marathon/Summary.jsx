import { useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useMarathon } from './store.js'
import { hm } from './providers.js'
import { posterUrl } from '../tmdb.js'
import { summaryCanvas, filmColor } from './tickets.js'
import { saveCanvas } from './share.js'
import { endOf, isOver } from './session.js'

const WD = ['일', '월', '화', '수', '목', '금', '토']

export default function Summary({ onRate }) {
  const st = useMarathon()
  const reduce = useReducedMotion()
  const [img, setImg] = useState(null)

  const watched = useMemo(() => [...st.cart].filter(isOver), [st.cart])
  const rows = useMemo(() => watched.map(s => {
    const r = st.rated[s.id]; const x = new Date(s.date + 'T00:00:00')
    return { ...s, total: r?.total ?? null, star: r?.star ?? null, poster: st.films[s.key]?.poster ? posterUrl(st.films[s.key].poster, 'w185') : null, when: `${x.getMonth() + 1}.${x.getDate()} ${WD[x.getDay()]} ${hm(s.st)}` }
  }).sort((a, b) => (b.total ?? -1) - (a.total ?? -1)), [watched, st.rated, st.films])

  const minutes = watched.reduce((a, s) => a + (endOf(s) - s.st), 0)
  const stats = {
    films: watched.length, time: `${Math.floor(minutes / 60)}H ${minutes % 60}M`, theaters: new Set(watched.map(s => s.theater)).size,
    range: (() => { const d = st.dates(); const f = x => { const y = new Date(x + 'T00:00:00'); return `${y.getMonth() + 1}.${String(y.getDate()).padStart(2, '0')}` }; return `${f(d[0])} - ${f(d[d.length - 1])}` })(),
  }
  const unrated = rows.filter(r => r.total == null)

  return (
    <div className="mm mm-sum">
      <header className="mm-top"><div className="mm-lbl">MARATHON REPORT</div><h1 className="mm-h1">마라톤 결산</h1></header>
      <div className="mm-stats">
        <div><span className="mm-lbl">FILMS</span><b className="num">{stats.films}</b></div>
        <div><span className="mm-lbl">SCREEN TIME</span><b className="num">{stats.time}</b></div>
        <div><span className="mm-lbl">THEATERS</span><b className="num">{stats.theaters}</b></div>
      </div>
      {!rows.length && <div className="mm-empty center"><b>아직 다 본 회차가 없어요</b>장바구니에 담은 회차가 끝나면 여기에 쌓여요.</div>}
      <ol className="mm-rank">
        {rows.map((r, i) => (
          <motion.li key={r.id} style={{ '--c': filmColor(r.key) }} initial={reduce ? false : { y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6, delay: i * 0.1, ease: [0.25, 0, 0, 1] }}>
            <span className="rk num">{i + 1}</span>
            {r.poster ? <img src={r.poster} alt="" /> : <span className="ph">{[...r.title][0]}</span>}
            <div><b>{r.title}</b><span>{r.when} · {r.theater}</span></div>
            {r.total != null ? <span className="sc num">{r.star.toFixed(1)}<small>{r.total}PT</small></span> : <button className="mm-btn sm" onClick={() => onRate(r)}>채점</button>}
          </motion.li>
        ))}
      </ol>
      {rows.length > 0 && <div className="mm-row center">
        <button className="mm-btn pri" onClick={async () => { const cv = await summaryCanvas(rows, stats); setImg({ cv, url: cv.toDataURL('image/png') }) }}>결산 카드 만들기</button>
      </div>}
      {unrated.length > 0 && <p className="mm-help center">채점 안 한 영화 {unrated.length}편은 순위 맨 아래에 놓여요.</p>}
      {img && <div className="mm-tk"><img src={img.url} alt="마라톤 결산 카드" /><button className="mm-btn pri" onClick={() => saveCanvas(img.cv, '0zong-marathon-report.png')}>저장·공유</button></div>}
    </div>
  )
}
