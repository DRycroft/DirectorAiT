-- Dashboard Templates: stores dashboard configurations
CREATE TABLE dashboard_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  layout_json JSONB NOT NULL DEFAULT '{"widgets": [], "grid": {"columns": 12, "rowHeight": 100}}'::jsonb,
  is_default BOOLEAN DEFAULT false,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Dashboard Widgets: stores individual widget configurations
CREATE TABLE dashboard_widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES dashboard_templates(id) ON DELETE CASCADE,
  widget_type TEXT NOT NULL CHECK (widget_type IN ('kpi_card', 'line_chart', 'bar_chart', 'table', 'traffic_light', 'gauge')),
  title TEXT NOT NULL,
  config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  position_x INTEGER NOT NULL DEFAULT 0,
  position_y INTEGER NOT NULL DEFAULT 0,
  width INTEGER NOT NULL DEFAULT 4,
  height INTEGER NOT NULL DEFAULT 2,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Dashboard Metrics: stores actual metric data with provenance
CREATE TABLE dashboard_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('financial', 'health_safety', 'hr', 'sales', 'projects', 'compliance', 'governance')),
  metric_name TEXT NOT NULL,
  metric_value NUMERIC,
  metric_unit TEXT,
  period_type TEXT NOT NULL CHECK (period_type IN ('current', 'mtd', 'qtd', 'ytd', 'custom')) DEFAULT 'current',
  period_start DATE,
  period_end DATE,
  data_source TEXT NOT NULL,
  last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  metadata_json JSONB DEFAULT '{}'::jsonb,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_dashboard_templates_org ON dashboard_templates(org_id);
CREATE INDEX idx_dashboard_widgets_template ON dashboard_widgets(template_id);
CREATE INDEX idx_dashboard_metrics_org ON dashboard_metrics(org_id);
CREATE INDEX idx_dashboard_metrics_category ON dashboard_metrics(category, period_type);

-- RLS Policies
ALTER TABLE dashboard_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_metrics ENABLE ROW LEVEL SECURITY;

-- Users can view templates in their org
CREATE POLICY "Users can view org templates"
ON dashboard_templates FOR SELECT
USING (org_id IN (
  SELECT org_id FROM profiles WHERE id = auth.uid()
));

-- Users can create templates in their org
CREATE POLICY "Users can create templates"
ON dashboard_templates FOR INSERT
WITH CHECK (
  org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
  AND created_by = auth.uid()
);

-- Users can update templates in their org
CREATE POLICY "Users can update org templates"
ON dashboard_templates FOR UPDATE
USING (org_id IN (
  SELECT org_id FROM profiles WHERE id = auth.uid()
));

-- Users can delete templates they created
CREATE POLICY "Users can delete own templates"
ON dashboard_templates FOR DELETE
USING (created_by = auth.uid());

-- Widget policies (inherit from template)
CREATE POLICY "Users can view widgets"
ON dashboard_widgets FOR SELECT
USING (template_id IN (
  SELECT id FROM dashboard_templates 
  WHERE org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
));

CREATE POLICY "Users can manage widgets"
ON dashboard_widgets FOR ALL
USING (template_id IN (
  SELECT id FROM dashboard_templates 
  WHERE org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
));

-- Metrics policies
CREATE POLICY "Users can view org metrics"
ON dashboard_metrics FOR SELECT
USING (org_id IN (
  SELECT org_id FROM profiles WHERE id = auth.uid()
));

CREATE POLICY "Users can create metrics"
ON dashboard_metrics FOR INSERT
WITH CHECK (
  org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
  AND created_by = auth.uid()
);

CREATE POLICY "Users can update org metrics"
ON dashboard_metrics FOR UPDATE
USING (org_id IN (
  SELECT org_id FROM profiles WHERE id = auth.uid()
));

CREATE POLICY "Users can delete own metrics"
ON dashboard_metrics FOR DELETE
USING (created_by = auth.uid());

-- Triggers for updated_at
CREATE TRIGGER update_dashboard_templates_updated_at
  BEFORE UPDATE ON dashboard_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_dashboard_widgets_updated_at
  BEFORE UPDATE ON dashboard_widgets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_dashboard_metrics_updated_at
  BEFORE UPDATE ON dashboard_metrics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();