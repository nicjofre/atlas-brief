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

// The Friday dispatch email — deliberately a *teaser*, not the full article.
// Masthead, kicker, headline, hero, the operator deck, a compact stat bar, and
// a single "Read the full brief" button to the site. Keeping it short both
// sidesteps email-client formatting hell (single column, table-based via React
// Email primitives) AND drives the click that is the real engagement signal.
//
// Design tokens mirror atlas-v2.css. Webfonts don't render reliably in email
// (Outlook especially), so we use a Georgia/Times serif stack rather than
// Newsreader — the brand reads through the layout and color, not the typeface.
// Editorial rule: no em-dashes anywhere in static copy.

export type DispatchStat = { k: string; v: string; s?: string | null }

export type DispatchEmailProps = {
  kicker: string // e.g. "The Atlas Dispatch · For Sale"
  dateline: string // e.g. "Friday, June 21, 2026"
  headline: string // may embed one *italic* phrase
  deck: string | null
  heroUrl: string | null
  stats: DispatchStat[]
  brokerTag: string | null // e.g. "Listed by Jane Doe · Marcus & Millichap"
  articleUrl: string
  // Resend swaps this token for its hosted unsubscribe link at send time.
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

// David's headlines embed one italic phrase wrapped in *...*. Render that span
// in italic; everything else stays roman. Mirrors HeadlineText in article-render.
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

export function DispatchEmail({
  kicker,
  dateline,
  headline,
  deck,
  heroUrl,
  stats,
  brokerTag,
  articleUrl,
  unsubscribeUrl,
}: DispatchEmailProps) {
  const previewText = deck || `${kicker} from David Safai`

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
            <Text
              style={{
                fontFamily: C.serif,
                fontSize: '40px',
                lineHeight: '1',
                color: C.ink,
                margin: 0,
              }}
            >
              Atlas <span style={{ fontStyle: 'italic' }}>Brief</span>
            </Text>
          </Section>

          <Hr style={{ borderColor: C.ink, borderTopWidth: '1px', margin: 0 }} />

          {/* Kicker + dateline */}
          <Section style={{ padding: '20px 32px 0' }}>
            <Text
              style={{
                fontFamily: C.mono,
                fontSize: '11px',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: C.accent,
                margin: 0,
              }}
            >
              {kicker}
            </Text>
            <Text
              style={{
                fontFamily: C.mono,
                fontSize: '11px',
                letterSpacing: '0.08em',
                color: C.muted,
                margin: '4px 0 0',
              }}
            >
              {dateline}
            </Text>
          </Section>

          {/* Headline */}
          <Section style={{ padding: '12px 32px 0' }}>
            <Text
              style={{
                fontFamily: C.serif,
                fontSize: '30px',
                lineHeight: '1.12',
                color: C.ink,
                margin: 0,
                fontWeight: 400,
              }}
            >
              {renderHeadline(headline)}
            </Text>
          </Section>

          {/* Hero */}
          {heroUrl ? (
            <Section style={{ padding: '20px 32px 0' }}>
              <Img
                src={heroUrl}
                alt=""
                width="496"
                style={{
                  width: '100%',
                  height: 'auto',
                  display: 'block',
                  border: `1px solid ${C.rule}`,
                }}
              />
            </Section>
          ) : null}

          {/* Deck — David's operator take */}
          {deck ? (
            <Section style={{ padding: '20px 32px 0' }}>
              <Text
                style={{
                  fontFamily: C.serif,
                  fontSize: '17px',
                  lineHeight: '1.55',
                  color: C.inkSoft,
                  margin: 0,
                }}
              >
                {deck}
              </Text>
            </Section>
          ) : null}

          {/* Stat bar */}
          {stats.length > 0 ? (
            <Section style={{ padding: '22px 32px 0' }}>
              <table
                role="presentation"
                width="100%"
                cellPadding={0}
                cellSpacing={0}
                style={{ borderTop: `1px solid ${C.rule}` }}
              >
                <tbody>
                  <tr>
                    {stats.map((s, i) => (
                      <td
                        key={i}
                        valign="top"
                        style={{
                          padding: '14px 10px 0 0',
                          width: `${100 / stats.length}%`,
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: C.mono,
                            fontSize: '9px',
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            color: C.muted,
                            margin: '0 0 4px',
                          }}
                        >
                          {s.k}
                        </Text>
                        <Text
                          style={{
                            fontFamily: C.serif,
                            fontSize: '20px',
                            lineHeight: '1.1',
                            color: C.ink,
                            margin: 0,
                          }}
                        >
                          {s.v}
                        </Text>
                        {s.s ? (
                          <Text
                            style={{
                              fontFamily: C.mono,
                              fontSize: '9px',
                              color: C.muted,
                              margin: '3px 0 0',
                            }}
                          >
                            {s.s}
                          </Text>
                        ) : null}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </Section>
          ) : null}

          {/* CTA */}
          <Section style={{ padding: '26px 32px 4px' }}>
            <a
              href={articleUrl}
              style={{
                display: 'inline-block',
                backgroundColor: C.ink,
                color: C.bg,
                fontFamily: C.mono,
                fontSize: '11px',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                textDecoration: 'none',
                padding: '13px 22px',
              }}
            >
              Read the full brief &rarr;
            </a>
          </Section>

          {/* Broker tag */}
          {brokerTag ? (
            <Section style={{ padding: '18px 32px 0' }}>
              <Text
                style={{
                  fontFamily: C.mono,
                  fontSize: '11px',
                  letterSpacing: '0.06em',
                  color: C.muted,
                  margin: 0,
                }}
              >
                {brokerTag}
              </Text>
            </Section>
          ) : null}

          <Hr
            style={{
              borderColor: C.rule,
              borderTopWidth: '1px',
              margin: '28px 0 0',
            }}
          />

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
              David Safai, Editor and Publisher · Atlas Home Builders · Los Angeles
            </Text>
            <Text
              style={{
                fontFamily: C.mono,
                fontSize: '10px',
                color: C.muted,
                margin: '10px 0 0',
              }}
            >
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

export default DispatchEmail
