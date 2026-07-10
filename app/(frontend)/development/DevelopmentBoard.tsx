'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export type DevTask = {
  id: string
  title: string
  detail: string | null
  minutes: number
  paid: boolean
  paid_at: string | null
}

const ACCENT = '#9A6B3F'
const round1 = (n: number) => Math.round(n * 10) / 10

function fmt(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h && m) return `${h}h ${m}m`
  if (h) return `${h}h`
  return `${m}m`
}

export default function DevelopmentBoard({ tasks }: { tasks: DevTask[] }) {
  const router = useRouter()
  const supabase = createClient()
  const [busy, setBusy] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  async function run(fn: () => Promise<unknown>) {
    if (busy) return
    setBusy(true)
    try { await fn() ; router.refresh() } finally { setBusy(false) }
  }

  const totals = useMemo(() => {
    let total = 0, paid = 0
    for (const t of tasks) { total += t.minutes; if (t.paid) paid += t.minutes }
    return { total, paid, unpaid: total - paid }
  }, [tasks])

  const addTask = (title: string, detail: string) =>
    run(async () => { await supabase.from('dev_tasks').insert({ title, detail: detail || null }) })
  const bumpMinutes = (t: DevTask, delta: number) =>
    run(async () => { await supabase.from('dev_tasks').update({ minutes: Math.max(0, t.minutes + delta) }).eq('id', t.id) })
  const setMinutes = (t: DevTask, minutes: number) =>
    run(async () => { await supabase.from('dev_tasks').update({ minutes: Math.max(0, Math.round(minutes)) }).eq('id', t.id) })
  const deleteTask = (id: string) => run(async () => { await supabase.from('dev_tasks').delete().eq('id', id) })
  const setPaid = (ids: string[], paid: boolean) =>
    run(async () => {
      await supabase.from('dev_tasks').update({ paid, paid_at: paid ? new Date().toISOString() : null }).in('id', ids)
      setSelected(new Set())
    })
  const toggleSel = (id: string) =>
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })

  return (
    <div style={{ maxWidth: 940, margin: '0 auto', padding: '32px 24px', fontFamily: 'Georgia, serif' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 28, margin: 0 }}>Development</h1>
          <p style={{ color: '#888', fontSize: 13, marginTop: 4 }}>Tasks and time. Log as you go; mark paid once David settles.</p>
        </div>
        {selected.size > 0 && (
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn onClick={() => setPaid([...selected], true)} disabled={busy}>Mark {selected.size} paid</Btn>
            <Btn ghost onClick={() => setPaid([...selected], false)} disabled={busy}>Mark unpaid</Btn>
          </div>
        )}
      </div>

      <AddTaskForm onAdd={addTask} disabled={busy} />

      <div style={{ border: '1px solid #eee', borderRadius: 8, overflow: 'hidden', marginTop: 20 }}>
        {tasks.length === 0 ? (
          <div style={{ padding: '18px 16px', color: '#999', fontSize: 14 }}>No tasks yet. Add one above.</div>
        ) : tasks.map((t) => (
          <div key={t.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px', borderBottom: '1px solid #f3f3f3', background: t.paid ? '#FAFAF8' : '#fff' }}>
            <input type="checkbox" checked={selected.has(t.id)} onChange={() => toggleSel(t.id)} style={{ width: 16, height: 16, marginTop: 3 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, color: '#111' }}>{t.title}</div>
              {t.detail && <div style={{ fontSize: 13, color: '#777', marginTop: 2, whiteSpace: 'pre-wrap' }}>{t.detail}</div>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <EditableTime minutes={t.minutes} onSet={(h) => setMinutes(t, h * 60)} disabled={busy} />
              <MiniBtn onClick={() => bumpMinutes(t, 15)} disabled={busy}>+15m</MiniBtn>
              <MiniBtn onClick={() => bumpMinutes(t, 30)} disabled={busy}>+30m</MiniBtn>
              <MiniBtn onClick={() => bumpMinutes(t, 60)} disabled={busy}>+1h</MiniBtn>
              <MiniBtn onClick={() => bumpMinutes(t, -15)} disabled={busy || t.minutes === 0} muted>−15m</MiniBtn>
              {t.paid && <span style={{ fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: '#2E7D32', border: '1px solid #B7DBB9', borderRadius: 4, padding: '3px 7px' }}>Paid</span>}
              <DeleteX onClick={() => confirm('Delete this task?') && deleteTask(t.id)} />
            </div>
          </div>
        ))}
      </div>

      {tasks.length > 0 && (
        <div style={{ marginTop: 14, fontSize: 13, color: '#666', display: 'flex', gap: 20, justifyContent: 'flex-end' }}>
          <span><b style={{ color: ACCENT }}>Unpaid {round1(totals.unpaid / 60)}h</b></span>
          <span>Paid {round1(totals.paid / 60)}h</span>
          <span>Total {round1(totals.total / 60)}h</span>
        </div>
      )}
    </div>
  )
}

// ---------- pieces ----------
const miniBtn: React.CSSProperties = { fontSize: 11, padding: '5px 8px', borderRadius: 4, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'monospace' }
function MiniBtn({ children, onClick, disabled, muted }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; muted?: boolean }) {
  return <button onClick={onClick} disabled={disabled} style={{ ...miniBtn, border: '1px solid #ddd', background: '#fff', color: muted ? '#aaa' : '#444', opacity: disabled ? 0.4 : 1 }}>{children}</button>
}
const btnBase: React.CSSProperties = { fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', padding: '7px 12px', borderRadius: 4, cursor: 'pointer', whiteSpace: 'nowrap' }
function Btn({ children, onClick, disabled, ghost }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; ghost?: boolean }) {
  return <button onClick={onClick} disabled={disabled} style={{ ...btnBase, border: `1px solid ${ghost ? '#ccc' : ACCENT}`, background: ghost ? '#fff' : ACCENT, color: ghost ? '#555' : '#fff', opacity: disabled ? 0.5 : 1 }}>{children}</button>
}
function DeleteX({ onClick }: { onClick: () => void }) {
  return <button onClick={onClick} title="Delete" style={{ border: 0, background: 'none', color: '#ccc', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '0 2px' }}>×</button>
}

// Time display; click to edit the total directly (in hours, e.g. 1.5).
function EditableTime({ minutes, onSet, disabled }: { minutes: number; onSet: (hours: number) => void; disabled: boolean }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState('')
  const start = () => { setVal(String(round1(minutes / 60))); setEditing(true) }
  const commit = () => { const h = Number(val); if (!Number.isNaN(h) && h >= 0) onSet(h); setEditing(false) }
  if (editing) {
    return (
      <input autoFocus value={val} onChange={(e) => setVal(e.target.value)} onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
        inputMode="decimal" title="Hours (e.g. 1.5)"
        style={{ width: 52, padding: '4px 6px', border: `1px solid ${ACCENT}`, borderRadius: 4, fontSize: 14, fontFamily: 'monospace', textAlign: 'right' }} />
    )
  }
  return (
    <button onClick={start} disabled={disabled} title="Click to set the total"
      style={{ minWidth: 60, textAlign: 'right', border: '1px solid transparent', background: 'none', cursor: 'pointer', fontFamily: 'monospace', fontSize: 15, color: minutes ? '#111' : '#bbb', padding: '4px 6px' }}>
      {fmt(minutes)}
    </button>
  )
}

function AddTaskForm({ onAdd, disabled }: { onAdd: (title: string, detail: string) => void; disabled: boolean }) {
  const [title, setTitle] = useState('')
  const [detail, setDetail] = useState('')
  const submit = () => {
    const t = title.trim()
    if (!t) return
    onAdd(t, detail.trim())
    setTitle(''); setDetail('')
  }
  return (
    <div style={{ marginTop: 24, border: '1px solid #eee', borderRadius: 8, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title"
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        style={{ padding: '10px 12px', border: '1px solid #ddd', borderRadius: 4, fontSize: 15, fontFamily: 'Georgia, serif' }} />
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="Detail (optional) — what it involves"
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          style={{ flex: 1, padding: '10px 12px', border: '1px solid #ddd', borderRadius: 4, fontSize: 14 }} />
        <Btn onClick={submit} disabled={disabled}>Add task</Btn>
      </div>
    </div>
  )
}
