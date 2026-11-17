import { useMemo, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { posterUrl } from '../tmdb.js'
import { CRITERIA, useRecords } from './records.js'
import { starText } from '../marathon/watcha.js'
import { filmColor } from '../marathon/tickets.js'
import RateSheet from './RateSheet.jsx'

const SORTS = [
  { key: 'recent', label: '최근 본' },
  { key: 'score', label: '점수 높은' },
]

export default function Records() {
  const reduce = useReducedMotion()
  const { list, remove } = useRecords()
  const [sort, setSort] = useState('recent')
  const [open, setOpen] = useState(null)      // 상세로 볼 기록
  const [edit, setEdit] = useState(null)      // 채점 시트: {} 새로, 기록 객체면 수정

  const sorted = useMemo(() => [...list].sort((a, b) => sort === 'score'
    ? (b.totalScore || 0) - (a.totalScore || 0)
    : String(b.watchedDate || b.savedAt).localeCompare(String(a.watchedDate || a.savedAt))), [list, sort])
  const avg = list.length ? (list.reduce((a, r) => a + (+r.totalScore || 0), 0) / list.length).toFixed(0) : null

  return (
    <div className="rc">
      <header className="rc-top">
        <div>
          <h1>내 기록</h1>
          <p>{list.length ? `${list.length}편 · 평균 ${avg}점` : '본 영화를 검색해서 점수를 매겨보세요'}</p>
        </div>
        <button className="rc-add" onClick={() => setEdit({})}>+ 채점</button>
      </header>

      {list.length > 1 && (
        <div className="rc-sort">{SORTS.map(s => <button key={s.key} aria-pressed={sort === s.key} onClick={() => setSort(s.key)}>{s.label}</button>)}</div>
      )}

      {!list.length && (
        <button className="rc-empty" onClick={() => setEdit({})}>
          <span className="big">+</span>
          <b>첫 영화 채점하기</b>
          <small>몰입감, 여운, 서사, 인물, 연출, 취향 6개로 100점을 매기고 왓챠 별점으로 바꿔줘요</small>
        </button>
      )}

      <div className="rc-grid">
        {sorted.map((r, i) => (
          <motion.button key={r.id} className="rc-card" style={{ '--c': filmColor(r.title) }} onClick={() => setOpen(r)}
            initial={reduce ? false : { y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5, delay: Math.min(i, 9) * 0.04, ease: [0.25, 0, 0, 1] }}>
            <span className="pst">
              {r.posterPath ? <img src={posterUrl(r.posterPath, 'w342')} alt="" loading="lazy" /> : <span className="ph">{r.title}</span>}
              <span className="badge"><b>{r.totalScore}</b><small>★{starText(r.watchaStar ?? r.starRating)}</small></span>
            </span>
            <span className="t">{r.title}</span>
          </motion.button>
        ))}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div className="rs-bg" onClick={() => setOpen(null)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="rs" onClick={e => e.stopPropagation()} initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ duration: reduce ? 0 : 0.45, ease: [0.16, 1, 0.3, 1] }}>
              <div className="rs-head" style={{ backgroundImage: open.posterPath ? `url(${posterUrl(open.posterPath, 'w500')})` : undefined }}>
                <div className="shade" />
                <button className="x" onClick={() => setOpen(null)} aria-label="닫기">✕</button>
                <div className="ttl"><h2>{open.title}</h2><span>{[open.watchedDate, open.watchedPlace].filter(Boolean).join(' · ')}</span></div>
                <div className="score"><span className="big">{open.totalScore}</span><span className="of">★ {starText(open.watchaStar ?? open.starRating)}</span></div>
              </div>
              <div className="rs-body">
                {open.memo && <p className="rc-memo">“{open.memo}”</p>}
                {CRITERIA.map(c => {
                  const v = +open[c.key] || 0
                  return (
                    <div key={c.key} className="rc-bar">
                      <span className="k">{c.label}</span>
                      <span className="track"><motion.i initial={{ scaleX: 0 }} animate={{ scaleX: v / c.max }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }} /></span>
                      <span className="v">{v}<small>/{c.max}</small></span>
                    </div>
                  )
                })}
              </div>
              <div className="rs-foot two">
                <button onClick={() => { if (window.confirm(`${open.title} 기록을 지울까요?`)) { remove(open.id); setOpen(null) } }}>지우기</button>
                <button className="save" onClick={() => { setEdit(open); setOpen(null) }}>점수 고치기</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>{edit && <RateSheet initial={edit} onClose={() => setEdit(null)} />}</AnimatePresence>
    </div>
  )
}
