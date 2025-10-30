-- Drop the old check constraint
ALTER TABLE dashboard_widgets DROP CONSTRAINT IF EXISTS dashboard_widgets_widget_type_check;

-- Add updated check constraint with all widget types used in the builder
ALTER TABLE dashboard_widgets ADD CONSTRAINT dashboard_widgets_widget_type_check 
CHECK (widget_type = ANY (ARRAY[
  'kpi',
  'kpi_card',
  'line',
  'line_chart',
  'bar',
  'bar_chart',
  'pie',
  'pie_chart',
  'table',
  'traffic-light',
  'traffic_light',
  'gauge'
]));