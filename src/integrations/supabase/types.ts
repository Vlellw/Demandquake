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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      api_rate_events: {
        Row: {
          created_at: string
          id: number
          provider: string
        }
        Insert: {
          created_at?: string
          id?: number
          provider: string
        }
        Update: {
          created_at?: string
          id?: number
          provider?: string
        }
        Relationships: []
      }
      clusters: {
        Row: {
          affected_users: string | null
          category: string | null
          competitor_query: string | null
          competitor_source_ids: string[]
          created_at: string
          evidence_strength: string
          generation_error: string | null
          generation_started_at: string | null
          generation_status: string
          geography: string | null
          id: string
          industry: string | null
          keywords: string[]
          rank: number
          run_id: string
          signals: Json
          source_ids: string[]
          startup_id: string | null
          strength_reason: string | null
          summary: string
          title: string
          why_now: string | null
        }
        Insert: {
          affected_users?: string | null
          category?: string | null
          competitor_query?: string | null
          competitor_source_ids?: string[]
          created_at?: string
          evidence_strength?: string
          generation_error?: string | null
          generation_started_at?: string | null
          generation_status?: string
          geography?: string | null
          id?: string
          industry?: string | null
          keywords?: string[]
          rank?: number
          run_id: string
          signals?: Json
          source_ids?: string[]
          startup_id?: string | null
          strength_reason?: string | null
          summary: string
          title: string
          why_now?: string | null
        }
        Update: {
          affected_users?: string | null
          category?: string | null
          competitor_query?: string | null
          competitor_source_ids?: string[]
          created_at?: string
          evidence_strength?: string
          generation_error?: string | null
          generation_started_at?: string | null
          generation_status?: string
          geography?: string | null
          id?: string
          industry?: string | null
          keywords?: string[]
          rank?: number
          run_id?: string
          signals?: Json
          source_ids?: string[]
          startup_id?: string | null
          strength_reason?: string | null
          summary?: string
          title?: string
          why_now?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clusters_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "discovery_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clusters_startup_fk"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      discovery_runs: {
        Row: {
          completed_at: string | null
          created_at: string
          error: string | null
          geography: string | null
          id: string
          industry: string | null
          plan: Json
          query: string
          query_key: string
          stage_started_at: string | null
          stats: Json
          status: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error?: string | null
          geography?: string | null
          id?: string
          industry?: string | null
          plan?: Json
          query: string
          query_key: string
          stage_started_at?: string | null
          stats?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error?: string | null
          geography?: string | null
          id?: string
          industry?: string | null
          plan?: Json
          query?: string
          query_key?: string
          stage_started_at?: string | null
          stats?: Json
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      market_scans: {
        Row: {
          assessment_after: Json | null
          assessment_before: Json | null
          candidates_count: number
          changes: Json
          completed_at: string | null
          created_at: string
          error: string | null
          headline: string | null
          id: string
          new_source_ids: string[]
          queries: string[]
          stage_started_at: string | null
          startup_id: string
          status: string
          summary: string | null
          verdict: string | null
          window_days: number
        }
        Insert: {
          assessment_after?: Json | null
          assessment_before?: Json | null
          candidates_count?: number
          changes?: Json
          completed_at?: string | null
          created_at?: string
          error?: string | null
          headline?: string | null
          id?: string
          new_source_ids?: string[]
          queries?: string[]
          stage_started_at?: string | null
          startup_id: string
          status?: string
          summary?: string | null
          verdict?: string | null
          window_days?: number
        }
        Update: {
          assessment_after?: Json | null
          assessment_before?: Json | null
          candidates_count?: number
          changes?: Json
          completed_at?: string | null
          created_at?: string
          error?: string | null
          headline?: string | null
          id?: string
          new_source_ids?: string[]
          queries?: string[]
          stage_started_at?: string | null
          startup_id?: string
          status?: string
          summary?: string | null
          verdict?: string | null
          window_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "market_scans_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          assumptions: Json
          brand: Json
          checklist: Json
          concept: string | null
          created_at: string
          id: string
          name: string
          pitch: Json
          research: Json
          roadmap: Json
          startup_id: string | null
          tagline: string | null
          updated_at: string
          updates: Json
          user_id: string
        }
        Insert: {
          assumptions?: Json
          brand?: Json
          checklist?: Json
          concept?: string | null
          created_at?: string
          id?: string
          name: string
          pitch?: Json
          research?: Json
          roadmap?: Json
          startup_id?: string | null
          tagline?: string | null
          updated_at?: string
          updates?: Json
          user_id: string
        }
        Update: {
          assumptions?: Json
          brand?: Json
          checklist?: Json
          concept?: string | null
          created_at?: string
          id?: string
          name?: string
          pitch?: Json
          research?: Json
          roadmap?: Json
          startup_id?: string | null
          tagline?: string | null
          updated_at?: string
          updates?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      sources: {
        Row: {
          article_type: string | null
          created_at: string
          domain: string
          highlights: string[]
          id: string
          origin: string
          published_at: string | null
          publisher: string | null
          relevance: string | null
          retrieved_at: string
          run_id: string | null
          scan_id: string | null
          search_intent: string | null
          search_query: string | null
          signal_type: string | null
          snippet: string | null
          startup_id: string | null
          title: string
          url: string
        }
        Insert: {
          article_type?: string | null
          created_at?: string
          domain: string
          highlights?: string[]
          id?: string
          origin?: string
          published_at?: string | null
          publisher?: string | null
          relevance?: string | null
          retrieved_at?: string
          run_id?: string | null
          scan_id?: string | null
          search_intent?: string | null
          search_query?: string | null
          signal_type?: string | null
          snippet?: string | null
          startup_id?: string | null
          title: string
          url: string
        }
        Update: {
          article_type?: string | null
          created_at?: string
          domain?: string
          highlights?: string[]
          id?: string
          origin?: string
          published_at?: string | null
          publisher?: string | null
          relevance?: string | null
          retrieved_at?: string
          run_id?: string | null
          scan_id?: string | null
          search_intent?: string | null
          search_query?: string | null
          signal_type?: string | null
          snippet?: string | null
          startup_id?: string | null
          title?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "sources_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "discovery_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sources_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: false
            referencedRelation: "market_scans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sources_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      startups: {
        Row: {
          assessment: Json
          brand: Json
          business_model: Json
          business_model_type: string | null
          business_plan: Json
          claim_count: number
          cluster_id: string | null
          competitors: Json
          created_at: string
          customers: Json
          differentiation: Json
          evidence_source_ids: string[]
          geography: string | null
          hypotheses: Json
          id: string
          industry: string | null
          last_scanned_at: string | null
          monitor_queries: string[]
          name: string
          pitch: Json
          problem: Json
          research_at: string
          run_id: string | null
          slug: string
          solution: Json
          tagline: string
          timeline: Json
          updated_at: string
          validation_steps: Json
        }
        Insert: {
          assessment?: Json
          brand?: Json
          business_model?: Json
          business_model_type?: string | null
          business_plan?: Json
          claim_count?: number
          cluster_id?: string | null
          competitors?: Json
          created_at?: string
          customers?: Json
          differentiation?: Json
          evidence_source_ids?: string[]
          geography?: string | null
          hypotheses?: Json
          id?: string
          industry?: string | null
          last_scanned_at?: string | null
          monitor_queries?: string[]
          name: string
          pitch?: Json
          problem?: Json
          research_at?: string
          run_id?: string | null
          slug: string
          solution?: Json
          tagline: string
          timeline?: Json
          updated_at?: string
          validation_steps?: Json
        }
        Update: {
          assessment?: Json
          brand?: Json
          business_model?: Json
          business_model_type?: string | null
          business_plan?: Json
          claim_count?: number
          cluster_id?: string | null
          competitors?: Json
          created_at?: string
          customers?: Json
          differentiation?: Json
          evidence_source_ids?: string[]
          geography?: string | null
          hypotheses?: Json
          id?: string
          industry?: string | null
          last_scanned_at?: string | null
          monitor_queries?: string[]
          name?: string
          pitch?: Json
          problem?: Json
          research_at?: string
          run_id?: string | null
          slug?: string
          solution?: Json
          tagline?: string
          timeline?: Json
          updated_at?: string
          validation_steps?: Json
        }
        Relationships: [
          {
            foreignKeyName: "startups_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "clusters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "startups_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "discovery_runs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      reserve_rate_slot: {
        Args: { p_limit: number; p_provider: string; p_window_ms: number }
        Returns: number
      }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
