@AGENTS.md

## Notes for future work

### Always filter soft-deleted listings

Any dashboard, analytics view, aggregate query, comp table, or article-generation pipeline that reads from `listings` MUST filter `WHERE deleted_at IS NULL` by default. Deleted entries stay in the database for historical record but are excluded from every default view. Only opt in to including deleted rows when the use case explicitly requires historical/audit visibility.

### When AI article drafting is built

**Rent regulation must be editable in the article draft view.** The `listings.rent_regulation_override` column lets David correct the derived value on the listing detail page, but the article workflow should also surface a clearly editable "Rent Regulation" field at draft time — some edge cases (post-1978 buildings still under RSO via LA ordinance designations / REAP / opt-in) can only be caught when David is reviewing the specific deal. Pre-fill from `rent_regulation_override` if set, otherwise from the derived label. Persist any in-article edit back to `rent_regulation_override` so the database stays consistent.

The article generator must handle `under_construction` listings as a first-class case, not just a fallback to "for_sale". Specifically:

- Surface `expected_delivery_date` / `expected_delivery_note` in the article body (e.g., "delivers Q4 2027" or "expected delivery Dec 2027")
- For under-construction projects there's no closed sale price or actual CAP — articles should lean on supply/market context (units coming online, submarket pipeline, what the project's delivery means competitively)
- Don't generate "What an operator sees" / closed-comp commentary for under-construction listings — they haven't traded
- The headline metrics bar at the top of the article should drop the `Sale Price / $/Door / CAP / GRM` row for under-construction and show `Units / Year Delivering / Bldg SF / Submarket` instead
