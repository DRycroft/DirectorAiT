-- Create enum for template scope
CREATE TYPE template_scope AS ENUM ('personal', 'team', 'organization');

-- Create enum for draft status
CREATE TYPE draft_status AS ENUM ('in_progress', 'awaiting_review', 'approved', 'archived');

-- Templates table
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  scope template_scope NOT NULL DEFAULT 'personal',
  tags TEXT[] NOT NULL DEFAULT '{}',
  default_for_sections TEXT[] NOT NULL DEFAULT '{}',
  is_default BOOLEAN DEFAULT false,
  version INTEGER DEFAULT 1,
  published BOOLEAN DEFAULT true,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
  sections JSONB NOT NULL DEFAULT '[]',
  permissions JSONB DEFAULT '{"can_edit": [], "can_delete": []}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Document drafts table
CREATE TABLE document_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  template_id UUID REFERENCES templates(id) ON DELETE SET NULL,
  section_key TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{}',
  status draft_status DEFAULT 'in_progress',
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_saved TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Template approvals table
CREATE TABLE template_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES templates(id) ON DELETE CASCADE NOT NULL,
  requested_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  requested_scope template_scope NOT NULL,
  status TEXT DEFAULT 'pending',
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  comments TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- User template preferences
CREATE TABLE user_template_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  section_key TEXT NOT NULL,
  preferred_template_id UUID REFERENCES templates(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, section_key)
);

-- Enable RLS
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_template_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for templates
CREATE POLICY "Users can view templates in their scope"
ON templates FOR SELECT
USING (
  scope = 'personal' AND author_id = auth.uid()
  OR scope = 'team' AND board_id IN (SELECT board_id FROM board_memberships WHERE user_id = auth.uid())
  OR scope = 'organization' AND org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
  OR published = true
);

CREATE POLICY "Users can create personal templates"
ON templates FOR INSERT
WITH CHECK (author_id = auth.uid() AND scope = 'personal');

CREATE POLICY "Users can update their own templates"
ON templates FOR UPDATE
USING (author_id = auth.uid() OR has_role(auth.uid(), 'org_admin'));

CREATE POLICY "Users can delete their own templates"
ON templates FOR DELETE
USING (author_id = auth.uid() OR has_role(auth.uid(), 'org_admin'));

-- RLS Policies for document_drafts
CREATE POLICY "Users can view their own drafts"
ON document_drafts FOR SELECT
USING (
  created_by = auth.uid()
  OR board_id IN (SELECT board_id FROM board_memberships WHERE user_id = auth.uid())
);

CREATE POLICY "Users can create drafts"
ON document_drafts FOR INSERT
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own drafts"
ON document_drafts FOR UPDATE
USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own drafts"
ON document_drafts FOR DELETE
USING (created_by = auth.uid());

-- RLS Policies for template_approvals
CREATE POLICY "Users can view approval requests"
ON template_approvals FOR SELECT
USING (
  requested_by = auth.uid()
  OR has_role(auth.uid(), 'org_admin')
  OR has_role(auth.uid(), 'chair')
);

CREATE POLICY "Users can create approval requests"
ON template_approvals FOR INSERT
WITH CHECK (requested_by = auth.uid());

CREATE POLICY "Admins can update approvals"
ON template_approvals FOR UPDATE
USING (has_role(auth.uid(), 'org_admin') OR has_role(auth.uid(), 'chair'));

-- RLS Policies for user_template_preferences
CREATE POLICY "Users can manage their own preferences"
ON user_template_preferences FOR ALL
USING (user_id = auth.uid());

-- Triggers for updated_at
CREATE TRIGGER update_templates_updated_at
  BEFORE UPDATE ON templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_document_drafts_updated_at
  BEFORE UPDATE ON document_drafts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_template_preferences_updated_at
  BEFORE UPDATE ON user_template_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_templates_author ON templates(author_id);
CREATE INDEX idx_templates_scope ON templates(scope);
CREATE INDEX idx_templates_tags ON templates USING GIN(tags);
CREATE INDEX idx_document_drafts_created_by ON document_drafts(created_by);
CREATE INDEX idx_document_drafts_section ON document_drafts(section_key);
CREATE INDEX idx_document_drafts_status ON document_drafts(status);