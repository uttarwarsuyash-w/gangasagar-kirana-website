'use client'
// Single-series bar chart (one hue, no legend: the title names it). Thin bars with 4px rounded
// data-ends on the baseline, 2px gaps, recessive grid, hover tooltip and a table view.
import { useState } from 'react'

export function BarChart({ data, format, label, height = 180 }: { data: { x: string; y: number }[]; format: (n: number) => string; label: string; height?: number }) {
  const [hover, setHover] = useState<number | null>(null)
  const [table, setTable] = useState(false)
  const max = Math.max(1, ...data.map((d) => d.y))
  const nice = niceMax(max)
  const W = 640
  const pad = { l: 44, r: 8, t: 10, b: 24 }
  const iw = W - pad.l - pad.r
  const ih = height - pad.t - pad.b
  const bw = iw / data.length
  const ticks = [0, nice / 2, nice]
  return (
    <div>
      <div className="mb-2 flex justify-end">
        <button className="text-[0.8rem] text-muted underline" onClick={() => setTable(!table)}>
          {table ? 'Show chart' : 'Show table'}
        </button>
      </div>
      {table ? (
        <table className="w-full text-[0.9rem]">
          <caption className="sr-only">{label}</caption>
          <tbody>
            {data.map((d) => (
              <tr key={d.x} className="border-b border-line">
                <td className="py-1.5">{d.x}</td>
                <td className="py-1.5 text-right tnum">{format(d.y)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="relative">
          <svg viewBox={`0 0 ${W} ${height}`} className="w-full" role="img" aria-label={label} onMouseLeave={() => setHover(null)}>
            {ticks.map((t) => {
              const y = pad.t + ih - (t / nice) * ih
              return (
                <g key={t}>
                  <line x1={pad.l} x2={W - pad.r} y1={y} y2={y} stroke="var(--color-line)" strokeWidth="1" />
                  <text x={pad.l - 6} y={y + 4} textAnchor="end" fontSize="10" fill="var(--color-muted)">
                    {format(t)}
                  </text>
                </g>
              )
            })}
            {data.map((d, i) => {
              const h = (d.y / nice) * ih
              const x = pad.l + i * bw + 1
              const w = Math.max(2, bw - 2)
              const y = pad.t + ih - h
              const r = Math.min(4, w / 2, h)
              return (
                <g key={d.x} onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} tabIndex={0} aria-label={`${d.x}: ${format(d.y)}`}>
                  <rect x={pad.l + i * bw} y={pad.t} width={bw} height={ih} fill="transparent" />
                  {h > 0 && <path d={`M${x} ${pad.t + ih} V${y + r} Q${x} ${y} ${x + r} ${y} H${x + w - r} Q${x + w} ${y} ${x + w} ${y + r} V${pad.t + ih} Z`} fill={hover === i ? 'var(--color-brand-dark)' : 'var(--color-brand)'} />}
                  {(i === 0 || i === data.length - 1 || data.length <= 8 || i % Math.ceil(data.length / 7) === 0) && (
                    <text x={pad.l + i * bw + bw / 2} y={height - 6} textAnchor="middle" fontSize="10" fill="var(--color-muted)">
                      {d.x}
                    </text>
                  )}
                </g>
              )
            })}
          </svg>
          {hover != null && (
            <div className="pointer-events-none absolute -translate-x-1/2 rounded-lg bg-ink px-2.5 py-1.5 text-[0.8rem] text-paper shadow-lg" style={{ left: `${((pad.l + hover * bw + bw / 2) / W) * 100}%`, top: 0 }}>
              <span className="text-paper/70">{data[hover].x}</span> <span className="font-semibold tnum">{format(data[hover].y)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function niceMax(v: number) {
  const p = Math.pow(10, Math.floor(Math.log10(v)))
  for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= v) return m * p
  return 10 * p
}
