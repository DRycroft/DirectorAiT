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
import { 
  BarChart3, TrendingUp, Users, DollarSign, 
  AlertTriangle, FileText, Target, Shield, Activity, Briefcase,
  UserCheck, Scale, Building2, CheckCircle2, Calendar
} from "lucide-react";

interface MetricOption {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: any;
  defaultVisualization: string;
  visualizationOptions: string[];
  priority?: number; // 1 = Board Pulse (must-have), 2 = Priority 2, 3 = Priority 3
}

interface SelectedMetric {
  metricId: string;
  visualization: string;
  title: string;
}

const AVAILABLE_METRICS: MetricOption[] = [
  // BOARD PULSE - Top Priority (answers: safe, solvent, on-strategy?)
  {
    id: "cash_on_hand",
    name: "Cash on Hand",
    description: "Current cash position + months runway (Cash / monthly burn)",
    category: "Board Pulse",
    icon: DollarSign,
    defaultVisualization: "kpi",
    visualizationOptions: ["kpi", "gauge", "line_chart"],
    priority: 1
  },
  {
    id: "net_operating_cashflow",
    name: "Net Operating Cash Flow",
    description: "Operating cash flow for the period",
    category: "Board Pulse",
    icon: TrendingUp,
    defaultVisualization: "kpi",
    visualizationOptions: ["kpi", "line_chart", "bar_chart"],
    priority: 1
  },
  {
    id: "ebitda",
    name: "EBITDA / Operating Surplus",
    description: "Earnings before interest, tax, depreciation & amortization",
    category: "Board Pulse",
    icon: Target,
    defaultVisualization: "kpi",
    visualizationOptions: ["kpi", "line_chart", "bar_chart"],
    priority: 1
  },
  {
    id: "covenant_status",
    name: "Covenant Status",
    description: "Bank covenant compliance (OK / At-risk / Breach)",
    category: "Board Pulse",
    icon: Shield,
    defaultVisualization: "traffic_light",
    visualizationOptions: ["traffic_light", "kpi"],
    priority: 1
  },
  {
    id: "lti_incidents",
    name: "Lost Time Injuries (LTI)",
    description: "LTI count YTD + days since last incident",
    category: "Board Pulse",
    icon: AlertTriangle,
    defaultVisualization: "kpi",
    visualizationOptions: ["kpi", "line_chart", "traffic_light"],
    priority: 1
  },
  {
    id: "customer_health",
    name: "Customer Health",
    description: "Net Revenue Retention or Customer Churn %",
    category: "Board Pulse",
    icon: Users,
    defaultVisualization: "gauge",
    visualizationOptions: ["gauge", "kpi", "line_chart"],
    priority: 1
  },
  {
    id: "staff_turnover",
    name: "Staff Turnover",
    description: "12-month rolling turnover percentage",
    category: "Board Pulse",
    icon: UserCheck,
    defaultVisualization: "kpi",
    visualizationOptions: ["kpi", "line_chart", "gauge"],
    priority: 1
  },
  {
    id: "top_risks",
    name: "Top 3 Risks",
    description: "Highest severity risks with mitigation status",
    category: "Board Pulse",
    icon: AlertTriangle,
    defaultVisualization: "traffic_light",
    visualizationOptions: ["traffic_light", "bar_chart"],
    priority: 1
  },

  // FINANCIAL HEALTH
  {
    id: "revenue",
    name: "Revenue",
    description: "Period revenue vs budget vs prior year",
    category: "Financial",
    icon: TrendingUp,
    defaultVisualization: "line_chart",
    visualizationOptions: ["line_chart", "bar_chart", "kpi"],
    priority: 1
  },
  {
    id: "gross_margin",
    name: "Gross Margin %",
    description: "Gross profit as percentage of revenue",
    category: "Financial",
    icon: Target,
    defaultVisualization: "kpi",
    visualizationOptions: ["kpi", "gauge", "line_chart"],
    priority: 2
  },
  {
    id: "burn_rate",
    name: "Burn Rate",
    description: "Monthly cash burn rate (month on month)",
    category: "Financial",
    icon: TrendingUp,
    defaultVisualization: "line_chart",
    visualizationOptions: ["line_chart", "kpi", "bar_chart"],
    priority: 1
  },
  {
    id: "aged_debtors",
    name: "Aged Debtors (AR)",
    description: "Receivables aged by bucket: 0-30, 31-60, 61-90, >90 days",
    category: "Financial",
    icon: DollarSign,
    defaultVisualization: "bar_chart",
    visualizationOptions: ["bar_chart", "kpi"],
    priority: 1
  },
  {
    id: "aged_creditors",
    name: "Aged Creditors (AP)",
    description: "Payables aged by bucket with days payable outstanding",
    category: "Financial",
    icon: DollarSign,
    defaultVisualization: "bar_chart",
    visualizationOptions: ["bar_chart", "kpi"],
    priority: 2
  },
  {
    id: "capex_vs_budget",
    name: "CapEx vs Budget",
    description: "Capital expenditure YTD vs planned spend",
    category: "Financial",
    icon: Building2,
    defaultVisualization: "bar_chart",
    visualizationOptions: ["bar_chart", "kpi"],
    priority: 2
  },

  // CUSTOMERS & SALES
  {
    id: "new_clients",
    name: "New Clients",
    description: "New clients this period / churned / retention rate",
    category: "Customers & Sales",
    icon: Users,
    defaultVisualization: "kpi",
    visualizationOptions: ["kpi", "bar_chart", "line_chart"],
    priority: 2
  },
  {
    id: "sales_pipeline",
    name: "Sales Pipeline",
    description: "Pipeline value, weighted value, win rate, deal velocity",
    category: "Customers & Sales",
    icon: TrendingUp,
    defaultVisualization: "kpi",
    visualizationOptions: ["kpi", "bar_chart"],
    priority: 2
  },
  {
    id: "tenders_submitted",
    name: "Tenders Submitted",
    description: "Submitted count/value, success rate, awarded contracts",
    category: "Customers & Sales",
    icon: FileText,
    defaultVisualization: "bar_chart",
    visualizationOptions: ["bar_chart", "kpi"],
    priority: 2
  },

  // OPERATIONS & PROJECTS
  {
    id: "active_projects",
    name: "Active Projects",
    description: "Project status: on-track / at-risk / off-track with % complete",
    category: "Operations",
    icon: Briefcase,
    defaultVisualization: "traffic_light",
    visualizationOptions: ["traffic_light", "bar_chart", "kpi"],
    priority: 2
  },
  {
    id: "on_time_delivery",
    name: "On-Time Delivery %",
    description: "Percentage of deliveries/jobs completed on schedule",
    category: "Operations",
    icon: CheckCircle2,
    defaultVisualization: "gauge",
    visualizationOptions: ["gauge", "kpi", "line_chart"],
    priority: 2
  },
  {
    id: "backlog_value",
    name: "Backlog Value",
    description: "Revenue backlog and burn rate",
    category: "Operations",
    icon: DollarSign,
    defaultVisualization: "kpi",
    visualizationOptions: ["kpi", "line_chart"],
    priority: 2
  },

  // PEOPLE & HR
  {
    id: "headcount",
    name: "Headcount",
    description: "FT/PT/contractors with trend",
    category: "People & HR",
    icon: Users,
    defaultVisualization: "kpi",
    visualizationOptions: ["kpi", "line_chart", "bar_chart"],
    priority: 2
  },
  {
    id: "vacancies_open",
    name: "Open Vacancies",
    description: "Vacancies open and average time-to-fill",
    category: "People & HR",
    icon: UserCheck,
    defaultVisualization: "kpi",
    visualizationOptions: ["kpi", "bar_chart"],
    priority: 3
  },

  // HEALTH & SAFETY
  {
    id: "trifr",
    name: "TRIFR",
    description: "Total Recordable Injury Frequency Rate",
    category: "Health & Safety",
    icon: Activity,
    defaultVisualization: "kpi",
    visualizationOptions: ["kpi", "line_chart", "gauge"],
    priority: 2
  },
  {
    id: "near_misses",
    name: "Near Misses Reported",
    description: "Trend of near-miss reports (indicator of safety culture)",
    category: "Health & Safety",
    icon: AlertTriangle,
    defaultVisualization: "line_chart",
    visualizationOptions: ["line_chart", "kpi"],
    priority: 3
  },
  {
    id: "corrective_actions",
    name: "Open Corrective Actions",
    description: "H&S corrective actions with owner and due date",
    category: "Health & Safety",
    icon: CheckCircle2,
    defaultVisualization: "kpi",
    visualizationOptions: ["kpi", "bar_chart"],
    priority: 2
  },

  // COMPLIANCE & LEGAL
  {
    id: "regulatory_items",
    name: "Regulatory Items",
    description: "Open filings, licences, deadlines",
    category: "Compliance",
    icon: Scale,
    defaultVisualization: "traffic_light",
    visualizationOptions: ["traffic_light", "kpi"],
    priority: 2
  },
  {
    id: "contract_expiries",
    name: "Contract Expiries",
    description: "Contracts expiring in next 90/180 days",
    category: "Compliance",
    icon: FileText,
    defaultVisualization: "kpi",
    visualizationOptions: ["kpi", "bar_chart"],
    priority: 3
  },

  // BOARD ACTIONS & GOVERNANCE
  {
    id: "open_board_actions",
    name: "Open Board Actions",
    description: "Outstanding actions with owner, due date, status",
    category: "Governance",
    icon: Calendar,
    defaultVisualization: "kpi",
    visualizationOptions: ["kpi", "bar_chart"],
    priority: 1
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
        .insert([{
          name: templateName,
          description: description,
          org_id: orgId,
          created_by: userId,
          layout_json: { metrics: selectedMetrics } as any
        }])
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
                <CardDescription>
                  Choose metrics to display. Board Pulse metrics answer: Is the organisation safe, solvent, and on-strategy?
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2">
                  {/* Group metrics by category */}
                  {Array.from(new Set(AVAILABLE_METRICS.map(m => m.category))).map(category => {
                    const categoryMetrics = AVAILABLE_METRICS.filter(m => m.category === category);
                    return (
                      <div key={category}>
                        <h3 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wide">
                          {category}
                        </h3>
                        <div className="space-y-2">
                          {categoryMetrics.map((metric) => {
                            const Icon = metric.icon;
                            const isSelected = selectedMetrics.some(m => m.metricId === metric.id);
                            const isPriority1 = metric.priority === 1;
                            
                            return (
                              <div 
                                key={metric.id} 
                                className={`flex items-start space-x-3 p-3 rounded-lg border ${
                                  isPriority1 ? 'border-primary/30 bg-primary/5' : ''
                                }`}
                              >
                                <Checkbox
                                  id={metric.id}
                                  checked={isSelected}
                                  onCheckedChange={() => toggleMetric(metric.id)}
                                />
                                <div className="flex-1 min-w-0">
                                  <label
                                    htmlFor={metric.id}
                                    className="flex items-center gap-2 font-medium cursor-pointer"
                                  >
                                    <Icon className="h-4 w-4 flex-shrink-0" />
                                    <span>{metric.name}</span>
                                    {isPriority1 && (
                                      <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold">
                                        P1
                                      </span>
                                    )}
                                  </label>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {metric.description}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
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
