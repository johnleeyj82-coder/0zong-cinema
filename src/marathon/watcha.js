/**
 * watcha.js: 100점 채점을 왓챠피디아 별점(0.5 단위, 5점 만점)으로 바꾸기
 * - 그대로: 100점 / 20
 * - 내 분포 보정: 지금까지 기록이 10편 이상이면, 내 평균과 흩어짐을 기준으로
 *   평균 3.5점, 표준편차 0.8점 분포에 맞춰요. 점수가 한쪽으로 몰리는 걸 막아요.
 */
const half = v => Math.min(5, Math.max(0.5, Math.round(v * 2) / 2))

export function watchaRaw(total) { return half(total / 20) }

export function watchaCalibrated(total, history) {
  const xs = (history || []).map(h => +h.totalScore).filter(Number.isFinite)
  if (xs.length < 10) return null
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length
  const sd = Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length) || 1
  return half(3.5 + 0.8 * ((total - mean) / sd))
}

export const starText = v => (v == null ? '-' : v.toFixed(1))
