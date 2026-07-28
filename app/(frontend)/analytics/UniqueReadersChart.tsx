'use client'

import { useRef, useState } from 'react'

export type SeriesPoint = { day: string; uniques: number; reads: number }

// One series — unique readers per day — so the chart needs no legend: the
// heading above it names what's plotted. Reads ride along in the tooltip as
// context, deliberately not drawn as a second line: two lines on one axis
// invite reading the gap between them as a quantity, and the gap here is just
// "people who came back the same day".
const INK = '#9A6B3F'
const SURFACE = '#fff'
const GRID = '#ededed'
const MUTED = '#999'

const W = 760
const H = 210
const PAD = { top: 16, right: 18, bottom: 26, left: 42 }
const PLOT_W = W - PAD.left - PAD.right
const PLOT_H = H - PAD.top - PAD.bottom

// Axis ticks land on numbers a person would say out loud. The steps are chosen
// so half of any of them is also round — the chart draws a midline — and so
// they're fine-grained enough that the line isn't stranded in the bottom third
// of the plot by a too-generous ceiling.
function niceMax(v: number): number {
  if (v <= 5) return 5
  const mag = 10 ** Math.floor(Math.log10(v))
  for (const step of [1, 1.5, 2, 3, 4, 5, 6, 8, 10]) {
    const candidate = step * mag
    if (candidate >= v) return candidate
  }
  return 10 * mag
}

function fmtDay(day: string, withYear = false): string {
  const d = new Date(`${day}T12:00:00Z`)
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(withYear ? { year: 'numeric' } : {}),
    timeZone: 'UTC',
  })
}

export default function UniqueReadersChart({ points }: { points: SeriesPoint[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  if (points.length < 2) return null

  const max = niceMax(Math.max(...points.map(p => p.uniques), 1))
  const x = (i: number) => PAD.left + (points.length === 1 ? PLOT_W / 2 : (i / (points.length - 1)) * PLOT_W)
  const y = (v: number) => PAD.top + PLOT_H - (v / max) * PLOT_H

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.uniques).toFixed(1)}`).join(' ')
  const area = `${line} L${x(points.length - 1).toFixed(1)},${(PAD.top + PLOT_H).toFixed(1)} L${x(0).toFixed(1)},${(PAD.top + PLOT_H).toFixed(1)} Z`

  // Label the peak, and the last point too when it's far enough away not to
  // collide. Never a number on every point.
  const peak = points.reduce((best, p, i) => (p.uniques > points[best].uniques ? i : best), 0)
  const last = points.length - 1
  const labelled = new Set<number>([peak])
  if (last - peak > Math.max(3, points.length * 0.12)) labelled.add(last)

  // Evenly spaced date ticks, always including both ends.
  const tickCount = Math.min(6, points.length)
  const ticks = Array.from({ length: tickCount }, (_, i) =>
    Math.round((i / (tickCount - 1)) * (points.length - 1))
  ).filter((v, i, a) => a.indexOf(v) === i)

  // The pointer only has to be closest to a date, not on the 2px line.
  function nearest(clientX: number): number | null {
    const svg = svgRef.current
    if (!svg) return null
    const box = svg.getBoundingClientRect()
    const px = ((clientX - box.left) / box.width) * W
    const i = Math.round(((px - PAD.left) / PLOT_W) * (points.length - 1))
    return Math.max(0, Math.min(points.length - 1, i))
  }

  const active = hover === null ? null : points[hover]

  return (
    <div style={{ position: 'relative' }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: 'auto', display: 'block', touchAction: 'pan-y' }}
        role="img"
        aria-label={`Unique readers per day. Peak ${points[peak].uniques} on ${fmtDay(points[peak].day)}.`}
        onPointerMove={e => setHover(nearest(e.clientX))}
        onPointerLeave={() => setHover(null)}
      >
        {/* gridlines — hairline, solid, recessive */}
        {[0, max / 2, max].map(v => (
          <g key={v}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} stroke={GRID} strokeWidth={1} />
            <text x={PAD.left - 8} y={y(v) + 3.5} textAnchor="end" fontSize={10} fill={MUTED} fontFamily="monospace">
              {v.toLocaleString()}
            </text>
          </g>
        ))}

        <path d={area} fill={INK} fillOpacity={0.1} />
        <path d={line} fill="none" stroke={INK} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {/* x ticks */}
        {ticks.map(i => (
          <text
            key={i}
            x={x(i)}
            y={H - 8}
            textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'}
            fontSize={10}
            fill={MUTED}
            fontFamily="monospace"
          >
            {fmtDay(points[i].day)}
          </text>
        ))}

        {/* selective direct labels */}
        {[...labelled].map(i => (
          <g key={`lbl-${i}`}>
            <circle cx={x(i)} cy={y(points[i].uniques)} r={4} fill={INK} stroke={SURFACE} strokeWidth={2} />
            <text
              x={Math.min(x(i), W - PAD.right - 14)}
              y={y(points[i].uniques) - 10}
              textAnchor={i === last ? 'end' : 'middle'}
              fontSize={11}
              fill="#555"
              fontFamily="monospace"
            >
              {points[i].uniques.toLocaleString()}
            </text>
          </g>
        ))}

        {/* crosshair */}
        {hover !== null && (
          <g pointerEvents="none">
            <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + PLOT_H} stroke={INK} strokeWidth={1} strokeOpacity={0.45} />
            <circle cx={x(hover)} cy={y(points[hover].uniques)} r={4.5} fill={INK} stroke={SURFACE} strokeWidth={2} />
          </g>
        )}

        {/* keyboard-reachable hit areas — same readout as hover */}
        {points.map((p, i) => (
          <rect
            key={p.day}
            x={x(i) - PLOT_W / (points.length - 1) / 2}
            y={PAD.top}
            width={PLOT_W / (points.length - 1)}
            height={PLOT_H}
            fill="transparent"
            tabIndex={0}
            role="button"
            aria-label={`${fmtDay(p.day, true)}: ${p.uniques} unique readers, ${p.reads} reads`}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
            style={{ outline: 'none' }}
          />
        ))}
      </svg>

      {active && hover !== null && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: `${(x(hover) / W) * 100}%`,
            transform: `translateX(${hover > points.length / 2 ? 'calc(-100% - 10px)' : '10px'})`,
            background: '#fff',
            border: '1px solid #e6e6e6',
            borderRadius: 6,
            boxShadow: '0 2px 10px rgba(0,0,0,0.07)',
            padding: '8px 10px',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            fontFamily: 'Georgia, serif',
          }}
        >
          <div style={{ fontSize: 11, color: MUTED, marginBottom: 3 }}>{fmtDay(active.day, true)}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span aria-hidden style={{ display: 'inline-block', width: 10, height: 2, background: INK }} />
            <b style={{ fontSize: 15, color: '#111' }}>{active.uniques.toLocaleString()}</b>
            <span style={{ fontSize: 11, color: MUTED }}>unique readers</span>
          </div>
          <div style={{ fontSize: 11, color: MUTED, marginTop: 2, paddingLeft: 16 }}>
            {active.reads.toLocaleString()} reads
          </div>
        </div>
      )}
    </div>
  )
}
