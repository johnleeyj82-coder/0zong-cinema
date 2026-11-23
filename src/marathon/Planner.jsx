import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { useMarathon, today } from './store.js'
import { fetchDay, hm } from './providers.js'
import { endOf, isOver, isStarted, buildTheaters, theaterList, pickSig } from './session.js'
import { CHAINS, CHAIN_ORDER, shortName } from './theaters.js'
import { SNAPSHOT } from './snapshot.js'
import { lookupFilm, setTmdbKey, posterUrl } from '../tmdb.js'
import { ticketsCanvas, filmColor } from './tickets.js'
import { saveCanvas, scheduleRateReminder, cancelRateReminder } from './share.js'

const EASE = [0.16, 1, 0.3, 1]
const WD = ['일', '월', '화', '수', '목', '금', '토']
const dayOf = d => { const x = new Date(d + 'T00:00:00'); return { day: x.getDate(), w: WD[x.getDay()], wknd: x.getDay() === 0 || x.getDay() === 6 } }
const PARTS = [
  { key: 'am', label: '아침', from: 0, to: 12 * 60 },
  { key: 'pm', label: '오후', from: 12 * 60, to: 18 * 60 },
  { key: 'ev', label: '저녁', from: 18 * 60, to: 22 * 60 },
  { key: 'late', label: '심야', from: 22 * 60, to: 99 * 60 },
]
const TRAVEL = 25
const STALE = 5 * 60 * 1000
const branch = s => s.area || shortName(s.chain, s.theater)
/** 체인 색 이름표 + 지점 이름 */
const Th = ({ chain, name }) => <span className="th" style={{ '--ch': CHAINS[chain]?.color }}><i>{CHAINS[chain]?.short}</i>{name}</span>
const seatText = s => s.left == null ? '' : s.left === 0 ? '매진' : `${s.left}석`
const seatCls = s => s.left == null ? '' : s.left === 0 ? 'sold' : s.left <= 10 ? 'few' : ''
/** 스냅샷(예시 시간표)을 오늘 날짜로 옮겨요: 미리보기에서 화면을 보여주기 위한 것 */
const shiftedSnapshot = () => {
  const first = SNAPSHOT.reduce((m, x) => x.date < m ? x.date : m, '9999')
  const off = Math.round((new Date(today() + 'T00:00:00') - new Date(first + 'T00:00:00')) / 864e5)
  const mv = d => { const x = new Date(d + 'T00:00:00'); x.setDate(x.getDate() + off); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}` }
  return SNAPSHOT.map(x => ({ ...x, date: mv(x.date), id: x.id.replace(x.date, mv(x.date)) }))
}
const clock = m => { const h = Math.floor(m / 60) % 24; return `${h < 6 ? '새벽' : h < 12 ? '오전' : '오후'} ${h % 12 || 12}시` }

export default function Planner({ onRate }) {
  const st = useMarathon()
  const reduce = useReducedMotion()
  const dates = st.dates()
  const [day, setDay] = useState(dates[0])
  const [film, setFilm] = useState(null)
  const [after, setAfter] = useState(null)
  const [busy, setBusy] = useState(null)
  const [sheet, setSheet] = useState(false)
  const [tickets, setTickets] = useState(null)
  const [toast, setToast] = useState('')
  const toastT = useRef(null)
  const say = useCallback(t => { setToast(t); clearTimeout(toastT.current); toastT.current = setTimeout(() => setToast(''), 1600) }, [])
  const curDay = dates.includes(day) ? day : dates[0]

  useEffect(() => { setTmdbKey(st.tmdbKey) }, [st.tmdbKey])

  const sig = pickSig(st)
  const loading = useRef({})
  const load = useCallback(async (date, force = false) => {
    const s = useMarathon.getState()
    const sg = pickSig(s); const prev = s.dayAt[date]
    if (!force && prev && prev.sig === sg && Date.now() - prev.at < STALE) return
    if (loading.current[date]) return
    loading.current[date] = true
    setBusy({ date, done: 0, total: 1 })
    try {
      const { list, unknown } = await buildTheaters(s)
      const { ok, failed } = await fetchDay(list, date, (done, total) => setBusy({ date, done, total }))
      const all = [...failed, ...unknown.map(n => `CGV ${n}`)]
      if (ok.size) useMarathon.getState().mergeDay(date, ok, all, sg)
      else {
        const cur = useMarathon.getState()
        if (!cur.sessions.some(x => x.date >= today())) cur.set({ sessions: shiftedSnapshot(), source: 'snapshot' })
        useMarathon.setState(x => ({ dayErr: { ...x.dayErr, [date]: all } }))
      }
    } finally {
      loading.current[date] = false
      setBusy(b => (b?.date === date ? null : b))
    }
  }, [])
  // 날짜를 고를 때마다(그리고 극장 선택이 바뀌면) 그 날 시간표를 새로 불러와요
  useEffect(() => { const id = setTimeout(() => load(curDay), 0); return () => clearTimeout(id) }, [curDay, sig, load])

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

  const daySessions = useMemo(() => {
    const recentCut = new Date(today() + 'T00:00:00'); recentCut.setDate(recentCut.getDate() - 14)
    const active = new Set(theaterList(st).map(t => t.id))
    return st.sessions.filter(s => {
      if (s.date !== curDay || st.hidden.includes(s.key)) return false
      if (!s.theaterId.startsWith('snap:') && !active.has(s.theaterId)) return false
      if (st.onlyRecent) { const r = st.films[s.key]?.release; if (!r || new Date(r) < recentCut) return false }
      if (isStarted(s)) return false
      return st.windowsOf(s.date).some(([a, b]) => s.st >= a && endOf(s) <= b)
    }).sort((a, b) => a.st - b.st)
  }, [st.sessions, st.hidden, st.onlyRecent, st.films, st.windows, sig, curDay]) // eslint-disable-line react-hooks/exhaustive-deps

  const theatersToday = useMemo(() => [...new Map(daySessions.map(s => [s.theaterId, { chain: s.chain, name: branch(s) }])).entries()]
    .sort((a, b) => CHAIN_ORDER.indexOf(a[1].chain) - CHAIN_ORDER.indexOf(b[1].chain)), [daySessions])
  const pinned = st.pinned.filter(id => theatersToday.some(([t]) => t === id))
  const visible = daySessions.filter(s => (!pinned.length || pinned.includes(s.theaterId)) && (after == null || s.st >= after))

  const filmMap = new Map()
  visible.forEach(s => { const f = filmMap.get(s.key) || { key: s.key, title: s.title, list: [] }; f.list.push(s); filmMap.set(s.key, f) })
  const films = [...filmMap.values()].sort((a, b) => b.list.length - a.list.length)

  const cart = [...st.cart].sort((a, b) => a.date.localeCompare(b.date) || a.st - b.st)
  const cartDay = cart.filter(s => s.date === curDay)
  const cartIds = new Set(st.cart.map(c => c.id))
  const relation = s => {
    if (cartIds.has(s.id)) return 'added'
    if (s.left === 0) return 'sold'
    let r = ''
    for (const c of cartDay) {
      if (s.st < endOf(c) && c.st < endOf(s)) return 'clash'
      const gap = s.st >= endOf(c) ? s.st - endOf(c) : c.st - endOf(s)
      if (gap < (c.theaterId === s.theaterId ? 5 : TRAVEL)) r = 'tight'
    }
    return r
  }
  const toggle = s => {
    const r = relation(s)
    if (r === 'clash') return say('담은 회차와 시간이 겹쳐요')
    if (r === 'sold') return say('매진된 회차예요')
    if (r === 'added') { st.removeCart(s.id); cancelRateReminder(s); return say('뺐어요') }
    st.addCart({ ...s, original: st.films[s.key]?.original || '' }); scheduleRateReminder(s)
    setFilm(null)
    say(r === 'tight' ? '담았어요. 이동이 빠듯해요' : '담았어요')
  }

  const pending = cart.filter(s => isOver(s) && !st.rated[s.id])
  const poster = (key, size = 'w342') => { const p = st.films[key]?.poster; return p ? posterUrl(p, size) : null }
  const posterOf = s => poster(s.key)

  const issue = async mode => {
    if (!cart.length) return say('먼저 회차를 담아주세요')
    setTickets({ images: null })
    const ratingOf = s => st.rated[s.id] || null
    const list = mode === 'all'
      ? [{ cv: await ticketsCanvas(cart, { posterOf, ratingOf }), name: '0zong-marathon-tickets.png' }]
      : await Promise.all(cart.map(async (s, i) => ({ cv: await ticketsCanvas([s], { posterOf, ratingOf, single: { idx: i, total: cart.length } }), name: `ticket-${s.date}-${hm(s.st).replace(':', '')}.png` })))
    setTickets({ images: list.map(x => ({ ...x, url: x.cv.toDataURL('image/png') })) })
  }

  const wins = st.windowsOf(curDay)
  // 막대 범위: 가능 시간 안에서 7시~새벽 2시로 줄여 보여줘요
  const span = wins.length ? [Math.max(7 * 60, Math.min(...wins.map(w => w[0]))), Math.min(26 * 60, Math.max(...wins.map(w => w[1])))] : [9 * 60, 24 * 60]
  const pos = m => ((m - span[0]) / (span[1] - span[0])) * 100
  const lastEnd = cartDay.length ? Math.max(...cartDay.map(endOf)) : null
  const openFilm = films.find(f => f.key === film)
  const cd = dayOf(curDay)

  return (
    <div className="pl">
      <div className="pl-days">
        {dates.map(d => {
          const x = dayOf(d); const n = st.cart.filter(c => c.date === d).length
          return (
            <button key={d} className={`pl-day ${d === curDay ? 'on' : ''} ${x.wknd ? 'wknd' : ''}`} onClick={() => { setDay(d); setAfter(null); setFilm(null) }}>
              <span className="w">{x.w}</span><span className="n">{x.day}</span>
              <span className="dots">{Array.from({ length: Math.min(n, 4) }, (_, i) => <i key={i} />)}</span>
            </button>
          )
        })}
      </div>

      <section className="pl-myday">
        <div className="pl-myday-h">
          <b>{cd.day}일 {cd.w}요일</b>
          <span>{cartDay.length ? `${cartDay.length}편 담음` : '아직 담은 영화가 없어요'}</span>
        </div>
        <div className="pl-bar">
          {wins.map(([a, b], i) => { const x = Math.max(a, span[0]), y = Math.min(b, span[1]); return y > x && <span key={i} className="pl-win" style={{ left: `${pos(x)}%`, width: `${pos(y) - pos(x)}%` }} /> })}
          {cartDay.map(s => (
            <span key={s.id} className="pl-blk" style={{ left: `${pos(s.st)}%`, width: `${pos(endOf(s)) - pos(s.st)}%`, '--c': filmColor(s.key), backgroundImage: poster(s.key, 'w185') ? `url(${poster(s.key, 'w185')})` : undefined }} title={s.title} />
          ))}
        </div>
        <div className="pl-ticks"><span>{clock(span[0])}</span><span>{clock(span[1])}</span></div>
        {lastEnd != null && (
          <button className={`pl-next ${after != null ? 'on lamp' : ''}`} onClick={() => setAfter(after != null ? null : lastEnd + TRAVEL)}>
            {after != null ? `${hm(after)} 이후 회차만 보는 중 · 해제` : `${hm(lastEnd)}에 끝나요. 이 다음엔?`}
          </button>
        )}
      </section>

      {pending.length > 0 && (
        <button className="pl-rate" onClick={() => onRate(pending[0])}>
          {poster(pending[0].key, 'w92') ? <img src={poster(pending[0].key, 'w92')} alt="" /> : <span className="ph" />}
          <span><b>{pending[0].title}</b> 다 봤어요?<br /><small>30초 채점하고 왓챠 별점 복사하기</small></span>
        </button>
      )}

      <div className="pl-tools">
        <div className="pl-pins">
          <span className="pl-k">내 극장</span>
          <button className={`pl-pin ${!pinned.length ? 'on' : ''}`} onClick={() => st.set({ pinned: [] })}>전체</button>
          {theatersToday.map(([id, t]) => <button key={id} className={`pl-pin ${pinned.includes(id) ? 'on' : ''}`} onClick={() => st.togglePin(id)}><Th chain={t.chain} name={t.name} /></button>)}
        </div>
        <div className="pl-mode" role="tablist">
          <button role="tab" aria-selected={st.mode === 'film'} onClick={() => st.set({ mode: 'film' })}>포스터로</button>
          <button role="tab" aria-selected={st.mode === 'time'} onClick={() => st.set({ mode: 'time' })}>시간으로</button>
        </div>
      </div>

      {!visible.length && <div className="pl-empty"><b>볼 수 있는 회차가 없어요</b>{after != null ? '이어보기를 해제하거나, ' : ''}극장 고정을 풀거나, 설정에서 이 날 가능 시간을 넓혀 보세요.</div>}

      {st.mode === 'film' && (
        <div className="pl-grid">
          {films.map((f, i) => {
            const got = st.cart.some(c => c.key === f.key)
            return (
              <motion.button key={f.key} className={`pl-card ${got ? 'got' : ''}`} style={{ '--c': filmColor(f.key) }} onClick={() => setFilm(f.key)}
                initial={reduce ? false : { y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.55, delay: Math.min(i, 8) * 0.05, ease: [0.25, 0, 0, 1] }}>
                <span className="pl-poster">
                  {poster(f.key) ? <img src={poster(f.key)} alt="" loading="lazy" /> : <span className="pl-ph">{f.title}</span>}
                  {got && <span className="pl-got">담음</span>}
                </span>
                <span className="pl-ct">{f.title}</span>
                <span className="pl-cs">{hm(f.list[0].st)}부터</span>
              </motion.button>
            )
          })}
        </div>
      )}

      {st.mode === 'time' && (
        <div className="pl-time">
          {PARTS.map(p => {
            const ss = visible.filter(s => s.st >= p.from && s.st < p.to)
            if (!ss.length) return null
            return (
              <section key={p.key} className="pl-part">
                <h3>{p.label}</h3>
                {ss.map(s => {
                  const r = relation(s)
                  return (
                    <button key={s.id} className={`pl-row ${r} ${r === 'added' ? 'lamp' : ''}`} style={{ '--c': filmColor(s.key) }} onClick={() => toggle(s)}>
                      <span className="t">{hm(s.st)}</span>
                      {poster(s.key, 'w92') ? <img src={poster(s.key, 'w92')} alt="" loading="lazy" /> : <span className="ph" />}
                      <span className="nm"><b>{s.title}</b><small><Th chain={s.chain} name={branch(s)} />{r === 'tight' ? ' · 이동 빠듯' : ''}{r === 'clash' ? ' · 겹침' : ''}</small></span>
                      <span className={`seat ${seatCls(s)}`}>{seatText(s)}</span>
                      
                    </button>
                  )
                })}
              </section>
            )
          })}
        </div>
      )}

      <div className="pl-foot">
        <span>{busy?.date === curDay ? `시간표 불러오는 중 ${busy.done}/${busy.total}`
          : st.source === 'snapshot' ? '극장 서버에 닿지 않아 예시 시간표를 보여줘요'
          : st.dayAt[curDay] ? `${hm(new Date(st.dayAt[curDay].at).getHours() * 60 + new Date(st.dayAt[curDay].at).getMinutes())} 기준 시간표·잔여석` : ''}</span>
        {!busy && <button onClick={() => load(curDay, true)}>다시</button>}
        {!!st.dayErr[curDay]?.length && <span className="pl-err">못 불러온 극장: {st.dayErr[curDay].join(', ')}</span>}
        <label><input type="checkbox" checked={st.onlyRecent} onChange={e => st.set({ onlyRecent: e.target.checked })} /> 최근 2주 개봉작만</label>
      </div>

      {cart.length > 0 && <button className="mm-fab" onClick={() => setSheet(true)}>
        <span className="fab-posters">{cart.slice(-3).map(s => <i key={s.id} style={{ '--c': filmColor(s.key), backgroundImage: poster(s.key, 'w92') ? `url(${poster(s.key, 'w92')})` : undefined }} />)}</span>
        내 마라톤 <span className="num">{cart.length}</span>
      </button>}

      <AnimatePresence>
        {openFilm && (
          <motion.div className="mm-sheet-bg" onClick={() => setFilm(null)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.aside className="pl-film" onClick={e => e.stopPropagation()} style={{ '--c': filmColor(openFilm.key) }}
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ duration: reduce ? 0 : 0.45, ease: EASE }}>
              <div className="pl-film-h" style={{ backgroundImage: poster(openFilm.key, 'w500') ? `url(${poster(openFilm.key, 'w500')})` : undefined }}>
                <div className="shade" />
                <div className="txt"><h2>{openFilm.title}</h2>
                  <span>{st.films[openFilm.key]?.release ? `${st.films[openFilm.key].release.slice(0, 4)}년 개봉 · ` : ''}오늘 {openFilm.list.length}회</span></div>
                <button className="x" onClick={() => setFilm(null)} aria-label="닫기">✕</button>
              </div>
              <div className="pl-film-b">
                {PARTS.map(p => {
                  const ss = openFilm.list.filter(s => s.st >= p.from && s.st < p.to)
                  if (!ss.length) return null
                  return (
                    <div key={p.key} className="pl-fpart">
                      <h3>{p.label}</h3>
                      <div className="pl-chips">
                        {ss.map(s => {
                          const r = relation(s)
                          return (
                            <button key={s.id} className={`pl-chip ${r} ${r === 'added' ? 'lamp' : ''}`} onClick={() => toggle(s)}>
                              <b>{hm(s.st)}</b><Th chain={s.chain} name={branch(s)} />
                              <small className={`seat ${seatCls(s)}`}>{[seatText(s), s.fmt].filter(Boolean).join(' · ') || '\u00a0'}</small>
                              {r === 'clash' && <em>겹침</em>}{r === 'tight' && <em>빠듯</em>}
                              
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
                <button className="pl-hide" onClick={() => { st.toggleHidden(openFilm.key); setFilm(null); say('이 영화는 숨겼어요') }}>이 영화는 안 볼래요</button>
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {sheet && (
          <motion.div className="mm-sheet-bg" onClick={() => setSheet(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.aside className="mm-sheet" onClick={e => e.stopPropagation()} initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ duration: reduce ? 0 : 0.45, ease: EASE }}>
              <div className="mm-sh-h"><h2>내 마라톤</h2><button className="mm-btn ghost sm" onClick={() => setSheet(false)}>닫기</button></div>
              <div className="mm-sh-b">
                {!cart.length && <div className="pl-empty"><b>아직 비어 있어요</b>포스터를 눌러 회차를 담아보세요.</div>}
                {dates.filter(d => cart.some(s => s.date === d)).map(d => {
                  const ds = cart.filter(s => s.date === d); const x = dayOf(d)
                  return (
                    <div key={d} className="mm-cday">
                      <div className="mm-cday-h"><b>{x.day}일 {x.w}요일</b></div>
                      {ds.map((s, i) => {
                        const prev = ds[i - 1]; const gap = prev ? s.st - endOf(prev) : null; const same = prev && prev.theaterId === s.theaterId
                        const rated = st.rated[s.id]
                        return (
                          <div key={s.id}>
                            {prev && <div className={`mm-gap ${gap < (same ? 5 : TRAVEL) ? 'bad' : ''}`}>{same ? '같은 극장에서' : `${s.theater}까지 이동`} · {gap}분 여유</div>}
                            <motion.div layout className="pl-it" style={{ '--c': filmColor(s.key) }}>
                              {poster(s.key, 'w92') ? <img src={poster(s.key, 'w92')} alt="" /> : <span className="ph" />}
                              <div className="mid">
                                <b>{s.title}</b>
                                <span>{hm(s.st)} · <Th chain={s.chain} name={branch(s)} /></span>
                                {rated && <em>★ {rated.star.toFixed(1)}</em>}
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
                <button className="mm-btn ghost" onClick={() => { if (window.confirm('담은 회차를 모두 뺄까요?')) st.clearCart() }}>비우기</button>
                <button className="mm-btn" onClick={() => issue('each')}>낱장</button>
                <button className="mm-btn pri" onClick={() => issue('all')}>티켓 발권</button>
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {tickets && (
          <motion.div className="mm-modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="mm-modal-bar"><h3>발권된 티켓</h3><button className="mm-btn ghost sm" onClick={() => setTickets(null)}>닫기</button></div>
            <div className="mm-modal-body">
              {!tickets.images && <div className="pl-empty">발권 중이에요...</div>}
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
