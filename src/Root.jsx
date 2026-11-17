import { useState, lazy, Suspense } from 'react'
import { motion, AnimatePresence, MotionConfig } from 'framer-motion'
import Records from './rate/Records.jsx'
import RateSheet from './rate/RateSheet.jsx'
import Planner from './marathon/Planner.jsx'
import { useMarathon } from './marathon/store.js'
import './marathon/marathon.css'

const Summary = lazy(() => import('./marathon/Summary.jsx'))
const Settings = lazy(() => import('./marathon/Settings.jsx'))

const TABS = [
  { key: 'plan', label: '마라톤', en: 'PLAN' },
  { key: 'rate', label: '기록', en: 'FILMS' },
  { key: 'report', label: '결산', en: 'REPORT' },
  { key: 'set', label: '설정', en: 'SET' },
]

export default function Root() {
  const [tab, setTab] = useState('plan')
  const [rating, setRating] = useState(null)   // 채점할 회차
  const markRated = useMarathon(s => s.markRated)

  const openRate = s => setRating(s)
  const onSaved = entry => {
    if (rating) markRated(rating.id, { recordId: entry.id, total: entry.totalScore, star: entry.watchaStar ?? entry.totalScore / 20 })
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className={`root-shell tab-${tab}`}>
        <main className="root-pane">
          {tab === 'plan' && <Planner onRate={openRate} />}
          {tab === 'rate' && <Records />}
          <Suspense fallback={<div className="mm-empty center">불러오는 중...</div>}>
            {tab === 'report' && <Summary onRate={openRate} />}
            {tab === 'set' && <Settings />}
          </Suspense>
        </main>

        <nav className="root-tabs" aria-label="화면">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} aria-current={tab === t.key ? 'page' : undefined}>
              {tab === t.key && <motion.span layoutId="tab-active" className="root-tab-active" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
              <span className="en">{t.en}</span><span className="ko">{t.label}</span>
            </button>
          ))}
        </nav>

        <AnimatePresence>
          {rating && (
            <RateSheet
              query={rating.title}
              initial={{ watchedDate: rating.date, watchedPlace: rating.theater }}
              onClose={() => setRating(null)}
              onSaved={onSaved}
            />
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  )
}
