@AGENTS.md

## Notes for future work

### When AI article drafting is built

The article generator must handle `under_construction` listings as a first-class case, not just a fallback to "for_sale". Specifically:

- Surface `expected_delivery_date` / `expected_delivery_note` in the article body (e.g., "delivers Q4 2027" or "expected delivery Dec 2027")
- For under-construction projects there's no closed sale price or actual CAP — articles should lean on supply/market context (units coming online, submarket pipeline, what the project's delivery means competitively)
- Don't generate "What an operator sees" / closed-comp commentary for under-construction listings — they haven't traded
- The headline metrics bar at the top of the article should drop the `Sale Price / $/Door / CAP / GRM` row for under-construction and show `Units / Year Delivering / Bldg SF / Submarket` instead
