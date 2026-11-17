import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { useMarathon } from './store.js'
import { fetchAll, hm } from './providers.js'
import { endOf, isOver, buildTheaters, nowMin } from './session.js'
import { SNAPSHOT, SNAPSHOT_AT } from './snapshot.js'
import { lookupFilm, setTmdbKey, posterUrl } from '../tmdb.js'
import { ticketsCanvas, filmColor } from './tickets.js'
import { saveCanvas, scheduleRateReminder, cancelRateReminder } from './share.js'

const EASE = [0.16, 1, 0.3, 1]
const WD = ['일', '월', '화', '수', '목', '금', '토']
const dayLabel = d => { const x = new Date(d + 'T00:00:00'); return { n: `${x.getMonth() + 1}.${String(x.getDate()).padStart(2, '0')}`, w: WD[x.getDay()] } }
export default function Planner({ onRate }) {
  const st = useMarathon()
  const reduce = useReducedMotion()
  const [dayF, setDayF] = useState('all')
  const [filmF, setFilmF] = useState(null)       // null = 전체
  const [busy, setBusy] = useState(null)         // { done, total }
  const [sheet, setSheet] = useState(false)
  const [tickets, setTickets] = useState(null)   // { mode, images: [{url, cv, name}] }
  const [toast, setToast] = useState('')
  const dates = st.dates()

  const toastT = useRef(null)
  const say = useCallback(t => { setToast(t); clearTimeout(toastT.current); toastT.current = setTimeout(() => setToast(''), 1600) }, [])

  useEffect(() => { setTmdbKey(st.tmdbKey) }, [st.tmdbKey])

  const refresh = useCallback(async () => {
    const s = useMarathon.getState()
    setBusy({ done: 0, total: 1 })
    const theaters = await buildTheaters(s)
    const { sessions, errors } = await fetchAll(theaters, s.dates().map(d => new Date(d + 'T00:00:00')), (done, total) => setBusy({ done, total }))
    setBusy(null)
    if (sessions.length) {
      useMarathon.getState().set({ sessions, source: 'live', fetchedAt: new Date().toISOString(), fetchErrors: errors })
      say(`시간표 ${sessions.length}개 회차를 불러왔어요`)
    } else {
      if (!useMarathon.getState().sessions.length) useMarathon.getState().set({ sessions: SNAPSHOT, source: 'snapshot', fetchedAt: SNAPSHOT_AT })
      useMarathon.getState().set({ fetchErrors: errors })
      say('극장 서버에 닿지 않아 저장된 시간표를 보여줘요')
    }
  }, [say])

  // 처음 열면 저장된 시간표를 먼저 보여주고, 바로 새로 불러와요
  useEffect(() => {
    if (!useMarathon.getState().sessions.length) useMarathon.getState().set({ sessions: SNAPSHOT, source: 'snapshot', fetchedAt: SNAPSHOT_AT })
    const id = setTimeout(refresh, 0)
    return () => clearTimeout(id)
  }, [refresh])

  // TMDB로 포스터·개봉일 채우기 (영화당 한 번)
  useEffect(() => {
    let alive = true
    const todo = [...new Map(st.sessions.map(s => [s.key, s.title])).entries()].filter(([k]) => !st.films[k]).slice(0, 40)
    ;(async () => {
      for (const [k, title] of todo) {
        if (!alive) return
        const meta = await lookupFilm(title)
        useMarathon.setState(s => ({ films: { ...s.films, [k]: meta ? { ...meta, title } : { title, none: true } } }))
      }
    })()
    return () => { alive = false }
  }, [st.sessions]) // eslint-disable-line react-hooks/exhaustive-deps

  /* 가능 시간 안에 드는 회차만 */
  const fit = useMemo(() => {
    const inRange = new Set(dates)
    const recentCut = new Date(st.start + 'T00:00:00'); recentCut.setDate(recentCut.getDate() - 14)
    return st.sessions.filter(s => {
      if (!inRange.has(s.date) || st.hidden.includes(s.key)) return false
      if (st.onlyRecent) { const r = st.films[s.key]?.release; if (!r || new Date(r) < recentCut) return false }
      const { date, m } = nowMin(); if (s.date === date && s.st < m) return false
      return st.windowsOf(s.date).some(([a, b]) => s.st >= a && endOf(s) <= b)
    })
  }, [st.sessions, st.hidden, st.onlyRecent, st.films, st.windows, st.start, st.days]) // eslint-disable-line react-hooks/exhaustive-deps

  const filmList = useMemo(() => {
    const m = new Map()
    fit.forEach(s => { const f = m.get(s.key) || { key: s.key, title: s.title, n: 0 }; f.n++; m.set(s.key, f) })
    return [...m.values()].sort((a, b) => b.n - a.n)
  }, [fit])

  const cartIds = new Set(st.cart.map(c => c.id))
  const relation = s => {
    if (cartIds.has(s.id)) return 'added'
    let r = ''
    for (const c of st.cart) {
      if (c.date !== s.date) continue
      if (s.st < endOf(c) && c.st < endOf(s)) return 'clash'
      const gap = s.st >= endOf(c) ? s.st - endOf(c) : c.st - endOf(s)
      if (gap < (c.theaterId === s.theaterId ? 5 : 25)) r = 'tight'
    }
    return r
  }
  const toggle = s => {
    const r = relation(s)
    if (r === 'clash') return say('담은 회차와 시간이 겹쳐요')
    if (r === 'added') { st.removeCart(s.id); cancelRateReminder(s); return say('뺐어요') }
    st.addCart({ ...s, original: st.films[s.key]?.original || '' }); scheduleRateReminder(s)
    say(r === 'tight' ? '담았어요. 이동이 빠듯해요' : '담았어요')
  }

  const cart = [...st.cart].sort((a, b) => a.date.localeCompare(b.date) || a.st - b.st)
  const pending = cart.filter(s => isOver(s) && !st.rated[s.id])
  const posterOf = s => { const p = st.films[s.key]?.poster; return p ? posterUrl(p, 'w342') : null }

  const issue = async mode => {
    if (!cart.length) return say('먼저 회차를 담아주세요')
    setTickets({ mode, images: null })
    const ratingOf = s => st.rated[s.id] || null
    const list = mode === 'all'
      ? [{ cv: await ticketsCanvas(cart, { posterOf, ratingOf }), name: '0zong-marathon-tickets.png' }]
      : await Promise.all(cart.map(async (s, i) => ({ cv: await ticketsCanvas([s], { posterOf, ratingOf, single: { idx: i, total: cart.length } }), name: `ticket-${s.date}-${hm(s.st).replace(':', '')}.png` })))
    setTickets({ mode, images: list.map(x => ({ ...x, url: x.cv.toDataURL('image/png') })) })
  }

  const days = dayF === 'all' ? dates : [dayF]
  const shown = fit.filter(s => (!filmF || filmF.has(s.key)))

  return (
    <div className="mm">
      <header className="mm-top">
        <div className="mm-lbl">CINEMA MARATHON</div>
        <h1 className="mm-h1">보고 싶은 회차를 담고,<br /><em>티켓을 끊어요</em></h1>
        <div className="mm-meta">
          <span>{st.source === 'live' ? '실시간 시간표' : '저장된 시간표'} · {st.fetchedAt ? new Date(st.fetchedAt).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}</span>
          <button className="mm-btn ghost sm" onClick={refresh} disabled={!!busy}>{busy ? `불러오는 중 ${busy.done}/${busy.total}` : '새로 불러오기'}</button>
        </div>
        {st.fetchErrors?.length > 0 && st.source === 'live' && <div className="mm-note">못 불러온 곳 {st.fetchErrors.length}개: {st.fetchErrors.slice(0, 3).join(', ')}{st.fetchErrors.length > 3 ? ' 외' : ''}</div>}
      </header>

      {pending.length > 0 && (
        <motion.button className="mm-pending lamp" onClick={() => onRate(pending[0])} initial={reduce ? false : { y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5, ease: EASE }}>
          <span className="vf"><i /></span>
          <span className="mm-lbl">RATE NOW</span>
          <b>{pending[0].title}</b> 다 봤어요? 30초 채점하고 왓챠 별점도 복사해요{pending.length > 1 ? ` (대기 ${pending.length}편)` : ''}
        </motion.button>
      )}

      <div className="mm-filters">
        <div className="mm-seg" role="group" aria-label="요일">
          <button aria-pressed={dayF === 'all'} onClick={() => setDayF('all')}>전체<small>{fit.length}</small></button>
          {dates.map(d => { const l = dayLabel(d); return <button key={d} aria-pressed={dayF === d} onClick={() => setDayF(d)}>{l.w} {l.n.split('.')[1]}<small>{fit.filter(s => s.date === d).length}</small></button> })}
        </div>
        <div className="mm-films">
          {filmList.map(f => {
            const on = !filmF || filmF.has(f.key)
            return <button key={f.key} className="mm-fbtn" aria-pressed={on} style={{ '--c': filmColor(f.key) }}
              onClick={() => setFilmF(prev => { const all = !prev; if (all) return new Set([f.key]); const n = new Set(prev); n.has(f.key) ? n.delete(f.key) : n.add(f.key); return n.size ? n : null })}>
              <i />{f.title}<small>{f.n}</small></button>
          })}
        </div>
        <label className="mm-check"><input type="checkbox" checked={st.onlyRecent} onChange={e => st.set({ onlyRecent: e.target.checked })} /> 최근 2주 안 개봉작만</label>
      </div>

      <div className="mm-list">
        {days.map(d => {
          const ds = shown.filter(s => s.date === d); const l = dayLabel(d)
          const groups = [...new Set(ds.map(s => s.key))]
          return (
            <section key={d} className="mm-day">
              <div className="mm-dlab"><span className="n">{l.n}</span><span className="w">{l.w}요일</span>
                <span className="lim">{st.windowsOf(d).map(([a, b]) => `${hm(a)}-${hm(b)}`).join(', ')}</span></div>
              {!ds.length && <div className="mm-empty">가능 시간 안에 들어가는 회차가 없어요. 설정에서 시간을 넓혀 보세요.</div>}
              {groups.map(k => {
                const fs = ds.filter(s => s.key === k).sort((a, b) => a.st - b.st); const meta = st.films[k]
                return (
                  <motion.div key={k} className="mm-frow" style={{ '--c': filmColor(k) }}
                    initial={reduce ? false : { y: 24, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true, amount: 0.15 }} transition={{ duration: 0.6, ease: [0.25, 0, 0, 1] }}>
                    <div className="mm-fhead">
                      {meta?.poster ? <img className="mm-poster" src={posterUrl(meta.poster, 'w92')} alt="" loading="lazy" /> : <span className="mm-poster blank">{[...fs[0].title][0]}</span>}
                      <div><b>{fs[0].title}</b><span>{fs.length}회차{meta?.release ? ` · ${meta.release.slice(0, 4)}.${meta.release.slice(5, 7)} 개봉` : ''}</span></div>
                    </div>
                    <div className="mm-slots">
                      {fs.map(s => {
                        const r = relation(s)
                        return (
                          <button key={s.id} className={`mm-slot ${r} ${r === 'added' ? 'lamp' : ''}`} onClick={() => toggle(s)} aria-pressed={r === 'added'}>
                            <span className="t">{hm(s.st)}<small>- {hm(endOf(s))}</small></span>
                            <span className="th">{s.theater}</span>
                            <span className="tags">{s.fmt && <em>{s.fmt}</em>}{s.en == null && <em>종료 예상</em>}{r === 'tight' && <em className="bad">이동 빠듯</em>}{r === 'clash' && <em className="bad">겹침</em>}</span>
                            <span className="act">{r === 'added' ? '✓' : '+'}</span>
                            {r === 'added' && <span className="vf"><i /></span>}
                          </button>
                        )
                      })}
                    </div>
                  </motion.div>
                )
              })}
            </section>
          )
        })}
      </div>

      <button className="mm-fab" onClick={() => setSheet(true)}>내 마라톤 <span className="num">{cart.length}</span></button>

      <AnimatePresence>
        {sheet && (
          <motion.div className="mm-sheet-bg" onClick={() => setSheet(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.aside className="mm-sheet" onClick={e => e.stopPropagation()} initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ duration: reduce ? 0 : 0.45, ease: EASE }}>
              <div className="mm-sh-h"><div><div className="mm-lbl">MY MARATHON</div><h2>내 마라톤</h2></div><span className="num big">{cart.length}<small>편</small></span><button className="mm-btn ghost sm" onClick={() => setSheet(false)}>닫기</button></div>
              <div className="mm-sh-b">
                {!cart.length && <div className="mm-empty center"><b>아직 비어 있어요</b>회차를 눌러 담아보세요. 같은 날 겹치는 회차는 자동으로 막혀요.</div>}
                {dates.filter(d => cart.some(s => s.date === d)).map(d => {
                  const ds = cart.filter(s => s.date === d); const l = dayLabel(d)
                  return (
                    <div key={d} className="mm-cday">
                      <div className="mm-cday-h"><b>{l.n} {l.w}</b><span>{ds.length}편</span></div>
                      {ds.map((s, i) => {
                        const prev = ds[i - 1]; const gap = prev ? s.st - endOf(prev) : null; const same = prev && prev.theaterId === s.theaterId
                        const rated = st.rated[s.id]
                        return (
                          <div key={s.id}>
                            {prev && <div className={`mm-gap ${gap < (same ? 5 : 25) ? 'bad' : ''}`}>{same ? '같은 극장' : `${s.area || s.theater}(으)로 이동`}, 여유 {gap}분</div>}
                            <motion.div layout className="mm-it" style={{ '--c': filmColor(s.key) }}>
                              <div>
                                <div className="t">{hm(s.st)} - {hm(endOf(s))}{s.en == null && <small>종료 예상</small>}</div>
                                <div className="n">{s.title}</div>
                                <div className="th">{s.theater}{s.fmt ? `, ${s.fmt}` : ''}</div>
                                {rated && <div className="stamp">WATCHED · ★ {rated.star.toFixed(1)} · {rated.total}pt</div>}
                              </div>
                              <div className="acts">
                                {isOver(s) && !rated ? <button className="pri" onClick={() => { setSheet(false); onRate(s) }}>채점</button> : <a href={s.url} target="_blank" rel="noreferrer">예매</a>}
                                <button onClick={() => { st.removeCart(s.id); cancelRateReminder(s) }}>빼기</button>
                              </div>
                            </motion.div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
              <div className="mm-sh-f">
                <button className="mm-btn ghost" onClick={() => { if (confirmClear()) st.clearCart() }}>비우기</button>
                <button className="mm-btn" onClick={() => issue('each')}>낱장 발권</button>
                <button className="mm-btn pri" onClick={() => issue('all')}>티켓 발권</button>
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {tickets && (
          <motion.div className="mm-modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="mm-modal-bar"><h3>발권된 티켓</h3>
              <button className="mm-btn ghost sm" onClick={() => setTickets(null)}>닫기</button></div>
            <div className="mm-modal-body">
              {!tickets.images && <div className="mm-empty center">발권 중이에요...</div>}
              {tickets.images?.map((im, i) => (
                <motion.div key={im.name} className="mm-tk" initial={reduce ? false : { y: -60, opacity: 0, rotate: -2 }} animate={{ y: 0, opacity: 1, rotate: 0 }} transition={{ duration: 0.8, delay: i * 0.12, ease: EASE }}>
                  <img src={im.url} alt="발권된 티켓" />
                  <button className="mm-btn pri" onClick={async () => { try { await saveCanvas(im.cv, im.name); say('저장했어요') } catch { say('저장을 취소했어요') } }}>저장·공유</button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>{toast && <motion.div className="mm-toast" role="status" initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }}>{toast}</motion.div>}</AnimatePresence>
    </div>
  )
}

function confirmClear() { return typeof window === 'undefined' ? true : window.confirm('담은 회차를 모두 뺄까요?') }
