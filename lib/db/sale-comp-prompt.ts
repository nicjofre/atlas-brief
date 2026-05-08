// Sales Comp page parser prompt — for CoStar's sold-deal detail page
// (richer than Property Summary; includes true buyer/seller, hold period,
// sale notes narrative, initial ask, buyer activity history).

export const SALE_COMP_PROMPT = `You are parsing a CoStar "Sales Comp" page (sold-deal detail). Extract structured data and return ONLY valid JSON in this exact shape (use null for any field not found):

{
  "property": {
    "address": string,
    "city": string,
    "state": string,
    "zip": string,
    "apn": string,
    "year_built": number,
    "unit_count": number,
    "gross_sf": number,
    "lot_sf": number,
    "land_acres": number,
    "stories": number,
    "construction_type": string,
    "property_class": "A" | "B" | "C",
    "zoning": string,
    "submarket": string
  },
  "transaction": {
    "sale_date": string,
    "recording_date": string,
    "sale_price": number,
    "initial_ask_price": number,
    "price_per_unit": number,
    "price_per_sf": number,
    "price_per_acre_land": number,
    "price_per_sf_land": number,
    "transfer_tax": number,
    "actual_cap_rate": number,
    "noi_current": number,
    "sale_type": string,
    "price_status": string,
    "comp_status": string,
    "document_number": string,
    "hold_period_months": number,
    "sale_notes": string
  },
  "buyer": {
    "recorded_buyer": string,
    "true_buyer": string,
    "true_buyer_address": string,
    "true_buyer_phone": string,
    "buyer_contact_name": string,
    "buyer_contact_phone": string,
    "buyer_contact_cell": string,
    "buyer_origin": string,
    "buyer_type": string,
    "buyer_secondary_type": string,
    "buyer_activity_acquisitions": number,
    "buyer_activity_dispositions": number
  },
  "seller": {
    "recorded_seller": string,
    "true_seller": string,
    "true_seller_address": string,
    "true_seller_phone": string,
    "seller_contact_name": string,
    "seller_contact_phone": string,
    "seller_contact_cell": string,
    "seller_origin": string,
    "seller_type": string,
    "seller_secondary_type": string
  },
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
  "buyer_broker": {
    "name": string,
    "title": string,
    "firm": string,
    "phone": string,
    "cell": string,
    "email": string,
    "dre_license": string,
    "office_address": string
  }
}

Critical instructions:

1. SUBJECT PROPERTY ONLY. The page shows market data, demographics, and traffic for the surrounding area. None of that goes in property; only the actual building being sold.

2. RECORDED vs TRUE. The page distinguishes "Recorded Buyer/Seller" (the LLC or trust on the deed) from "True Buyer/Seller" (the actual operating entity). Capture both. They may be the same.

3. SALE_NOTES. The narrative paragraph at the bottom (often labeled "Sale Notes" or appearing under "Documents"). Capture verbatim — David quotes from these. Examples: "A private individual sold this 4,514 square foot 11-unit multifamily building... The seller was motivated to divest the property because they wanted to liquidate their assets..."

4. INITIAL_ASK_PRICE. Often appears in the sale notes narrative ("with an initial asking price of $2,995,000"). Extract the number. Distinct from sale_price (the actual closing number).

5. HOLD_PERIOD_MONTHS. May be shown directly ("Hold Period: 8 Months") or computable from prior sale date. If shown directly, use that. If only "Hold Period: 8 Months" with months, return 8. If "2 Years 3 Months", return 27.

6. ACTUAL_CAP_RATE. The verified at-close number, distinct from broker-stated. Sometimes labeled "Actual Cap Rate" or just "Cap Rate" with a "Confirmed" Price Status.

7. NOI_CURRENT. From the Income & Expenses table. Use the most recent year column.

8. BUYER ACTIVITY. The "Activity (Last 5 Yrs)" line: parse the dollar amounts. "$450.1M (Acquisitions) / $156M (Dispositions)" → buyer_activity_acquisitions = 450100000, buyer_activity_dispositions = 156000000.

9. BROKERS. The page shows "Listing Broker" and "Buyer Broker" sections. Capture both. Some Sales Comps show the same person/firm in both — that's fine, capture them both ways. Phone formatting: "(310) 210-4303" verbatim. DRE: digits only.

10. NUMBERS. All numerics are numbers, not strings. "$3,100,000" → 3100000. "6.10%" → 6.10. "12,478 SF" → 12478. "0.20 AC" → 0.20.

11. DATES. ISO format YYYY-MM-DD. "Apr 6, 2026" → "2026-04-06".

12. PRICE_STATUS / COMP_STATUS. These are CoStar metadata fields with values like "Confirmed", "Research Complete", "Unconfirmed". Capture verbatim.

Return only valid JSON, no explanation, no markdown fences.`
