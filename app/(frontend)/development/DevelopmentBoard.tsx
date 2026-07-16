'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { OpsTask } from '@/lib/ops/dev'
import { addDevTask, addDevSubtask, editDevTask, deleteDevTask, reorderDevTasks } from './ops-actions'

const ACCENT = '#9A6B3F'
const round1 = (n: number) => Math.round(n * 10) / 10
function fmt(min: number) { const h = Math.floor(min / 60), m = min % 60; return h && m ? `${h}h ${m}m` : h ? `${h}h` : `${m}m` }

type Tab = 'backlog' | 'to_bill' | 'billed'
const TABS: [Tab, string][] = [['backlog', 'Backlog'], ['to_bill', 'To bill'], ['billed', 'Billed']]

export default function DevelopmentBoard({ tasks, hourlyRate }: { tasks: OpsTask[]; hourlyRate: number }) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('backlog')
  const [busy, setBusy] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const run = async (fn: () => Promise<unknown>) => { if (busy) return; setBusy(true); try { await fn(); router.refresh() } finally { setBusy(false) } }

  const tops = useMemo(() => tasks.filter((t) => !t.parent_id), [tasks])
  const subsByParent = useMemo(() => {
    const m = new Map<string, OpsTask[]>()
    tasks.filter((t) => t.parent_id).forEach((t) => { const a = m.get(t.parent_id!) ?? []; a.push(t); m.set(t.parent_id!, a) })
    return m
  }, [tasks])
  const totalMin = (t: OpsTask) => t.minutes + (subsByParent.get(t.id) ?? []).reduce((s, x) => s + x.minutes, 0)

  const toBillMin = tops.filter((t) => t.status === 'to_bill').reduce((s, t) => s + totalMin(t), 0)
  const counts = (s: Tab) => tops.filter((t) => t.status === s).length
  const editable = tab === 'backlog'

  // Drag-to-reorder (backlog only).
  const backlogIds = tops.filter((t) => t.status === 'backlog').map((t) => t.id).join(',')
  const [order, setOrder] = useState<string[]>(() => backlogIds ? backlogIds.split(',') : [])
  const [dragId, setDragId] = useState<string | null>(null)
  useEffect(() => { setOrder(backlogIds ? backlogIds.split(',') : []) }, [backlogIds])

  const taskById = useMemo(() => new Map(tops.map((t) => [t.id, t])), [tops])
  const rows: OpsTask[] = tab === 'backlog'
    ? order.map((id) => taskById.get(id)).filter((t): t is OpsTask => !!t)
    : tops.filter((t) => t.status === tab)

  const onDragEnter = (overId: string) => {
    if (!dragId || dragId === overId) return
    setOrder((prev) => { const from = prev.indexOf(dragId), to = prev.indexOf(overId); if (from < 0 || to < 0) return prev; const n = [...prev]; n.splice(from, 1); n.splice(to, 0, dragId); return n })
  }
  const toggleExp = (id: string) => setExpanded((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })

  return (
    <div style={{ maxWidth: 940, margin: '0 auto', padding: '32px 24px', fontFamily: 'Georgia, serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 28, margin: 0 }}>Development</h1>
          <p style={{ color: '#888', fontSize: 13, marginTop: 4 }}>Add requests and prioritize the backlog. Time &amp; billing are managed by the team.</p>
        </div>
        <div style={{ border: `1px solid ${ACCENT}`, borderRadius: 8, padding: '10px 18px', textAlign: 'right' }}>
          <div style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: '#999' }}>Current bill</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, justifyContent: 'flex-end' }}>
            <span style={{ fontSize: 26, color: ACCENT }}>${Math.round((toBillMin / 60) * hourlyRate).toLocaleString()}</span>
            <span style={{ fontSize: 13, color: '#888' }}>{round1(toBillMin / 60)}h @ ${hourlyRate}/hr</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 0, marginTop: 18, borderBottom: '1px solid #ddd' }}>
        {TABS.map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ padding: '10px 18px', fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', color: tab === id ? '#111' : '#999', background: 'none', border: 0, borderBottom: tab === id ? `2px solid ${ACCENT}` : '2px solid transparent', marginBottom: -1, cursor: 'pointer' }}>
            {label} <span style={{ color: '#bbb' }}>{counts(id)}</span>
          </button>
        ))}
      </div>

      {editable && <AddTask onAdd={(t, d) => run(() => addDevTask(t, d))} busy={busy} />}

      <div style={{ border: '1px solid #eee', borderRadius: 8, overflow: 'hidden', marginTop: 16 }}>
        {rows.length === 0 ? (
          <div style={{ padding: '18px 16px', color: '#999', fontSize: 14 }}>
            {tab === 'backlog' ? 'No requests yet. Add one above.' : tab === 'to_bill' ? 'Nothing here yet.' : 'Nothing billed yet.'}
          </div>
        ) : rows.map((t) => {
          const subs = subsByParent.get(t.id) ?? []
          const isExp = expanded.has(t.id)
          return (
            <div key={t.id}
              onDragOver={editable ? (e) => e.preventDefault() : undefined}
              onDragEnter={editable ? () => onDragEnter(t.id) : undefined}
              style={{ borderBottom: '1px solid #f3f3f3', background: '#fff', opacity: dragId === t.id ? 0.35 : 1 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '13px 15px' }}>
                {editable && (
                  <span draggable onDragStart={() => setDragId(t.id)} onDragEnd={() => { run(() => reorderDevTasks(order)); setDragId(null) }}
                    title="Drag to prioritize" style={{ cursor: 'grab', color: '#c4c4c4', fontSize: 15, marginTop: 2, userSelect: 'none' }}>⣿</span>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {editable
                    ? <Editable task={t} onSave={(ti, de) => run(() => editDevTask(t.id, ti, de))} />
                    : <><div style={{ fontSize: 15, color: '#111' }}>{t.title}</div>{t.detail && <div style={{ fontSize: 13, color: '#777', marginTop: 2, whiteSpace: 'pre-wrap' }}>{t.detail}</div>}</>}
                  <div style={{ marginTop: 6 }}>
                    <button onClick={() => toggleExp(t.id)} style={{ background: 'none', border: '1px solid #ddd', borderRadius: 4, fontSize: 12, padding: '4px 8px', cursor: 'pointer', color: '#555' }}>
                      {isExp ? '▾' : '▸'} Subtasks {subs.length ? `(${subs.length})` : ''}
                    </button>
                  </div>
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: 14, color: totalMin(t) ? '#111' : '#ccc', minWidth: 56, textAlign: 'right', paddingTop: 2 }}>{fmt(totalMin(t))}</div>
                {editable && <button title="Delete" onClick={() => confirm('Delete this task?') && run(() => deleteDevTask(t.id))} style={{ background: 'none', border: 0, color: '#ccc', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>}
              </div>

              {isExp && (
                <div style={{ padding: '0 15px 14px 40px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {subs.map((s) => (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ color: '#bbb' }}>•</span>
                      <span style={{ flex: 1, fontSize: 14 }}>{s.title}</span>
                      <span style={{ fontFamily: 'monospace', fontSize: 13, color: s.minutes ? '#666' : '#ccc' }}>{fmt(s.minutes)}</span>
                      {editable && <button title="Delete" onClick={() => run(() => deleteDevTask(s.id))} style={{ background: 'none', border: 0, color: '#ccc', cursor: 'pointer', fontSize: 16 }}>×</button>}
                    </div>
                  ))}
                  {editable && <AddSubtask onAdd={(title) => run(() => addDevSubtask(t.id, title))} busy={busy} />}
                  {!editable && subs.length === 0 && <span style={{ color: '#bbb', fontSize: 13 }}>No subtasks.</span>}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function AddTask({ onAdd, busy }: { onAdd: (title: string, detail: string) => void; busy: boolean }) {
  const [title, setTitle] = useState('')
  const [detail, setDetail] = useState('')
  const submit = () => { if (!title.trim()) return; onAdd(title.trim(), detail.trim()); setTitle(''); setDetail('') }
  return (
    <div style={{ marginTop: 20, border: '1px solid #eee', borderRadius: 8, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Request or task title" onKeyDown={(e) => e.key === 'Enter' && submit()}
        style={{ padding: '10px 12px', border: '1px solid #ddd', borderRadius: 4, fontSize: 15, fontFamily: 'Georgia, serif' }} />
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="Detail (optional)" onKeyDown={(e) => e.key === 'Enter' && submit()}
          style={{ flex: 1, padding: '10px 12px', border: '1px solid #ddd', borderRadius: 4, fontSize: 14 }} />
        <button onClick={submit} disabled={busy} style={{ border: `1px solid ${ACCENT}`, background: ACCENT, color: '#fff', borderRadius: 4, padding: '0 16px', fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer', opacity: busy ? 0.5 : 1 }}>Add</button>
      </div>
    </div>
  )
}

function AddSubtask({ onAdd, busy }: { onAdd: (title: string) => void; busy: boolean }) {
  const [title, setTitle] = useState('')
  const submit = () => { if (!title.trim()) return; onAdd(title.trim()); setTitle('') }
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add a subtask…" onKeyDown={(e) => e.key === 'Enter' && submit()}
        style={{ flex: 1, padding: '7px 9px', border: '1px solid #e2e2e2', borderRadius: 4, fontSize: 13 }} />
      <button onClick={submit} disabled={busy} style={{ border: '1px solid #ccc', background: '#fff', color: '#555', borderRadius: 4, padding: '0 12px', fontSize: 12, cursor: 'pointer' }}>Add</button>
    </div>
  )
}

function Editable({ task, onSave }: { task: OpsTask; onSave: (title: string, detail: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(task.title)
  const [detail, setDetail] = useState(task.detail ?? '')
  if (editing) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { onSave(title, detail); setEditing(false) } if (e.key === 'Escape') setEditing(false) }}
          style={{ padding: '6px 8px', border: `1px solid ${ACCENT}`, borderRadius: 4, fontSize: 15, fontFamily: 'Georgia, serif' }} />
        <input value={detail} placeholder="Detail" onChange={(e) => setDetail(e.target.value)} onBlur={() => { onSave(title, detail); setEditing(false) }}
          style={{ padding: '6px 8px', border: '1px solid #ddd', borderRadius: 4, fontSize: 13 }} />
      </div>
    )
  }
  return (
    <div onClick={() => setEditing(true)} style={{ cursor: 'text' }}>
      <div style={{ fontSize: 15, color: '#111' }}>{task.title}</div>
      {task.detail ? <div style={{ fontSize: 13, color: '#777', marginTop: 2, whiteSpace: 'pre-wrap' }}>{task.detail}</div> : <div style={{ fontSize: 12, color: '#ccc', marginTop: 2 }}>+ detail</div>}
    </div>
  )
}
