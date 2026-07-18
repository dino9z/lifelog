export function reminderTimeToNext(time: string): number {
  const [h, m] = time.split(':').map(Number)
  const now = new Date()
  const target = new Date()
  target.setHours(h, m, 0, 0)
  if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 1)
  return target.getTime() - now.getTime()
}

export function fireReminder(): void {
  if (!('Notification' in window)) return
  if (Notification.permission === 'granted') {
    new Notification('Lifelog · time to log', {
      body: 'A quick check-in keeps your streak alive.',
    })
  }
}

export async function ensurePermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied'
  if (Notification.permission === 'default') return Notification.requestPermission()
  return Notification.permission
}
