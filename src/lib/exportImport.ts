import type { LifelogData } from '../types'

export function exportData(data: LifelogData): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `lifelog-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function parseImport(text: string): LifelogData {
  const data = JSON.parse(text)
  if (!data || !Array.isArray(data.habits) || !Array.isArray(data.entries) || !data.settings) {
    throw new Error('Invalid Lifelog backup file.')
  }
  return data as LifelogData
}
