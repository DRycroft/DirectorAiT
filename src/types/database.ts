import { Database } from "@/integrations/supabase/types";

// Convenient type aliases for database tables
export type Board = Database['public']['Tables']['boards']['Row'];
export type BoardMember = Database['public']['Tables']['board_members']['Row'];
export type BoardMembership = Database['public']['Tables']['board_memberships']['Row'];
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Organization = Database['public']['Tables']['organizations']['Row'];
export type ComplianceItem = Database['public']['Tables']['compliance_items']['Row'];
export type ComplianceReview = Database['public']['Tables']['compliance_reviews']['Row'];
export type UserRole = Database['public']['Tables']['user_roles']['Row'];
export type BoardPaperTemplate = Database['public']['Tables']['board_paper_templates']['Row'];
export type StaffFormTemplate = Database['public']['Tables']['staff_form_templates']['Row'];
export type DashboardTemplate = Database['public']['Tables']['dashboard_templates']['Row'];
export type DashboardWidget = Database['public']['Tables']['dashboard_widgets']['Row'];
export type ExecutiveReport = Database['public']['Tables']['executive_reports']['Row'];
export type MeetingMinutes = Database['public']['Tables']['meeting_minutes']['Row'];
export type SpecialPaper = Database['public']['Tables']['special_papers']['Row'];

// Insert types for creating new records
export type BoardInsert = Database['public']['Tables']['boards']['Insert'];
export type BoardMemberInsert = Database['public']['Tables']['board_members']['Insert'];
export type ComplianceItemInsert = Database['public']['Tables']['compliance_items']['Insert'];

// Update types for modifying records
export type BoardUpdate = Database['public']['Tables']['boards']['Update'];
export type BoardMemberUpdate = Database['public']['Tables']['board_members']['Update'];
export type ComplianceItemUpdate = Database['public']['Tables']['compliance_items']['Update'];

// Extended types with relationships
export interface BoardWithOrg extends Board {
  organizations?: Pick<Organization, 'name'> | Organization;
}

export interface BoardMemberWithBoard extends BoardMember {
  boards?: { title: string };
}

export interface UserRoleWithProfile extends UserRole {
  profile?: Pick<Profile, 'name' | 'email'>;
}

// Form template types
export interface TemplateField {
  id: string;
  label: string;
  required: boolean;
  enabled: boolean;
  field_type: 'text' | 'email' | 'phone' | 'tel' | 'date' | 'url' | 'textarea' | 'select';
  type?: 'text' | 'email' | 'phone' | 'tel' | 'date' | 'url' | 'textarea' | 'select'; // Alias for field_type
  order: number;
  locked?: boolean;
}

export interface TemplateSection {
  id: string;
  title: string;
  required: boolean;
  enabled: boolean;
  order: number;
}

// Dashboard types
export interface MetricOption {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultVisualization: string;
  visualizationOptions: string[];
}

export interface SelectedMetric {
  metricId: string;
  visualization: string;
  title?: string;
}

// Member types for filtering
export type MemberType = 'board' | 'executive' | 'key_staff';
export type ViewerRole = 'public' | 'internal' | 'admin';

// Compliance types
export type ComplianceFrequency = Database['public']['Enums']['compliance_frequency'];
export type ComplianceStatus = Database['public']['Enums']['compliance_status'];
export type DraftStatus = Database['public']['Enums']['draft_status'];
export type AppRole = Database['public']['Enums']['app_role'];
