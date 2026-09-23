// Legal disclaimer shown on every public page (in the footer). Single source of
// truth for the text so it stays consistent site-wide.
//
// Colour lives in CSS (.disclaimer) rather than inline, so it can sit on the
// navy footer as readily as on a light page.
export default function Disclaimer() {
  return (
    <p className="disclaimer">
      <b>DISCLAIMER:</b> These analyses represent operator
      observations and opinions based on market research and deal data. This is not investment advice,
      financial advice, or a recommendation to buy or sell any property. Consult qualified professionals
      before making investment decisions.
    </p>
  )
}
