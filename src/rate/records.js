/**
 * records.js: 채점 기록 (기존 '0zong-films' 저장 형식 그대로 써서 예전 기록도 보여요)
 */
import { create } from 'zustand'

export const CRITERIA = [
  { key: 'engagement', label: '몰입감', hint: '재미, 시간 가는 줄 몰랐나', max: 25 },
  { key: 'aftertaste', label: '여운', hint: '끝나고도 생각나나', max: 20 },
  { key: 'story', label: '서사', hint: '이야기와 메시지', max: 20 },
  { key: 'character', label: '인물', hint: '캐릭터와 연기', max: 15 },
  { key: 'visual', label: '연출', hint: '화면과 소리', max: 15 },
  { key: 'personal', label: '취향', hint: '그냥 내 마음', max: 5 },
]

const KEY = '0zong-films'
const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] } }
const save = list => { try { localStorage.setItem(KEY, JSON.stringify(list)) } catch { /* 저장 공간이 없으면 화면에만 남아요 */ } }

export const totalOf = r => CRITERIA.reduce((a, c) => a + (Number(r[c.key]) || 0), 0)

export const useRecords = create((set, get) => ({
  list: load(),
  upsert: rec => {
    const list = get().list
    const i = list.findIndex(x => x.id === rec.id)
    const next = i >= 0 ? list.map(x => (x.id === rec.id ? rec : x)) : [rec, ...list]
    save(next); set({ list: next }); return rec
  },
  remove: id => { const next = get().list.filter(x => x.id !== id); save(next); set({ list: next }) },
}))
