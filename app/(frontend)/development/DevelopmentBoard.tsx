'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export type DevTask = {
  id: string
  title: string
  detail: string | null
  minutes: number
  done: boolean
  paid: boolean
  paid_at: string | null
}

type Tab = 'backlog' | 'to_bill' | 'billed'
const ACCENT = '#9A6B3F'
const round1 = (n: number) => Math.round(n * 10) / 10
function fmt(min: number): string {
  const h = Math.floor(min / 60), m = min % 60
  if (h && m) return `${h}h ${m}m`
  if (h) return `${h}h`
  return `${m}m`
}

export default function DevelopmentBoard({ tasks }: { tasks: DevTask[] }) {
  const router = useRouter()
  const supabase = createClient()
  const [busy, setBusy] = useState(false)
  const [tab, setTab] = useState<Tab>('backlog')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  async function run(fn: () => Promise<unknown>) {
    if (busy) return
    setBusy(true)
    try { await fn(); router.refresh() } finally { setBusy(false) }
  }

  // Lifecycle: backlog (!done) -> to bill (done, !billed) -> billed (billed).
  // The `paid` column stores the "billed" flag.
  const backlog = useMemo(() => tasks.filter((t) => !t.done), [tasks])
  const toBill = useMemo(() => tasks.filter((t) => t.done && !t.paid), [tasks])
  const billed = useMemo(() => tasks.filter((t) => t.paid), [tasks])
  const current = tab === 'backlog' ? backlog : tab === 'to_bill' ? toBill : billed
  const taskById = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks])

  // Drag-to-reorder, backlog only.
  const backlogKey = backlog.map((t) => t.id).join(',')
  const [order, setOrder] = useState<string[]>(() => backlog.map((t) => t.id))
  const [dragId, setDragId] = useState<string | null>(null)
  useEffect(() => { setOrder(backlogKey ? backlogKey.split(',') : []) }, [backlogKey])
  useEffect(() => { setSelected(new Set()) }, [tab])

  // --- actions ---
  const addTask = (title: string, detail: string) =>
    run(async () => { await supabase.from('dev_tasks').insert({ title, detail: detail || null }) })
  const saveText = (id: string, title: string, detail: string) =>
    run(async () => { await supabase.from('dev_tasks').update({ title, detail: detail || null }).eq('id', id) })
  const bumpMinutes = (t: DevTask, delta: number) =>
    run(async () => { await supabase.from('dev_tasks').update({ minutes: Math.max(0, t.minutes + delta) }).eq('id', t.id) })
  const setMinutes = (t: DevTask, minutes: number) =>
    run(async () => { await supabase.from('dev_tasks').update({ minutes: Math.max(0, Math.round(minutes)) }).eq('id', t.id) })
  const deleteTask = (id: string) => run(async () => { await supabase.from('dev_tasks').delete().eq('id', id) })
  const move = (ids: string[], patch: Partial<Pick<DevTask, 'done' | 'paid'>> & { paid_at?: string | null }) =>
    run(async () => { await supabase.from('dev_tasks').update(patch).in('id', ids); setSelected(new Set()) })
  const toBacklog = (ids: string[]) => move(ids, { done: false, paid: false, paid_at: null })
  const toToBill = (ids: string[]) => move(ids, { done: true, paid: false, paid_at: null })
  const toBilled = (ids: string[]) => move(ids, { done: true, paid: true, paid_at: new Date().toISOString() })

  const toggleSel = (id: string) =>
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })

  const onDragEnterRow = (overId: string) => {
    if (!dragId || dragId === overId) return
    setOrder((prev) => {
      const from = prev.indexOf(dragId), to = prev.indexOf(overId)
      if (from < 0 || to < 0 || from === to) return prev
      const next = [...prev]; next.splice(from, 1); next.splice(to, 0, dragId); return next
    })
  }
  const persistOrder = () =>
    run(async () => { await Promise.all(order.map((id, i) => supabase.from('dev_tasks').update({ sort_order: i }).eq('id', id))) })

  const sel = [...selected]
  const rows = tab === 'backlog' ? order.map((id) => taskById.get(id)).filter((t): t is DevTask => !!t) : current

  return (
    <div style={{ maxWidth: 940, margin: '0 auto', padding: '32px 24px', fontFamily: 'Georgia, serif' }}>
      <h1 style={{ fontSize: 28, margin: 0 }}>Development</h1>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginTop: 18, borderBottom: '1px solid #ddd' }}>
        {([['backlog', 'Backlog', backlog.length], ['to_bill', 'To bill', toBill.length], ['billed', 'Billed', billed.length]] as [Tab, string, number][]).map(([id, label, n]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ padding: '10px 18px', fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', color: tab === id ? '#111' : '#999', background: 'none', border: 0, borderBottom: tab === id ? `2px solid ${ACCENT}` : '2px solid transparent', marginBottom: -1, cursor: 'pointer' }}>
            {label} <span style={{ color: '#bbb' }}>{n}</span>
          </button>
        ))}
      </div>

      {tab === 'backlog' && <AddTaskForm onAdd={addTask} disabled={busy} />}

      {/* Contextual bulk actions */}
      {sel.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: '#888', alignSelf: 'center' }}>{sel.length} selected:</span>
          {tab === 'backlog' && <Btn onClick={() => toToBill(sel)} disabled={busy}>Mark done →</Btn>}
          {tab === 'to_bill' && <>
            <Btn onClick={() => toBilled(sel)} disabled={busy}>Mark billed →</Btn>
            <Btn ghost onClick={() => toBacklog(sel)} disabled={busy}>← Back to backlog</Btn>
          </>}
          {tab === 'billed' && <Btn ghost onClick={() => toToBill(sel)} disabled={busy}>← Move to bill</Btn>}
        </div>
      )}

      <div style={{ border: '1px solid #eee', borderRadius: 8, overflow: 'hidden', marginTop: 16 }}>
        {rows.length === 0 ? (
          <div style={{ padding: '18px 16px', color: '#999', fontSize: 14 }}>
            {tab === 'backlog' ? 'No tasks in the backlog. Add one above.' : tab === 'to_bill' ? 'Nothing waiting to be billed.' : 'Nothing billed yet.'}
          </div>
        ) : rows.map((t) => {
          const draggable = tab === 'backlog'
          return (
            <div key={t.id}
              onDragOver={draggable ? (e) => e.preventDefault() : undefined}
              onDragEnter={draggable ? () => onDragEnterRow(t.id) : undefined}
              style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '14px 16px', borderBottom: '1px solid #f3f3f3', background: '#fff', opacity: dragId === t.id ? 0.35 : 1 }}>
              {draggable ? (
                <span draggable onDragStart={() => setDragId(t.id)} onDragEnd={() => { persistOrder(); setDragId(null) }}
                  title="Drag to reorder" style={{ cursor: 'grab', color: '#c4c4c4', fontSize: 15, marginTop: 2, userSelect: 'none', lineHeight: 1 }}>⣿</span>
              ) : <span style={{ width: 9 }} />}
              <input type="checkbox" checked={selected.has(t.id)} onChange={() => toggleSel(t.id)} style={{ width: 16, height: 16, marginTop: 3 }} />
              <EditableTaskText task={t} onSave={(title, detail) => saveText(t.id, title, detail)} disabled={busy} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <EditableTime minutes={t.minutes} onSet={(h) => setMinutes(t, h * 60)} disabled={busy} />
                <MiniBtn onClick={() => bumpMinutes(t, 15)} disabled={busy}>+15m</MiniBtn>
                <MiniBtn onClick={() => bumpMinutes(t, 30)} disabled={busy}>+30m</MiniBtn>
                <MiniBtn onClick={() => bumpMinutes(t, 60)} disabled={busy}>+1h</MiniBtn>
                <MiniBtn onClick={() => bumpMinutes(t, -15)} disabled={busy || t.minutes === 0} muted>−15m</MiniBtn>
                <DeleteX onClick={() => confirm('Delete this task?') && deleteTask(t.id)} />
              </div>
            </div>
          )
        })}
      </div>
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

// Title + detail; click to edit both inline.
function EditableTaskText({ task, onSave, disabled }: { task: DevTask; onSave: (title: string, detail: string) => void; disabled: boolean }) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(task.title)
  const [detail, setDetail] = useState(task.detail ?? '')
  const start = () => { setTitle(task.title); setDetail(task.detail ?? ''); setEditing(true) }
  const commit = () => { const t = title.trim(); if (t) onSave(t, detail.trim()); setEditing(false) }
  if (editing) {
    return (
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
          style={{ padding: '6px 8px', border: `1px solid ${ACCENT}`, borderRadius: 4, fontSize: 15, fontFamily: 'Georgia, serif' }} />
        <input value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="Detail (optional)"
          onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }} onBlur={commit}
          style={{ padding: '6px 8px', border: '1px solid #ddd', borderRadius: 4, fontSize: 13 }} />
      </div>
    )
  }
  return (
    <div onClick={() => !disabled && start()} title="Click to edit" style={{ flex: 1, minWidth: 0, cursor: 'text' }}>
      <div style={{ fontSize: 15, color: '#111' }}>{task.title}</div>
      {task.detail
        ? <div style={{ fontSize: 13, color: '#777', marginTop: 2, whiteSpace: 'pre-wrap' }}>{task.detail}</div>
        : <div style={{ fontSize: 12, color: '#ccc', marginTop: 2 }}>+ add detail</div>}
    </div>
  )
}

function AddTaskForm({ onAdd, disabled }: { onAdd: (title: string, detail: string) => void; disabled: boolean }) {
  const [title, setTitle] = useState('')
  const [detail, setDetail] = useState('')
  const submit = () => { const t = title.trim(); if (!t) return; onAdd(t, detail.trim()); setTitle(''); setDetail('') }
  return (
    <div style={{ marginTop: 20, border: '1px solid #eee', borderRadius: 8, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
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

// Time display; click to set the total directly (in hours, e.g. 1.5).
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
