import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { searchMovies, getMovieDetails, posterUrl } from './tmdb.js'
import './App.css'

/* ═══════════════════════════════════════════════════
   상수
═══════════════════════════════════════════════════ */
const MARQUEE_TEXT =
  'FILMS MAKE YOUR LIFE BETTER · SEE YOU AT THE MOVIE · 0ZONG CINEMA · GOOD FILMS MAKE YOUR LIFE BETTER · FILM IS ABOUT TO START · '

const LIGHT_LEVELS = [
  { overlay: 'rgba(0,0,0,0)',    icon: '💡', label: '밝게'      },
  { overlay: 'rgba(0,0,0,0.35)', icon: '🕯️', label: '조금 어둡게' },
  { overlay: 'rgba(0,0,0,0.65)', icon: '🌑', label: '많이 어둡게' },
]

const SEAT_CONFIG = [
  { count: 13, shrink: 0  },
  { count: 12, shrink: 20 },
  { count: 11, shrink: 40 },
  { count: 10, shrink: 60 },
  { count: 9,  shrink: 80 },
]

const RATING_CRITERIA = [
  { key: 'engagement', label: '몰입감 / 재미', sub: 'Engagement', max: 25 },
  { key: 'aftertaste', label: '여운 / 사유',   sub: 'Aftertaste', max: 20 },
  { key: 'story',      label: '서사 / 메시지', sub: 'Story',      max: 20 },
  { key: 'character',  label: '인물 / 연기',   sub: 'Character',  max: 15 },
  { key: 'visual',     label: '연출 / 시청각', sub: 'Visual',     max: 15 },
  { key: 'personal',   label: '개인적 취향',   sub: 'Personal',   max: 5  },
]

const EMPTY_FORM = {
  tmdbId: null, title: '', originalTitle: '', year: '', overview: '',
  posterPath: '', tmdbRating: '', genres: [], director: '', runtime: '',
  engagement: '', aftertaste: '', story: '', character: '',
  visual: '', personal: '',
  watchedDate: new Date().toISOString().slice(0, 10),
  watchedPlace: '', memo: '',
}

const TOTAL_EMPTY_SLOTS = 10

/* ═══════════════════════════════════════════════════
   TMDB 미니 검색 (티켓 내부용)
═══════════════════════════════════════════════════ */
function TmdbSearch({ onSelect }) {
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const debRef = useRef(null)
  const wrapRef = useRef(null)

  useEffect(() => {
    clearTimeout(debRef.current)
    if (!query.trim()) { setResults(null); return }
    setLoading(true)
    debRef.current = setTimeout(async () => {
      const r = await searchMovies(query)
      setResults(r)
      setLoading(false)
    }, 380)
  }, [query])

  useEffect(() => {
    const fn = e => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setResults(null)
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  const handleSelect = async (id) => {
    setResults(null)
    setQuery('')
    const d = await getMovieDetails(id)
    if (d) onSelect(d)
  }

  return (
    <div className="tmdb-search-wrap" ref={wrapRef}>
      <div className="tmdb-search-row">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="tmdb-icon">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          id="tmdb-ticket-search"
          className="tmdb-input"
          placeholder="TMDB 영화 검색..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          autoComplete="off"
        />
      </div>

      <AnimatePresence>
        {(loading || results !== null) && (
          <motion.div
            className="tmdb-dropdown"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
          >
            {loading && (
              <div className="tmdb-dd-msg">
                <span className="spin">⟳</span> 검색 중...
              </div>
            )}
            {!loading && results?.length === 0 && (
              <div className="tmdb-dd-msg">검색 결과 없음</div>
            )}
            {!loading && results?.map(m => (
              <button key={m.id} className="tmdb-dd-item" onClick={() => handleSelect(m.id)}>
                <div className="tmdb-dd-thumb">
                  {m.posterPath
                    ? <img src={posterUrl(m.posterPath, 'w92')} alt={m.title} className="tmdb-dd-img"/>
                    : <span className="tmdb-dd-fallback">🎬</span>}
                </div>
                <div className="tmdb-dd-info">
                  <span className="tmdb-dd-title">{m.title}</span>
                  <span className="tmdb-dd-sub">{m.year} · ⭐ {m.rating}</span>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ═══════════════════════════════════════════════════
   티켓 폼 (스크린 내부에 렌더링)
═══════════════════════════════════════════════════ */
function TicketForm({ onClose, onSave }) {
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  /* 총점 / 별점 자동 계산 */
  const totalScore = useMemo(() =>
    RATING_CRITERIA.reduce((sum, c) => sum + (parseFloat(form[c.key]) || 0), 0),
    [form]
  )
  const starRating = (totalScore / 20).toFixed(1)

  /* TMDB 영화 선택 시 폼 자동 채움 */
  const handleMovieSelect = (d) => {
    setForm(f => ({
      ...f,
      tmdbId: d.id, title: d.title, originalTitle: d.originalTitle,
      year: d.year, overview: d.overview, posterPath: d.posterPath,
      tmdbRating: d.rating, genres: d.genres,
      director: d.director, runtime: d.runtime,
    }))
  }

  /* 저장 */
  const handleSave = () => {
    if (!form.title) return
    const saved = JSON.parse(localStorage.getItem('0zong-films') || '[]')
    const entry = {
      ...form, totalScore, starRating: parseFloat(starRating),
      savedAt: new Date().toISOString(), id: Date.now(),
    }
    saved.unshift(entry)
    localStorage.setItem('0zong-films', JSON.stringify(saved))
    onSave(entry)
    onClose()
  }

  /* 바코드 숫자 (의사 랜덤) */
  const barcodeNum = form.title
    ? String(form.title.split('').reduce((a, c) => a + c.charCodeAt(0), 27020404)).slice(0, 8)
    : '27020404'

  return (
    <div className="ticket-wrap">
      <div className="vintage-ticket">

        {/* ── 왼쪽 빨간 스텁 ── */}
        <div className="t-stub-left">
          <div className="admit-text">ADMIT ONE</div>
          <div className="stub-stars">
            {[1, 2, 3, 4, 5].map(n => (
              <span key={n} className={`stub-star ${n <= Math.round(parseFloat(starRating)) ? 'lit' : ''}`}>★</span>
            ))}
          </div>
          <div className="stub-serial">{barcodeNum}</div>
        </div>

        {/* 톱니 분리선 왼쪽 */}
        <div className="t-perforation left-perf-line" aria-hidden="true">
          <div className="perf-notch-t"/>
          <div className="perf-dots"/>
          <div className="perf-notch-b"/>
        </div>

        {/* ── 메인 바디 (크림) ── */}
        <div className="t-body">

          {/* 헤더: TMDB 검색 + 닫기 */}
          <div className="t-body-header">
            <TmdbSearch onSelect={handleMovieSelect}/>
            <button className="t-close-btn" onClick={onClose} aria-label="닫기">✕</button>
          </div>

          {/* 영화 정보 행 */}
          <div className="t-movie-row">
            {/* 포스터 */}
            <div className="t-poster-wrap">
              {form.posterPath
                ? <img src={posterUrl(form.posterPath)} alt={form.title} className="t-poster-img"/>
                : <div className="t-poster-ph"><span>🎬</span></div>
              }
            </div>

            {/* 제목 + 메타 */}
            <div className="t-movie-info">
              <p className="t-cinema-label">★ ★ ★  0ZONG CINEMA TICKET  ★ ★ ★</p>
              <input
                id="ticket-title-input"
                className="t-title-input"
                value={form.title}
                onChange={e => set('title', e.target.value)}
                placeholder="영화 제목"
              />
              {form.originalTitle && (
                <p className="t-original">{form.originalTitle}</p>
              )}
              <div className="t-chips">
                {form.year       && <span className="t-chip">{form.year}</span>}
                {form.tmdbRating && <span className="t-chip">TMDB ⭐ {form.tmdbRating}</span>}
                {form.director   && <span className="t-chip">🎬 {form.director}</span>}
                {form.runtime    && <span className="t-chip">⏱ {form.runtime}분</span>}
              </div>
              {form.genres.length > 0 && (
                <div className="t-genres">
                  {form.genres.map(g => <span key={g} className="t-genre">{g}</span>)}
                </div>
              )}
              {form.overview && (
                <p className="t-overview">{form.overview.slice(0, 120)}{form.overview.length > 120 ? '…' : ''}</p>
              )}
            </div>
          </div>

          {/* 수평 구분선 */}
          <div className="t-h-rule"/>

          {/* ── 평점 공식 ── */}
          <div className="t-rating-section">
            <div className="t-rating-header">
              <span className="t-rating-label">RATING FORMULA</span>
              <div className="t-totals">
                <span className="t-total-badge">
                  <span className="tot-num">{totalScore}</span>
                  <span className="tot-denom"> / 100</span>
                </span>
                <span className="t-star-badge">
                  ★ <span className="tot-num">{starRating}</span>
                  <span className="tot-denom"> / 5.0</span>
                </span>
              </div>
            </div>

            <div className="t-rating-grid">
              {RATING_CRITERIA.map(c => (
                <div key={c.key} className="t-rating-row">
                  <div className="t-r-labels">
                    <span className="t-r-ko">{c.label}</span>
                    <span className="t-r-en">{c.sub}</span>
                  </div>
                  <div className="t-r-input-wrap">
                    <input
                      id={`r-${c.key}`}
                      type="number"
                      className="t-r-input"
                      min={0}
                      max={c.max}
                      value={form[c.key]}
                      onChange={e => {
                        const raw = e.target.value
                        if (raw === '') { set(c.key, ''); return }
                        const n = Math.min(c.max, Math.max(0, Number(raw)))
                        set(c.key, isNaN(n) ? '' : n)
                      }}
                      placeholder="0"
                    />
                    <span className="t-r-max">/ {c.max}</span>
                    {/* 점수 바 */}
                    <div className="t-r-bar-bg">
                      <div
                        className="t-r-bar-fill"
                        style={{ width: `${((parseFloat(form[c.key]) || 0) / c.max) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 수평 구분선 */}
          <div className="t-h-rule"/>

          {/* ── 하단 입력 ── */}
          <div className="t-bottom-fields">
            <div className="t-fields-row">
              <div className="t-field">
                <label className="t-f-label" htmlFor="ticket-watched-date">본 날짜</label>
                <input
                  id="ticket-watched-date"
                  type="date"
                  className="t-f-input"
                  value={form.watchedDate}
                  onChange={e => set('watchedDate', e.target.value)}
                />
              </div>
              <div className="t-field">
                <label className="t-f-label" htmlFor="ticket-watched-place">본 장소</label>
                <input
                  id="ticket-watched-place"
                  type="text"
                  className="t-f-input"
                  value={form.watchedPlace}
                  onChange={e => set('watchedPlace', e.target.value)}
                  placeholder="CGV 강남, 집, ..."
                />
              </div>
            </div>
            <div className="t-field">
              <label className="t-f-label" htmlFor="ticket-memo">한줄평</label>
              <input
                id="ticket-memo"
                type="text"
                className="t-f-input"
                value={form.memo}
                onChange={e => set('memo', e.target.value)}
                placeholder="이 영화를 한 마디로..."
                maxLength={80}
              />
            </div>
          </div>

          <button
            id="ticket-save-btn"
            className="t-save-btn"
            onClick={handleSave}
            disabled={!form.title}
          >
            🎟  기록 저장
          </button>
        </div>

        {/* 톱니 분리선 오른쪽 */}
        <div className="t-perforation right-perf-line" aria-hidden="true">
          <div className="perf-notch-t"/>
          <div className="perf-dots"/>
          <div className="perf-notch-b"/>
        </div>

        {/* ── 오른쪽 스텁 (바코드) ── */}
        <div className="t-stub-right">
          <div className="barcode">
            <div className="barcode-bars"/>
            <div className="barcode-num">{barcodeNum}</div>
          </div>
          <div className="t-stub-right-info">
            <span className="stub-r-label">DATE</span>
            <span className="stub-r-val">{form.watchedDate || '—'}</span>
            <span className="stub-r-label">PLACE</span>
            <span className="stub-r-val">{form.watchedPlace || '—'}</span>
            <span className="stub-r-label">SCORE</span>
            <span className="stub-r-val score-val">{totalScore} pt</span>
          </div>
        </div>

      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════
   메인 App
═══════════════════════════════════════════════════ */
export default function App() {
  const [lightLevel, setLightLevel]   = useState(0)
  const [localFilter, setLocalFilter] = useState('')
  const [screenMode, setScreenMode]   = useState('theater')
  const [savedMovies, setSavedMovies] = useState(() =>
    JSON.parse(localStorage.getItem('0zong-films') || '[]')
  )

  const filmScrollRef = useRef(null)
  const handleFilmWheel = useCallback((e) => {
    e.preventDefault()
    if (filmScrollRef.current) filmScrollRef.current.scrollTop += e.deltaY * 0.6
  }, [])

  useEffect(() => {
    const el = filmScrollRef.current
    if (!el) return
    el.addEventListener('wheel', handleFilmWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleFilmWheel)
  }, [handleFilmWheel])

  const handleLight = () => setLightLevel(p => (p + 1) % LIGHT_LEVELS.length)
  const current = LIGHT_LEVELS[lightLevel]

  /* 저장된 영화 필터링 (제목 | 한줄평) */
  const filteredMovies = useMemo(() => {
    if (!localFilter.trim()) return savedMovies
    const q = localFilter.toLowerCase()
    return savedMovies.filter(m =>
      m.title?.toLowerCase().includes(q) || m.memo?.toLowerCase().includes(q)
    )
  }, [savedMovies, localFilter])

  /* 영화 저장 콜백 */
  const handleSave = (entry) => {
    setSavedMovies(prev => [entry, ...prev.filter(m => m.id !== entry.id)])
  }

  /* 필름 스트립 아이템 구성 */
  const isEmpty    = savedMovies.length === 0
  const emptySlots = Array.from({ length: TOTAL_EMPTY_SLOTS }, (_, i) => ({
    id: `empty-${i}`, empty: true, num: i + 1,
  }))
  const stripItems = isEmpty ? emptySlots : filteredMovies
  const loopItems  = isEmpty ? [...stripItems, ...stripItems] : stripItems

  return (
    <div className="app-root">

      {/* 조명 오버레이 */}
      <motion.div
        className="dim-overlay"
        animate={{ backgroundColor: current.overlay }}
        transition={{ duration: 0.9, ease: 'easeInOut' }}
        aria-hidden="true"
      />

      {/* ══════════ 상단 마키 간판 ══════════ */}
      <header className="marquee-header">
        <div className="marquee-track top-track" aria-hidden="true">
          <div className="marquee-inner">
            <span>{MARQUEE_TEXT}</span><span>{MARQUEE_TEXT}</span>
          </div>
        </div>

        <div className="header-main">
          {/* 로컬 검색 (저장된 영화 필터) */}
          <div className="search-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="search-svg">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              id="search-input"
              type="text"
              className="search-input"
              placeholder="내 영화 검색..."
              value={localFilter}
              onChange={e => setLocalFilter(e.target.value)}
              aria-label="저장된 영화 검색"
            />
            {localFilter && (
              <button
                className="search-clear"
                onClick={() => setLocalFilter('')}
                aria-label="검색어 지우기"
              >✕</button>
            )}
          </div>

          {/* 브랜드 */}
          <div className="brand-title" aria-label="0zong Cinema">
            <span className="brand-deco">★</span>
            <div className="brand-wrap">
              <h1 className="brand-name">0ZONG</h1>
              <p className="brand-sub">CINEMA</p>
            </div>
            <span className="brand-deco">★</span>
          </div>

          {/* ADD FILM 토글 버튼 */}
          <button
            id="add-movie-btn"
            className={`add-btn ${screenMode === 'ticket' ? 'btn-cancel' : ''}`}
            onClick={() => setScreenMode(m => m === 'ticket' ? 'theater' : 'ticket')}
            aria-label={screenMode === 'ticket' ? '취소' : '영화 추가'}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="15" height="15">
              {screenMode === 'ticket' ? (
                <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
              ) : (
                <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>
              )}
            </svg>
            {screenMode === 'ticket' ? 'CANCEL' : 'ADD FILM'}
          </button>
        </div>

        <div className="marquee-track bottom-track" aria-hidden="true">
          <div className="marquee-inner reverse">
            <span>{MARQUEE_TEXT}</span><span>{MARQUEE_TEXT}</span>
          </div>
        </div>
      </header>

      {/* ══════════ 메인 콘텐츠 ══════════ */}
      <div className="main-layout">

        {/* ── 왼쪽 필름 스트립 ── */}
        <aside className="film-strip-container" aria-label="영화 목록">
          <div className="film-strip-scroll" ref={filmScrollRef}>
            {!isEmpty && filteredMovies.length === 0 ? (
              <div className="film-no-results">
                <span>결과 없음</span>
              </div>
            ) : (
              <motion.div
                className="film-strip-track"
                animate={isEmpty ? { y: [0, -(TOTAL_EMPTY_SLOTS * 130)] } : {}}
                transition={isEmpty ? {
                  duration: TOTAL_EMPTY_SLOTS * 5,
                  repeat: Infinity,
                  ease: 'linear',
                  repeatType: 'loop',
                } : {}}
              >
                {loopItems.map((movie, i) => (
                  <div key={`${movie.id}-${i}`} className="film-unit">
                    <div className="perf-col left-perf">
                      <div className="perf-hole"/><div className="perf-hole"/>
                    </div>
                    <motion.div
                      className={`film-poster-frame ${movie.empty ? 'is-empty' : 'has-movie'}`}
                      whileHover={{ scale: 1.05 }}
                      transition={{ duration: 0.18 }}
                      role="button"
                      tabIndex={0}
                      aria-label={movie.empty ? `빈 슬롯 ${movie.num}` : movie.title}
                    >
                      {movie.empty ? (
                        <div className="poster-empty">
                          <span className="poster-num">{String(movie.num).padStart(2, '0')}</span>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="poster-icon">
                            <rect x="2" y="2" width="20" height="20" rx="2"/>
                            <polygon points="10,8 16,12 10,16"/>
                          </svg>
                        </div>
                      ) : movie.posterPath ? (
                        <img
                          src={posterUrl(movie.posterPath, 'w92')}
                          alt={movie.title}
                          className="film-poster-img"
                        />
                      ) : (
                        <div className="poster-empty">
                          <span className="poster-num">{movie.title?.[0] || '?'}</span>
                        </div>
                      )}
                    </motion.div>
                    <div className="perf-col right-perf">
                      <div className="perf-hole"/><div className="perf-hole"/>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </div>

          <div className="film-fade-top"    aria-hidden="true"/>
          <div className="film-fade-bottom" aria-hidden="true"/>
          <div className="film-count-badge">{savedMovies.length} FILMS</div>
        </aside>

        {/* ── 가운데 영화관 영역 ── */}
        <section
          className={`theater-section ${screenMode === 'ticket' ? 'ticket-mode' : ''}`}
          aria-label="영화관"
        >
          {/* 천장 조명 */}
          <div className="ceiling">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="ceiling-light">
                <div className="ceiling-beam" style={{ '--angle': `${(i - 2.5) * 6}deg` }}/>
                <div className="ceiling-bulb"/>
              </div>
            ))}
          </div>

          {/* 스크린 */}
          <div className={`screen-area ${screenMode === 'ticket' ? 'screen-expanded' : ''}`}>
            <div className="wall left-wall"/>
            <div className="screen-frame-wrap">
              <AnimatePresence mode="wait">
                {screenMode === 'theater' ? (
                  <motion.div
                    key="theater-view"
                    className="screen-surface"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.35 }}
                  >
                    <div className="screen-msg">
                      <p className="screen-msg-main">간단 정보 &amp; 크레딧 처럼</p>
                      <p className="screen-msg-sub">영화를 추가하면 여기에 표시됩니다</p>
                    </div>
                    <motion.div
                      className="proj-beam"
                      animate={{ opacity: [0, 0.06, 0] }}
                      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                      aria-hidden="true"
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="ticket-view"
                    className="screen-surface ticket-screen"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                  >
                    <TicketForm
                      onClose={() => setScreenMode('theater')}
                      onSave={handleSave}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="wall right-wall"/>
          </div>

          {/* 좌석 */}
          <div className={`seats-area ${screenMode === 'ticket' ? 'seats-compact' : ''}`}>
            {SEAT_CONFIG.map((row, ri) => (
              <div
                key={ri}
                className="seat-row"
                style={{ paddingInline: `${row.shrink}px` }}
                aria-hidden="true"
              >
                {[...Array(row.count)].map((_, si) => (
                  <div key={si} className="seat">
                    <div className="seat-back"/>
                    <div className="seat-base"/>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ══════════ 조명 버튼 ══════════ */}
      <motion.button
        id="light-btn"
        className="light-btn"
        onClick={handleLight}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        aria-label={`조명: ${current.label}`}
        title={current.label}
      >
        <AnimatePresence mode="wait">
          <motion.span
            key={lightLevel}
            className="light-emoji"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.25 }}
          >{current.icon}</motion.span>
        </AnimatePresence>
        <span className="level-pips" aria-hidden="true">
          {LIGHT_LEVELS.map((_, i) => (
            <span key={i} className={`pip ${i <= lightLevel ? 'on' : ''}`}/>
          ))}
        </span>
      </motion.button>

    </div>
  )
}
