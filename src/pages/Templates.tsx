import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TemplateSectionEditor, TemplateSection } from "@/components/TemplateSectionEditor";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Save, Plus, Eye, Trash2, Copy, Pin, FileText } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const sectionOptions = [
  "Board Papers",
  "CEO Report",
  "CFO Report",
  "Chair Report",
  "H&S Report",
  "Finance Report",
  "S&M Report",
  "HR Report",
  "KPIs Report",
  "Minutes",
  "Special Papers",
  "Financial Updates",
];

const defaultSections: TemplateSection[] = [
  { id: "exec-summary", title: "Executive Summary", required: true, enabled: true, order: 0, label: "For Noting" },
  { id: "financial-overview", title: "Financial Overview", required: false, enabled: true, order: 1, label: "For Discussion" },
  { id: "strategic-updates", title: "Strategic Updates", required: false, enabled: true, order: 2, label: "For Discussion" },
  { id: "operational-metrics", title: "Operational Metrics", required: false, enabled: true, order: 3, label: "For Noting" },
  { id: "risk-compliance", title: "Risk & Compliance", required: false, enabled: true, order: 4, label: "For Noting" },
  { id: "recommendations", title: "Recommendations", required: true, enabled: true, order: 5, label: "For Decision" },
];

const Templates = () => {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  
  // Template form state
  const [templateName, setTemplateName] = useState("");
  const [templateScope, setTemplateScope] = useState<"personal" | "team" | "organization">("personal");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [setAsDefault, setSetAsDefault] = useState(false);
  const [sections, setSections] = useState<TemplateSection[]>(defaultSections);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    const { data, error } = await supabase
      .from("templates")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      toast({
        title: "Error loading templates",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setTemplates(data || []);
  };

  const loadTemplate = async (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;

    setSelectedTemplateId(templateId);
    setTemplateName(template.name);
    setTemplateScope(template.scope);
    setSelectedTags(template.tags || []);
    setSetAsDefault(template.is_default || false);
    setSections(template.sections || defaultSections);
    setIsCreating(false);
  };

  const handleCreateNew = () => {
    setSelectedTemplateId(null);
    setTemplateName("");
    setTemplateScope("personal");
    setSelectedTags([]);
    setSetAsDefault(false);
    setSections(defaultSections);
    setIsCreating(true);
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      toast({
        title: "Template name required",
        description: "Please enter a name for your template",
        variant: "destructive",
      });
      return;
    }

    if (selectedTags.length === 0) {
      toast({
        title: "Tags required",
        description: "Please select at least one section tag",
        variant: "destructive",
      });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const templateData = {
      name: templateName,
      scope: templateScope,
      tags: selectedTags,
      is_default: setAsDefault,
      default_for_sections: setAsDefault ? selectedTags : [],
      sections: sections as any,
      author_id: user.id,
    };

    if (selectedTemplateId) {
      const { error } = await supabase
        .from("templates")
        .update(templateData)
        .eq("id", selectedTemplateId);

      if (error) {
        toast({
          title: "Error updating template",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Template updated",
        description: "Your template has been updated successfully",
      });
    } else {
      const { error } = await supabase
        .from("templates")
        .insert(templateData);

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
        description: "Your template has been created successfully",
      });
    }

    setSaveDialogOpen(false);
    loadTemplates();
    setIsCreating(false);
  };

  const handleDeleteTemplate = async (templateId: string) => {
    const { error } = await supabase
      .from("templates")
      .delete()
      .eq("id", templateId);

    if (error) {
      toast({
        title: "Error deleting template",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Template deleted",
      description: "Template has been deleted successfully",
    });

    if (selectedTemplateId === templateId) {
      setSelectedTemplateId(null);
      setIsCreating(false);
    }

    loadTemplates();
  };

  const handleDuplicateTemplate = async (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("templates")
      .insert({
        ...template,
        id: undefined,
        name: `${template.name} (Copy)`,
        author_id: user.id,
        is_default: false,
        created_at: undefined,
        updated_at: undefined,
      });

    if (error) {
      toast({
        title: "Error duplicating template",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Template duplicated",
      description: "Template has been duplicated successfully",
    });

    loadTemplates();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      <main className="flex-1 container mx-auto px-4 py-24 max-w-7xl">
        <div className="mb-6">
          <h1 className="text-5xl font-bold mb-3 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            Document Templates
          </h1>
          <p className="text-lg text-muted-foreground">
            Create and manage templates for all your board documentation
          </p>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Templates List */}
          <div className="col-span-12 lg:col-span-4">
            <Card>
              <CardHeader>
                <CardTitle>My Templates</CardTitle>
                <CardDescription>
                  Create and manage your templates
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button onClick={handleCreateNew} className="w-full" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Template
                </Button>

                <div className="space-y-2 pt-4">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedTemplateId === template.id
                          ? "bg-accent border-primary"
                          : "hover:bg-accent/50"
                      }`}
                      onClick={() => loadTemplate(template.id)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{template.name}</h4>
                          <p className="text-xs text-muted-foreground mt-1">
                            {template.scope} • v{template.version}
                          </p>
                          {template.is_default && (
                            <div className="flex items-center gap-1 mt-1">
                              <Pin className="h-3 w-3 text-yellow-500" />
                              <span className="text-xs text-yellow-500">Default</span>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDuplicateTemplate(template.id);
                            }}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTemplate(template.id);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Template Editor */}
          <div className="col-span-12 lg:col-span-8">
            {(selectedTemplateId || isCreating) ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>
                        {isCreating ? "Create New Template" : "Edit Template"}
                      </CardTitle>
                      <CardDescription>
                        Configure sections and settings for your template
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        Preview
                      </Button>
                      <Button onClick={() => setSaveDialogOpen(true)} size="sm">
                        <Save className="h-4 w-4 mr-2" />
                        Save Template
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <TemplateSectionEditor
                    sections={sections}
                    onSectionsChange={setSections}
                  />
                </CardContent>
              </Card>
            ) : (
              <Card className="h-full flex items-center justify-center min-h-[600px]">
                <div className="text-center text-muted-foreground">
                  <FileText className="h-16 w-16 mx-auto mb-4 opacity-20" />
                  <p>Select a template to edit or create a new one</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </main>
      <Footer />

      {/* Save Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Template</DialogTitle>
            <DialogDescription>
              Configure template settings and save
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Template Name</Label>
              <Input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g., CEO Report - Standard"
              />
            </div>

            <div>
              <Label>Scope</Label>
              <Select value={templateScope} onValueChange={(v: any) => setTemplateScope(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal">Personal</SelectItem>
                  <SelectItem value="team">Team</SelectItem>
                  <SelectItem value="organization">Organization</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-2 block">Tags (Select sections this template applies to)</Label>
              <div className="grid grid-cols-2 gap-2">
                {sectionOptions.map((section) => (
                  <div key={section} className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedTags.includes(section)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedTags([...selectedTags, section]);
                        } else {
                          setSelectedTags(selectedTags.filter((t) => t !== section));
                        }
                      }}
                    />
                    <Label className="text-sm">{section}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Checkbox
                checked={setAsDefault}
                onCheckedChange={(checked) => setSetAsDefault(checked === true)}
              />
              <Label>Set as default template for selected sections</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTemplate}>
              Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Templates;
