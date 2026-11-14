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
      brand_name_lookups: {
        Row: {
          domain: string | null
          error: string | null
          industry: string | null
          lookup_key: string
          name: string
          retrieved_at: string
          status: string
        }
        Insert: {
          domain?: string | null
          error?: string | null
          industry?: string | null
          lookup_key: string
          name: string
          retrieved_at?: string
          status: string
        }
        Update: {
          domain?: string | null
          error?: string | null
          industry?: string | null
          lookup_key?: string
          name?: string
          retrieved_at?: string
          status?: string
        }
        Relationships: []
      }
      brand_profiles: {
        Row: {
          colors: Json
          description: string | null
          domain: string
          employees: string | null
          error: string | null
          hq_country: string | null
          icon_url: string | null
          industries: string[]
          logo_url: string | null
          retrieved_at: string
          slogan: string | null
          status: string
          title: string | null
        }
        Insert: {
          colors?: Json
          description?: string | null
          domain: string
          employees?: string | null
          error?: string | null
          hq_country?: string | null
          icon_url?: string | null
          industries?: string[]
          logo_url?: string | null
          retrieved_at?: string
          slogan?: string | null
          status?: string
          title?: string | null
        }
        Update: {
          colors?: Json
          description?: string | null
          domain?: string
          employees?: string | null
          error?: string | null
          hq_country?: string | null
          icon_url?: string | null
          industries?: string[]
          logo_url?: string | null
          retrieved_at?: string
          slogan?: string | null
          status?: string
          title?: string | null
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
      credit_admin_bootstrap: {
        Row: {
          email: string
        }
        Insert: {
          email: string
        }
        Update: {
          email?: string
        }
        Relationships: []
      }
      credit_packages: {
        Row: {
          active: boolean
          amount: number
          credits: number
          currency: string
          id: string
          name: string
          price_key: string
          product_key: string
        }
        Insert: {
          active?: boolean
          amount: number
          credits: number
          currency?: string
          id: string
          name: string
          price_key: string
          product_key: string
        }
        Update: {
          active?: boolean
          amount?: number
          credits?: number
          currency?: string
          id?: string
          name?: string
          price_key?: string
          product_key?: string
        }
        Relationships: []
      }
      credit_payments: {
        Row: {
          amount: number
          created_at: string
          credits: number
          currency: string
          environment: string
          id: string
          package_id: string
          payment_intent_id: string | null
          refunded_amount: number
          refunded_credits: number
          session_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          credits: number
          currency: string
          environment: string
          id?: string
          package_id: string
          payment_intent_id?: string | null
          refunded_amount?: number
          refunded_credits?: number
          session_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          credits?: number
          currency?: string
          environment?: string
          id?: string
          package_id?: string
          payment_intent_id?: string | null
          refunded_amount?: number
          refunded_credits?: number
          session_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      credit_reservations: {
        Row: {
          cost: number
          created_at: string
          environment: string
          id: string
          run_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          cost: number
          created_at?: string
          environment: string
          id: string
          run_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          cost?: number
          created_at?: string
          environment?: string
          id?: string
          run_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_reservations_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "discovery_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_settings: {
        Row: {
          key: string
          value: number
        }
        Insert: {
          key: string
          value: number
        }
        Update: {
          key?: string
          value?: number
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          balance_after: number
          created_at: string
          delta: number
          description: string
          environment: string
          id: string
          idempotency_key: string
          kind: string
          user_id: string
        }
        Insert: {
          balance_after: number
          created_at?: string
          delta: number
          description: string
          environment: string
          id?: string
          idempotency_key: string
          kind: string
          user_id: string
        }
        Update: {
          balance_after?: number
          created_at?: string
          delta?: number
          description?: string
          environment?: string
          id?: string
          idempotency_key?: string
          kind?: string
          user_id?: string
        }
        Relationships: []
      }
      credit_wallets: {
        Row: {
          balance: number
          environment: string
          reserved: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          environment: string
          reserved?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          environment?: string
          reserved?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      credit_webhook_events: {
        Row: {
          created_at: string
          environment: string
          id: string
        }
        Insert: {
          created_at?: string
          environment: string
          id: string
        }
        Update: {
          created_at?: string
          environment?: string
          id?: string
        }
        Relationships: []
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
      project_invites: {
        Row: {
          created_at: string
          created_by: string
          expires_at: string
          id: string
          project_id: string
          revoked_at: string | null
          token: string
        }
        Insert: {
          created_at?: string
          created_by: string
          expires_at?: string
          id?: string
          project_id: string
          revoked_at?: string | null
          token?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          expires_at?: string
          id?: string
          project_id?: string
          revoked_at?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_invites_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_members: {
        Row: {
          display_name: string
          joined_at: string
          project_id: string
          role: string
          user_id: string
        }
        Insert: {
          display_name?: string
          joined_at?: string
          project_id: string
          role?: string
          user_id: string
        }
        Update: {
          display_name?: string
          joined_at?: string
          project_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
          owner_name: string | null
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
          owner_name?: string | null
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
          owner_name?: string | null
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
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_project_invite: {
        Args: { _display_name: string; _token: string }
        Returns: string
      }
      adjust_credit_balance: {
        Args: {
          p_delta: number
          p_env: string
          p_key: string
          p_reason: string
          p_user: string
        }
        Returns: number
      }
      attach_credit_run: {
        Args: { p_request: string; p_run: string }
        Returns: undefined
      }
      ensure_credit_wallet: {
        Args: { p_env: string; p_user: string }
        Returns: undefined
      }
      fulfill_credit_payment: {
        Args: {
          p_amount: number
          p_currency: string
          p_env: string
          p_event: string
          p_intent: string
          p_payment: string
          p_session: string
        }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_project_member: {
        Args: { _project: string; _user: string }
        Returns: boolean
      }
      is_project_owner: {
        Args: { _project: string; _user: string }
        Returns: boolean
      }
      preview_project_invite: {
        Args: { _token: string }
        Returns: {
          brand: Json
          owner_name: string
          project_id: string
          project_name: string
          status: string
          tagline: string
        }[]
      }
      refund_credit_payment: {
        Args: {
          p_env: string
          p_event: string
          p_intent: string
          p_refunded: number
        }
        Returns: undefined
      }
      renew_discovery_reservation: {
        Args: { p_env: string; p_run: string; p_user: string }
        Returns: undefined
      }
      reserve_discovery_credits: {
        Args: { p_env: string; p_request: string; p_user: string }
        Returns: {
          cost: number
          created_at: string
          environment: string
          id: string
          run_id: string | null
          status: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "credit_reservations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      reserve_rate_slot: {
        Args: { p_limit: number; p_provider: string; p_window_ms: number }
        Returns: number
      }
      settle_credit_reservation: {
        Args: { p_request: string; p_success: boolean }
        Returns: undefined
      }
      start_paid_discovery: {
        Args: {
          p_env: string
          p_expected_cost: number
          p_force: boolean
          p_geography: string
          p_industry: string
          p_key: string
          p_query: string
          p_request: string
          p_user: string
        }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
