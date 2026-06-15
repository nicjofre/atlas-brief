// Registry of editable content blocks on the About / Contact / Build pages.
//
// Each entry pairs a stable key with the page it belongs to, a human-readable
// label for the admin UI, whether the field is multi-paragraph (textarea) or
// a single line (input), and the fallback text used when no override is saved
// in the content_blocks table.
//
// To make a new piece of copy editable: add a row here, then replace the
// hardcoded string in the page with `c['key']` where `c` is the result of
// getPageContent('about' | 'contact' | 'build').
//
// The fallback text in this file IS the source of truth for the default copy.
// If David has never edited a block, the page renders the fallback verbatim.

export type PageSlug = 'about' | 'contact' | 'build'

export type ContentField = {
  key: string
  page: PageSlug
  label: string
  hint?: string
  multiline: boolean
  defaultText: string
}

export const CONTENT_FIELDS: ContentField[] = [
  // ===== ABOUT =====
  {
    key: 'about.intro',
    page: 'about',
    label: 'Intro line',
    multiline: false,
    defaultText: 'Atlas is a Los Angeles real estate practice with three sides.',
  },
  {
    key: 'about.brief_body',
    page: 'about',
    label: 'Atlas Brief description',
    multiline: true,
    defaultText:
      'The publication you are reading. A running log of Los Angeles multifamily deal commentary, construction cost reads, and owner-operator analysis. Written by David Safai, a thirty-year LA operator, developer, and general contractor. Not a marketing funnel. An operating journal.',
  },
  {
    key: 'about.builders_body',
    page: 'about',
    label: 'Atlas Home Builders description',
    multiline: true,
    defaultText:
      'The legal company behind it — a licensed California Class B general contractor, founded in 1996. The practice operates a portfolio of approximately 126 units across multiple Los Angeles buildings, develops ground-up multifamily and condominium projects, and takes selective general contracting work for owners, developers, and family offices. Two buildings developed by the firm are still held by the builder: The Felix on Fairfax, a 43-unit apartment in the Fairfax District, and Olympic Towers, a 12-unit condominium.',
  },
  {
    key: 'about.homepro_body',
    page: 'about',
    label: 'Atlas Home Pro description',
    multiline: true,
    defaultText:
      'An acquisition platform for Los Angeles home service businesses — plumbing, HVAC, electrical, restoration. We are a buyer. If you own a service company in Los Angeles County and are considering a sale, or a broker representing one, send us the details. Conversations are confidential.',
  },
  {
    key: 'about.felix_blurb',
    page: 'about',
    label: 'Felix on Fairfax blurb',
    multiline: true,
    defaultText:
      "A 43-unit, five-story residential building developed, built, and held by Atlas. Designed around a single organizing principle: no unit plan exists that the sponsor wouldn't live in.",
  },
  {
    key: 'about.olympic_blurb',
    page: 'about',
    label: 'Olympic Towers blurb',
    multiline: true,
    defaultText:
      "Twelve for-sale homes in a mid-Wilshire infill. A study in how much a thoughtful building envelope and a real construction schedule can add to a buyer's basis without adding a dollar to ours.",
  },
  {
    key: 'about.tail_p1',
    page: 'about',
    label: 'Closing paragraph 1',
    multiline: true,
    defaultText:
      'The practice began in 1996 with a long-hold real estate thesis: buy well-located Los Angeles multifamily, operate it honestly, hold for decades, let debt amortize against rent growth. Thirty years in, the thesis has held.',
  },
  {
    key: 'about.tail_p2',
    page: 'about',
    label: 'Closing paragraph 2',
    multiline: true,
    defaultText:
      'What changed recently is the writing. Atlas Brief exists because most of what gets published about Los Angeles real estate is either a brokerage pitch or a consumer service blog. Very little of it is written by someone who has actually operated a building, pulled a permit, or signed a construction draw. The Brief tries to fill that gap.',
  },
  {
    key: 'about.tail_p3',
    page: 'about',
    label: 'Closing line',
    multiline: false,
    defaultText: 'Read it like a trade journal, not a brochure.',
  },

  // ===== CONTACT =====
  {
    key: 'contact.hero_subtitle',
    page: 'contact',
    label: 'Hero subtitle',
    multiline: false,
    defaultText: 'Atlas Home Builders, Inc. is based in Los Angeles.',
  },
  {
    key: 'contact.editorial_body',
    page: 'contact',
    label: 'Editorial inquiries paragraph',
    multiline: true,
    defaultText:
      'If you have a listing, a comp, a trade, or a deal worth covering in The Tape: send it over. We read every submission. Interesting deals run in the next issue of the Brief. Uninteresting ones get a straight answer back the same day.',
  },
  {
    key: 'contact.construction_body',
    page: 'contact',
    label: 'Construction / development inquiries paragraph',
    multiline: true,
    defaultText:
      'If you have a project that needs a general contractor, or a site that needs a walk: describe it in a few sentences. If it is a fit, we schedule a walk within the week. If it is not, we tell you why.',
  },
  {
    key: 'contact.acquisition_body',
    page: 'contact',
    label: 'Acquisition inquiries paragraph',
    multiline: true,
    defaultText:
      'If you own a Los Angeles home service business and are thinking about a sale, or a broker representing one: we are a buyer. Plumbing, HVAC, electrical, restoration. Conversations are confidential. Preferred size $500K to $5M in revenue, but we will read anything that fits the thesis.',
  },
  {
    key: 'contact.direct_email',
    page: 'contact',
    label: 'Direct email',
    multiline: false,
    defaultText: 'David@AtlasHomePro.com',
  },
  {
    key: 'contact.direct_phone',
    page: 'contact',
    label: 'Direct phone',
    multiline: false,
    defaultText: '(213) 275-2210',
  },
  {
    key: 'contact.direct_office',
    page: 'contact',
    label: 'Office location',
    multiline: false,
    defaultText: 'Los Angeles, California',
  },
  {
    key: 'contact.license_status',
    page: 'contact',
    label: 'License status line',
    multiline: false,
    defaultText: 'License [pending]',
  },

  // ===== BUILD =====
  {
    key: 'build.intro_p1',
    page: 'build',
    label: 'Intro paragraph 1',
    multiline: true,
    defaultText:
      'Atlas Home Builders, Inc. is a licensed California Class B general contractor. The practice has developed ground-up multifamily and condominium projects, operates its own portfolio of roughly 126 units, and takes selective general contracting work for other owners, developers, and family offices.',
  },
  {
    key: 'build.intro_p2',
    page: 'build',
    label: 'Intro paragraph 2',
    multiline: true,
    defaultText:
      "We are not a service company. We are a general contracting practice run by an owner-operator who has spent thirty years on the owner's side of the table. Every job we take, we underwrite the way an owner would — because the person running the work has been the owner a hundred times over.",
  },
  {
    key: 'build.in_house_body',
    page: 'build',
    label: 'In-house capabilities paragraph',
    multiline: true,
    defaultText:
      'General contracting, light framing, plumbing rough and trim, electrical rough and trim, HVAC, painting, restoration, gates and garage doors. We subcontract anything outside that list to people we have worked with for years and will work with for years more.',
  },
  {
    key: 'build.step1_body',
    page: 'build',
    label: 'Step 1 — Walk',
    multiline: true,
    defaultText:
      'We walk the project with the owner, the architect, or whoever is running point. No proposal yet. We are looking at what the scope actually is, what the building actually needs, where the surprises are likely to live. If the project is not a fit, we say so on the walk.',
  },
  {
    key: 'build.step2_body',
    page: 'build',
    label: 'Step 2 — Scope & Schedule',
    multiline: true,
    defaultText:
      'A real scope document, a real schedule, real line items. Not marketing numbers. If the budget needs a conversation about tradeoffs, we have the conversation before the contract.',
  },
  {
    key: 'build.step3_body',
    page: 'build',
    label: 'Step 3 — Build',
    multiline: true,
    defaultText:
      'We open walls cleanly and close them cleaner. We run the job with the discipline of an operator who will have to live with the work for the next twenty years. We do not chase change orders.',
  },
  {
    key: 'build.step4_body',
    page: 'build',
    label: 'Step 4 — Close Out',
    multiline: true,
    defaultText:
      'Permits pulled, inspections signed, closeout binder delivered. The binder is built so an operator can pick it up five years from now and understand exactly what was done, by whom, and when.',
  },
  {
    key: 'build.cta_body',
    page: 'build',
    label: 'Closing CTA paragraph',
    multiline: true,
    defaultText:
      'Email David directly at David@AtlasHomePro.com. If the project is a fit, we respond within 24 hours. If it is not, we respond within 24 hours and tell you why.',
  },
]

export function fieldsForPage(page: PageSlug): ContentField[] {
  return CONTENT_FIELDS.filter(f => f.page === page)
}
