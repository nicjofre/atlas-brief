import Anthropic from '@anthropic-ai/sdk'
import type { ContentBlockParam, Base64PDFSource } from '@anthropic-ai/sdk/resources'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { persistDeal } from '@/lib/db/upsert'
import type { ParsedDeal } from '@/lib/db/parsed-deal'

export const maxDuration = 300

const client = new Anthropic()

const SYSTEM_PROMPT = `You are a commercial real estate data parser for CoStar reports. Extract structured deal data from the provided report. Return a JSON object with these fields. Use null for any field not found. Be aggressive about pulling out everything that's present.

{
  "property_id": string,
  "property_name": string,
  "address": string,
  "city": string,
  "state": string,
  "zip": string,
  "county": string,
  "market": string,
  "submarket": string,
  "submarket_cluster": string,
  "cbsa": string,
  "dma": string,
  "location_type": string,
  "neighborhood": string,

  "star_rating": number,
  "property_class": "A" | "B" | "C",
  "property_type": string,

  "unit_count": number,
  "building_sf": number,
  "avg_unit_size_sf": number,
  "stories": number,
  "typical_floor_sf": number,
  "building_count": number,
  "units_per_acre": number,
  "year_built": number,
  "year_renovated": number,
  "construction": string,
  "elevators": string,
  "walk_up": boolean,
  "metering": string,
  "market_segment": string,
  "rent_type": string,

  "land_acres": number,
  "land_sf": number,
  "bldg_far": number,
  "zoning": string,
  "apn": string,

  "status": "for_sale" | "sold" | "off_market",
  "list_price": number,
  "sale_price": number,
  "price_per_unit": number,
  "price_per_sf": number,
  "cap_rate": number,
  "noi": number,
  "grm": number,
  "sale_type": string,
  "sale_date": string,
  "last_sale_date": string,
  "last_sale_price": number,

  "sale_history": [
    { "date": string, "type": string, "price": number, "units": number, "price_per_unit": number, "cap_rate": number, "buyer": string, "seller": string }
  ],

  "unit_mix": [
    { "bed_type": string, "units": number, "avg_sf": number, "asking_rent_per_unit": number, "asking_rent_per_sf": number, "concessions_pct": number }
  ],
  "asking_rent_per_unit": number,
  "asking_rent_per_sf": number,
  "unit_mix_updated": string,

  "vacancy_rate_subject": number,
  "vacancy_rate_submarket": number,
  "vacancy_rate_market": number,
  "market_rent_subject": number,
  "market_rent_submarket": number,
  "market_rent_market": number,
  "concessions_subject": number,
  "concessions_submarket": number,
  "concessions_market": number,
  "under_construction_units_market": number,
  "twelve_mo_sales_volume_submarket": number,
  "market_sales_price_per_unit": number,

  "pedestrian_score": number,
  "cycling_score": number,
  "car_score": number,
  "transit_score": number,
  "walk_score": number,
  "bike_score": number,

  "parking_spaces": string,
  "parking_count": number,

  "loan_amount": number,
  "loan_origination_date": string,
  "loan_maturity_date": string,
  "lender": string,
  "borrower": string,
  "loan_type": string,
  "loan_doc_number": string,

  "recorded_owner": string,
  "true_owner": string,
  "owner_type": string,
  "property_manager": string,
  "property_manager_phone": string,
  "property_manager_since": string,

  "sale_broker": string,
  "broker_name": string,
  "broker_firm": string,
  "broker_phone": string,
  "broker_email": string,
  "broker_license": string,
  "mls_number": string,

  "assessed_total": number,
  "assessed_improvements": number,
  "assessed_land": number,
  "assessment_year": number,
  "annual_tax": number,
  "tax_per_unit": number,
  "tax_year": number,

  "flood_risk_area": string,
  "flood_zone": string,
  "in_sfha": boolean,
  "fema_map_id": string,
  "fema_map_date": string,

  "demographics_1mi": { "population": number, "households": number, "median_age": number, "median_hh_income": number, "daytime_employees": number, "population_growth_5y": number, "household_growth_5y": number },
  "demographics_3mi": { "population": number, "households": number, "median_age": number, "median_hh_income": number, "daytime_employees": number, "population_growth_5y": number, "household_growth_5y": number },

  "sale_highlights": string,
  "building_notes": string,
  "amenities": string[],
  "value_add_notes": string,
  "capital_improvements": string,
  "soft_story_retrofit": boolean,

  "transit_stations": [ { "name": string, "type": string, "drive_min": number, "walk_min": number, "distance_mi": number } ],
  "airports": [ { "name": string, "drive_min": number, "distance_mi": number } ]
}

Notes:
- For percentages, return as numbers (e.g., 5.21 not "5.21%").
- For currency, return numeric values only (e.g., 8890000 not "$8.89M").
- For dates, return ISO format YYYY-MM-DD (e.g., "2024-09-15") or null. Never return free-form date strings.
- For "Taxes $X/Unit (YEAR)", set tax_per_unit, tax_year, and compute annual_tax = tax_per_unit * unit_count.
- "Pedestrian Friendly", "Cycling Friendly", "Car Friendly", "Transit Friendly" map to pedestrian_score/cycling_score/car_score/transit_score (numeric only, drop the descriptive label).
- For unit_mix, each row is a bedroom type. Use "Studio", "1", "2", "3" etc as bed_type.
- Sale highlights: capture the bullet points as a single string with line breaks.
- Building notes: capture the editorial narrative paragraphs.
- Amenities: list of strings like ["Kitchen", "Views", "Oven"].
- If a year_renovated isn't shown, leave null.

Return only valid JSON, no explanation or markdown.`

function parseResponse(text: string): ParsedDeal {
  const raw = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim()
  return JSON.parse(raw)
}

async function parseFromPdf(file: File): Promise<ParsedDeal> {
  const bytes = await file.arrayBuffer()
  const base64 = Buffer.from(bytes).toString('base64')

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: base64,
            } as Base64PDFSource,
          } as ContentBlockParam,
          { type: 'text', text: SYSTEM_PROMPT } as ContentBlockParam,
        ],
      },
    ],
  })

  const content = response.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type')
  return parseResponse(content.text)
}

async function parseFromText(text: string): Promise<ParsedDeal> {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    messages: [
      { role: 'user', content: `${SYSTEM_PROMPT}\n\nText to parse:\n${text}` },
    ],
  })

  const content = response.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type')
  return parseResponse(content.text)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const contentType = request.headers.get('content-type') || ''

  let deal: ParsedDeal
  try {
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const file = formData.get('pdf') as File | null
      if (!file) {
        return NextResponse.json({ error: 'No PDF provided' }, { status: 400 })
      }
      deal = await parseFromPdf(file)
    } else {
      const { text } = await request.json()
      if (!text?.trim()) {
        return NextResponse.json({ error: 'No text provided' }, { status: 400 })
      }
      deal = await parseFromText(text)
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Parse failed'
    return NextResponse.json({ error: `Parse failed: ${message}` }, { status: 500 })
  }

  try {
    const { propertyId, listingId, brokerId } = await persistDeal(supabase, deal)
    return NextResponse.json({ deal, propertyId, listingId, brokerId })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Persistence failed'
    return NextResponse.json({ deal, error: `Saved parse but failed to persist: ${message}` }, { status: 500 })
  }
}
