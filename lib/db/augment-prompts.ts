// Type-specific prompts for paste augmentation.
// Each prompt is given the full text of one CoStar tab and returns
// JSON in a tightly-scoped shape.

export const CONTACTS_PROMPT = `You are parsing the CoStar "Contacts" tab for a commercial real estate property. Extract structured contact data and return ONLY valid JSON in this exact shape (use null for any field not found):

{
  "listing_broker": {
    "name": string,
    "title": string,
    "firm": string,
    "phone": string,
    "cell": string,
    "email": string,
    "dre_license": string,
    "office_address": string
  } | null,
  "buyer_broker": {
    "name": string,
    "title": string,
    "firm": string,
    "phone": string,
    "cell": string,
    "email": string,
    "dre_license": string,
    "office_address": string
  } | null,
  "property_manager": {
    "name": string,
    "address": string,
    "phone": string,
    "since": string
  } | null,
  "recorded_owner": {
    "name": string,
    "address": string,
    "since": string,
    "ownership_type": string
  } | null,
  "true_owner": {
    "name": string,
    "address": string,
    "phone": string,
    "since": string
  } | null
}

Notes:
- The Contacts tab has multiple sections. Pick the most likely listing/sales broker (often labeled "Leasing Company" or "Primary Leasing Company"). If multiple firms are listed, pick the first one and the first individual agent within it.
- CoStar often duplicates names (e.g. "Gregory Briest / Gregory Briest"). Dedupe — return the name once.
- Format phone numbers as they appear (don't strip parens/dashes).
- Dates like "Since Mar 5, 2003" → return as ISO date "2003-03-05".
- "(p)" suffix means primary phone, "(m)" mobile/cell, "(f)" fax. Map to phone, cell, ignore fax.
- If you can't confidently identify a buyer broker, return null. Buyer broker info is rare on this tab.
- Return only valid JSON, no explanation, no markdown.`

export const PUBLIC_RECORD_PROMPT = `You are parsing the CoStar "Public Record" tab for a commercial real estate property. Extract structured data and return ONLY valid JSON in this exact shape (use null for any field not found):

{
  "recorded_owner": {
    "name": string,
    "ownership_type": string,
    "mailing_address": string
  } | null,
  "subdivision": string,
  "legal_description": string,
  "census_tract": string,
  "municipality": string,
  "land_use": string,
  "transaction_history": [
    {
      "type": "sale" | "loan",
      "date": string,
      "recordation_date": string,
      "sale_type": string,
      "transaction_type": string,
      "deed_type": string,
      "document_number": string,
      "buyer": string,
      "seller": string,
      "buyers": [string],
      "sellers": [string],
      "borrower": string,
      "originator": string,
      "title_company": string,
      "price": number,
      "loan_amount": number,
      "loan_type": string
    }
  ],
  "assessment_history": [
    {
      "year": number,
      "total_assessed": number,
      "improved_assessed": number,
      "land_assessed": number,
      "pct_improved": number,
      "tax_year": number,
      "tax_amount": number
    }
  ]
}

Notes:
- Dates: convert to ISO format YYYY-MM-DD. "3/3/2003" → "2003-03-03".
- Currency: numeric only, no "$" or "M" suffix. "$55.1M" → 55100000.
- Percentages: numeric, no "%". "70.42%" → 70.42.
- Each row in the Sale/Loan History table is one transaction_history entry. Determine type:
  - "Sale Date" present → type: "sale", populate price (or null if "Undisclosed"), buyer, seller, sometimes buyers/sellers arrays for multi-party deals
  - "Loan Date" present → type: "loan", populate loan_amount, borrower, originator
- "Buyers" plural (e.g., "DANNY PAKRAVAN; BEHNAZ PAKRAVAN") → split into the buyers array (and leave buyer null). Same for sellers.
- For "Last Sale" and "Last Loan" detail blocks at the top, also include them as entries in transaction_history (they're usually the same as the most recent History row but with more fields like deed_type and document_number).
- If a transaction shows "Undisclosed" for price, return null for that field.
- Set transaction_history to an empty array [] (not null) if there are no transactions.
- Set assessment_history to an empty array [] if there's no assessment table.
- Return only valid JSON, no explanation, no markdown.`

export const LOAN_PROMPT = `You are parsing the CoStar "Loan" tab for a commercial real estate property. Extract loan history rows and return ONLY valid JSON in this exact shape (use null for any field not found):

{
  "loan_events": [
    {
      "data_source": string,
      "loan_type": string,
      "origination_date": string,
      "maturity_date": string,
      "origination_amount": number,
      "originator": string,
      "borrower": string
    }
  ]
}

Notes:
- The Loan tab is a tabular listing. Each row is one loan event.
- Dates: ISO format YYYY-MM-DD.
- Currency: numeric only.
- "Data Source" column may be "CMBS", "Research", "Agency", or empty.
- "Loan Type" is a classification like "Bond Financing".
- Some rows may be incomplete (truncated text in copy-paste). Include them with null for missing fields rather than skipping.
- Set loan_events to [] if no loans are present.
- Return only valid JSON, no explanation, no markdown.`
