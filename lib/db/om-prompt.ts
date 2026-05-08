// OM PDF parser system prompt.
// Extracts subject-property data from broker offering memoranda.

export const OM_PROMPT = `You are parsing a broker Offering Memorandum (OM) for a multifamily real estate property in Los Angeles. Extract structured data about THE SUBJECT PROPERTY ONLY (not comparable properties, not the broker's other listings, not the surrounding neighborhood).

Return ONLY valid JSON in this exact shape. Use null for any field not found. Do not infer or hallucinate.

{
  "property": {
    "name": string,
    "address": string,
    "city": string,
    "state": string,
    "zip": string,
    "apn": string,
    "year_built": number,
    "year_renovated": number,
    "unit_count": number,
    "gross_sf": number,
    "lot_sf": number,
    "land_acres": number,
    "stories": number,
    "construction_type": string,
    "property_class": "A" | "B" | "C",
    "zoning": string,
    "submarket": string,
    "amenities": [string],
    "architectural_notes": string,
    "capital_improvements": string,
    "value_add_notes": string
  },
  "listing": {
    "list_price": number,
    "list_price_note": string,
    "cap_rate_current": number,
    "cap_rate_market": number,
    "grm_current": number,
    "grm_market": number,
    "noi_current": number,
    "noi_market": number,
    "expense_ratio_current": number,
    "expense_ratio_market": number,
    "scheduled_gross_income_current": number,
    "scheduled_gross_income_market": number,
    "total_expenses_current": number,
    "total_expenses_market": number,
    "vacancy_rate_used": number,
    "implied_monthly_rent_current": number,
    "implied_monthly_rent_market": number,
    "expense_breakdown": [
      { "category": string, "current": number, "market": number }
    ]
  },
  "unit_mix": [
    {
      "bed_type": string,
      "units": number,
      "avg_sf": number,
      "current_avg_rent": number,
      "market_avg_rent": number,
      "vacant_count": number
    }
  ],
  "in_unit_features": [string],
  "marketing_quotes": [
    { "label": string, "body": string }
  ],
  "om_highlights": [string],
  "photos": [
    { "caption": string, "page": number, "role": "exterior" | "unit" | "amenity" | "aerial" | "common_area" | "neighborhood_landmark" }
  ],
  "listing_broker": {
    "name": string,
    "title": string,
    "firm": string,
    "phone": string,
    "cell": string,
    "email": string,
    "dre_license": string,
    "office_address": string
  },
  "co_listing_brokers": [
    {
      "name": string,
      "title": string,
      "firm": string,
      "phone": string,
      "cell": string,
      "email": string,
      "dre_license": string,
      "office_address": string
    }
  ]
}

Critical instructions:

1. SUBJECT PROPERTY ONLY. Many OMs include "Sales Comparables" or "Apartment Comparables" tables with data on nearby properties. Do NOT extract those into property/listing/unit_mix. Only extract data about the property being marketed for sale.

2. CURRENT vs MARKET. OMs typically show financials in two or three columns: Current (in-place), Year 1 (proforma after light intervention), and Market (stabilized). For each financial field, capture both Current and Market. Ignore Year 1 unless that's the only column shown.

3. LIST PRICE. Some OMs say "Request for Offers", "Submit Offers", "Call for Pricing", or "Unpriced". In that case, set list_price to null and list_price_note to the literal phrase used.

4. UNITS. The "unit_count" is the residential unit count. If the property is mixed-use (e.g., 88 residential + 1 retail), set unit_count to the residential number only and note the retail in amenities or capital_improvements.

5. BROKERS. The cover page or "Listed By" / "Exclusively Listed By" section lists 1-4 brokers. Pick the FIRST broker listed as listing_broker. Put any additional brokers in co_listing_brokers. Capture all available contact fields per broker. CA license numbers may appear as "DRE 00908473", "CA License 02012927", or "CA 01066258" — return just the digits (e.g., "00908473").

6. MARKETING_QUOTES. The "Investment Highlights" / "Investment Summary" section is a list of bulleted pitch points, often with a bold label and explanatory paragraph. Capture each as { label, body } verbatim. These are pull-quotes David will react to in commentary.

7. OM_HIGHLIGHTS. Short pitch phrases that appear ONCE on the cover or section dividers (e.g., "An 88 Unit Mixed-Use Value Add Opportunity Located in Downtown Los Angeles", "A Premier 132-Unit Multifamily Opportunity in Los Angeles' Dynamic Miracle Mile Submarket"). Different from marketing_quotes which are the longer Investment Highlights bullets.

8. UNIT_MIX. Aggregate by bedroom type (e.g., "Studio", "1+1", "1+2", "2+1", "2+2", "2+2.5", "3+2"). Pull from the financial summary's unit mix table. If a rent roll exists, count vacant units per type and put it in vacant_count; otherwise leave vacant_count null.

9. IN_UNIT_FEATURES. From The Offering / Investment Highlights / Premium In-Unit Finishes sections — extract phrases like "high ceilings", "polished concrete floors", "stainless steel appliances", "in-unit laundry hookups", "vaulted ceilings in upper floors", "private balconies with city views", "Nest smart thermostats", "fireplaces". One per array element.

10. PHOTOS. For each photo on the page, capture { caption, page, role }. Caption is the visible label if present (e.g., "PERCH LA", "PALM COURT APARTMENTS"), or a 3-5 word description if no caption. Role: "exterior" (building from outside), "unit" (interior of an apartment), "amenity" (pool/gym/lounge), "aerial" (drone shot), "common_area" (lobby/hallway), "neighborhood_landmark" (nearby building like a museum or stadium — NOT the subject property). Skip plain location maps, broker logos, disclaimer pages.

11. EXPENSE_BREAKDOWN. From the Annualized Expenses / Operating Expenses table. Each line item (Real Estate Taxes, Insurance, Utilities, Maintenance, Payroll, etc.) becomes one entry. Use the Current column for "current" and the Market or stabilized column for "market".

12. NUMBERS. All numeric fields are numbers, not strings. "$8.89M" → 8890000. "5.21%" → 5.21. "1,512 SF" → 1512.

13. AB 1482 / RSO. If the OM mentions rent control (AB 1482, RSO, Rent Stabilization Ordinance), capture the relevant phrase in value_add_notes (e.g., "Subject to AB 1482, capping annual increases at 5% plus CPI up to 10%").

14. PROPERTY CLASS. If the OM explicitly says "Class A property", "Class B", or "Class C", capture it. If it just describes the property (e.g., "luxury", "historic", "value-add"), leave property_class null. Do not infer from age or amenities.

Return only valid JSON, no explanation, no markdown fences.`
