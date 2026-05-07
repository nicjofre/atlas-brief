export function dollars(n: number | null | undefined): string {
  if (n == null) return '—'
  return '$' + Number(n).toLocaleString()
}

export function compactDollars(n: number | null | undefined): string {
  if (n == null) return '—'
  const num = Number(n)
  if (num >= 1_000_000) return '$' + (num / 1_000_000).toFixed(2) + 'M'
  if (num >= 1_000) return '$' + (num / 1_000).toFixed(1) + 'K'
  return '$' + num.toLocaleString()
}

export function pct(n: number | null | undefined): string {
  if (n == null) return '—'
  return n + '%'
}

export function num(n: number | null | undefined): string {
  if (n == null) return '—'
  return Number(n).toLocaleString()
}

export function plain(v: string | number | boolean | null | undefined): string {
  if (v == null || v === '') return '—'
  if (v === true) return 'Yes'
  if (v === false) return 'No'
  return String(v)
}

export function date(s: string | null | undefined): string {
  if (!s) return '—'
  const d = new Date(s)
  if (isNaN(d.getTime())) return s
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}
