'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Deal = {
  address: string | null
  neighborhood: string | null
  city: string | null
  submarket: string | null
  zoning: string | null
  year_built: number | null
  stories: number | null
  unit_count: number | null
  bedroom_mix: string | null
  building_sf: number | null
  lot_size: string | null
  apn: string | null
  parking: string | null
  list_price: number | null
  sale_price: number | null
  price_per_door: number | null
  price_per_sf: number | null
  cap_rate: number | null
  noi: number | null
  grm: number | null
  last_sale_date: string | null
  last_sale_price: number | null
  broker_name: string | null
  broker_firm: string | null
  broker_phone: string | null
  broker_email: string | null
  broker_license: string | null
  mls_number: string | null
  status: 'for_sale' | 'sold' | null
  value_add_notes: string | null
  soft_story_retrofit: boolean | null
  capital_improvements: string | null
}

function fmt(n: number | null, prefix = '') {
  if (n == null) return '—'
  return prefix + n.toLocaleString()
}

function Field({ label, value }: { label: string; value: string | number | boolean | null }) {
  const display = value == null ? '—' : value === true ? 'Yes' : value === false ? 'No' : String(value)
  return (
    <div style={{ borderBottom: '1px solid #eee', paddingBottom: 12, marginBottom: 12 }}>
      <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: '#9A6B3F', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 15, color: display === '—' ? '#bbb' : '#111' }}>{display}</div>
    </div>
  )
}

export default function DashboardPage() {
  const [mode, setMode] = useState<'text' | 'pdf'>('pdf')
  const [text, setText] = useState('')
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [deal, setDeal] = useState<Deal | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  async function handleParse() {
    setLoading(true)
    setError('')
    setDeal(null)
    try {
      let res: Response
      if (mode === 'pdf' && pdfFile) {
        const formData = new FormData()
        formData.append('pdf', pdfFile)
        res = await fetch('/api/parse', { method: 'POST', body: formData })
      } else {
        if (!text.trim()) return
        res = await fetch('/api/parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        })
      }
      const data = await res.json()
      if (data.error) {
        setError(data.error)
      } else {
        setDeal(data.deal)
      }
    } catch {
      setError('Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const canParse = mode === 'pdf' ? !!pdfFile : !!text.trim()

  return (
    <div style={{ background: '#FAFAF8', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid #ddd', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff' }}>
        <div style={{ fontFamily: 'Georgia, serif', fontSize: 20, fontStyle: 'italic', color: '#111' }}>Atlas <em>Brief</em></div>
        <button onClick={handleSignOut} style={{ fontSize: 13, color: '#666', background: 'none', border: 'none', cursor: 'pointer' }}>Sign out</button>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px' }}>

        {/* Input */}
        <div style={{ marginBottom: 32 }}>
          {/* Mode tabs */}
          <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderBottom: '1px solid #ddd' }}>
            {(['pdf', 'text'] as const).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  padding: '8px 20px',
                  fontSize: 11,
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                  background: 'none',
                  border: 'none',
                  borderBottom: mode === m ? '2px solid #111' : '2px solid transparent',
                  color: mode === m ? '#111' : '#999',
                  cursor: 'pointer',
                  marginBottom: -1,
                }}
              >
                {m === 'pdf' ? 'Upload CoStar PDF' : 'Paste Text'}
              </button>
            ))}
          </div>

          {mode === 'pdf' ? (
            <div
              onClick={() => document.getElementById('pdf-input')?.click()}
              style={{
                border: '2px dashed #ddd',
                borderRadius: 4,
                padding: '40px 24px',
                textAlign: 'center',
                cursor: 'pointer',
                background: pdfFile ? '#f9f9f9' : '#fff',
              }}
            >
              <input
                id="pdf-input"
                type="file"
                accept="application/pdf"
                style={{ display: 'none' }}
                onChange={e => setPdfFile(e.target.files?.[0] ?? null)}
              />
              {pdfFile ? (
                <div>
                  <div style={{ fontSize: 13, color: '#111', marginBottom: 4 }}>{pdfFile.name}</div>
                  <div style={{ fontSize: 11, color: '#999' }}>{(pdfFile.size / 1024).toFixed(0)} KB — click to replace</div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>Drop CoStar PDF report here</div>
                  <div style={{ fontSize: 11, color: '#999' }}>Reports → Investment Package Report → Generate</div>
                </div>
              )}
            </div>
          ) : (
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Paste CoStar listing or export data here..."
              rows={10}
              style={{ width: '100%', padding: 16, border: '1px solid #ddd', borderRadius: 4, fontSize: 14, background: '#fff', resize: 'vertical', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
          )}

          <button
            onClick={handleParse}
            disabled={loading || !canParse}
            style={{ marginTop: 12, padding: '12px 28px', background: '#111', color: '#fff', border: 'none', borderRadius: 4, fontSize: 14, cursor: loading || !canParse ? 'not-allowed' : 'pointer', opacity: loading || !canParse ? 0.6 : 1 }}
          >
            {loading ? 'Parsing...' : 'Parse Deal'}
          </button>
          {error && <div style={{ marginTop: 12, color: '#c0392b', fontSize: 13 }}>{error}</div>}
        </div>

        {/* Results */}
        {deal && (
          <div>
            {/* Status badge + address */}
            <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
              {deal.status && (
                <span style={{
                  padding: '4px 12px',
                  borderRadius: 2,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                  background: deal.status === 'sold' ? '#c0392b' : '#27ae60',
                  color: '#fff'
                }}>
                  {deal.status === 'sold' ? 'Sold' : 'For Sale'}
                </span>
              )}
              <div style={{ fontFamily: 'Georgia, serif', fontSize: 22, color: '#111' }}>
                {deal.address || 'Unknown Address'}
              </div>
            </div>

            {/* Stats bar */}
            <div style={{ background: '#111', color: '#fff', padding: '16px 24px', borderRadius: 4, marginBottom: 32, display: 'flex', gap: 32, flexWrap: 'wrap' }}>
              {[
                { label: 'Units', value: deal.unit_count },
                { label: 'Year Built', value: deal.year_built },
                { label: 'Price', value: deal.list_price || deal.sale_price ? '$' + ((deal.list_price || deal.sale_price)! / 1000000).toFixed(2) + 'M' : null },
                { label: '$/Door', value: fmt(deal.price_per_door, '$') },
                { label: '$/SF', value: fmt(deal.price_per_sf, '$') },
                { label: 'CAP Rate', value: deal.cap_rate ? deal.cap_rate + '%' : null },
                { label: 'NOI', value: deal.noi ? '$' + (deal.noi / 1000).toFixed(0) + 'K' : null },
                { label: 'GRM', value: deal.grm },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: '#9A6B3F', marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>{value ?? '—'}</div>
                </div>
              ))}
            </div>

            {/* Data grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 48px' }}>
              <div>
                <div style={{ fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: '#666', marginBottom: 16, borderBottom: '2px solid #111', paddingBottom: 8 }}>Property</div>
                <Field label="Address" value={deal.address} />
                <Field label="Neighborhood" value={deal.neighborhood} />
                <Field label="Submarket" value={deal.submarket} />
                <Field label="Year Built" value={deal.year_built} />
                <Field label="Stories" value={deal.stories} />
                <Field label="Unit Count" value={deal.unit_count} />
                <Field label="Bedroom Mix" value={deal.bedroom_mix} />
                <Field label="Building SF" value={deal.building_sf ? deal.building_sf.toLocaleString() + ' SF' : null} />
                <Field label="Lot Size" value={deal.lot_size} />
                <Field label="Zoning" value={deal.zoning} />
                <Field label="APN" value={deal.apn} />
                <Field label="Parking" value={deal.parking} />
                <Field label="Soft Story Retrofit" value={deal.soft_story_retrofit} />
              </div>
              <div>
                <div style={{ fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: '#666', marginBottom: 16, borderBottom: '2px solid #111', paddingBottom: 8 }}>Financials & Broker</div>
                <Field label="List Price" value={deal.list_price ? '$' + deal.list_price.toLocaleString() : null} />
                <Field label="Sale Price" value={deal.sale_price ? '$' + deal.sale_price.toLocaleString() : null} />
                <Field label="Price Per Door" value={deal.price_per_door ? '$' + deal.price_per_door.toLocaleString() : null} />
                <Field label="Price Per SF" value={deal.price_per_sf ? '$' + deal.price_per_sf : null} />
                <Field label="CAP Rate" value={deal.cap_rate ? deal.cap_rate + '%' : null} />
                <Field label="NOI" value={deal.noi ? '$' + deal.noi.toLocaleString() : null} />
                <Field label="GRM" value={deal.grm} />
                <Field label="Last Sale Date" value={deal.last_sale_date} />
                <Field label="Last Sale Price" value={deal.last_sale_price ? '$' + deal.last_sale_price.toLocaleString() : null} />
                <Field label="Broker" value={deal.broker_name && deal.broker_firm ? `${deal.broker_name} · ${deal.broker_firm}` : deal.broker_name} />
                <Field label="Broker Phone" value={deal.broker_phone} />
                <Field label="Broker Email" value={deal.broker_email} />
                <Field label="MLS #" value={deal.mls_number} />
              </div>
            </div>

            {/* Notes */}
            {(deal.value_add_notes || deal.capital_improvements) && (
              <div style={{ marginTop: 32 }}>
                {deal.value_add_notes && (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: '#9A6B3F', marginBottom: 8 }}>Value Add Notes</div>
                    <div style={{ fontSize: 14, color: '#444', lineHeight: 1.6 }}>{deal.value_add_notes}</div>
                  </div>
                )}
                {deal.capital_improvements && (
                  <div>
                    <div style={{ fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: '#9A6B3F', marginBottom: 8 }}>Capital Improvements</div>
                    <div style={{ fontSize: 14, color: '#444', lineHeight: 1.6 }}>{deal.capital_improvements}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
