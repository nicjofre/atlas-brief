import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'

// The Friday dispatch as a ROUNDUP: David's short note up top, then a few deal
// teasers, each a compact card linking back to the full brief. Same design
// tokens and email-safe table layout as the single-deal template. Editorial
// rule: no em-dashes in static copy.

export type RoundupDeal = {
  kicker: string
  headline: string
  deck: string | null
  heroUrl: string | null
  brokerTag: string | null
  articleUrl: string
}

export type RoundupEmailProps = {
  dateline: string
  // Personalization token (e.g. "{{{FIRST_NAME|there}}}") for broadcasts, or a
  // plain sample name for preview/test renders.
  greeting: string
  intro: string // David's note, paragraphs separated by blank lines
  deals: RoundupDeal[]
  unsubscribeUrl: string
}

const C = {
  bg: '#FFF4E3',
  paper: '#FFFDF7',
  ink: '#0A0A0A',
  inkSoft: '#1F1F1D',
  muted: '#4F4F4B',
  rule: '#D6CBB3',
  accent: '#8B5A2B',
  serif: "Newsreader, Georgia, 'Times New Roman', serif",
  mono: "'JetBrains Mono', ui-monospace, Menlo, monospace",
}

function renderHeadline(text: string) {
  const parts = text.split(/\*([^*]+)\*/)
  return parts.map((part, i) =>
    i % 2 === 0 ? (
      <span key={i}>{part}</span>
    ) : (
      <span key={i} style={{ fontStyle: 'italic' }}>
        {part}
      </span>
    )
  )
}

function DealBlock({ deal, last }: { deal: RoundupDeal; last: boolean }) {
  return (
    <>
      <Section style={{ padding: '24px 32px 0' }}>
        <Text
          style={{
            fontFamily: C.mono,
            fontSize: '11px',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: C.accent,
            margin: '0 0 8px',
          }}
        >
          {deal.kicker}
        </Text>
        <Text
          style={{
            fontFamily: C.serif,
            fontSize: '24px',
            lineHeight: '1.14',
            color: C.ink,
            margin: 0,
            fontWeight: 400,
          }}
        >
          <Link href={deal.articleUrl} style={{ color: C.ink, textDecoration: 'none' }}>
            {renderHeadline(deal.headline)}
          </Link>
        </Text>
        {deal.heroUrl ? (
          <Img
            src={deal.heroUrl}
            alt=""
            width="496"
            style={{
              width: '100%',
              height: 'auto',
              display: 'block',
              border: `1px solid ${C.rule}`,
              margin: '16px 0 0',
            }}
          />
        ) : null}
        {deal.deck ? (
          <Text
            style={{
              fontFamily: C.serif,
              fontSize: '16px',
              lineHeight: '1.55',
              color: C.inkSoft,
              margin: '14px 0 0',
            }}
          >
            {deal.deck}
          </Text>
        ) : null}
        {deal.brokerTag ? (
          <Text
            style={{
              fontFamily: C.mono,
              fontSize: '10px',
              letterSpacing: '0.06em',
              color: C.muted,
              margin: '10px 0 0',
            }}
          >
            {deal.brokerTag}
          </Text>
        ) : null}
        <Section style={{ padding: '14px 0 0' }}>
          <Link
            href={deal.articleUrl}
            style={{
              fontFamily: C.mono,
              fontSize: '11px',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: C.accent,
              textDecoration: 'none',
            }}
          >
            Read the full brief &rarr;
          </Link>
        </Section>
      </Section>
      {!last ? (
        <Hr style={{ borderColor: C.rule, borderTopWidth: '1px', margin: '24px 32px 0' }} />
      ) : null}
    </>
  )
}

export function RoundupEmail({
  dateline,
  greeting,
  intro,
  deals,
  unsubscribeUrl,
}: RoundupEmailProps) {
  const previewText = intro.split(/\n+/)[0]?.slice(0, 140) || 'This week from Atlas Brief'
  const introParas = intro.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)

  return (
    <Html lang="en">
      <Head />
      <Preview>{previewText}</Preview>
      <Body
        style={{
          backgroundColor: C.bg,
          margin: 0,
          padding: '24px 0',
          fontFamily: C.serif,
          color: C.ink,
        }}
      >
        <Container
          style={{
            width: '100%',
            maxWidth: '560px',
            margin: '0 auto',
            backgroundColor: C.paper,
            border: `1px solid ${C.rule}`,
          }}
        >
          {/* Masthead */}
          <Section style={{ padding: '28px 32px 18px', textAlign: 'center' }}>
            <Text
              style={{
                fontFamily: C.mono,
                fontSize: '10px',
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: C.muted,
                margin: '0 0 8px',
              }}
            >
              The Atlas Dispatch
            </Text>
            <Text style={{ fontFamily: C.serif, fontSize: '40px', lineHeight: '1', color: C.ink, margin: 0 }}>
              Atlas <span style={{ fontStyle: 'italic' }}>Brief</span>
            </Text>
            <Text
              style={{
                fontFamily: C.mono,
                fontSize: '11px',
                letterSpacing: '0.08em',
                color: C.muted,
                margin: '10px 0 0',
              }}
            >
              {dateline}
            </Text>
          </Section>

          <Hr style={{ borderColor: C.ink, borderTopWidth: '1px', margin: 0 }} />

          {/* David's note */}
          <Section style={{ padding: '22px 32px 0' }}>
            <Text style={{ fontFamily: C.serif, fontSize: '17px', lineHeight: '1.55', color: C.inkSoft, margin: 0 }}>
              Hi {greeting},
            </Text>
            {introParas.map((p, i) => (
              <Text
                key={i}
                style={{ fontFamily: C.serif, fontSize: '17px', lineHeight: '1.55', color: C.inkSoft, margin: '14px 0 0' }}
              >
                {p}
              </Text>
            ))}
          </Section>

          {deals.map((deal, i) => (
            <DealBlock key={i} deal={deal} last={i === deals.length - 1} />
          ))}

          <Hr style={{ borderColor: C.rule, borderTopWidth: '1px', margin: '28px 0 0' }} />

          {/* Footer */}
          <Section style={{ padding: '18px 32px 28px' }}>
            <Text
              style={{
                fontFamily: C.mono,
                fontSize: '10px',
                lineHeight: '1.6',
                letterSpacing: '0.04em',
                color: C.muted,
                margin: 0,
              }}
            >
              David Safai, Editor and Publisher · Atlas Brief · Los Angeles
            </Text>
            <Text style={{ fontFamily: C.mono, fontSize: '10px', color: C.muted, margin: '10px 0 0' }}>
              <Link href={unsubscribeUrl} style={{ color: C.accent }}>
                Unsubscribe
              </Link>
            </Text>
            <Text
              style={{
                fontFamily: C.serif,
                fontSize: '10px',
                lineHeight: '1.5',
                color: C.muted,
                margin: '16px 0 0',
                paddingTop: '14px',
                borderTop: `1px solid ${C.rule}`,
              }}
            >
              <b>DISCLAIMER:</b> These analyses represent operator observations and opinions based on market
              research and deal data. This is not investment advice, financial advice, or a recommendation to
              buy or sell any property. Consult qualified professionals before making investment decisions.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export default RoundupEmail
