'use client'

// Visual port of David's Friday dispatch signup. Submission is a no-op
// until we wire a real handler — we just prevent the default redirect.
export default function DispatchForm() {
  return (
    <form className="tm-dispatch" onSubmit={(e) => e.preventDefault()}>
      <span className="tm-d-label">Friday dispatch &mdash; one note per week.</span>
      <input
        type="email"
        name="email"
        placeholder="name@domain.com"
        required
        autoComplete="email"
        aria-label="Email address"
      />
      <button type="submit">Subscribe</button>
      <span className="tm-d-sent">You are on the list.</span>
    </form>
  )
}
