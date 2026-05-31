import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence, useAnimationControls } from 'framer-motion'
import './App.css'

/* ─────────────────────────────────────────────
   마키 텍스트 (상단 간판 흐르는 글자)
───────────────────────────────────────────── */
const MARQUEE_TEXT =
  'FILMS MAKE YOUR LIFE BETTER · SEE YOU AT THE MOVIE · 0ZONG CINEMA · GOOD FILMS MAKE YOUR LIFE BETTER · FILM IS ABOUT TO START · '

/* ─────────────────────────────────────────────
   조명 단계 설정
───────────────────────────────────────────── */
const LIGHT_LEVELS = [
  { overlay: 'rgba(0,0,0,0)',    icon: '💡', label: '밝게' },
  { overlay: 'rgba(0,0,0,0.35)', icon: '🕯️', label: '조금 어둡게' },
  { overlay: 'rgba(0,0,0,0.65)', icon: '🌑', label: '많이 어둡게' },
]

/* ─────────────────────────────────────────────
   더미 영화 슬롯 (나중에 실제 데이터로 교체)
───────────────────────────────────────────── */
const TOTAL_SLOTS = 12

/* ─────────────────────────────────────────────
   좌석 구성
───────────────────────────────────────────── */
const SEAT_CONFIG = [
  { count: 13, shrink: 0 },
  { count: 12, shrink: 20 },
  { count: 11, shrink: 40 },
  { count: 10, shrink: 60 },
  { count: 9,  shrink: 80 },
]

export default function App() {
  const [lightLevel, setLightLevel] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const filmScrollRef = useRef(null)

  const handleLight = () => setLightLevel(prev => (prev + 1) % LIGHT_LEVELS.length)
  const current = LIGHT_LEVELS[lightLevel]

  /* 마우스 휠로 필름 스트립 수동 스크롤 */
  const handleFilmWheel = (e) => {
    e.preventDefault()
    if (filmScrollRef.current) {
      filmScrollRef.current.scrollTop += e.deltaY * 0.6
    }
  }

  useEffect(() => {
    const el = filmScrollRef.current
    if (!el) return
    el.addEventListener('wheel', handleFilmWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleFilmWheel)
  }, [])

  return (
    <div className="app-root">

      {/* ══ 조명 오버레이 ══════════════════════════════ */}
      <motion.div
        className="dim-overlay"
        animate={{ backgroundColor: current.overlay }}
        transition={{ duration: 0.9, ease: 'easeInOut' }}
        aria-hidden="true"
      />

      {/* ══ 상단 마키 간판 ═════════════════════════════ */}
      <header className="marquee-header">
        {/* 위쪽 흐르는 텍스트 줄 */}
        <div className="marquee-track top-track" aria-hidden="true">
          <div className="marquee-inner">
            <span>{MARQUEE_TEXT}</span>
            <span>{MARQUEE_TEXT}</span>
          </div>
        </div>

        {/* 중앙 메인 바 */}
        <div className="header-main">
          {/* 검색창 */}
          <div className="search-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="search-svg">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              id="search-input"
              type="text"
              className="search-input"
              placeholder="영화 검색..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              aria-label="영화 검색"
            />
          </div>

          {/* 0zong 타이틀 */}
          <div className="brand-title" aria-label="0zong Cinema">
            <span className="brand-deco">★</span>
            <div className="brand-wrap">
              <h1 className="brand-name">0ZONG</h1>
              <p className="brand-sub">CINEMA</p>
            </div>
            <span className="brand-deco">★</span>
          </div>

          {/* + 추가 버튼 */}
          <button id="add-movie-btn" className="add-btn" aria-label="영화 추가">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            ADD FILM
          </button>
        </div>

        {/* 아래쪽 흐르는 텍스트 줄 */}
        <div className="marquee-track bottom-track" aria-hidden="true">
          <div className="marquee-inner reverse">
            <span>{MARQUEE_TEXT}</span>
            <span>{MARQUEE_TEXT}</span>
          </div>
        </div>
      </header>

      {/* ══ 메인 콘텐츠 ═══════════════════════════════ */}
      <div className="main-layout">

        {/* ── 왼쪽 필름 스트립 ────────────────────────── */}
        <aside className="film-strip-container" aria-label="영화 목록">
          <div className="film-strip-scroll" ref={filmScrollRef}>
            {/* 필름 내부: 자동 스크롤 애니메이션 */}
            <motion.div
              className="film-strip-track"
              animate={{ y: [0, -((TOTAL_SLOTS * 130) / 2)] }}
              transition={{
                duration: TOTAL_SLOTS * 6,
                repeat: Infinity,
                ease: 'linear',
                repeatType: 'loop',
              }}
            >
              {/* 슬롯을 2배로 복제해서 무한 루프 */}
              {[...Array(TOTAL_SLOTS * 2)].map((_, i) => {
                const idx = i % TOTAL_SLOTS
                return (
                  <div key={i} className="film-unit">
                    {/* 왼쪽 구멍 열 */}
                    <div className="perf-col left-perf">
                      <div className="perf-hole" />
                      <div className="perf-hole" />
                    </div>

                    {/* 포스터 프레임 */}
                    <motion.div
                      className="film-poster-frame"
                      whileHover={{ scale: 1.04, zIndex: 5 }}
                      transition={{ duration: 0.18 }}
                      role="button"
                      tabIndex={0}
                      aria-label={`영화 슬롯 ${idx + 1}`}
                    >
                      <div className="poster-empty">
                        <span className="poster-num">{String(idx + 1).padStart(2, '0')}</span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="poster-icon">
                          <rect x="2" y="2" width="20" height="20" rx="2"/>
                          <polygon points="10,8 16,12 10,16"/>
                        </svg>
                      </div>
                    </motion.div>

                    {/* 오른쪽 구멍 열 */}
                    <div className="perf-col right-perf">
                      <div className="perf-hole" />
                      <div className="perf-hole" />
                    </div>
                  </div>
                )
              })}
            </motion.div>
          </div>

          {/* 상하 그라데이션 페이드 */}
          <div className="film-fade-top"    aria-hidden="true" />
          <div className="film-fade-bottom" aria-hidden="true" />
        </aside>

        {/* ── 가운데 영화관 ───────────────────────────── */}
        <section className="theater-section" aria-label="영화관 스크린">

          {/* 천장 + 천장 조명들 */}
          <div className="ceiling">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="ceiling-light">
                <div className="ceiling-beam" style={{ '--angle': `${(i - 2.5) * 6}deg` }} />
                <div className="ceiling-bulb" />
              </div>
            ))}
          </div>

          {/* 좌우 벽 + 스크린 */}
          <div className="screen-area">
            <div className="wall left-wall" />
            <div className="screen-frame-wrap">
              <div className="screen-surface">
                {/* 스크린 빈 상태 안내 */}
                <div className="screen-msg">
                  <p className="screen-msg-main">간단 정보 &amp; 크레딧 처럼</p>
                  <p className="screen-msg-sub">영화를 추가하면 여기에 표시됩니다</p>
                </div>
                {/* 영사기 빔 효과 */}
                <motion.div
                  className="proj-beam"
                  animate={{ opacity: [0.0, 0.06, 0.0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  aria-hidden="true"
                />
              </div>
            </div>
            <div className="wall right-wall" />
          </div>

          {/* 좌석 구역 */}
          <div className="seats-area">
            {SEAT_CONFIG.map((row, ri) => (
              <div
                key={ri}
                className="seat-row"
                style={{ paddingInline: `${row.shrink}px` }}
                aria-hidden="true"
              >
                {[...Array(row.count)].map((_, si) => (
                  <div key={si} className="seat">
                    <div className="seat-back" />
                    <div className="seat-base" />
                  </div>
                ))}
              </div>
            ))}
          </div>

        </section>
      </div>

      {/* ══ 우하단 조명 버튼 ═══════════════════════════ */}
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
          >
            {current.icon}
          </motion.span>
        </AnimatePresence>
        {/* 단계 인디케이터 */}
        <span className="level-pips" aria-hidden="true">
          {LIGHT_LEVELS.map((_, i) => (
            <span key={i} className={`pip ${i <= lightLevel ? 'on' : ''}`} />
          ))}
        </span>
      </motion.button>

    </div>
  )
}
