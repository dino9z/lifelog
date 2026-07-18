interface BarChartProps {
  data: { label: string; value: number }[]
  max?: number
  color?: string
}

export function BarChart({ data, max = 100, color = 'rgb(var(--accent))' }: BarChartProps) {
  if (!data.length) return <div className="py-8 text-center text-sm text-muted">No data yet.</div>
  return (
    <div className="flex h-40 items-end gap-1.5">
      {data.map((d) => (
        <div key={d.label} className="flex flex-1 flex-col items-center justify-end gap-1.5">
          <span className="text-[10px] font-medium text-muted">{d.value}%</span>
          <div
            className="w-full rounded-t-md transition-all"
            style={{ height: `${Math.max(2, (Math.min(max, d.value) / max) * 100)}%`, backgroundColor: color, opacity: d.value > 0 ? 0.35 + 0.65 * (d.value / max) : 0.12 }}
            title={`${d.label}: ${d.value}%`}
          />
          <span className="text-[10px] text-muted/80">{d.label}</span>
        </div>
      ))}
    </div>
  )
}
