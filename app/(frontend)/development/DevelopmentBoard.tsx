'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export type DevTask = {
  id: string
  title: string
  notes: string | null
  status: 'backlog' | 'in_progress' | 'done'
  estimate_hours: number | null
  paid: boolean
  paid_at: string | null
  completed_at: string | null
}
export type DevEntry = {
  id: string
  task_id: string | null
  hours: number
  note: string | null
  worked_on: string
  taskTitle: string | null
}

const ACCENT = '#9A6B3F'
const round1 = (n: number) => Math.round(n * 10) / 10

export default function DevelopmentBoard({ tasks, entries }: { tasks: DevTask[]; entries: DevEntry[] }) {
  const router = useRouter()
  const supabase = createClient()
  const [busy, setBusy] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  async function run(fn: () => Promise<unknown>) {
    if (busy) return
    setBusy(true)
    try {
      await fn()
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  // --- derived ---
  const paidByTask = useMemo(() => {
    const m = new Map<string, boolean>()
    tasks.forEach((t) => m.set(t.id, t.paid))
    return m
  }, [tasks])

  const hoursByTask = useMemo(() => {
    const m = new Map<string, number>()
    entries.forEach((e) => {
      if (!e.task_id) return
      m.set(e.task_id, (m.get(e.task_id) ?? 0) + e.hours)
    })
    return m
  }, [entries])

  const totals = useMemo(() => {
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 864e5).toISOString().slice(0, 10)
    const monthKey = now.toISOString().slice(0, 7)
    let total = 0, paid = 0, week = 0, month = 0
    for (const e of entries) {
      total += e.hours
      if (e.task_id && paidByTask.get(e.task_id)) paid += e.hours
      if (e.worked_on >= weekAgo) week += e.hours
      if (e.worked_on.slice(0, 7) === monthKey) month += e.hours
    }
    return { total, paid, unpaid: total - paid, week, month }
  }, [entries, paidByTask])

  const backlog = tasks.filter((t) => t.status === 'backlog')
  const inProgress = tasks.filter((t) => t.status === 'in_progress')
  const done = tasks.filter((t) => t.status === 'done')

  // --- actions ---
  const addTask = (title: string, estimate: number | null) =>
    run(async () => { await supabase.from('dev_tasks').insert({ title, estimate_hours: estimate, status: 'backlog' }) })
  const setStatus = (id: string, status: DevTask['status']) => {
    const patch: { status: DevTask['status']; started_at?: string; completed_at?: string } = { status }
    if (status === 'in_progress') patch.started_at = new Date().toISOString()
    if (status === 'done') patch.completed_at = new Date().toISOString()
    return run(async () => { await supabase.from('dev_tasks').update(patch).eq('id', id) })
  }
  const logTime = (taskId: string | null, hours: number, note: string, worked_on: string) =>
    run(async () => { await supabase.from('dev_time_entries').insert({ task_id: taskId, hours, note: note || null, worked_on }) })
  const deleteTask = (id: string) => run(async () => { await supabase.from('dev_tasks').delete().eq('id', id) })
  const deleteEntry = (id: string) => run(async () => { await supabase.from('dev_time_entries').delete().eq('id', id) })
  const setPaid = (ids: string[], paid: boolean) =>
    run(async () => {
      await supabase.from('dev_tasks').update({ paid, paid_at: paid ? new Date().toISOString() : null }).in('id', ids)
      setSelected(new Set())
    })

  const toggleSel = (id: string) =>
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 24px', fontFamily: 'Georgia, serif' }}>
      <h1 style={{ fontSize: 28, margin: 0 }}>Development</h1>
      <p style={{ color: '#888', fontSize: 13, marginTop: 4 }}>Task board + billable-hours log.</p>

      {/* Summary */}
      <div style={{ display: 'flex', gap: 16, marginTop: 20, flexWrap: 'wrap' }}>
        <Stat label="Outstanding hrs" value={round1(totals.unpaid)} accent />
        <Stat label="Paid hrs" value={round1(totals.paid)} />
        <Stat label="Total hrs" value={round1(totals.total)} />
        <Stat label="This week" value={round1(totals.week)} />
        <Stat label="This month" value={round1(totals.month)} />
      </div>

      {/* Add task */}
      <AddTaskForm onAdd={addTask} disabled={busy} />

      {/* Backlog */}
      <Section title={`Backlog (${backlog.length})`}>
        {backlog.length === 0 ? <Empty text="Nothing queued. Add a task above." /> : backlog.map((t) => (
          <Row key={t.id}>
            <div style={{ flex: 1 }}>
              <TaskTitle t={t} />
              {t.estimate_hours != null && <Muted> · est {round1(t.estimate_hours)}h</Muted>}
            </div>
            <Btn onClick={() => setStatus(t.id, 'in_progress')} disabled={busy}>Start</Btn>
            <DeleteX onClick={() => confirm('Delete this task?') && deleteTask(t.id)} />
          </Row>
        ))}
      </Section>

      {/* In progress */}
      <Section title={`In progress (${inProgress.length})`}>
        {inProgress.length === 0 ? <Empty text="Nothing in progress." /> : inProgress.map((t) => (
          <Row key={t.id} col>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
              <div style={{ flex: 1 }}>
                <TaskTitle t={t} />
                <Muted> · {round1(hoursByTask.get(t.id) ?? 0)}h logged</Muted>
              </div>
              <Btn onClick={() => setStatus(t.id, 'done')} disabled={busy}>Complete</Btn>
              <Btn ghost onClick={() => setStatus(t.id, 'backlog')} disabled={busy}>Backlog</Btn>
              <DeleteX onClick={() => confirm('Delete this task?') && deleteTask(t.id)} />
            </div>
            <LogTimeInline onLog={(h, note, d) => logTime(t.id, h, note, d)} disabled={busy} />
          </Row>
        ))}
      </Section>

      {/* Done */}
      <Section
        title={`Done (${done.length})`}
        action={selected.size > 0 ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn onClick={() => setPaid([...selected], true)} disabled={busy}>Mark {selected.size} paid</Btn>
            <Btn ghost onClick={() => setPaid([...selected], false)} disabled={busy}>Mark unpaid</Btn>
          </div>
        ) : null}
      >
        {done.length === 0 ? <Empty text="No completed tasks yet." /> : done.map((t) => (
          <Row key={t.id} col>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
              <input type="checkbox" checked={selected.has(t.id)} onChange={() => toggleSel(t.id)} style={{ width: 16, height: 16 }} />
              <div style={{ flex: 1 }}>
                <TaskTitle t={t} />
                <Muted> · {round1(hoursByTask.get(t.id) ?? 0)}h</Muted>
              </div>
              {t.paid
                ? <span style={{ fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: '#2E7D32', border: '1px solid #B7DBB9', borderRadius: 4, padding: '3px 8px' }}>Paid</span>
                : <span style={{ fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: ACCENT, border: `1px solid ${ACCENT}55`, borderRadius: 4, padding: '3px 8px' }}>Unpaid</span>}
              <DeleteX onClick={() => confirm('Delete this task?') && deleteTask(t.id)} />
            </div>
            <LogTimeInline onLog={(h, note, d) => logTime(t.id, h, note, d)} disabled={busy} />
          </Row>
        ))}
      </Section>

      {/* Time log */}
      <h2 style={{ fontSize: 18, marginTop: 40, marginBottom: 8 }}>Time log</h2>
      {entries.length === 0 ? <Empty text="No hours logged yet." /> : (
        <div style={{ border: '1px solid #eee', borderRadius: 8, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id}>
                  <td style={{ ...TD, fontFamily: 'monospace', fontSize: 12, color: '#666', whiteSpace: 'nowrap' }}>{e.worked_on}</td>
                  <td style={{ ...TD, fontFamily: 'monospace', textAlign: 'right', width: 60 }}>{round1(e.hours)}h</td>
                  <td style={TD}>{e.taskTitle ?? <span style={{ color: '#bbb' }}>— (no task)</span>}</td>
                  <td style={{ ...TD, color: '#666', fontSize: 13 }}>{e.note}</td>
                  <td style={{ ...TD, width: 30, textAlign: 'right' }}><DeleteX onClick={() => confirm('Delete this entry?') && deleteEntry(e.id)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ---------- small pieces ----------
const TD: React.CSSProperties = { padding: '10px 12px', fontSize: 14, borderBottom: '1px solid #f3f3f3', color: '#222' }

function Stat({ label, value, accent }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <div style={{ border: `1px solid ${accent ? ACCENT : '#eee'}`, borderRadius: 8, padding: '14px 18px', minWidth: 120 }}>
      <div style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: '#999' }}>{label}</div>
      <div style={{ fontSize: 26, fontFamily: 'Georgia, serif', color: accent ? ACCENT : '#0A0A0A', marginTop: 4 }}>{value}</div>
    </div>
  )
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <h2 style={{ fontSize: 18, margin: 0 }}>{title}</h2>
        {action}
      </div>
      <div style={{ border: '1px solid #eee', borderRadius: 8, overflow: 'hidden' }}>{children}</div>
    </div>
  )
}

function Row({ children, col }: { children: React.ReactNode; col?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: col ? 'column' : 'row', alignItems: col ? 'stretch' : 'center', gap: 10, padding: '12px 14px', borderBottom: '1px solid #f3f3f3' }}>
      {children}
    </div>
  )
}
function TaskTitle({ t }: { t: DevTask }) {
  return <span style={{ fontSize: 15, color: '#111' }}>{t.title}</span>
}
function Muted({ children }: { children: React.ReactNode }) {
  return <span style={{ color: '#999', fontSize: 13 }}>{children}</span>
}
function Empty({ text }: { text: string }) {
  return <div style={{ padding: '16px 14px', color: '#999', fontSize: 14 }}>{text}</div>
}

const btnBase: React.CSSProperties = { fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', padding: '7px 12px', borderRadius: 4, cursor: 'pointer', whiteSpace: 'nowrap' }
function Btn({ children, onClick, disabled, ghost }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; ghost?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ ...btnBase, border: `1px solid ${ghost ? '#ccc' : ACCENT}`, background: ghost ? '#fff' : ACCENT, color: ghost ? '#555' : '#fff', opacity: disabled ? 0.5 : 1 }}>
      {children}
    </button>
  )
}
function DeleteX({ onClick }: { onClick: () => void }) {
  return <button onClick={onClick} title="Delete" style={{ border: 0, background: 'none', color: '#ccc', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '0 4px' }}>×</button>
}

function AddTaskForm({ onAdd, disabled }: { onAdd: (title: string, est: number | null) => void; disabled: boolean }) {
  const [title, setTitle] = useState('')
  const [est, setEst] = useState('')
  const submit = () => {
    const t = title.trim()
    if (!t) return
    onAdd(t, est.trim() ? Number(est) : null)
    setTitle(''); setEst('')
  }
  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 28 }}>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add a task to the backlog…"
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        style={{ flex: 1, padding: '10px 12px', border: '1px solid #ddd', borderRadius: 4, fontSize: 14, fontFamily: 'Georgia, serif' }} />
      <input value={est} onChange={(e) => setEst(e.target.value)} placeholder="est h" inputMode="decimal"
        style={{ width: 70, padding: '10px 12px', border: '1px solid #ddd', borderRadius: 4, fontSize: 14, fontFamily: 'monospace' }} />
      <Btn onClick={submit} disabled={disabled}>Add</Btn>
    </div>
  )
}

function LogTimeInline({ onLog, disabled }: { onLog: (hours: number, note: string, worked_on: string) => void; disabled: boolean }) {
  const today = new Date().toISOString().slice(0, 10)
  const [hours, setHours] = useState('')
  const [note, setNote] = useState('')
  const [day, setDay] = useState(today)
  const submit = () => {
    const h = Number(hours)
    if (!h || h <= 0) return
    onLog(h, note.trim(), day)
    setHours(''); setNote('')
  }
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', paddingTop: 8, flexWrap: 'wrap' }}>
      <input value={hours} onChange={(e) => setHours(e.target.value)} placeholder="hrs" inputMode="decimal"
        style={{ width: 56, padding: '7px 9px', border: '1px solid #e2e2e2', borderRadius: 4, fontSize: 13, fontFamily: 'monospace' }} />
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="what you did (optional)"
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        style={{ flex: 1, minWidth: 160, padding: '7px 9px', border: '1px solid #e2e2e2', borderRadius: 4, fontSize: 13 }} />
      <input type="date" value={day} onChange={(e) => setDay(e.target.value)}
        style={{ padding: '6px 8px', border: '1px solid #e2e2e2', borderRadius: 4, fontSize: 12, fontFamily: 'monospace' }} />
      <button onClick={submit} disabled={disabled} style={{ ...btnBase, border: '1px solid #ccc', background: '#fff', color: '#555', opacity: disabled ? 0.5 : 1 }}>Log</button>
    </div>
  )
}
