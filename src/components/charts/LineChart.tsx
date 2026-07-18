import { useId } from 'react'

interface LineChartProps {
  data: number[]
  height?: number
  max?: number
  color?: string
  area?: boolean
}

export function LineChart({ data, height = 160, max = 100, color = 'rgb(var(--accent))', area = true }: LineChartProps) {
  const id = useId().replace(/:/g, '')
  const n = data.length
  const pad = 8
  const x = (i: number) => (n <= 1 ? 50 : (i / (n - 1)) * 100)
  const y = (v: number) => 100 - pad - (Math.max(0, Math.min(max, v)) / max) * (100 - pad * 2)

  if (n === 0) return <div style={{ height }} className="flex items-center justify-center text-sm text-muted">No data yet.</div>

  const line = data.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(2)},${y(v).toFixed(2)}`).join(' ')
  const areaPath = `${line} L${x(n - 1).toFixed(2)},100 L${x(0).toFixed(2)},100 Z`

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height }} role="img">
      <defs>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {area && <path d={areaPath} fill={`url(#g${id})`} />}
      <path d={line} fill="none" stroke={color} strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}
