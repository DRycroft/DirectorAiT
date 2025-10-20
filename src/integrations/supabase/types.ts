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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      action_items: {
        Row: {
          agenda_item_id: string | null
          created_at: string
          description: string | null
          due_date: string | null
          extracted_decision_id: string | null
          id: string
          owner_id: string | null
          status: string | null
          title: string
          updated_at: string
        }
        Insert: {
          agenda_item_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          extracted_decision_id?: string | null
          id?: string
          owner_id?: string | null
          status?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          agenda_item_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          extracted_decision_id?: string | null
          id?: string
          owner_id?: string | null
          status?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "action_items_agenda_item_id_fkey"
            columns: ["agenda_item_id"]
            isOneToOne: false
            referencedRelation: "agenda_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_items_extracted_decision_id_fkey"
            columns: ["extracted_decision_id"]
            isOneToOne: false
            referencedRelation: "extracted_decisions"
            referencedColumns: ["id"]
          },
        ]
      }
      agenda_items: {
        Row: {
          agenda_id: string
          created_at: string
          description: string | null
          estimated_duration: number | null
          id: string
          item_order: number
          required_reading: boolean | null
          title: string
          updated_at: string
        }
        Insert: {
          agenda_id: string
          created_at?: string
          description?: string | null
          estimated_duration?: number | null
          id?: string
          item_order?: number
          required_reading?: boolean | null
          title: string
          updated_at?: string
        }
        Update: {
          agenda_id?: string
          created_at?: string
          description?: string | null
          estimated_duration?: number | null
          id?: string
          item_order?: number
          required_reading?: boolean | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agenda_items_agenda_id_fkey"
            columns: ["agenda_id"]
            isOneToOne: false
            referencedRelation: "agendas"
            referencedColumns: ["id"]
          },
        ]
      }
      agendas: {
        Row: {
          board_id: string
          created_at: string
          id: string
          meeting_date: string
          status: string | null
          title: string
          updated_at: string
        }
        Insert: {
          board_id: string
          created_at?: string
          id?: string
          meeting_date: string
          status?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          board_id?: string
          created_at?: string
          id?: string
          meeting_date?: string
          status?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agendas_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
        ]
      }
      archived_documents: {
        Row: {
          approved: boolean | null
          board_id: string | null
          confidential_level: string | null
          created_at: string
          error_json: Json | null
          file_name: string
          file_type: string
          id: string
          ocr_language: string | null
          org_id: string
          parsed_metadata: Json | null
          processing_status: string | null
          raw_text: string | null
          snapshot_id: string
          updated_at: string
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          approved?: boolean | null
          board_id?: string | null
          confidential_level?: string | null
          created_at?: string
          error_json?: Json | null
          file_name: string
          file_type: string
          id?: string
          ocr_language?: string | null
          org_id: string
          parsed_metadata?: Json | null
          processing_status?: string | null
          raw_text?: string | null
          snapshot_id: string
          updated_at?: string
          uploaded_at?: string
          uploaded_by: string
        }
        Update: {
          approved?: boolean | null
          board_id?: string | null
          confidential_level?: string | null
          created_at?: string
          error_json?: Json | null
          file_name?: string
          file_type?: string
          id?: string
          ocr_language?: string | null
          org_id?: string
          parsed_metadata?: Json | null
          processing_status?: string | null
          raw_text?: string | null
          snapshot_id?: string
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "archived_documents_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "archived_documents_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "archived_documents_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "document_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          detail_json: Json | null
          entity_id: string
          entity_type: string
          id: string
          ip_address: string | null
          timestamp: string
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          detail_json?: Json | null
          entity_id: string
          entity_type: string
          id?: string
          ip_address?: string | null
          timestamp?: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          detail_json?: Json | null
          entity_id?: string
          entity_type?: string
          id?: string
          ip_address?: string | null
          timestamp?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      board_memberships: {
        Row: {
          accepted_at: string | null
          board_id: string
          id: string
          invited_at: string
          role: string
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          board_id: string
          id?: string
          invited_at?: string
          role: string
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          board_id?: string
          id?: string
          invited_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "board_memberships_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
        ]
      }
      board_role_overrides: {
        Row: {
          board_id: string
          created_at: string
          id: string
          profile_id: string
          role_id: string
        }
        Insert: {
          board_id: string
          created_at?: string
          id?: string
          profile_id: string
          role_id: string
        }
        Update: {
          board_id?: string
          created_at?: string
          id?: string
          profile_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "board_role_overrides_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "board_role_overrides_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "board_role_overrides_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      board_settings: {
        Row: {
          board_id: string
          created_at: string
          quorum_percent: number | null
          reveal_policy: string | null
          silent_vote_window: number | null
          supermajority_threshold: number | null
          updated_at: string
          vote_threshold: number | null
        }
        Insert: {
          board_id: string
          created_at?: string
          quorum_percent?: number | null
          reveal_policy?: string | null
          silent_vote_window?: number | null
          supermajority_threshold?: number | null
          updated_at?: string
          vote_threshold?: number | null
        }
        Update: {
          board_id?: string
          created_at?: string
          quorum_percent?: number | null
          reveal_policy?: string | null
          silent_vote_window?: number | null
          supermajority_threshold?: number | null
          updated_at?: string
          vote_threshold?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "board_settings_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: true
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
        ]
      }
      boards: {
        Row: {
          created_at: string
          description: string | null
          id: string
          org_id: string
          timezone: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          org_id: string
          timezone?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          org_id?: string
          timezone?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "boards_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      document_embeddings: {
        Row: {
          chunk_index: number
          chunk_text: string
          created_at: string
          document_id: string
          id: string
        }
        Insert: {
          chunk_index: number
          chunk_text: string
          created_at?: string
          document_id: string
          id?: string
        }
        Update: {
          chunk_index?: number
          chunk_text?: string
          created_at?: string
          document_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_embeddings_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "archived_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_links: {
        Row: {
          created_at: string
          id: string
          linked_item_id: string
          linked_item_type: string
          similarity_score: number | null
          src_document_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          linked_item_id: string
          linked_item_type: string
          similarity_score?: number | null
          src_document_id: string
        }
        Update: {
          created_at?: string
          id?: string
          linked_item_id?: string
          linked_item_type?: string
          similarity_score?: number | null
          src_document_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_links_src_document_id_fkey"
            columns: ["src_document_id"]
            isOneToOne: false
            referencedRelation: "archived_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_snapshots: {
        Row: {
          checksum_sha256: string
          encryption_key_id: string | null
          filesize: number
          id: string
          storage_path: string
          uploaded_at: string
        }
        Insert: {
          checksum_sha256: string
          encryption_key_id?: string | null
          filesize: number
          id?: string
          storage_path: string
          uploaded_at?: string
        }
        Update: {
          checksum_sha256?: string
          encryption_key_id?: string | null
          filesize?: number
          id?: string
          storage_path?: string
          uploaded_at?: string
        }
        Relationships: []
      }
      document_submissions: {
        Row: {
          comments: string | null
          created_at: string
          document_id: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_by: string
        }
        Insert: {
          comments?: string | null
          created_at?: string
          document_id: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_by: string
        }
        Update: {
          comments?: string | null
          created_at?: string
          document_id?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_submissions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "archived_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      extracted_decisions: {
        Row: {
          confidence_score: number | null
          created_at: string
          decision_date: string | null
          decision_text: string
          document_id: string
          due_date: string | null
          id: string
          motion_text: string | null
          outcome: string | null
          owners: Json | null
          proposer: string | null
          source_page: number | null
          source_snippet: string | null
          vote_count: Json | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          decision_date?: string | null
          decision_text: string
          document_id: string
          due_date?: string | null
          id?: string
          motion_text?: string | null
          outcome?: string | null
          owners?: Json | null
          proposer?: string | null
          source_page?: number | null
          source_snippet?: string | null
          vote_count?: Json | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          decision_date?: string | null
          decision_text?: string
          document_id?: string
          due_date?: string | null
          id?: string
          motion_text?: string | null
          outcome?: string | null
          owners?: Json | null
          proposer?: string | null
          source_page?: number | null
          source_snippet?: string | null
          vote_count?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "extracted_decisions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "archived_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      ingest_jobs: {
        Row: {
          completed_files: number
          created_at: string
          failed_files: number
          finished_at: string | null
          id: string
          log_json: Json | null
          org_id: string
          started_at: string | null
          status: string
          total_files: number
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_files?: number
          created_at?: string
          failed_files?: number
          finished_at?: string | null
          id?: string
          log_json?: Json | null
          org_id: string
          started_at?: string | null
          status?: string
          total_files?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_files?: number
          created_at?: string
          failed_files?: number
          finished_at?: string | null
          id?: string
          log_json?: Json | null
          org_id?: string
          started_at?: string | null
          status?: string
          total_files?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingest_jobs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          domain: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          domain?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          domain?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          mfa_enforced: boolean
          name: string
          org_id: string | null
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          mfa_enforced?: boolean
          name: string
          org_id?: string | null
          role: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          mfa_enforced?: boolean
          name?: string
          org_id?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          description: string | null
          display_name: string
          id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_name: string
          id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_name?: string
          id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "org_admin"
        | "chair"
        | "director"
        | "executive"
        | "staff"
        | "observer"
        | "external_guest"
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
    Enums: {
      app_role: [
        "super_admin",
        "org_admin",
        "chair",
        "director",
        "executive",
        "staff",
        "observer",
        "external_guest",
      ],
    },
  },
} as const
