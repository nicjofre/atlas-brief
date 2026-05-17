'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { compactDollars, date, num, pct } from '@/lib/format'

type Row = {
  id: string
  created_at: string
  status: string | null
  list_price: number | null
  sale_price: number | null
  sale_date: string | null
  list_date: string | null
  expected_delivery_date: string | null
  expected_delivery_note: string | null
  cap_rate_current: number | null
  grm_current: number | null
  price_per_unit: number | null
  property: {
    id: string
    street_address: string | null
    city: string | null
    state: string | null
    zip: string | null
    submarket: string | null
    year_built: number | null
    unit_count: number | null
  } | null
  listing_broker: {
    id: string
    name: string | null
    firm: string | null
  } | null
}

type View = 'active' | 'trash'

export default function ListingsTable({
  rows,
  view,
  activeCount,
  trashCount,
}: {
  rows: Row[]
  view: View
  activeCount: number
  trashCount: number
}) {
  const router = useRouter()
  const supabase = createClient()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirmStage, setConfirmStage] = useState<'idle' | 'confirm' | 'running'>('idle')
  const [error, setError] = useState<string | null>(null)

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    setConfirmStage('idle')
  }
  function toggleAll() {
    setSelected(prev => {
      if (prev.size === rows.length) return new Set()
      return new Set(rows.map(r => r.id))
    })
    setConfirmStage('idle')
  }

  async function runAction() {
    if (selected.size === 0) return
    setConfirmStage('running')
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const ids = Array.from(selected)
      const update =
        view === 'active'
          ? { deleted_at: new Date().toISOString(), deleted_by: user?.id ?? null }
          : { deleted_at: null, deleted_by: null }
      const { error: updErr } = await supabase.from('listings').update(update).in('id', ids)
      if (updErr) throw new Error(updErr.message)
      setSelected(new Set())
      setConfirmStage('idle')
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed')
      setConfirmStage('confirm')
    }
  }

  const actionLabel = view === 'active' ? 'Delete' : 'Restore'
  const allSelected = rows.length > 0 && selected.size === rows.length

  return (
    <div>
      {/* tab toggle */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderBottom: '1px solid #ddd' }}>
        <Link
          href="/listings?view=active"
          style={{
            padding: '8px 16px',
            fontSize: 11,
            letterSpacing: 2,
            textTransform: 'uppercase',
            color: view === 'active' ? '#111' : '#999',
            textDecoration: 'none',
            borderBottom: view === 'active' ? '2px solid #111' : '2px solid transparent',
            marginBottom: -1,
          }}
        >
          Active ({activeCount})
        </Link>
        <Link
          href="/listings?view=trash"
          style={{
            padding: '8px 16px',
            fontSize: 11,
            letterSpacing: 2,
            textTransform: 'uppercase',
            color: view === 'trash' ? '#111' : '#999',
            textDecoration: 'none',
            borderBottom: view === 'trash' ? '2px solid #111' : '2px solid transparent',
            marginBottom: -1,
          }}
        >
          Trash ({trashCount})
        </Link>
      </div>

      {rows.length === 0 ? (
        <div style={{ padding: 48, textAlign: 'center', background: '#fff', border: '1px solid #eee', borderRadius: 4 }}>
          <div style={{ fontSize: 14, color: '#666', marginBottom: 16 }}>
            {view === 'active' ? 'No active listings.' : 'Trash is empty.'}
          </div>
          {view === 'active' && (
            <Link href="/dashboard" style={{ padding: '10px 20px', background: '#111', color: '#fff', textDecoration: 'none', borderRadius: 4, fontSize: 13 }}>
              Parse your first deal
            </Link>
          )}
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', border: '1px solid #eee', borderRadius: 4, fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #111', color: '#9A6B3F', fontSize: 10, textTransform: 'uppercase', letterSpacing: 2 }}>
              <th style={{ padding: '12px 12px', width: 32 }}>
                <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all" />
              </th>
              <th style={{ textAlign: 'left', padding: '12px 16px' }}>Status</th>
              <th style={{ textAlign: 'left', padding: '12px 16px' }}>Address</th>
              <th style={{ textAlign: 'left', padding: '12px 16px' }}>Submarket</th>
              <th style={{ textAlign: 'right', padding: '12px 16px' }}>Year</th>
              <th style={{ textAlign: 'right', padding: '12px 16px' }}>Units</th>
              <th style={{ textAlign: 'right', padding: '12px 16px' }}>Price</th>
              <th style={{ textAlign: 'right', padding: '12px 16px' }}>$/Door</th>
              <th style={{ textAlign: 'right', padding: '12px 16px' }}>CAP</th>
              <th style={{ textAlign: 'left', padding: '12px 16px' }}>Date</th>
              <th style={{ textAlign: 'left', padding: '12px 16px' }}>Broker</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => {
              const p = r.property
              const b = r.listing_broker
              const headlinePrice = r.sale_price ?? r.list_price
              const headlineDate = r.sale_date ?? r.list_date ?? r.created_at
              const isChecked = selected.has(r.id)
              return (
                <tr key={r.id} style={{ borderBottom: '1px solid #f0f0f0', background: isChecked ? '#fff8e7' : 'transparent' }}>
                  <td style={{ padding: '12px 12px', textAlign: 'center' }}>
                    <input type="checkbox" checked={isChecked} onChange={() => toggle(r.id)} aria-label={`Select ${p?.street_address ?? r.id}`} />
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <StatusPill status={r.status} />
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <Link href={`/listings/${r.id}`} style={{ color: '#111', textDecoration: 'none', fontWeight: 500 }}>
                      {p?.street_address ?? '—'}
                    </Link>
                    <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
                      {[p?.city, p?.state, p?.zip].filter(Boolean).join(', ')}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#444' }}>{p?.submarket ?? '—'}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>{p?.year_built ?? '—'}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>{num(p?.unit_count)}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 500 }}>{compactDollars(headlinePrice)}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>{compactDollars(r.price_per_unit)}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>{pct(r.cap_rate_current)}</td>
                  <td style={{ padding: '12px 16px', color: '#666', fontSize: 12 }}>
                    {r.status === 'under_construction' && (r.expected_delivery_date || r.expected_delivery_note) ? (
                      <span style={{ color: '#8B6914' }}>
                        Delivers {r.expected_delivery_note ?? date(r.expected_delivery_date)}
                      </span>
                    ) : (
                      date(headlineDate)
                    )}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#666', fontSize: 12 }}>
                    {b?.name ?? '—'}
                    {b?.firm && <div style={{ fontSize: 11, color: '#999' }}>{b.firm}</div>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      {/* sticky action bar */}
      {selected.size > 0 && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#111',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: 4,
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            zIndex: 100,
          }}
        >
          <span style={{ fontSize: 12, letterSpacing: 1 }}>{selected.size} selected</span>
          {confirmStage === 'idle' ? (
            <button
              onClick={() => setConfirmStage('confirm')}
              style={{
                padding: '6px 14px',
                fontSize: 11,
                letterSpacing: 1,
                textTransform: 'uppercase',
                color: '#fff',
                background: view === 'active' ? '#c0392b' : '#27ae60',
                border: 'none',
                borderRadius: 2,
                cursor: 'pointer',
              }}
            >
              {actionLabel} ({selected.size})
            </button>
          ) : (
            <>
              <button
                onClick={runAction}
                disabled={confirmStage === 'running'}
                style={{
                  padding: '6px 14px',
                  fontSize: 11,
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                  color: '#fff',
                  background: view === 'active' ? '#c0392b' : '#27ae60',
                  border: 'none',
                  borderRadius: 2,
                  cursor: confirmStage === 'running' ? 'not-allowed' : 'pointer',
                  opacity: confirmStage === 'running' ? 0.6 : 1,
                }}
              >
                {confirmStage === 'running' ? '...' : `Confirm ${actionLabel.toLowerCase()}`}
              </button>
              <button
                onClick={() => setConfirmStage('idle')}
                disabled={confirmStage === 'running'}
                style={{
                  padding: '6px 14px',
                  fontSize: 11,
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                  color: '#fff',
                  background: 'transparent',
                  border: '1px solid #555',
                  borderRadius: 2,
                  cursor: confirmStage === 'running' ? 'not-allowed' : 'pointer',
                }}
              >
                Cancel
              </button>
            </>
          )}
          <button
            onClick={() => {
              setSelected(new Set())
              setConfirmStage('idle')
            }}
            style={{ fontSize: 11, color: '#999', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Clear
          </button>
          {error && <span style={{ fontSize: 11, color: '#ff9e9e' }}>{error}</span>}
        </div>
      )}
    </div>
  )
}

function StatusPill({ status }: { status: string | null }) {
  if (!status) return <span style={{ color: '#bbb' }}>—</span>
  const bg =
    status === 'sold' ? '#c0392b' :
    status === 'for_sale' ? '#27ae60' :
    status === 'under_construction' ? '#d68910' :
    '#7f8c8d'
  const label =
    status === 'sold' ? 'Sold' :
    status === 'for_sale' ? 'For Sale' :
    status === 'under_construction' ? 'Under Construction' :
    'Off Market'
  return (
    <span style={{ padding: '3px 8px', borderRadius: 2, fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', background: bg, color: '#fff' }}>
      {label}
    </span>
  )
}
