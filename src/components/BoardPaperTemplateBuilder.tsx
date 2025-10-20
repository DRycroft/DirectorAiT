import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { GripVertical, Lock } from "lucide-react";
import { toast } from "sonner";

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

  const handleSaveTemplate = () => {
    const enabledSections = sections.filter(s => s.enabled);
    console.log("Saving template with sections:", enabledSections);
    toast.success(`Template saved with ${enabledSections.length} sections`);
  };

  const handleResetTemplate = () => {
    setSections(defaultSections);
    toast.success("Template reset to defaults");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Set Up Board Paper Template</CardTitle>
        <CardDescription>
          Customize your board paper sections. Required sections cannot be removed. Drag to reorder.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
          {sections.map((section) => (
            <div
              key={section.id}
              draggable={!section.required}
              onDragStart={() => handleDragStart(section.id)}
              onDragOver={(e) => handleDragOver(e, section.id)}
              onDragEnd={handleDragEnd}
              className={`flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors ${
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
          <Button onClick={handleSaveTemplate} className="flex-1">
            Save Template
          </Button>
          <Button onClick={handleResetTemplate} variant="outline">
            Reset to Defaults
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
