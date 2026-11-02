import {
  Body,
  Container,
  Head,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'

// The welcome email, sent the moment someone subscribes. On brand, unlike the
// Friday roundup (still on the old cream palette): it borrows Nic's front page
// (2026-10) — the navy band with the red line under it for the masthead, the
// red place kicker for The Tape, the blue tag and light-blue highlight for
// Owner's Notes. No handwriting: Caveat can't load in most mail apps.
//
// Sent from a no-reply address (Lucas, 2026-11-01) so automatic signups can't
// put spam in David's inbox; the footer says so. Editorial rule: no em-dashes
// in static copy.

export type WelcomeCard = {
  stream: 'tape' | 'notes'
  // The Tape: the deal's neighborhood/city. Owner's Notes: the stream name.
  label: string
  headline: string
  url: string
}

export type WelcomeEmailProps = {
  // Newest of each stream, Tape first. Empty streams are simply left out.
  cards: WelcomeCard[]
  forwardUrl: string
  unsubscribeUrl: string
  mailingAddress: string
}

const C = {
  navy: '#061832',
  red: '#E73736',
  blue: '#387FF4',
  highlight: '#DCE8FB',
  ink: '#0C1530',
  muted: '#5A6485',
  rule: '#D8DDE9',
  panel: '#F4F6FA',
  bg: '#F4F6FA',
  // Arial first: off Apple, "Helvetica" can be a font pack's impostor (see
  // atlas-v2.css, 2026-10-23). Apple Mail falls through to Helvetica Neue.
  sans: "Arial, 'Helvetica Neue', Helvetica, sans-serif",
  // The logo stays in Times, as on the site.
  logo: "'Times New Roman', Times, serif",
}

function Card({ card }: { card: WelcomeCard }) {
  const notes = card.stream === 'notes'
  return (
    // Inline-block columns: two across where there's room, stacked on a phone,
    // with no media query for a mail app to drop.
    <div style={{ display: 'inline-block', width: '100%', maxWidth: '236px', verticalAlign: 'top', margin: '0 8px 20px', textAlign: 'left' }}>
      <Text style={{ margin: '0 0 8px', fontFamily: C.sans, fontSize: '11px', lineHeight: '1', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        {notes ? (
          <span style={{ display: 'inline-block', padding: '4px 9px', backgroundColor: C.blue, color: '#FFFFFF' }}>{card.label}</span>
        ) : (
          // Same height as the blue tag, so the two headlines line up.
          <span style={{ display: 'inline-block', padding: '4px 0', color: C.red }}>{card.label}</span>
        )}
      </Text>
      <Text style={{ margin: 0, fontFamily: C.sans, fontSize: '18px', lineHeight: '1.3', fontWeight: 700, color: C.ink }}>
        <Link href={card.url} style={{ color: C.ink, textDecoration: 'none' }}>
          {notes ? <span style={{ backgroundColor: C.highlight }}>{card.headline}</span> : card.headline}
        </Link>
      </Text>
    </div>
  )
}

export function WelcomeEmail({ cards, forwardUrl, unsubscribeUrl, mailingAddress }: WelcomeEmailProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>The deals that traded in LA and what they really sold for, every Friday.</Preview>
      <Body style={{ backgroundColor: C.bg, margin: 0, padding: '24px 0', fontFamily: C.sans, color: C.ink }}>
        <Container style={{ width: '100%', maxWidth: '560px', margin: '0 auto', backgroundColor: '#FFFFFF' }}>
          {/* Masthead: the front page's navy band with the red line under it. */}
          <Section style={{ backgroundColor: C.navy, borderBottom: `3px solid ${C.red}`, padding: '26px 32px 22px', textAlign: 'center' }}>
            <Text style={{ margin: 0, fontFamily: C.logo, fontSize: '38px', lineHeight: '1', fontWeight: 700, letterSpacing: '-0.02em', color: '#FFFFFF' }}>
              Atlas <span style={{ color: C.red }}>Brief</span>
            </Text>
          </Section>

          <Section style={{ padding: '30px 32px 6px' }}>
            <Text style={{ margin: '0 0 12px', fontFamily: C.sans, fontSize: '26px', lineHeight: '1.15', fontWeight: 700, letterSpacing: '-0.01em', color: C.ink }}>
              Thanks for subscribing.
            </Text>
            <Text style={{ margin: 0, fontFamily: C.sans, fontSize: '16px', lineHeight: '1.55', color: C.ink }}>
              You&rsquo;re on the list for Atlas Brief. Every Friday you&rsquo;ll get the Los Angeles deals that traded, what they really sold for, and David&rsquo;s notes from the owner&rsquo;s side of the table.
            </Text>
          </Section>

          {cards.length > 0 ? (
            <Section style={{ padding: '26px 24px 6px' }}>
              {/* "The latest" over a red rule, after the front page's "Latest". */}
              <Text style={{ margin: '0 8px 18px', paddingBottom: '8px', borderBottom: `2px solid ${C.red}`, fontFamily: C.sans, fontSize: '13px', lineHeight: '1', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.navy }}>
                The latest
              </Text>
              <div style={{ textAlign: 'center', fontSize: 0 }}>
                {cards.map(card => <Card key={card.stream} card={card} />)}
              </div>
            </Section>
          ) : null}

          {/* The forward ask. */}
          <Section style={{ padding: '6px 32px 30px' }}>
            <div style={{ backgroundColor: C.panel, borderLeft: `3px solid ${C.blue}`, padding: '16px 18px' }}>
              <Text style={{ margin: 0, fontFamily: C.sans, fontSize: '15px', lineHeight: '1.5', color: C.ink }}>
                Know anyone who&rsquo;d be interested in our content? Forward them this email. They can sign up at{' '}
                <Link href={forwardUrl} style={{ color: C.blue, fontWeight: 700, textDecoration: 'underline' }}>atlasbrief.la/subscribe</Link>.
              </Text>
            </div>
            <Text style={{ margin: '22px 0 0', fontFamily: C.logo, fontSize: '20px', lineHeight: '1', fontWeight: 700, color: C.navy }}>
              Atlas <span style={{ color: C.red }}>Brief</span>
            </Text>
          </Section>

          <Section style={{ padding: '18px 32px 26px', borderTop: `1px solid ${C.rule}` }}>
            <Text style={{ margin: 0, fontFamily: C.sans, fontSize: '12px', lineHeight: '1.6', color: C.muted }}>
              This email was sent from an address that isn&rsquo;t monitored, so replies won&rsquo;t reach us.
            </Text>
            <Text style={{ margin: '10px 0 0', fontFamily: C.sans, fontSize: '12px', lineHeight: '1.6', color: C.muted }}>
              <Link href={unsubscribeUrl} style={{ color: C.muted, textDecoration: 'underline' }}>Unsubscribe</Link>
              {' · '}
              {mailingAddress}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export default WelcomeEmail
