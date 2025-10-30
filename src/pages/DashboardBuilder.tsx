import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Save, Eye, Plus } from "lucide-react";
import WidgetLibrary from "@/components/dashboard/WidgetLibrary";
import KPICard from "@/components/dashboard/widgets/KPICard";
import TrafficLight from "@/components/dashboard/widgets/TrafficLight";
import SimpleChart from "@/components/dashboard/widgets/SimpleChart";

interface Widget {
  id: string;
  type: string;
  title: string;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  config: any;
}

const DashboardBuilder = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [selectedWidget, setSelectedWidget] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
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
    setUser(user);

    const { data: profile } = await supabase
      .from("profiles")
      .select("org_id")
      .eq("id", user.id)
      .single();

    if (profile?.org_id) {
      setOrgId(profile.org_id);
    }
  };

  const addWidget = (widgetType: string) => {
    const newWidget: Widget = {
      id: crypto.randomUUID(),
      type: widgetType,
      title: `New ${widgetType.replace('_', ' ')}`,
      position_x: 0,
      position_y: widgets.length * 2,
      width: widgetType === 'kpi_card' ? 3 : 6,
      height: 2,
      config: {
        metric_name: "Sample Metric",
        value: 0,
        unit: "",
        threshold: { green: 100, amber: 50, red: 0 }
      }
    };
    setWidgets([...widgets, newWidget]);
    setSelectedWidget(newWidget.id);
  };

  const updateWidget = (id: string, updates: Partial<Widget>) => {
    setWidgets(widgets.map(w => w.id === id ? { ...w, ...updates } : w));
  };

  const removeWidget = (id: string) => {
    setWidgets(widgets.filter(w => w.id !== id));
    if (selectedWidget === id) setSelectedWidget(null);
  };

  const saveTemplate = async () => {
    if (!orgId || !user) {
      toast({
        title: "Error",
        description: "You must be logged in and part of an organization",
        variant: "destructive"
      });
      return;
    }

    if (!templateName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a template name",
        variant: "destructive"
      });
      return;
    }

    try {
      // Create template
      const { data: template, error: templateError } = await supabase
        .from("dashboard_templates")
        .insert({
          org_id: orgId,
          name: templateName,
          description: templateDescription,
          created_by: user.id,
          layout_json: {
            widgets: widgets.map(w => ({ id: w.id, x: w.position_x, y: w.position_y, w: w.width, h: w.height })),
            grid: { columns: 12, rowHeight: 100 }
          }
        })
        .select()
        .single();

      if (templateError) throw templateError;

      // Create widgets
      const widgetInserts = widgets.map(w => ({
        template_id: template.id,
        widget_type: w.type,
        title: w.title,
        position_x: w.position_x,
        position_y: w.position_y,
        width: w.width,
        height: w.height,
        config_json: w.config
      }));

      const { error: widgetsError } = await supabase
        .from("dashboard_widgets")
        .insert(widgetInserts);

      if (widgetsError) throw widgetsError;

      toast({
        title: "Success",
        description: "Dashboard template saved successfully"
      });

      navigate("/dashboard");
    } catch (error: any) {
      console.error("Error saving template:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save template",
        variant: "destructive"
      });
    }
  };

  const renderWidget = (widget: Widget) => {
    const isSelected = selectedWidget === widget.id;
    const commonProps = {
      className: `cursor-pointer border-2 ${isSelected ? 'border-primary' : 'border-transparent'} hover:border-primary/50 transition-colors`,
      onClick: () => setSelectedWidget(widget.id)
    };

    switch (widget.type) {
      case 'kpi_card':
        return <KPICard {...commonProps} title={widget.title} value={widget.config.value || 0} unit={widget.config.unit} />;
      case 'traffic_light':
        return <TrafficLight {...commonProps} title={widget.title} status={widget.config.status || 'green'} />;
      case 'line_chart':
      case 'bar_chart':
        return <SimpleChart {...commonProps} title={widget.title} type={widget.type} data={widget.config.data || []} />;
      default:
        return <Card {...commonProps}><CardContent className="pt-6">Unknown widget type</CardContent></Card>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-8 pt-24">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Dashboard Template Builder</h1>
            <p className="text-muted-foreground">Create custom dashboards for your organization</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              <Eye className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={saveTemplate}>
              <Save className="h-4 w-4 mr-2" />
              Save Template
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar: Widget Library + Properties */}
          <div className="space-y-6">
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
                    placeholder="e.g., Board Pulse"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={templateDescription}
                    onChange={(e) => setTemplateDescription(e.target.value)}
                    placeholder="Brief description..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            <WidgetLibrary onAddWidget={addWidget} />

            {selectedWidget && (
              <Card>
                <CardHeader>
                  <CardTitle>Widget Properties</CardTitle>
                  <CardDescription>Configure selected widget</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(() => {
                    const widget = widgets.find(w => w.id === selectedWidget);
                    if (!widget) return null;
                    return (
                      <>
                        <div>
                          <Label>Title</Label>
                          <Input
                            value={widget.title}
                            onChange={(e) => updateWidget(widget.id, { title: e.target.value })}
                          />
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="w-full"
                          onClick={() => removeWidget(widget.id)}
                        >
                          Remove Widget
                        </Button>
                      </>
                    );
                  })()}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Main Canvas */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle>Dashboard Preview</CardTitle>
                <CardDescription>
                  Click widgets to select • Drag to reorder (coming soon)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {widgets.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Plus className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No widgets yet. Add widgets from the library on the left.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-12 gap-4 auto-rows-[100px]">
                    {widgets.map(widget => (
                      <div
                        key={widget.id}
                        className={`col-span-${widget.width} row-span-${widget.height}`}
                        style={{
                          gridColumn: `span ${widget.width}`,
                          gridRow: `span ${widget.height}`
                        }}
                      >
                        {renderWidget(widget)}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardBuilder;
