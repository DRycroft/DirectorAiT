import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { BarChart3, LineChart, Gauge, CircleDot, TrendingUp, Users, DollarSign, AlertTriangle, Clock, FileText } from "lucide-react";

interface MetricOption {
  id: string;
  name: string;
  description: string;
  icon: any;
  defaultVisualization: string;
  visualizationOptions: string[];
}

interface SelectedMetric {
  metricId: string;
  visualization: string;
  title: string;
}

const AVAILABLE_METRICS: MetricOption[] = [
  {
    id: "cash_balance",
    name: "Cash Balance",
    description: "Current cash position",
    icon: DollarSign,
    defaultVisualization: "kpi",
    visualizationOptions: ["kpi", "gauge", "line_chart"]
  },
  {
    id: "revenue",
    name: "Revenue",
    description: "Revenue over time",
    icon: TrendingUp,
    defaultVisualization: "line_chart",
    visualizationOptions: ["line_chart", "bar_chart", "kpi"]
  },
  {
    id: "active_projects",
    name: "Active Projects",
    description: "Number of ongoing projects",
    icon: FileText,
    defaultVisualization: "kpi",
    visualizationOptions: ["kpi", "bar_chart"]
  },
  {
    id: "team_size",
    name: "Team Size",
    description: "Total employees",
    icon: Users,
    defaultVisualization: "kpi",
    visualizationOptions: ["kpi", "line_chart"]
  },
  {
    id: "project_status",
    name: "Project Status",
    description: "On-track, at-risk, or critical",
    icon: AlertTriangle,
    defaultVisualization: "traffic_light",
    visualizationOptions: ["traffic_light", "bar_chart"]
  },
  {
    id: "overdue_tasks",
    name: "Overdue Tasks",
    description: "Tasks past their due date",
    icon: Clock,
    defaultVisualization: "kpi",
    visualizationOptions: ["kpi", "bar_chart"]
  }
];

const VISUALIZATION_LABELS: Record<string, string> = {
  kpi: "KPI Card",
  gauge: "Gauge",
  traffic_light: "Traffic Light",
  line_chart: "Line Chart",
  bar_chart: "Bar Chart"
};

const DashboardBuilder = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [templateName, setTemplateName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedMetrics, setSelectedMetrics] = useState<SelectedMetric[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }
    setUserId(user.id);

    const { data: profile } = await supabase
      .from("profiles")
      .select("org_id")
      .eq("id", user.id)
      .single();

    if (profile?.org_id) {
      setOrgId(profile.org_id);
    }
  };

  const toggleMetric = (metricId: string) => {
    const isSelected = selectedMetrics.some(m => m.metricId === metricId);
    
    if (isSelected) {
      setSelectedMetrics(selectedMetrics.filter(m => m.metricId !== metricId));
    } else {
      const metric = AVAILABLE_METRICS.find(m => m.id === metricId);
      if (metric) {
        setSelectedMetrics([...selectedMetrics, {
          metricId: metric.id,
          visualization: metric.defaultVisualization,
          title: metric.name
        }]);
      }
    }
  };

  const updateVisualization = (metricId: string, visualization: string) => {
    setSelectedMetrics(selectedMetrics.map(m => 
      m.metricId === metricId ? { ...m, visualization } : m
    ));
  };

  const updateTitle = (metricId: string, title: string) => {
    setSelectedMetrics(selectedMetrics.map(m => 
      m.metricId === metricId ? { ...m, title } : m
    ));
  };

  const saveTemplate = async () => {
    if (!templateName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a template name",
        variant: "destructive"
      });
      return;
    }

    if (selectedMetrics.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one metric",
        variant: "destructive"
      });
      return;
    }

    if (!userId || !orgId) {
      toast({
        title: "Error",
        description: "Authentication required",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data: template, error: templateError } = await supabase
        .from("dashboard_templates")
        .insert({
          name: templateName,
          description: description,
          org_id: orgId,
          created_by: userId,
          layout_json: { metrics: selectedMetrics }
        })
        .select()
        .single();

      if (templateError) throw templateError;

      // Insert widgets based on selected metrics
      const widgetInserts = selectedMetrics.map((metric, index) => ({
        template_id: template.id,
        widget_type: metric.visualization,
        title: metric.title,
        position_x: (index % 3) * 4,
        position_y: Math.floor(index / 3) * 2,
        width: 4,
        height: 2,
        config_json: { metricId: metric.metricId }
      }));

      if (widgetInserts.length > 0) {
        const { error: widgetsError } = await supabase
          .from("dashboard_widgets")
          .insert(widgetInserts);

        if (widgetsError) throw widgetsError;
      }

      toast({
        title: "Success",
        description: "Dashboard template saved successfully"
      });

      navigate("/settings");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Dashboard Template Builder</h1>
          <p className="text-muted-foreground">
            Select metrics and choose how to visualize them
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel - Template Details & Metric Selection */}
          <div className="space-y-6">
            {/* Template Details */}
            <Card>
              <CardHeader>
                <CardTitle>Template Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Template Name</Label>
                  <Input
                    id="name"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="e.g., Executive Dashboard"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe what this dashboard shows..."
                  />
                </div>
              </CardContent>
            </Card>

            {/* Metric Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Select Metrics</CardTitle>
                <CardDescription>Choose which metrics to display on your dashboard</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {AVAILABLE_METRICS.map((metric) => {
                    const Icon = metric.icon;
                    const isSelected = selectedMetrics.some(m => m.metricId === metric.id);
                    
                    return (
                      <div key={metric.id} className="flex items-start space-x-3 p-3 rounded-lg border">
                        <Checkbox
                          id={metric.id}
                          checked={isSelected}
                          onCheckedChange={() => toggleMetric(metric.id)}
                        />
                        <div className="flex-1">
                          <label
                            htmlFor={metric.id}
                            className="flex items-center gap-2 font-medium cursor-pointer"
                          >
                            <Icon className="h-4 w-4" />
                            {metric.name}
                          </label>
                          <p className="text-sm text-muted-foreground mt-1">
                            {metric.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Selected Metrics Configuration */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Configure Selected Metrics</CardTitle>
                <CardDescription>
                  {selectedMetrics.length === 0 
                    ? "Select metrics from the left to configure them"
                    : `${selectedMetrics.length} metric${selectedMetrics.length > 1 ? 's' : ''} selected`
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedMetrics.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No metrics selected yet</p>
                    <p className="text-sm mt-2">Select metrics from the left panel to configure them</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {selectedMetrics.map((selected) => {
                      const metric = AVAILABLE_METRICS.find(m => m.id === selected.metricId);
                      if (!metric) return null;
                      
                      const Icon = metric.icon;
                      
                      return (
                        <div key={selected.metricId} className="p-4 border rounded-lg space-y-3">
                          <div className="flex items-center gap-2 font-medium">
                            <Icon className="h-4 w-4" />
                            {metric.name}
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Display Title</Label>
                            <Input
                              value={selected.title}
                              onChange={(e) => updateTitle(selected.metricId, e.target.value)}
                              placeholder={metric.name}
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Visualization Type</Label>
                            <Select
                              value={selected.visualization}
                              onValueChange={(value) => updateVisualization(selected.metricId, value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {metric.visualizationOptions.map((vizType) => (
                                  <SelectItem key={vizType} value={vizType}>
                                    {VISUALIZATION_LABELS[vizType]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="mt-8 flex justify-end gap-4">
          <Button variant="outline" onClick={() => navigate("/settings")}>
            Cancel
          </Button>
          <Button onClick={saveTemplate} disabled={selectedMetrics.length === 0}>
            Save Template
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DashboardBuilder;
