import { useEffect, useState } from 'react'
import { useMarathon, defaultWindows, isFullDay, MAX_DAYS } from './store.js'
import { cgvSites, hm, toMin } from './providers.js'
import { CHAINS, CINEQ, INDIE } from './theaters.js'

const Head = ({ chain, children }) => <h2 className="set-h" style={{ '--ch': CHAINS[chain].color }}><i />{children}</h2>

const WD = ['일', '월', '화', '수', '목', '금', '토']

export default function Settings() {
  const st = useMarathon()
  const [regions, setRegions] = useState(null)
  const [cgvErr, setCgvErr] = useState('')
  const [region, setRegion] = useState('서울')
  const [mega, setMega] = useState({ code: '', name: '' })

  useEffect(() => { cgvSites().then(setRegions).catch(() => setCgvErr('CGV 지점 목록을 못 불러왔어요. 앱에서 열면 보여요.')) }, [])

  const dates = st.dates()
  const setWin = (d, i, j, v) => { const w = st.windowsOf(d).map(x => [...x]); w[i][j] = toMin(v) + (j === 1 && toMin(v) < w[i][0] ? 1440 : 0); st.setWindows(d, w) }
  const fmtIn = m => hm(m % 1440)

  return (
    <div className="mm mm-set">
      <header className="mm-top"><div className="mm-lbl">SETTINGS</div><h1 className="mm-h1">내 기간과 극장</h1></header>

      <section className="mm-card">
        <h2>기간</h2>
        <p className="mm-help" style={{ marginTop: 0 }}>항상 오늘부터 시작해요. 며칠까지 볼지 골라 주세요.</p>
        <div className="set-days">
          {Array.from({ length: MAX_DAYS }, (_, i) => i + 1).map(n => (
            <button key={n} aria-pressed={st.days === n} onClick={() => st.set({ days: n })}>{n}일</button>
          ))}
        </div>
        <p className="mm-help">극장들은 보통 1주일 치 시간표만 미리 열어요. 뒤쪽 날짜는 비어 있을 수 있어요.</p>
      </section>

      <section className="mm-card">
        <h2>내가 볼 수 있는 시간</h2>
        <p className="mm-help">기본은 종일이에요(첫 회부터 새벽 막차까지). 오늘은 지금 이후에 시작하는 회차만 보여줘요. 자정 넘는 시간은 끝 시간을 작게 넣으면 다음 날로 계산해요.</p>
        {dates.map(d => {
          const x = new Date(d + 'T00:00:00'); const w = st.windowsOf(d)
          return (
            <div key={d} className="mm-win">
              <b>{x.getMonth() + 1}.{x.getDate()} {WD[x.getDay()]}</b>
              <div className="mm-win-list">
                {isFullDay(w) && <span className="set-full">종일</span>}
                {!isFullDay(w) && !w.length && <span className="set-full off">못 가요</span>}
                {!isFullDay(w) && w.map(([a, b], i) => (
                  <span key={i} className="mm-range">
                    <input type="time" value={fmtIn(a)} onChange={e => setWin(d, i, 0, e.target.value)} />
                    <span>-</span>
                    <input type="time" value={fmtIn(b)} onChange={e => setWin(d, i, 1, e.target.value)} />
                    <button aria-label="이 시간대 빼기" onClick={() => st.setWindows(d, w.filter((_, k) => k !== i))}>×</button>
                  </span>
                ))}
                <button className="mm-btn ghost sm" onClick={() => st.setWindows(d, isFullDay(w) ? [[18 * 60, 27 * 60]] : [...w, [18 * 60, 27 * 60]])}>{isFullDay(w) ? '시간 정하기' : '시간대 추가'}</button>
                {!isFullDay(w) && <button className="mm-btn ghost sm" onClick={() => st.setWindows(d, defaultWindows())}>종일</button>}
                {!!w.length && <button className="mm-btn ghost sm" onClick={() => st.setWindows(d, [])}>못 가요</button>}
              </div>
            </div>
          )
        })}
      </section>

      <section className="mm-card">
        <Head chain="cgv">CGV</Head>
        {cgvErr && <p className="mm-help">{cgvErr}</p>}
        <div className="mm-chips">{st.cgvPicked.map(n => <button key={n} className="mm-chip on" onClick={() => st.set({ cgvPicked: st.cgvPicked.filter(x => x !== n) })}>{n} ×</button>)}</div>
        {regions && <>
          <select value={region} onChange={e => setRegion(e.target.value)}>{regions.map(r => <option key={r.region}>{r.region}</option>)}</select>
          <div className="mm-chips">{regions.find(r => r.region === region)?.sites.filter(s => !st.cgvPicked.includes(s.name)).map(s =>
            <button key={s.code} className="mm-chip" onClick={() => st.set({ cgvPicked: [...st.cgvPicked, s.name], cgvCodes: { ...st.cgvCodes, [s.name]: s.code } })}>+ {s.name}</button>)}</div>
        </>}
      </section>

      <section className="mm-card">
        <Head chain="mega">메가박스</Head>
        <div className="mm-chips">
          {st.mega.map(t => <button key={t.code} className="mm-chip on" onClick={() => st.set({ mega: st.mega.filter(x => x.code !== t.code) })}>{t.name.replace('메가박스 ', '')} ×</button>)}
        </div>
        <div className="mm-row">
          <label>지점번호<input inputMode="numeric" placeholder="예: 1372" value={mega.code} onChange={e => setMega({ ...mega, code: e.target.value.trim() })} /></label>
          <label>이름<input placeholder="예: 강남" value={mega.name} onChange={e => setMega({ ...mega, name: e.target.value })} /></label>
          <button className="mm-btn sm" disabled={!mega.code || !mega.name} onClick={() => { st.set({ mega: [...st.mega, { code: mega.code, name: `메가박스 ${mega.name.replace(/^메가박스\s*/, '')}` }] }); setMega({ code: '', name: '' }) }}>추가</button>
        </div>
        <p className="mm-help">지점번호는 메가박스 웹 극장 페이지 주소의 brchNo 값이에요.</p>
      </section>

      <section className="mm-card">
        <Head chain="cineq">씨네Q</Head>
        <div className="mm-chips">
          {CINEQ.map(t => <button key={t.code} className={`mm-chip ${st.cineqOn ? 'on' : ''}`} onClick={() => st.set({ cineqOn: !st.cineqOn })}>{st.cineqOn ? '' : '+ '}{t.name.replace('씨네Q ', '')}{st.cineqOn ? ' ×' : ''}</button>)}
        </div>
      </section>

      <section className="mm-card">
        <Head chain="dtryx">독립·예술영화관</Head>
        <div className="mm-chips">
          {INDIE.map(t => {
            const on = st.indie.includes(t.code)
            return <button key={t.code} className={`mm-chip ${on ? 'on' : ''}`} onClick={() => st.set({ indie: on ? st.indie.filter(c => c !== t.code) : [...st.indie, t.code] })}>
              {on ? '' : '+ '}{t.name} <small>{t.where}</small>{on ? ' ×' : ''}</button>
          })}
        </div>
        <p className="mm-help">디트릭스 예매를 쓰는 서울 독립·예술영화관이에요. 씨네큐브·필름포럼은 예매 방식이 달라 아직 못 넣었어요.</p>
      </section>

      <section className="mm-card">
        <h2>TMDB 키</h2>
        <p className="mm-help">포스터와 개봉일을 불러올 때 써요. 비워 두면 빌드할 때 넣은 키를 써요.</p>
        <input className="mm-wide" type="password" placeholder="TMDB API 키" value={st.tmdbKey} onChange={e => st.set({ tmdbKey: e.target.value.trim(), films: {} })} />
        <p className="mm-help small">This product uses the TMDB API but is not endorsed or certified by TMDB.</p>
      </section>

      <section className="mm-card">
        <h2>데이터</h2>
        <div className="mm-row">
          <button className="mm-btn ghost sm" onClick={() => st.set({ hidden: [] })}>숨긴 영화 다시 보기 ({st.hidden.length})</button>
          <button className="mm-btn ghost sm" onClick={() => st.set({ films: {} })}>포스터 정보 새로 받기</button>
        </div>
      </section>
    </div>
  )
}
