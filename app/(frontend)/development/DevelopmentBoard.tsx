'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import type { OpsTask, OpsPerson } from '@/lib/ops/dev'
import { addDevTask, editDevTask, deleteDevTask, moveDevTask } from './ops-actions'

// Client-facing board for Atlas Brief, formatted to match the Forward Deployed
// Brothers dashboard: task cards, drag-to-nest, "Completed by <name>" stamps.
// David can add / edit / prioritize / nest / delete his requests in Backlog;
// time, status, and billing are managed by the team, so they're read-only here.

// C = concrete colors (this admin has no shared design tokens). Warm/bronze so
// it sits inside the Atlas Brief admin, with FDB's card structure.
const C = {
  panel: '#f6f4f0', nested: '#ffffff', accent: '#9A6B3F', ink: '#1c1a17',
  muted: '#6f6a61', muted2: '#9c9589', border: '#e5e1d9',
}

type Tab = 'backlog' | 'to_bill' | 'billed'
const TABS: [Tab, string][] = [['backlog', 'Backlog'], ['to_bill', 'Completed'], ['billed', 'Billed']]
type DropZone = 'before' | 'into' | 'after'

const round1 = (n: number) => Math.round(n * 10) / 10
function fmt(min: number) { const h = Math.floor(min / 60), m = min % 60; return h && m ? `${h}h ${m}m` : h ? `${h}h` : `${m}m` }
function shortDate(iso: string) {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

type Block =
  | { kind: 'task'; task: OpsTask; sort: number }
  | { kind: 'group'; parent: OpsTask; kids: OpsTask[]; sort: number }

export default function DevelopmentBoard({ tasks, people, hourlyRate }: { tasks: OpsTask[]; people: OpsPerson[]; hourlyRate: number }) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('backlog')
  const [busy, setBusy] = useState(false)
  const [dragId, setDragId] = useState<string | null>(null)
  const [over, setOver] = useState<{ id: string; zone: DropZone } | null>(null)

  const run = async (fn: () => Promise<unknown>) => { if (busy) return; setBusy(true); try { await fn(); router.refresh() } finally { setBusy(false) } }
  const editable = tab === 'backlog'

  const inTab = useMemo(() => tasks.filter((t) => t.status === tab), [tasks, tab])
  const byId = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks])
  const kidsOf = useMemo(() => {
    const m = new Map<string, OpsTask[]>()
    tasks.filter((t) => t.parent_id).forEach((t) => { const a = m.get(t.parent_id!) ?? []; a.push(t); m.set(t.parent_id!, a) })
    return m
  }, [tasks])

  const parentHere = (t: OpsTask) => (t.parent_id && inTab.some((x) => x.id === t.parent_id) ? t.parent_id : null)
  const nested = (id: string) => inTab.filter((t) => parentHere(t) === id)

  const blocks = useMemo<Block[]>(() => {
    const out: Block[] = []
    inTab.filter((t) => !t.parent_id).forEach((t) => out.push({ kind: 'task', task: t, sort: t.sort_order }))
    const orphans = new Map<string, OpsTask[]>()
    inTab.filter((t) => t.parent_id && !inTab.some((x) => x.id === t.parent_id))
      .forEach((t) => { const a = orphans.get(t.parent_id!) ?? []; a.push(t); orphans.set(t.parent_id!, a) })
    orphans.forEach((kids, pid) => {
      const parent = byId.get(pid)
      if (parent) out.push({ kind: 'group', parent, kids, sort: parent.sort_order })
      else kids.forEach((k) => out.push({ kind: 'task', task: k, sort: k.sort_order }))
    })
    return out.sort((a, b) => a.sort - b.sort)
  }, [inTab, byId])

  const totalMin = (t: OpsTask) => t.minutes + (kidsOf.get(t.id) ?? []).reduce((s, x) => s + x.minutes, 0)
  const counts = (s: Tab) => tasks.filter((t) => t.status === s && !tasks.some((p) => p.id === t.parent_id && p.status === s)).length
  const toBillMin = tasks.filter((t) => t.status === 'to_bill').reduce((s, t) => s + t.minutes, 0)

  const signatureFor = (t: OpsTask) => {
    if (t.status === 'backlog' || !t.completed_by) return null
    const who = people.find((p) => p.id === t.completed_by)?.name ?? 'the team'
    return t.completed_at ? `Completed by ${who} · ${shortDate(t.completed_at)}` : `Completed by ${who}`
  }

  const canNest = (drag: OpsTask, target: OpsTask) => drag.id !== target.id && (kidsOf.get(drag.id) ?? []).length === 0 && !target.parent_id
  const dragged = dragId ? byId.get(dragId) ?? null : null

  const onDrop = (target: OpsTask, zone: DropZone) => {
    setDragId(null); setOver(null)
    if (!dragged || dragged.id === target.id) return
    if (zone === 'into' && canNest(dragged, target)) {
      const sibs = nested(target.id).filter((t) => t.id !== dragged.id).map((t) => t.id)
      return run(() => moveDevTask({ id: dragged.id, parentId: target.id, siblingIds: [...sibs, dragged.id] }))
    }
    const parentId = target.parent_id
    const level = inTab.filter((t) => t.parent_id === parentId && t.id !== dragged.id).map((t) => t.id)
    const at = level.indexOf(target.id) + (zone === 'after' ? 1 : 0)
    level.splice(at, 0, dragged.id)
    run(() => moveDevTask({ id: dragged.id, parentId, siblingIds: level }))
  }

  const dragCtx: DragCtx = { dragId, over, setDragId, setOver, onDrop, editable }

  return (
    <div style={{ maxWidth: 940, margin: '0 auto', padding: '32px 24px', color: C.ink, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, margin: 0, fontFamily: 'Georgia, serif' }}>Development</h1>
          <p style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>Add requests and prioritize the backlog. Time and billing are managed by the team.</p>
        </div>
        <div style={{ border: `1px solid ${C.accent}`, borderRadius: 10, padding: '10px 18px', textAlign: 'right' }}>
          <div style={{ fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: C.muted2 }}>Current bill</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, justifyContent: 'flex-end' }}>
            <span style={{ fontSize: 24, color: C.accent, fontWeight: 600 }}>${Math.round((toBillMin / 60) * hourlyRate).toLocaleString()}</span>
            <span style={{ fontSize: 13, color: C.muted }}>{round1(toBillMin / 60)}h @ ${hourlyRate}/hr</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, marginTop: 18, borderBottom: `1px solid ${C.border}` }}>
        {TABS.map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ background: 'none', border: 'none', padding: '10px 14px', color: tab === id ? C.ink : C.muted, borderBottom: tab === id ? `2px solid ${C.accent}` : '2px solid transparent', marginBottom: -1, fontSize: 14, cursor: 'pointer' }}>
            {label} <span style={{ color: C.muted2 }}>{counts(id)}</span>
          </button>
        ))}
      </div>

      {editable && <div style={{ marginTop: 14 }}><AddRow onAdd={(title, detail) => run(() => addDevTask(title, detail))} busy={busy} /></div>}

      <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {blocks.length === 0 ? (
          <p style={{ color: C.muted, padding: '6px 2px' }}>{tab === 'backlog' ? 'No requests yet. Add one above.' : 'Nothing here yet.'}</p>
        ) : blocks.map((b) => {
          const kids = b.kind === 'task' ? nested(b.task.id) : b.kids
          return (
            <div key={b.kind === 'task' ? b.task.id : `group-${b.parent.id}`} style={{ background: C.panel, borderRadius: 10, boxShadow: '0 1px 2px rgba(28,26,23,0.05)' }}>
              {b.kind === 'task' ? (
                <TaskRow task={b.task} total={totalMin(b.task)} hasKids={(kidsOf.get(b.task.id) ?? []).length > 0}
                  editable={editable} busy={busy} run={run} signature={signatureFor(b.task)}
                  canDropInto={!!dragged && canNest(dragged, b.task)} drag={dragCtx}
                  titleSlot={editable ? <AddNested busy={busy} onAdd={(title) => run(() => addDevTask(title, '', b.task.id))} /> : null} />
              ) : (
                <GroupHeader parent={b.parent} minutes={b.kids.reduce((s, k) => s + k.minutes, 0)} />
              )}
              {kids.length > 0 && (
                <div style={{ margin: '0 15px 14px 41px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {kids.map((k) => (
                    <div key={k.id} style={{ borderRadius: 8, background: C.nested }}>
                      <TaskRow task={k} total={k.minutes} hasKids={false} nestedRow editable={editable} busy={busy} run={run}
                        signature={signatureFor(k)} canDropInto={false} drag={dragCtx} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
      {editable && blocks.length > 0 && <p style={{ color: C.muted2, fontSize: 12, marginTop: 10 }}>Drag a task onto another to nest it, or between tasks to reorder.</p>}
    </div>
  )
}

type DragCtx = {
  dragId: string | null
  over: { id: string; zone: DropZone } | null
  setDragId: (id: string | null) => void
  setOver: (o: { id: string; zone: DropZone } | null) => void
  onDrop: (target: OpsTask, zone: DropZone) => void
  editable: boolean
}

function TaskRow({ task, total, hasKids, nestedRow, editable, busy, run, drag, titleSlot, signature, canDropInto }: {
  task: OpsTask; total: number; hasKids: boolean; nestedRow?: boolean; editable: boolean; busy: boolean
  run: (fn: () => Promise<unknown>) => void; drag: DragCtx; titleSlot?: ReactNode; signature?: string | null; canDropInto: boolean
}) {
  const [grabbed, setGrabbed] = useState(false)
  const isOver = drag.over?.id === task.id
  const zone = isOver ? drag.over!.zone : null
  const dragging = drag.dragId === task.id

  const zoneAt = (e: React.DragEvent<HTMLDivElement>): DropZone => {
    const r = e.currentTarget.getBoundingClientRect()
    const y = (e.clientY - r.top) / r.height
    if (!canDropInto) return y < 0.5 ? 'before' : 'after'
    if (y < 0.28) return 'before'
    if (y > 0.72) return 'after'
    return 'into'
  }

  return (
    <div
      draggable={editable && grabbed}
      onDragStart={(e) => { drag.setDragId(task.id); e.dataTransfer.effectAllowed = 'move' }}
      onDragEnd={() => { setGrabbed(false); drag.setDragId(null); drag.setOver(null) }}
      onDragOver={editable ? (e) => { if (!drag.dragId || drag.dragId === task.id) return; e.preventDefault(); drag.setOver({ id: task.id, zone: zoneAt(e) }) } : undefined}
      onDragLeave={() => { if (isOver) drag.setOver(null) }}
      onDrop={editable ? (e) => { e.preventDefault(); drag.onDrop(task, zoneAt(e)) } : undefined}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 10,
        padding: nestedRow ? '12px 12px 11px' : '15px 15px 13px',
        borderRadius: nestedRow ? 8 : 10, opacity: dragging ? 0.4 : 1,
        background: zone === 'into' ? 'rgba(154,107,63,0.09)' : 'transparent',
        boxShadow: zone === 'before' ? `inset 0 2px 0 ${C.accent}` : zone === 'after' ? `inset 0 -2px 0 ${C.accent}` : 'none',
      }}>
      {editable && (
        <span title="Drag to move" onMouseDown={() => setGrabbed(true)} onMouseUp={() => setGrabbed(false)}
          style={{ cursor: 'grab', color: C.muted2, fontSize: 13, lineHeight: 1.6, userSelect: 'none' }}>⠿</span>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        {editable
          ? <EditableText task={task} titleSlot={titleSlot} onSave={(title, detail) => run(() => editDevTask(task.id, title, detail))} />
          : <>
              <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.35, letterSpacing: '-0.01em' }}>{task.title}</div>
              {task.detail && <div style={{ fontSize: 13, color: C.muted, marginTop: 3, lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>{task.detail}</div>}
            </>}
        {signature && <div style={{ fontSize: 12, color: C.muted2, marginTop: 4 }}>{signature}</div>}
      </div>
      {/* Read-only time (managed by the team). */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, paddingTop: 1 }}>
        <span style={{ fontFamily: 'monospace', fontSize: 14, color: task.minutes ? C.ink : C.muted2, minWidth: 52, textAlign: 'right' }}>{fmt(task.minutes)}</span>
        {hasKids && <span style={{ fontFamily: 'monospace', fontSize: 12, color: C.muted2 }}>{fmt(total)} all in</span>}
      </div>
      {editable && (
        <button title="Delete" onClick={() => confirm('Delete this task and anything nested under it?') && run(() => deleteDevTask(task.id))}
          style={{ background: 'none', border: 'none', color: C.muted2, fontSize: 18, lineHeight: 1, cursor: 'pointer' }}>×</button>
      )}
    </div>
  )
}

function GroupHeader({ parent, minutes }: { parent: OpsTask; minutes: number }) {
  const where = TABS.find(([s]) => s === parent.status)![1]
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '13px 15px 3px 41px' }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: C.muted }}>{parent.title}</span>
      <span style={{ fontSize: 12, color: C.muted2 }}>still in {where}</span>
      <span style={{ marginLeft: 'auto', fontFamily: 'monospace', fontSize: 13, color: C.muted }}>{fmt(minutes)}</span>
    </div>
  )
}

function AddNested({ onAdd, busy }: { onAdd: (title: string) => void; busy: boolean }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  if (!open) {
    return (
      <button onClick={(e) => { e.stopPropagation(); setOpen(true) }} title="Add a task inside this one"
        style={{ background: 'none', border: 'none', padding: 0, fontSize: 12, fontWeight: 500, color: C.muted2, flexShrink: 0, cursor: 'pointer' }}>+ New task</button>
    )
  }
  const submit = () => { if (!title.trim()) return setOpen(false); onAdd(title.trim()); setTitle('') }
  return (
    <input autoFocus value={title} placeholder="New task inside this one" disabled={busy}
      onClick={(e) => e.stopPropagation()} onChange={(e) => setTitle(e.target.value)}
      onBlur={() => { if (title.trim()) onAdd(title.trim()); setTitle(''); setOpen(false) }}
      onKeyDown={(e) => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') { setTitle(''); setOpen(false) } }}
      style={inputStyle(220)} />
  )
}

function AddRow({ onAdd, busy }: { onAdd: (title: string, detail: string) => void; busy: boolean }) {
  const [title, setTitle] = useState('')
  const [detail, setDetail] = useState('')
  const submit = () => { if (!title.trim()) return; onAdd(title.trim(), detail.trim()); setTitle(''); setDetail('') }
  return (
    <div style={{ background: C.panel, borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <input placeholder="Request or task title" value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} style={inputStyle()} />
      <div style={{ display: 'flex', gap: 8 }}>
        <input placeholder="Detail (optional)" value={detail} onChange={(e) => setDetail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} style={{ ...inputStyle(), flex: 1 }} />
        <button onClick={submit} disabled={busy} style={btnStyle}>Add task</button>
      </div>
    </div>
  )
}

function EditableText({ task, titleSlot, onSave }: { task: OpsTask; titleSlot?: ReactNode; onSave: (title: string, detail: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(task.title)
  const [detail, setDetail] = useState(task.detail ?? '')
  const commit = () => { onSave(title.trim() || task.title, detail.trim()); setEditing(false) }
  const cancel = () => { setTitle(task.title); setDetail(task.detail ?? ''); setEditing(false) }
  if (editing) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
        onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) commit() }}
        onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') cancel() }}>
        <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle()} />
        <input value={detail} placeholder="Detail" onChange={(e) => setDetail(e.target.value)} style={inputStyle()} />
      </div>
    )
  }
  return (
    <div onClick={() => setEditing(true)} style={{ cursor: 'text' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.35, letterSpacing: '-0.01em' }}>{task.title}</span>
        {titleSlot}
      </div>
      {task.detail
        ? <div style={{ fontSize: 13, color: C.muted, marginTop: 3, lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>{task.detail}</div>
        : <div style={{ fontSize: 12, color: C.muted2, marginTop: 3 }}>+ detail</div>}
    </div>
  )
}

function inputStyle(width?: number): React.CSSProperties {
  return { width, color: C.ink, background: '#fff', border: `1px solid ${C.border}`, borderRadius: 6, padding: '9px 11px', fontSize: 14, outline: 'none' }
}
const btnStyle: React.CSSProperties = { border: `1px solid ${C.accent}`, background: C.accent, color: '#fff', borderRadius: 6, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
