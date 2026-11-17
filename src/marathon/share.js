/**
 * share.js: 만든 이미지를 저장·공유하기
 * 앱에서는 파일로 쓴 뒤 공유 창을 열어요(갤러리 저장, 카톡 전송 등).
 * 웹에서는 바로 내려받아요.
 */
import { Capacitor } from '@capacitor/core'

export async function saveCanvas(canvas, filename) {
  const dataUrl = canvas.toDataURL('image/png')
  if (Capacitor.isNativePlatform()) {
    const { Filesystem, Directory } = await import('@capacitor/filesystem')
    const { Share } = await import('@capacitor/share')
    const res = await Filesystem.writeFile({ path: filename, data: dataUrl.split(',')[1], directory: Directory.Cache })
    await Share.share({ title: filename, files: [res.uri] })
    return 'shared'
  }
  const a = document.createElement('a')
  a.href = dataUrl; a.download = filename; a.click()
  return 'downloaded'
}

/** 회차가 끝나고 10분 뒤 "채점하러 가기" 알림 */
export async function scheduleRateReminder(sess) {
  if (!Capacitor.isNativePlatform() || sess.en == null) return
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    const perm = await LocalNotifications.requestPermissions()
    if (perm.display !== 'granted') return
    const at = new Date(sess.date + 'T00:00:00'); at.setMinutes(sess.en + 10)
    if (at < new Date()) return
    await LocalNotifications.schedule({ notifications: [{
      id: Math.abs(hash(sess.id)), title: `${sess.title} 어땠어요?`,
      body: '30초 채점하고 왓챠 별점도 바로 복사해요.', schedule: { at },
    }] })
  } catch { /* 알림이 안 돼도 앱은 그대로 동작해요 */ }
}
export async function cancelRateReminder(sess) {
  if (!Capacitor.isNativePlatform()) return
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    await LocalNotifications.cancel({ notifications: [{ id: Math.abs(hash(sess.id)) }] })
  } catch { /* noop */ }
}
function hash(s) { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return h % 2000000000 }
