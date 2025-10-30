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
      approval_requests: {
        Row: {
          board_id: string | null
          comments: string | null
          created_at: string
          entity_id: string
          entity_type: string
          first_approved_at: string | null
          first_approver: string | null
          id: string
          org_id: string
          request_data: Json
          request_type: string
          requested_at: string
          requested_by: string
          second_approved_at: string | null
          second_approver: string | null
          status: string
          updated_at: string
        }
        Insert: {
          board_id?: string | null
          comments?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          first_approved_at?: string | null
          first_approver?: string | null
          id?: string
          org_id: string
          request_data?: Json
          request_type: string
          requested_at?: string
          requested_by: string
          second_approved_at?: string | null
          second_approver?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          board_id?: string | null
          comments?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          first_approved_at?: string | null
          first_approver?: string | null
          id?: string
          org_id?: string
          request_data?: Json
          request_type?: string
          requested_at?: string
          requested_by?: string
          second_approved_at?: string | null
          second_approver?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_requests_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_requests_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      board_member_audit: {
        Row: {
          change_type: string
          changed_by: string | null
          field_name: string
          id: string
          member_id: string
          new_value: string | null
          old_value: string | null
          timestamp: string | null
        }
        Insert: {
          change_type: string
          changed_by?: string | null
          field_name: string
          id?: string
          member_id: string
          new_value?: string | null
          old_value?: string | null
          timestamp?: string | null
        }
        Update: {
          change_type?: string
          changed_by?: string | null
          field_name?: string
          id?: string
          member_id?: string
          new_value?: string | null
          old_value?: string | null
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "board_member_audit_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "board_members"
            referencedColumns: ["id"]
          },
        ]
      }
      board_member_coi: {
        Row: {
          created_at: string | null
          date_declared: string
          declared_interest: string
          id: string
          management_steps: string | null
          member_id: string
          related_party_name: string | null
          status: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          date_declared?: string
          declared_interest: string
          id?: string
          management_steps?: string | null
          member_id: string
          related_party_name?: string | null
          status?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          date_declared?: string
          declared_interest?: string
          id?: string
          management_steps?: string | null
          member_id?: string
          related_party_name?: string | null
          status?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "board_member_coi_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "board_members"
            referencedColumns: ["id"]
          },
        ]
      }
      board_members: {
        Row: {
          appointment_date: string | null
          board_id: string
          consent_signature: string | null
          consent_signed_at: string | null
          created_at: string | null
          custom_fields: Json | null
          cv_file_url: string | null
          date_of_birth: string | null
          detailed_work_history: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          full_name: string
          health_notes: string | null
          home_address: string | null
          id: string
          invite_sent_at: string | null
          invite_token: string | null
          legal_name: string | null
          member_type: string | null
          national_id: string | null
          personal_email: string | null
          personal_interests: string | null
          personal_mobile: string | null
          position: string | null
          preferred_title: string | null
          professional_qualifications: string | null
          profile_completed_at: string | null
          public_company_affiliations: string | null
          public_contact_email: string | null
          public_job_title: string | null
          public_photo_url: string | null
          public_social_links: Json | null
          publish_preferences: Json | null
          reappointment_history: Json | null
          reports_responsible_for: Json | null
          reports_to: string | null
          sensitive_notes: string | null
          short_bio: string | null
          skills_competencies: Json | null
          status: string | null
          term_expiry: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          appointment_date?: string | null
          board_id: string
          consent_signature?: string | null
          consent_signed_at?: string | null
          created_at?: string | null
          custom_fields?: Json | null
          cv_file_url?: string | null
          date_of_birth?: string | null
          detailed_work_history?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name: string
          health_notes?: string | null
          home_address?: string | null
          id?: string
          invite_sent_at?: string | null
          invite_token?: string | null
          legal_name?: string | null
          member_type?: string | null
          national_id?: string | null
          personal_email?: string | null
          personal_interests?: string | null
          personal_mobile?: string | null
          position?: string | null
          preferred_title?: string | null
          professional_qualifications?: string | null
          profile_completed_at?: string | null
          public_company_affiliations?: string | null
          public_contact_email?: string | null
          public_job_title?: string | null
          public_photo_url?: string | null
          public_social_links?: Json | null
          publish_preferences?: Json | null
          reappointment_history?: Json | null
          reports_responsible_for?: Json | null
          reports_to?: string | null
          sensitive_notes?: string | null
          short_bio?: string | null
          skills_competencies?: Json | null
          status?: string | null
          term_expiry?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          appointment_date?: string | null
          board_id?: string
          consent_signature?: string | null
          consent_signed_at?: string | null
          created_at?: string | null
          custom_fields?: Json | null
          cv_file_url?: string | null
          date_of_birth?: string | null
          detailed_work_history?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name?: string
          health_notes?: string | null
          home_address?: string | null
          id?: string
          invite_sent_at?: string | null
          invite_token?: string | null
          legal_name?: string | null
          member_type?: string | null
          national_id?: string | null
          personal_email?: string | null
          personal_interests?: string | null
          personal_mobile?: string | null
          position?: string | null
          preferred_title?: string | null
          professional_qualifications?: string | null
          profile_completed_at?: string | null
          public_company_affiliations?: string | null
          public_contact_email?: string | null
          public_job_title?: string | null
          public_photo_url?: string | null
          public_social_links?: Json | null
          publish_preferences?: Json | null
          reappointment_history?: Json | null
          reports_responsible_for?: Json | null
          reports_to?: string | null
          sensitive_notes?: string | null
          short_bio?: string | null
          skills_competencies?: Json | null
          status?: string | null
          term_expiry?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "board_members_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "board_members_reports_to_fkey"
            columns: ["reports_to"]
            isOneToOne: false
            referencedRelation: "board_members"
            referencedColumns: ["id"]
          },
        ]
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
      board_paper_templates: {
        Row: {
          company_name: string | null
          created_at: string
          created_by: string
          id: string
          is_default: boolean | null
          logo_url: string | null
          org_id: string
          sections: Json
          template_name: string
          template_type: string
          updated_at: string
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          created_by: string
          id?: string
          is_default?: boolean | null
          logo_url?: string | null
          org_id: string
          sections?: Json
          template_name: string
          template_type: string
          updated_at?: string
        }
        Update: {
          company_name?: string | null
          created_at?: string
          created_by?: string
          id?: string
          is_default?: boolean | null
          logo_url?: string | null
          org_id?: string
          sections?: Json
          template_name?: string
          template_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "board_paper_templates_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          archived_at: string | null
          board_type: string | null
          committee_purpose: string | null
          created_at: string
          description: string | null
          id: string
          org_id: string
          parent_board_id: string | null
          status: string | null
          timezone: string | null
          title: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          board_type?: string | null
          committee_purpose?: string | null
          created_at?: string
          description?: string | null
          id?: string
          org_id: string
          parent_board_id?: string | null
          status?: string | null
          timezone?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          board_type?: string | null
          committee_purpose?: string | null
          created_at?: string
          description?: string | null
          id?: string
          org_id?: string
          parent_board_id?: string | null
          status?: string | null
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
          {
            foreignKeyName: "boards_parent_board_id_fkey"
            columns: ["parent_board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_categories: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      compliance_items: {
        Row: {
          authority: string | null
          board_id: string | null
          category_id: string | null
          created_at: string
          description: string | null
          frequency: Database["public"]["Enums"]["compliance_frequency"]
          id: string
          industry_sector: string | null
          is_active: boolean
          last_completed_date: string | null
          next_due_date: string | null
          notes: string | null
          org_id: string
          reference_url: string | null
          reminder_days_before: number | null
          responsible_person: string | null
          status: Database["public"]["Enums"]["compliance_status"]
          title: string
          updated_at: string
        }
        Insert: {
          authority?: string | null
          board_id?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          frequency?: Database["public"]["Enums"]["compliance_frequency"]
          id?: string
          industry_sector?: string | null
          is_active?: boolean
          last_completed_date?: string | null
          next_due_date?: string | null
          notes?: string | null
          org_id: string
          reference_url?: string | null
          reminder_days_before?: number | null
          responsible_person?: string | null
          status?: Database["public"]["Enums"]["compliance_status"]
          title: string
          updated_at?: string
        }
        Update: {
          authority?: string | null
          board_id?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          frequency?: Database["public"]["Enums"]["compliance_frequency"]
          id?: string
          industry_sector?: string | null
          is_active?: boolean
          last_completed_date?: string | null
          next_due_date?: string | null
          notes?: string | null
          org_id?: string
          reference_url?: string | null
          reminder_days_before?: number | null
          responsible_person?: string | null
          status?: Database["public"]["Enums"]["compliance_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_items_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "compliance_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_reviews: {
        Row: {
          attachments: Json | null
          compliance_item_id: string
          created_at: string
          id: string
          notes: string | null
          review_date: string
          reviewed_by: string
          signed_off_at: string | null
          signed_off_by: string | null
          status: Database["public"]["Enums"]["compliance_status"]
        }
        Insert: {
          attachments?: Json | null
          compliance_item_id: string
          created_at?: string
          id?: string
          notes?: string | null
          review_date: string
          reviewed_by: string
          signed_off_at?: string | null
          signed_off_by?: string | null
          status: Database["public"]["Enums"]["compliance_status"]
        }
        Update: {
          attachments?: Json | null
          compliance_item_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          review_date?: string
          reviewed_by?: string
          signed_off_at?: string | null
          signed_off_by?: string | null
          status?: Database["public"]["Enums"]["compliance_status"]
        }
        Relationships: [
          {
            foreignKeyName: "compliance_reviews_compliance_item_id_fkey"
            columns: ["compliance_item_id"]
            isOneToOne: false
            referencedRelation: "compliance_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_reviews_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_reviews_signed_off_by_fkey"
            columns: ["signed_off_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_templates: {
        Row: {
          authority: string | null
          category_id: string | null
          created_at: string
          description: string | null
          frequency: Database["public"]["Enums"]["compliance_frequency"]
          id: string
          industry_sector: string
          is_mandatory: boolean
          reference_url: string | null
          title: string
        }
        Insert: {
          authority?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          frequency: Database["public"]["Enums"]["compliance_frequency"]
          id?: string
          industry_sector: string
          is_mandatory?: boolean
          reference_url?: string | null
          title: string
        }
        Update: {
          authority?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          frequency?: Database["public"]["Enums"]["compliance_frequency"]
          id?: string
          industry_sector?: string
          is_mandatory?: boolean
          reference_url?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_templates_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "compliance_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_metrics: {
        Row: {
          category: string
          created_at: string | null
          created_by: string
          data_source: string
          id: string
          last_synced_at: string | null
          metadata_json: Json | null
          metric_name: string
          metric_unit: string | null
          metric_value: number | null
          org_id: string
          period_end: string | null
          period_start: string | null
          period_type: string
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          created_by: string
          data_source: string
          id?: string
          last_synced_at?: string | null
          metadata_json?: Json | null
          metric_name: string
          metric_unit?: string | null
          metric_value?: number | null
          org_id: string
          period_end?: string | null
          period_start?: string | null
          period_type?: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          created_by?: string
          data_source?: string
          id?: string
          last_synced_at?: string | null
          metadata_json?: Json | null
          metric_name?: string
          metric_unit?: string | null
          metric_value?: number | null
          org_id?: string
          period_end?: string | null
          period_start?: string | null
          period_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_metrics_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dashboard_metrics_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_templates: {
        Row: {
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          is_default: boolean | null
          layout_json: Json
          name: string
          org_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          is_default?: boolean | null
          layout_json?: Json
          name: string
          org_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          is_default?: boolean | null
          layout_json?: Json
          name?: string
          org_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dashboard_templates_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_widgets: {
        Row: {
          config_json: Json
          created_at: string | null
          height: number
          id: string
          position_x: number
          position_y: number
          template_id: string
          title: string
          updated_at: string | null
          widget_type: string
          width: number
        }
        Insert: {
          config_json?: Json
          created_at?: string | null
          height?: number
          id?: string
          position_x?: number
          position_y?: number
          template_id: string
          title: string
          updated_at?: string | null
          widget_type: string
          width?: number
        }
        Update: {
          config_json?: Json
          created_at?: string | null
          height?: number
          id?: string
          position_x?: number
          position_y?: number
          template_id?: string
          title?: string
          updated_at?: string | null
          widget_type?: string
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_widgets_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "dashboard_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      document_drafts: {
        Row: {
          board_id: string | null
          content: Json
          created_at: string | null
          created_by: string
          id: string
          last_saved: string | null
          org_id: string | null
          section_key: string
          status: Database["public"]["Enums"]["draft_status"] | null
          template_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          board_id?: string | null
          content?: Json
          created_at?: string | null
          created_by: string
          id?: string
          last_saved?: string | null
          org_id?: string | null
          section_key: string
          status?: Database["public"]["Enums"]["draft_status"] | null
          template_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          board_id?: string | null
          content?: Json
          created_at?: string | null
          created_by?: string
          id?: string
          last_saved?: string | null
          org_id?: string | null
          section_key?: string
          status?: Database["public"]["Enums"]["draft_status"] | null
          template_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_drafts_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_drafts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_drafts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
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
      executive_reports: {
        Row: {
          board_id: string | null
          created_at: string
          file_name: string
          file_path: string
          id: string
          org_id: string
          period_covered: string
          report_type: string
          status: string
          updated_at: string
          uploaded_at: string
          uploaded_by: string
          uploaded_by_name: string
        }
        Insert: {
          board_id?: string | null
          created_at?: string
          file_name: string
          file_path: string
          id?: string
          org_id: string
          period_covered: string
          report_type: string
          status?: string
          updated_at?: string
          uploaded_at?: string
          uploaded_by: string
          uploaded_by_name: string
        }
        Update: {
          board_id?: string | null
          created_at?: string
          file_name?: string
          file_path?: string
          id?: string
          org_id?: string
          period_covered?: string
          report_type?: string
          status?: string
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string
          uploaded_by_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "executive_reports_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "executive_reports_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      meeting_minutes: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          board_id: string | null
          created_at: string
          file_name: string
          file_path: string
          id: string
          meeting_date: string
          meeting_type: string
          org_id: string
          status: string
          updated_at: string
          uploaded_at: string
          uploaded_by: string
          uploaded_by_name: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          board_id?: string | null
          created_at?: string
          file_name: string
          file_path: string
          id?: string
          meeting_date: string
          meeting_type?: string
          org_id: string
          status?: string
          updated_at?: string
          uploaded_at?: string
          uploaded_by: string
          uploaded_by_name: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          board_id?: string | null
          created_at?: string
          file_name?: string
          file_path?: string
          id?: string
          meeting_date?: string
          meeting_type?: string
          org_id?: string
          status?: string
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string
          uploaded_by_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_minutes_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_minutes_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_admins: {
        Row: {
          admin_type: string
          appointed_at: string
          appointed_by: string | null
          created_at: string
          id: string
          org_id: string
          user_id: string
        }
        Insert: {
          admin_type: string
          appointed_at?: string
          appointed_by?: string | null
          created_at?: string
          id?: string
          org_id: string
          user_id: string
        }
        Update: {
          admin_type?: string
          appointed_at?: string
          appointed_by?: string | null
          created_at?: string
          id?: string
          org_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_admins_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          admin_email: string | null
          admin_name: string | null
          admin_phone: string | null
          admin_role: string | null
          agm_date: string | null
          business_category: string[] | null
          business_number: string | null
          company_phone: string | null
          compliance_scan_completed: boolean | null
          compliance_scan_date: string | null
          created_at: string
          domain: string | null
          financial_year_end: string | null
          gst_period: string | null
          id: string
          industry_sector: string[] | null
          logo_url: string | null
          name: string
          primary_contact_email: string | null
          primary_contact_name: string | null
          primary_contact_phone: string | null
          primary_contact_role: string | null
          reporting_frequency: string | null
          updated_at: string
        }
        Insert: {
          admin_email?: string | null
          admin_name?: string | null
          admin_phone?: string | null
          admin_role?: string | null
          agm_date?: string | null
          business_category?: string[] | null
          business_number?: string | null
          company_phone?: string | null
          compliance_scan_completed?: boolean | null
          compliance_scan_date?: string | null
          created_at?: string
          domain?: string | null
          financial_year_end?: string | null
          gst_period?: string | null
          id?: string
          industry_sector?: string[] | null
          logo_url?: string | null
          name: string
          primary_contact_email?: string | null
          primary_contact_name?: string | null
          primary_contact_phone?: string | null
          primary_contact_role?: string | null
          reporting_frequency?: string | null
          updated_at?: string
        }
        Update: {
          admin_email?: string | null
          admin_name?: string | null
          admin_phone?: string | null
          admin_role?: string | null
          agm_date?: string | null
          business_category?: string[] | null
          business_number?: string | null
          company_phone?: string | null
          compliance_scan_completed?: boolean | null
          compliance_scan_date?: string | null
          created_at?: string
          domain?: string | null
          financial_year_end?: string | null
          gst_period?: string | null
          id?: string
          industry_sector?: string[] | null
          logo_url?: string | null
          name?: string
          primary_contact_email?: string | null
          primary_contact_name?: string | null
          primary_contact_phone?: string | null
          primary_contact_role?: string | null
          reporting_frequency?: string | null
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
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          mfa_enforced?: boolean
          name: string
          org_id?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          mfa_enforced?: boolean
          name?: string
          org_id?: string | null
          phone?: string | null
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
      special_papers: {
        Row: {
          board_id: string | null
          category: string
          created_at: string
          deadline: string | null
          description: string | null
          file_name: string
          file_path: string
          id: string
          org_id: string
          status: string
          title: string
          updated_at: string
          uploaded_at: string
          uploaded_by: string
          uploaded_by_name: string
        }
        Insert: {
          board_id?: string | null
          category: string
          created_at?: string
          deadline?: string | null
          description?: string | null
          file_name: string
          file_path: string
          id?: string
          org_id: string
          status?: string
          title: string
          updated_at?: string
          uploaded_at?: string
          uploaded_by: string
          uploaded_by_name: string
        }
        Update: {
          board_id?: string | null
          category?: string
          created_at?: string
          deadline?: string | null
          description?: string | null
          file_name?: string
          file_path?: string
          id?: string
          org_id?: string
          status?: string
          title?: string
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string
          uploaded_by_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "special_papers_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "special_papers_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_form_templates: {
        Row: {
          created_at: string
          fields: Json
          form_type: string
          id: string
          org_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          fields?: Json
          form_type: string
          id?: string
          org_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          fields?: Json
          form_type?: string
          id?: string
          org_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      template_approvals: {
        Row: {
          comments: string | null
          created_at: string | null
          id: string
          requested_by: string
          requested_scope: Database["public"]["Enums"]["template_scope"]
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          template_id: string
        }
        Insert: {
          comments?: string | null
          created_at?: string | null
          id?: string
          requested_by: string
          requested_scope: Database["public"]["Enums"]["template_scope"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          template_id: string
        }
        Update: {
          comments?: string | null
          created_at?: string | null
          id?: string
          requested_by?: string
          requested_scope?: Database["public"]["Enums"]["template_scope"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_approvals_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          author_id: string
          board_id: string | null
          created_at: string | null
          default_for_sections: string[]
          id: string
          is_default: boolean | null
          name: string
          org_id: string | null
          permissions: Json | null
          published: boolean | null
          scope: Database["public"]["Enums"]["template_scope"]
          sections: Json
          tags: string[]
          updated_at: string | null
          version: number | null
        }
        Insert: {
          author_id: string
          board_id?: string | null
          created_at?: string | null
          default_for_sections?: string[]
          id?: string
          is_default?: boolean | null
          name: string
          org_id?: string | null
          permissions?: Json | null
          published?: boolean | null
          scope?: Database["public"]["Enums"]["template_scope"]
          sections?: Json
          tags?: string[]
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          author_id?: string
          board_id?: string | null
          created_at?: string | null
          default_for_sections?: string[]
          id?: string
          is_default?: boolean | null
          name?: string
          org_id?: string | null
          permissions?: Json | null
          published?: boolean | null
          scope?: Database["public"]["Enums"]["template_scope"]
          sections?: Json
          tags?: string[]
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "templates_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "templates_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
      user_template_preferences: {
        Row: {
          created_at: string | null
          id: string
          preferred_template_id: string | null
          section_key: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          preferred_template_id?: string | null
          section_key: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          preferred_template_id?: string | null
          section_key?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_template_preferences_preferred_template_id_fkey"
            columns: ["preferred_template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_next_due_date: {
        Args: {
          freq: Database["public"]["Enums"]["compliance_frequency"]
          last_date: string
        }
        Returns: string
      }
      create_default_staff_form_templates: {
        Args: { p_org_id: string }
        Returns: undefined
      }
      generate_member_invite_token: { Args: never; Returns: string }
      get_user_org_id: { Args: { user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_board_member: {
        Args: { board_id: string; user_id: string }
        Returns: boolean
      }
      log_audit_entry: {
        Args: {
          _action: string
          _detail_json?: Json
          _entity_id: string
          _entity_type: string
        }
        Returns: undefined
      }
      log_board_member_audit: {
        Args: {
          _change_type: string
          _field_name: string
          _member_id: string
          _new_value?: string
          _old_value?: string
        }
        Returns: undefined
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
      compliance_frequency:
        | "daily"
        | "weekly"
        | "monthly"
        | "quarterly"
        | "semi_annual"
        | "annual"
        | "biennial"
        | "as_required"
      compliance_status:
        | "compliant"
        | "due_soon"
        | "overdue"
        | "not_applicable"
        | "in_progress"
      draft_status: "in_progress" | "awaiting_review" | "approved" | "archived"
      template_scope: "personal" | "team" | "organization"
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
      compliance_frequency: [
        "daily",
        "weekly",
        "monthly",
        "quarterly",
        "semi_annual",
        "annual",
        "biennial",
        "as_required",
      ],
      compliance_status: [
        "compliant",
        "due_soon",
        "overdue",
        "not_applicable",
        "in_progress",
      ],
      draft_status: ["in_progress", "awaiting_review", "approved", "archived"],
      template_scope: ["personal", "team", "organization"],
    },
  },
} as const
