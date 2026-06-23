// Live broker roster on the public article — reads from the listing's brokers
// (the listing_brokers join table), so any edit David makes shows up here
// immediately, and it faithfully represents the real deal:
//   - co-listing team  -> several agents stacked under one "Listing Brokers" header
//   - dual agency      -> one agent under "Buyer & Listing Broker"
//   - buyer side        -> "Buyer Broker(s)"
// Card format is the approved Option A (headshot · details · firm logo); the
// side label now lives on the group header instead of each card.

export type BrokerCard = {
  name: string | null
  title: string | null
  firm: string | null
  phone: string | null
  email: string | null
  dre: string | null
  headshotUrl: string | null
  logoUrl: string | null
}

export type BrokerGroup = {
  key: string
  label: string
  brokers: BrokerCard[]
}

function initials(name: string | null): string {
  if (!name) return '—'
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('')
}

function Card({ b }: { b: BrokerCard }) {
  return (
    <div className="bc-card">
      {b.headshotUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="bc-photo" src={b.headshotUrl} alt={b.name ?? 'Broker'} />
      ) : (
        <div className="bc-photo bc-photo-empty" aria-hidden>
          {initials(b.name)}
        </div>
      )}
      <div className="bc-detail">
        {b.name && <div className="bc-name">{b.name}</div>}
        {b.title && <div className="bc-title">{b.title}</div>}
        {b.firm && <div className="bc-firm">{b.firm}</div>}
        <ul className="bc-meta">
          {b.phone && <li>{b.phone}</li>}
          {b.email && (
            <li>
              <a href={`mailto:${b.email}`}>{b.email}</a>
            </li>
          )}
          {b.dre && <li>DRE# {b.dre.replace(/^\s*(cal)?dre\s*#?\s*/i, '')}</li>}
        </ul>
      </div>
      {b.logoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="bc-logo" src={b.logoUrl} alt={b.firm ?? 'Firm'} />
      )}
    </div>
  )
}

export default function BrokerBlock({ groups }: { groups: BrokerGroup[] }) {
  const live = groups.filter(g => g.brokers.length > 0)
  if (live.length === 0) return null

  return (
    <section className="broker-cards-wrap">
      <div className="wrap">
        <div className="bc-head">Brokers</div>
        <div className={`bc-grid${live.length > 1 ? ' cols-2' : ''}`}>
          {live.map(group => (
            <div className="bc-group" key={group.key}>
              <div className="bc-side">{group.label}</div>
              {group.brokers.map((b, i) => (
                <Card b={b} key={i} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
