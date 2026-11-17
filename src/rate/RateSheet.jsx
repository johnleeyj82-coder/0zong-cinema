import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { searchMovies, getMovieDetails, posterUrl } from '../tmdb.js'
import { CRITERIA, totalOf, useRecords } from './records.js'
import { watchaRaw, watchaCalibrated, starText } from '../marathon/watcha.js'

const today = () => new Date().toISOString().slice(0, 10)

/**
 * 채점 화면 하나로: 영화 고르기 → 6개 항목 → 저장
 * @param {{ initial?: object, query?: string, onClose: () => void, onSaved?: (rec) => void }} props
 */
export default function RateSheet({ initial, query, onClose, onSaved }) {
  const reduce = useReducedMotion()
  const { list, upsert } = useRecords()
  const [rec, setRec] = useState(() => ({ watchedDate: today(), watchedPlace: '', memo: '', ...initial }))
  const [q, setQ] = useState(query || '')
  const [results, setResults] = useState([])
  const [copied, setCopied] = useState(false)
  const picking = !rec.title

  // 마라톤에서 열면 제목으로 바로 찾아 첫 결과를 채워요
  useEffect(() => {
    if (!query || initial?.tmdbId) return
    let alive = true
    searchMovies(query).then(async r => {
      if (!alive || !r[0]) return
      const d = await getMovieDetails(r[0].id)
      if (alive && d) pick(d)
    })
    return () => { alive = false }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!picking || q.trim().length < 1) return
    const t = setTimeout(() => searchMovies(q).then(setResults), 300)
    return () => clearTimeout(t)
  }, [q, picking])

  function pick(d) {
    setRec(r => ({ ...r, tmdbId: d.id, title: d.title, originalTitle: d.originalTitle, year: d.year, posterPath: d.posterPath, genres: d.genres || [], director: d.director || '', runtime: d.runtime || '' }))
  }

  const total = totalOf(rec)
  const raw = watchaRaw(total)
  const cal = watchaCalibrated(total, list.filter(x => x.id !== rec.id))
  const star = cal ?? raw
  const filled = CRITERIA.every(c => rec[c.key] !== undefined && rec[c.key] !== '')

  const copy = async () => { try { await navigator.clipboard.writeText(starText(star)); setCopied(true); setTimeout(() => setCopied(false), 1300) } catch { setCopied(false) } }
  const doSave = () => {
    const saved = upsert({ ...rec, totalScore: total, starRating: +(total / 20).toFixed(1), watchaStar: star, id: rec.id || Date.now(), savedAt: rec.savedAt || new Date().toISOString() })
    onSaved?.(saved); onClose()
  }

  return (
    <motion.div className="rs-bg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="rs" onClick={e => e.stopPropagation()} initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ duration: reduce ? 0 : 0.45, ease: [0.16, 1, 0.3, 1] }}>
        {picking ? (
          <>
            <div className="rs-bar"><b>어떤 영화를 봤어요?</b><button onClick={onClose}>닫기</button></div>
            <input className="rs-search" autoFocus placeholder="영화 제목 검색" value={q} onChange={e => setQ(e.target.value)} />
            <div className="rs-results">
              {results.map(m => (
                <button key={m.id} onClick={async () => { const d = await getMovieDetails(m.id); pick(d || m) }}>
                  {m.posterPath ? <img src={posterUrl(m.posterPath, 'w92')} alt="" /> : <span className="ph" />}
                  <span><b>{m.title}</b><small>{m.year}{m.originalTitle && m.originalTitle !== m.title ? ` · ${m.originalTitle}` : ''}</small></span>
                </button>
              ))}
              {q && !results.length && <p className="rs-hint">검색 결과가 없어요. TMDB 키가 없으면 검색이 안 돼요(설정 탭).</p>}
            </div>
          </>
        ) : (
          <>
            <div className="rs-head" style={{ backgroundImage: rec.posterPath ? `url(${posterUrl(rec.posterPath, 'w500')})` : undefined }}>
              <div className="shade" />
              <button className="x" onClick={onClose} aria-label="닫기">✕</button>
              {!rec.id && <button className="change" onClick={() => setRec(r => ({ ...r, title: '', tmdbId: null, posterPath: '' }))}>다른 영화</button>}
              <div className="ttl"><h2>{rec.title}</h2><span>{[rec.year, rec.director].filter(Boolean).join(' · ')}</span></div>
              <div className="score">
                <span className="big">{total}</span><span className="of">/100</span>
              </div>
            </div>

            <div className="rs-body">
              {CRITERIA.map(c => {
                const v = rec[c.key] === undefined || rec[c.key] === '' ? null : Number(rec[c.key])
                return (
                  <div key={c.key} className="rs-crit">
                    <div className="lab"><b>{c.label}</b><small>{c.hint}</small><span className="v">{v ?? '-'}<i>/{c.max}</i></span></div>
                    <div className="steps" style={{ '--n': c.max + 1 }}>
                      <input type="range" min="0" max={c.max} step="1" value={v ?? 0}
                        onChange={e => setRec(r => ({ ...r, [c.key]: +e.target.value }))}
                        className={v == null ? 'unset' : ''} aria-label={c.label} />
                    </div>
                  </div>
                )
              })}

              <div className="rs-watcha">
                <div><span className="k">왓챠 별점</span><b>★ {starText(star)}</b>
                  <small>{cal != null ? `내 기록 ${list.length}편 분포로 보정 (그대로면 ${starText(raw)})` : `100점 ÷ 20 · 기록 10편부터 내 분포로 보정`}</small></div>
                <button onClick={copy}>{copied ? '복사됨' : '복사'}</button>
              </div>

              <div className="rs-fields">
                <label>본 날<input type="date" value={rec.watchedDate || ''} onChange={e => setRec(r => ({ ...r, watchedDate: e.target.value }))} /></label>
                <label>본 곳<input value={rec.watchedPlace || ''} placeholder="극장" onChange={e => setRec(r => ({ ...r, watchedPlace: e.target.value }))} /></label>
              </div>
              <label className="rs-memo">한 줄<input value={rec.memo || ''} placeholder="한 마디만" onChange={e => setRec(r => ({ ...r, memo: e.target.value }))} /></label>
            </div>
            <div className="rs-foot"><button className="save" disabled={!filled} onClick={doSave}>{filled ? '저장' : '6개 항목을 모두 매겨주세요'}</button></div>
          </>
        )}
      </motion.div>
    </motion.div>
  )
}
