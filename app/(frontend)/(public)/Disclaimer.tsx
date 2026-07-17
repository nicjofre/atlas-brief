// Legal disclaimer shown on every public page (in the footer). Single source of
// truth for the text so it stays consistent site-wide.
export default function Disclaimer() {
  return (
    <p
      style={{
        fontSize: 11.5,
        lineHeight: 1.55,
        color: 'var(--muted)',
        maxWidth: 900,
        margin: 0,
      }}
    >
      <b style={{ color: 'var(--ink-soft, inherit)' }}>DISCLAIMER:</b> These analyses represent operator
      observations and opinions based on market research and deal data. This is not investment advice,
      financial advice, or a recommendation to buy or sell any property. Consult qualified professionals
      before making investment decisions.
    </p>
  )
}
