export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      augmentation_log: {
        Row: {
          augment_type: string
          created_at: string
          created_by: string | null
          fields_changed: Json | null
          id: string
          listing_id: string | null
          parsed_payload: Json | null
          property_id: string | null
          raw_text: string
        }
        Insert: {
          augment_type: string
          created_at?: string
          created_by?: string | null
          fields_changed?: Json | null
          id?: string
          listing_id?: string | null
          parsed_payload?: Json | null
          property_id?: string | null
          raw_text: string
        }
        Update: {
          augment_type?: string
          created_at?: string
          created_by?: string | null
          fields_changed?: Json | null
          id?: string
          listing_id?: string | null
          parsed_payload?: Json | null
          property_id?: string | null
          raw_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "augmentation_log_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "augmentation_log_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      brokers: {
        Row: {
          bio: string | null
          cell: string | null
          created_at: string
          dre_license: string | null
          email: string | null
          firm: string | null
          focus_areas: string[] | null
          headshot_url: string | null
          id: string
          is_tracked: boolean
          linkedin: string | null
          name: string | null
          office_address: string | null
          phone: string | null
          podcast_name: string | null
          podcast_url: string | null
          profile_url: string | null
          start_year: number | null
          team: string | null
          title: string | null
          tracked_since: string | null
          updated_at: string
          volume_closed: string | null
          years_active: number | null
        }
        Insert: {
          bio?: string | null
          cell?: string | null
          created_at?: string
          dre_license?: string | null
          email?: string | null
          firm?: string | null
          focus_areas?: string[] | null
          headshot_url?: string | null
          id?: string
          is_tracked?: boolean
          linkedin?: string | null
          name?: string | null
          office_address?: string | null
          phone?: string | null
          podcast_name?: string | null
          podcast_url?: string | null
          profile_url?: string | null
          start_year?: number | null
          team?: string | null
          title?: string | null
          tracked_since?: string | null
          updated_at?: string
          volume_closed?: string | null
          years_active?: number | null
        }
        Update: {
          bio?: string | null
          cell?: string | null
          created_at?: string
          dre_license?: string | null
          email?: string | null
          firm?: string | null
          focus_areas?: string[] | null
          headshot_url?: string | null
          id?: string
          is_tracked?: boolean
          linkedin?: string | null
          name?: string | null
          office_address?: string | null
          phone?: string | null
          podcast_name?: string | null
          podcast_url?: string | null
          profile_url?: string | null
          start_year?: number | null
          team?: string | null
          title?: string | null
          tracked_since?: string | null
          updated_at?: string
          volume_closed?: string | null
          years_active?: number | null
        }
        Relationships: []
      }
      listings: {
        Row: {
          ab1482_applicable: boolean | null
          bid_ask_delta: number | null
          borrower: string | null
          buyer_broker_id: string | null
          cap_rate_current: number | null
          cap_rate_market: number | null
          created_at: string
          created_by: string | null
          expense_ratio: number | null
          grm_current: number | null
          grm_market: number | null
          hero_photo_index: number | null
          id: string
          implied_gross_annual_current: number | null
          implied_gross_annual_market: number | null
          implied_monthly_rent_current: number | null
          implied_monthly_rent_market: number | null
          in_unit_features: string[] | null
          last_om_parsed_at: string | null
          lender: string | null
          list_date: string | null
          list_price: number | null
          listing_broker_id: string | null
          loan_amount: number | null
          loan_doc_number: string | null
          loan_maturity_date: string | null
          loan_origination_date: string | null
          loan_type: string | null
          marketing_quotes: Json | null
          noi_current: number | null
          om_highlights: string[] | null
          photos: Json | null
          price_per_sf: number | null
          price_per_unit: number | null
          property_id: string
          rent_roll: Json | null
          rso_applicable: boolean | null
          sale_date: string | null
          sale_price: number | null
          sale_type: string | null
          status: string | null
          t12: Json | null
          ula_tax_estimate: number | null
          ula_threshold_status: string | null
          unit_mix: Json | null
          unit_mix_updated: string | null
          updated_at: string
        }
        Insert: {
          ab1482_applicable?: boolean | null
          bid_ask_delta?: number | null
          borrower?: string | null
          buyer_broker_id?: string | null
          cap_rate_current?: number | null
          cap_rate_market?: number | null
          created_at?: string
          created_by?: string | null
          expense_ratio?: number | null
          grm_current?: number | null
          grm_market?: number | null
          hero_photo_index?: number | null
          id?: string
          implied_gross_annual_current?: number | null
          implied_gross_annual_market?: number | null
          implied_monthly_rent_current?: number | null
          implied_monthly_rent_market?: number | null
          in_unit_features?: string[] | null
          last_om_parsed_at?: string | null
          lender?: string | null
          list_date?: string | null
          list_price?: number | null
          listing_broker_id?: string | null
          loan_amount?: number | null
          loan_doc_number?: string | null
          loan_maturity_date?: string | null
          loan_origination_date?: string | null
          loan_type?: string | null
          marketing_quotes?: Json | null
          noi_current?: number | null
          om_highlights?: string[] | null
          photos?: Json | null
          price_per_sf?: number | null
          price_per_unit?: number | null
          property_id: string
          rent_roll?: Json | null
          rso_applicable?: boolean | null
          sale_date?: string | null
          sale_price?: number | null
          sale_type?: string | null
          status?: string | null
          t12?: Json | null
          ula_tax_estimate?: number | null
          ula_threshold_status?: string | null
          unit_mix?: Json | null
          unit_mix_updated?: string | null
          updated_at?: string
        }
        Update: {
          ab1482_applicable?: boolean | null
          bid_ask_delta?: number | null
          borrower?: string | null
          buyer_broker_id?: string | null
          cap_rate_current?: number | null
          cap_rate_market?: number | null
          created_at?: string
          created_by?: string | null
          expense_ratio?: number | null
          grm_current?: number | null
          grm_market?: number | null
          hero_photo_index?: number | null
          id?: string
          implied_gross_annual_current?: number | null
          implied_gross_annual_market?: number | null
          implied_monthly_rent_current?: number | null
          implied_monthly_rent_market?: number | null
          in_unit_features?: string[] | null
          last_om_parsed_at?: string | null
          lender?: string | null
          list_date?: string | null
          list_price?: number | null
          listing_broker_id?: string | null
          loan_amount?: number | null
          loan_doc_number?: string | null
          loan_maturity_date?: string | null
          loan_origination_date?: string | null
          loan_type?: string | null
          marketing_quotes?: Json | null
          noi_current?: number | null
          om_highlights?: string[] | null
          photos?: Json | null
          price_per_sf?: number | null
          price_per_unit?: number | null
          property_id?: string
          rent_roll?: Json | null
          rso_applicable?: boolean | null
          sale_date?: string | null
          sale_price?: number | null
          sale_type?: string | null
          status?: string | null
          t12?: Json | null
          ula_tax_estimate?: number | null
          ula_threshold_status?: string | null
          unit_mix?: Json | null
          unit_mix_updated?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "listings_buyer_broker_id_fkey"
            columns: ["buyer_broker_id"]
            isOneToOne: false
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_listing_broker_id_fkey"
            columns: ["listing_broker_id"]
            isOneToOne: false
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          airports: Json | null
          amenities: string[] | null
          annual_tax: number | null
          apn: string | null
          architectural_notes: string | null
          assessed_improvements: number | null
          assessed_land: number | null
          assessed_total: number | null
          assessment_history: Json | null
          assessment_year: number | null
          avg_unit_sf: number | null
          bike_score: number | null
          bldg_far: number | null
          building_count: number | null
          building_notes: string | null
          capital_improvements: string | null
          car_score: number | null
          cbsa: string | null
          census_tract: string | null
          city: string | null
          concessions_market: number | null
          concessions_subject: number | null
          concessions_submarket: number | null
          construction_type: string | null
          costar_property_id: string | null
          county: string | null
          created_at: string
          created_by: string | null
          cross_streets: string | null
          cycling_score: number | null
          demographics_1mi: Json | null
          demographics_3mi: Json | null
          dma: string | null
          elevators: string | null
          fema_map_date: string | null
          fema_map_id: string | null
          flood_risk_area: string | null
          flood_zone: string | null
          gross_sf: number | null
          id: string
          in_sfha: boolean | null
          land_acres: number | null
          land_use: string | null
          last_costar_parsed_at: string | null
          lat: number | null
          legal_description: string | null
          lng: number | null
          location_type: string | null
          lot_sf: number | null
          market: string | null
          market_rent_market: number | null
          market_rent_subject: number | null
          market_rent_submarket: number | null
          market_sales_price_per_unit: number | null
          market_segment: string | null
          metering: string | null
          mls_number: string | null
          municipality: string | null
          neighborhood: string | null
          owner_mailing_address: string | null
          owner_type: string | null
          parking_count: number | null
          parking_type: string | null
          pedestrian_score: number | null
          pm_address: string | null
          pm_phone: string | null
          pm_since: string | null
          property_class: string | null
          property_manager: string | null
          property_type: string | null
          recorded_owner: string | null
          recorded_owner_address: string | null
          recorded_owner_since: string | null
          rent_type: string | null
          sale_highlights: string | null
          soft_story_retrofit: boolean | null
          star_rating: number | null
          state: string | null
          stories: number | null
          street_address: string | null
          subdivision: string | null
          submarket: string | null
          submarket_cluster: string | null
          tax_per_unit: number | null
          tax_year: number | null
          transaction_history: Json | null
          transit_score: number | null
          transit_stations: Json | null
          true_owner: string | null
          true_owner_address: string | null
          true_owner_phone: string | null
          true_owner_since: string | null
          twelve_mo_sales_volume_submarket: number | null
          typical_floor_sf: number | null
          under_construction_units_market: number | null
          unit_count: number | null
          units_per_acre: number | null
          updated_at: string
          vacancy_rate_market: number | null
          vacancy_rate_subject: number | null
          vacancy_rate_submarket: number | null
          value_add_notes: string | null
          walk_score: number | null
          walk_up: boolean | null
          year_built: number | null
          year_renovated: number | null
          zip: string | null
          zoning: string | null
        }
        Insert: {
          airports?: Json | null
          amenities?: string[] | null
          annual_tax?: number | null
          apn?: string | null
          architectural_notes?: string | null
          assessed_improvements?: number | null
          assessed_land?: number | null
          assessed_total?: number | null
          assessment_history?: Json | null
          assessment_year?: number | null
          avg_unit_sf?: number | null
          bike_score?: number | null
          bldg_far?: number | null
          building_count?: number | null
          building_notes?: string | null
          capital_improvements?: string | null
          car_score?: number | null
          cbsa?: string | null
          census_tract?: string | null
          city?: string | null
          concessions_market?: number | null
          concessions_subject?: number | null
          concessions_submarket?: number | null
          construction_type?: string | null
          costar_property_id?: string | null
          county?: string | null
          created_at?: string
          created_by?: string | null
          cross_streets?: string | null
          cycling_score?: number | null
          demographics_1mi?: Json | null
          demographics_3mi?: Json | null
          dma?: string | null
          elevators?: string | null
          fema_map_date?: string | null
          fema_map_id?: string | null
          flood_risk_area?: string | null
          flood_zone?: string | null
          gross_sf?: number | null
          id?: string
          in_sfha?: boolean | null
          land_acres?: number | null
          land_use?: string | null
          last_costar_parsed_at?: string | null
          lat?: number | null
          legal_description?: string | null
          lng?: number | null
          location_type?: string | null
          lot_sf?: number | null
          market?: string | null
          market_rent_market?: number | null
          market_rent_subject?: number | null
          market_rent_submarket?: number | null
          market_sales_price_per_unit?: number | null
          market_segment?: string | null
          metering?: string | null
          mls_number?: string | null
          municipality?: string | null
          neighborhood?: string | null
          owner_mailing_address?: string | null
          owner_type?: string | null
          parking_count?: number | null
          parking_type?: string | null
          pedestrian_score?: number | null
          pm_address?: string | null
          pm_phone?: string | null
          pm_since?: string | null
          property_class?: string | null
          property_manager?: string | null
          property_type?: string | null
          recorded_owner?: string | null
          recorded_owner_address?: string | null
          recorded_owner_since?: string | null
          rent_type?: string | null
          sale_highlights?: string | null
          soft_story_retrofit?: boolean | null
          star_rating?: number | null
          state?: string | null
          stories?: number | null
          street_address?: string | null
          subdivision?: string | null
          submarket?: string | null
          submarket_cluster?: string | null
          tax_per_unit?: number | null
          tax_year?: number | null
          transaction_history?: Json | null
          transit_score?: number | null
          transit_stations?: Json | null
          true_owner?: string | null
          true_owner_address?: string | null
          true_owner_phone?: string | null
          true_owner_since?: string | null
          twelve_mo_sales_volume_submarket?: number | null
          typical_floor_sf?: number | null
          under_construction_units_market?: number | null
          unit_count?: number | null
          units_per_acre?: number | null
          updated_at?: string
          vacancy_rate_market?: number | null
          vacancy_rate_subject?: number | null
          vacancy_rate_submarket?: number | null
          value_add_notes?: string | null
          walk_score?: number | null
          walk_up?: boolean | null
          year_built?: number | null
          year_renovated?: number | null
          zip?: string | null
          zoning?: string | null
        }
        Update: {
          airports?: Json | null
          amenities?: string[] | null
          annual_tax?: number | null
          apn?: string | null
          architectural_notes?: string | null
          assessed_improvements?: number | null
          assessed_land?: number | null
          assessed_total?: number | null
          assessment_history?: Json | null
          assessment_year?: number | null
          avg_unit_sf?: number | null
          bike_score?: number | null
          bldg_far?: number | null
          building_count?: number | null
          building_notes?: string | null
          capital_improvements?: string | null
          car_score?: number | null
          cbsa?: string | null
          census_tract?: string | null
          city?: string | null
          concessions_market?: number | null
          concessions_subject?: number | null
          concessions_submarket?: number | null
          construction_type?: string | null
          costar_property_id?: string | null
          county?: string | null
          created_at?: string
          created_by?: string | null
          cross_streets?: string | null
          cycling_score?: number | null
          demographics_1mi?: Json | null
          demographics_3mi?: Json | null
          dma?: string | null
          elevators?: string | null
          fema_map_date?: string | null
          fema_map_id?: string | null
          flood_risk_area?: string | null
          flood_zone?: string | null
          gross_sf?: number | null
          id?: string
          in_sfha?: boolean | null
          land_acres?: number | null
          land_use?: string | null
          last_costar_parsed_at?: string | null
          lat?: number | null
          legal_description?: string | null
          lng?: number | null
          location_type?: string | null
          lot_sf?: number | null
          market?: string | null
          market_rent_market?: number | null
          market_rent_subject?: number | null
          market_rent_submarket?: number | null
          market_sales_price_per_unit?: number | null
          market_segment?: string | null
          metering?: string | null
          mls_number?: string | null
          municipality?: string | null
          neighborhood?: string | null
          owner_mailing_address?: string | null
          owner_type?: string | null
          parking_count?: number | null
          parking_type?: string | null
          pedestrian_score?: number | null
          pm_address?: string | null
          pm_phone?: string | null
          pm_since?: string | null
          property_class?: string | null
          property_manager?: string | null
          property_type?: string | null
          recorded_owner?: string | null
          recorded_owner_address?: string | null
          recorded_owner_since?: string | null
          rent_type?: string | null
          sale_highlights?: string | null
          soft_story_retrofit?: boolean | null
          star_rating?: number | null
          state?: string | null
          stories?: number | null
          street_address?: string | null
          subdivision?: string | null
          submarket?: string | null
          submarket_cluster?: string | null
          tax_per_unit?: number | null
          tax_year?: number | null
          transaction_history?: Json | null
          transit_score?: number | null
          transit_stations?: Json | null
          true_owner?: string | null
          true_owner_address?: string | null
          true_owner_phone?: string | null
          true_owner_since?: string | null
          twelve_mo_sales_volume_submarket?: number | null
          typical_floor_sf?: number | null
          under_construction_units_market?: number | null
          unit_count?: number | null
          units_per_acre?: number | null
          updated_at?: string
          vacancy_rate_market?: number | null
          vacancy_rate_subject?: number | null
          vacancy_rate_submarket?: number | null
          value_add_notes?: string | null
          walk_score?: number | null
          walk_up?: boolean | null
          year_built?: number | null
          year_renovated?: number | null
          zip?: string | null
          zoning?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
