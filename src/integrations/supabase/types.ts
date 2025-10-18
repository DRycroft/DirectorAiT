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
          embedding: string | null
          id: string
        }
        Insert: {
          chunk_index: number
          chunk_text: string
          created_at?: string
          document_id: string
          embedding?: string | null
          id?: string
        }
        Update: {
          chunk_index?: number
          chunk_text?: string
          created_at?: string
          document_id?: string
          embedding?: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      halfvec_avg: {
        Args: { "": number[] }
        Returns: unknown
      }
      halfvec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_send: {
        Args: { "": unknown }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      hnsw_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnswhandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflathandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      l2_norm: {
        Args: { "": unknown } | { "": unknown }
        Returns: number
      }
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: unknown
      }
      sparsevec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      sparsevec_send: {
        Args: { "": unknown }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      vector_avg: {
        Args: { "": number[] }
        Returns: string
      }
      vector_dims: {
        Args: { "": string } | { "": unknown }
        Returns: number
      }
      vector_norm: {
        Args: { "": string }
        Returns: number
      }
      vector_out: {
        Args: { "": string }
        Returns: unknown
      }
      vector_send: {
        Args: { "": string }
        Returns: string
      }
      vector_typmod_in: {
        Args: { "": unknown[] }
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
