/**
 * BoardPaperTemplateBuilder Component
 * 
 * ⚠️ DEPRECATED: This component is being phased out in favor of PackTemplateBuilder
 * which uses the new board_templates and template_sections schema.
 * 
 * This component still uses the old board_paper_templates table.
 * For new implementations, use PackTemplateBuilder from @/components/PackTemplateBuilder
 */

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GripVertical, Lock, Upload, Building2, Save, Plus, Trash } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { logError } from "@/lib/errorHandling";

interface TemplateSection {
  id: string;
  title: string;
  required: boolean;
  enabled: boolean;
  order: number;
}

const defaultSections: TemplateSection[] = [
  { id: "cover-sheet", title: "Cover Sheet", required: true, enabled: true, order: 1 },
  { id: "agenda-toc", title: "Agenda / Table of Contents", required: true, enabled: true, order: 2 },
  { id: "declarations", title: "Declarations of Interest (Conflicts of Interest)", required: true, enabled: true, order: 3 },
  { id: "attendance", title: "Apologies / Attendance", required: true, enabled: true, order: 4 },
  { id: "previous-minutes", title: "Minutes of Previous Meeting", required: true, enabled: true, order: 5 },
  { id: "matters-arising", title: "Matters Arising / Action Log", required: false, enabled: true, order: 6 },
  { id: "chair-report", title: "Chair's Report", required: false, enabled: true, order: 7 },
  { id: "ceo-summary", title: "CEO / Managing Director's Executive Summary", required: false, enabled: true, order: 8 },
  { id: "strategy-update", title: "Strategy Update / Strategic Projects", required: false, enabled: true, order: 9 },
  { id: "business-plan", title: "Business Plan / Objectives & Key Results (OKRs)", required: false, enabled: true, order: 10 },
  { id: "operational-kpis", title: "Operational Performance / KPIs", required: false, enabled: true, order: 11 },
  { id: "sales-marketing", title: "Sales, Marketing & Customer Metrics", required: false, enabled: false, order: 12 },
  { id: "product-dev", title: "Product / Service Development / R&D", required: false, enabled: false, order: 13 },
  { id: "major-projects", title: "Major Projects & Programme Status", required: false, enabled: true, order: 14 },
  { id: "hse-report", title: "Health, Safety & Environmental (HSE) Report", required: false, enabled: true, order: 15 },
  { id: "esg", title: "ESG / Sustainability / Corporate Social Responsibility", required: false, enabled: false, order: 16 },
  { id: "people-culture", title: "People & Culture / HR Report", required: false, enabled: true, order: 17 },
  { id: "remuneration", title: "Remuneration Committee Report", required: false, enabled: false, order: 18 },
  { id: "audit-committee", title: "Audit Committee Report", required: false, enabled: true, order: 19 },
  { id: "risk-register", title: "Risk Register & Top Risks", required: false, enabled: true, order: 20 },
  { id: "compliance", title: "Compliance & Regulatory Update", required: false, enabled: true, order: 21 },
  { id: "legal-matters", title: "Legal Matters & Litigation", required: false, enabled: false, order: 22 },
  { id: "it-cybersecurity", title: "IT, Cybersecurity & Data Protection", required: false, enabled: true, order: 23 },
  { id: "privacy", title: "Privacy / Data Governance", required: false, enabled: false, order: 24 },
  { id: "financial-statements", title: "Financial Statements & Notes (Period)", required: false, enabled: true, order: 25 },
  { id: "liquidity", title: "Liquidity & Cashflow Forecast", required: false, enabled: true, order: 26 },
  { id: "financial-commentary", title: "Financial Commentary & Variance Analysis", required: false, enabled: true, order: 27 },
  { id: "capex", title: "Capital Expenditure (CapEx) Proposals", required: false, enabled: false, order: 28 },
  { id: "contracts", title: "Major Contracts / Procurement & Supplier Issues", required: false, enabled: false, order: 29 },
  { id: "related-party", title: "Related Party Transactions", required: false, enabled: false, order: 30 },
  { id: "investment", title: "Investment / Financing / Fundraising Update", required: false, enabled: false, order: 31 },
  { id: "ma", title: "Mergers, Acquisitions & Divestments (M&A)", required: false, enabled: false, order: 32 },
  { id: "internal-audit", title: "Internal Audit / Assurance Reports", required: false, enabled: false, order: 33 },
  { id: "external-auditor", title: "External Auditor Communications", required: false, enabled: false, order: 34 },
  { id: "board-governance", title: "Board Governance & Board Committee Items", required: false, enabled: true, order: 35 },
  { id: "decisions", title: "Board Papers Seeking Decisions / Resolutions", required: false, enabled: true, order: 36 },
  { id: "summary", title: "Summary of Key Decisions & Actions", required: false, enabled: true, order: 37 },
  { id: "aob", title: "Any Other Business (AOB)", required: false, enabled: true, order: 38 },
  { id: "next-meeting", title: "Date, Time & Location of Next Meeting", required: false, enabled: true, order: 39 },
  { id: "appendices", title: "Appendices & Supporting Papers", required: false, enabled: true, order: 40 },
  { id: "glossary", title: "Glossary / Definitions / Abbreviations", required: false, enabled: false, order: 41 },
];

export const BoardPaperTemplateBuilder = () => {
  const [sections, setSections] = useState<TemplateSection[]>(defaultSections);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("org_id")
        .eq("id", user.id)
        .single();

      if (!profile?.org_id) return;

      const { data, error } = await supabase
        .from("board_paper_templates")
        .select("*")
        .eq("org_id", profile.org_id)
        .eq("template_type", "Board Papers")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      logError("BoardPaperTemplateBuilder - Fetch templates", error);
    }
  };

  const handleToggleSection = (id: string) => {
    setSections(sections.map(section => 
      section.id === id && !section.required 
        ? { ...section, enabled: !section.enabled }
        : section
    ));
  };

  const handleDragStart = (id: string) => {
    setDraggedItem(id);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedItem || draggedItem === targetId) return;

    const draggedIndex = sections.findIndex(s => s.id === draggedItem);
    const targetIndex = sections.findIndex(s => s.id === targetId);

    const newSections = [...sections];
    const [removed] = newSections.splice(draggedIndex, 1);
    newSections.splice(targetIndex, 0, removed);

    // Update order numbers
    const reordered = newSections.map((section, index) => ({
      ...section,
      order: index + 1
    }));

    setSections(reordered);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoUrl(reader.result as string);
        toast.success("Logo uploaded successfully");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveTemplate = async () => {
    if (!templateName) {
      toast.error("Please enter a template name");
      return;
    }

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("org_id")
        .eq("id", user.id)
        .single();

      if (!profile?.org_id) throw new Error("No organization found");

      const templateData = {
        org_id: profile.org_id,
        template_name: templateName,
        template_type: "Board Papers",
        company_name: companyName,
        logo_url: logoUrl,
        sections: sections as any,
        created_by: user.id,
      };

      if (selectedTemplateId) {
        // Update existing template
        const { error } = await supabase
          .from("board_paper_templates")
          .update(templateData)
          .eq("id", selectedTemplateId);

        if (error) throw error;
        toast.success("Template updated successfully!");
      } else {
        // Create new template
        const { error } = await supabase
          .from("board_paper_templates")
          .insert([templateData]);

        if (error) throw error;
        toast.success("Template saved successfully!");
      }

      await fetchTemplates();
    } catch (error: any) {
      logError("BoardPaperTemplateBuilder - Save template", error);
      toast.error(error.message || "Failed to save template");
    } finally {
      setLoading(false);
    }
  };

  const handleLoadTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    setSelectedTemplateId(templateId);
    setTemplateName(template.template_name);
    setCompanyName(template.company_name || "");
    setLogoUrl(template.logo_url);
    setSections(template.sections || defaultSections);
    toast.success("Template loaded");
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;

    try {
      const { error } = await supabase
        .from("board_paper_templates")
        .delete()
        .eq("id", templateId);

      if (error) throw error;

      toast.success("Template deleted");
      await fetchTemplates();

      if (selectedTemplateId === templateId) {
        handleResetTemplate();
      }
    } catch (error: any) {
      logError("BoardPaperTemplateBuilder - Delete template", error);
      toast.error("Failed to delete template");
    }
  };

  const handleNewTemplate = () => {
    setSelectedTemplateId(null);
    setTemplateName("");
    setCompanyName("");
    setLogoUrl(null);
    setSections(defaultSections);
  };

  const handleResetTemplate = () => {
    setSections(defaultSections);
    setCompanyName("");
    setLogoUrl(null);
    setTemplateName("");
    setSelectedTemplateId(null);
    toast.success("Template reset to defaults");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Board Paper Template Settings</CardTitle>
        <CardDescription>
          Set up your company branding and customize board paper sections
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Template Management Section */}
        <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Saved Templates</h3>
            <Button onClick={handleNewTemplate} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Template
            </Button>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="savedTemplates">Load Template</Label>
              <Select value={selectedTemplateId || ""} onValueChange={handleLoadTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a saved template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.template_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="templateName">Template Name</Label>
              <Input
                id="templateName"
                placeholder="My Board Paper Template"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
              />
            </div>
          </div>

          {selectedTemplateId && (
            <Button 
              onClick={() => handleDeleteTemplate(selectedTemplateId)} 
              variant="destructive" 
              size="sm"
            >
              <Trash className="h-4 w-4 mr-2" />
              Delete Template
            </Button>
          )}
        </div>

        {/* Company Branding Section */}
        <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Company Branding
          </h3>
          
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                placeholder="Enter company name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="logo">Company Logo</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {logoUrl ? "Change Logo" : "Upload Logo"}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
              </div>
              {logoUrl && (
                <div className="mt-2 p-2 border rounded-lg bg-background">
                  <img src={logoUrl} alt="Company logo" className="h-12 object-contain" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Template Sections */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Template Sections</h3>
          <p className="text-xs text-muted-foreground">
            Required sections cannot be removed. Drag to reorder optional sections.
          </p>
        </div>
        <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
          {sections.map((section) => (
            <div
              key={section.id}
              draggable={!section.required}
              onDragStart={() => handleDragStart(section.id)}
              onDragOver={(e) => handleDragOver(e, section.id)}
              onDragEnd={handleDragEnd}
              className={`flex items-center gap-3 py-0.5 px-2 rounded-lg border bg-card hover:bg-accent/50 transition-colors ${
                draggedItem === section.id ? "opacity-50" : ""
              } ${section.required ? "cursor-default" : "cursor-move"}`}
            >
              {section.required ? (
                <Lock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              ) : (
                <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              )}
              
              <Checkbox
                checked={section.enabled}
                disabled={section.required}
                onCheckedChange={() => handleToggleSection(section.id)}
                className="flex-shrink-0"
              />
              
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${section.enabled ? "" : "text-muted-foreground"}`}>
                  {section.title}
                </p>
                {section.required && (
                  <p className="text-xs text-muted-foreground mt-0.5">Required section</p>
                )}
              </div>

              <span className="text-xs text-muted-foreground flex-shrink-0 w-8 text-right">
                {section.order}
              </span>
            </div>
          ))}
        </div>

        <div className="flex gap-3 pt-4 border-t">
          <Button onClick={handleSaveTemplate} size="lg" className="flex-1" disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {selectedTemplateId ? "Update Template" : "Save Template"}
          </Button>
          <Button onClick={handleResetTemplate} variant="outline" size="lg">
            Reset to Defaults
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
