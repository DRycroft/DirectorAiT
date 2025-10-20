import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TemplateSectionEditor, TemplateSection } from "@/components/TemplateSectionEditor";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Save } from "lucide-react";

const templateTypes = [
  "Board Papers",
  "Chair Report",
  "CEO Report",
  "CFO Report",
  "OSH Report",
  "Finance Report",
  "S&M Report",
  "HR Report",
  "KPIs Report",
  "One-Off Report",
  "Minutes",
  "Special Papers",
  "Financial Updates",
];

const defaultSections: TemplateSection[] = [
  { id: "exec-summary", title: "Executive Summary", required: false, enabled: true, order: 0, label: "For Noting" },
  { id: "financial-overview", title: "Financial Overview", required: false, enabled: true, order: 1, label: "For Discussion" },
  { id: "strategic-updates", title: "Strategic Updates", required: false, enabled: true, order: 2, label: "For Discussion" },
  { id: "operational-metrics", title: "Operational Metrics", required: false, enabled: true, order: 3, label: "For Noting" },
  { id: "risk-compliance", title: "Risk & Compliance", required: false, enabled: true, order: 4, label: "For Noting" },
  { id: "governance-updates", title: "Governance Updates", required: false, enabled: true, order: 5, label: "For Noting" },
  { id: "stakeholder-engagement", title: "Stakeholder Engagement", required: false, enabled: true, order: 6, label: "For Discussion" },
  { id: "project-updates", title: "Project Updates", required: false, enabled: true, order: 7, label: "For Noting" },
  { id: "budget-variance", title: "Budget Variance Analysis", required: false, enabled: true, order: 8, label: "For Discussion" },
  { id: "recommendations", title: "Recommendations", required: false, enabled: true, order: 9, label: "For Decision" },
];

const Templates = () => {
  const { toast } = useToast();
  const [selectedType, setSelectedType] = useState<string>("");
  const [sections, setSections] = useState<TemplateSection[]>(defaultSections);

  const handleSaveTemplate = async () => {
    if (!selectedType) {
      toast({
        title: "Template type required",
        description: "Please select a template type",
        variant: "destructive",
      });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const templateData = {
      name: selectedType,
      scope: "personal" as const,
      tags: [selectedType],
      is_default: true,
      default_for_sections: [selectedType],
      sections: sections as any,
      author_id: user.id,
    };

    const { error } = await supabase
      .from("templates")
      .insert([templateData]);

    if (error) {
      toast({
        title: "Error creating template",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Template created",
      description: `${selectedType} template has been saved to Board Papers`,
    });

    // Reset form
    setSelectedType("");
    setSections(defaultSections);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      <main className="flex-1 container mx-auto px-4 py-24 max-w-4xl">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <h1 className="text-3xl font-bold text-foreground">
              Document Templates - Create A New Document
            </h1>
          </div>
          
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-full max-w-md">
              <SelectValue placeholder="Choose a template type..." />
            </SelectTrigger>
            <SelectContent>
              {templateTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedType && (
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="text-2xl">{selectedType.toUpperCase()}</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-6">
                <TemplateSectionEditor
                  sections={sections}
                  onSectionsChange={setSections}
                />
                
                <div className="flex justify-end pt-4 border-t">
                  <Button onClick={handleSaveTemplate} size="lg">
                    <Save className="h-4 w-4 mr-2" />
                    Save Template
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Templates;
