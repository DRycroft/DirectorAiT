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

const defaultSectionsMap: Record<string, TemplateSection[]> = {
  "Chair Report": [
    { id: "exec-summary", title: "Chair's Executive Summary", required: false, enabled: true, order: 0, level: 0 },
    { id: "governance", title: "Governance Items", required: false, enabled: true, order: 1, level: 0 },
    { id: "board-performance", title: "Board Performance / Effectiveness", required: false, enabled: true, order: 2, level: 0 },
    { id: "key-issues", title: "Key Issues Referred to the Board", required: false, enabled: true, order: 3, level: 0 },
    { id: "stakeholder", title: "Stakeholder & External Relations", required: false, enabled: true, order: 4, level: 0 },
    { id: "calendar", title: "Board Calendar & Forthcoming Business", required: false, enabled: true, order: 5, level: 0 },
    { id: "decisions", title: "Matters for Decision", required: false, enabled: true, order: 6, level: 0 },
    { id: "noting", title: "Matters for Noting", required: false, enabled: true, order: 7, level: 0 },
    { id: "conflicts", title: "Conflicts / Declarations", required: false, enabled: true, order: 8, level: 0 },
    { id: "appendices", title: "Appendices", required: false, enabled: true, order: 9, level: 0 },
  ],
  "CEO Report": [
    { id: "exec-summary", title: "Executive Summary", required: false, enabled: true, order: 0, level: 0 },
    { id: "strategic-progress", title: "Strategic Progress", required: false, enabled: true, order: 1, level: 0 },
    { id: "operations", title: "Operational Performance Snapshot", required: false, enabled: true, order: 2, level: 0 },
    { id: "financial", title: "Financial Overview", required: false, enabled: true, order: 3, level: 0 },
    { id: "sales-customer", title: "Sales & Customer Update", required: false, enabled: true, order: 4, level: 0 },
    { id: "people-culture", title: "People & Culture", required: false, enabled: true, order: 5, level: 0 },
    { id: "projects", title: "Major Projects & Deliverables", required: false, enabled: true, order: 6, level: 0 },
    { id: "risk-compliance", title: "Risk & Compliance Highlights", required: false, enabled: true, order: 7, level: 0 },
    { id: "decisions-approvals", title: "Key Decisions / Approvals Requested", required: false, enabled: true, order: 8, level: 0 },
    { id: "next-steps", title: "Next Steps / Ask of the Board", required: false, enabled: true, order: 9, level: 0 },
    { id: "appendices", title: "Appendices", required: false, enabled: true, order: 10, level: 0 },
  ],
  "CFO Report": [
    { id: "exec-summary", title: "Executive Summary", required: false, enabled: true, order: 0, level: 0 },
    { id: "management-accounts", title: "Management Accounts", required: false, enabled: true, order: 1, level: 0 },
    { id: "variance", title: "Variance Analysis", required: false, enabled: true, order: 2, level: 0 },
    { id: "cash-liquidity", title: "Cash & Liquidity", required: false, enabled: true, order: 3, level: 0 },
    { id: "forecast", title: "Forecast & Sensitivity", required: false, enabled: true, order: 4, level: 0 },
    { id: "capex", title: "Capital Expenditure", required: false, enabled: true, order: 5, level: 0 },
    { id: "treasury", title: "Treasury & Banking", required: false, enabled: true, order: 6, level: 0 },
    { id: "tax-regulatory", title: "Tax, VAT & Regulatory Filings", required: false, enabled: true, order: 7, level: 0 },
    { id: "cost-control", title: "Cost Control & Efficiency Initiatives", required: false, enabled: true, order: 8, level: 0 },
    { id: "funding", title: "Funding / Financing / Investor Updates", required: false, enabled: true, order: 9, level: 0 },
    { id: "recommendations", title: "Recommendations / Board Approvals Required", required: false, enabled: true, order: 10, level: 0 },
    { id: "appendices", title: "Appendices", required: false, enabled: true, order: 11, level: 0 },
  ],
  "Finance Report": [
    { id: "snapshot", title: "Snapshot / Headline Metrics", required: false, enabled: true, order: 0, level: 0 },
    { id: "pl", title: "P&L", required: false, enabled: true, order: 1, level: 0 },
    { id: "balance-sheet", title: "Balance Sheet summary", required: false, enabled: true, order: 2, level: 0 },
    { id: "cashflow", title: "Cashflow Statement & Forecast", required: false, enabled: true, order: 3, level: 0 },
    { id: "aging", title: "A/R & A/P Aging, Collections & Liquidity Issues", required: false, enabled: true, order: 4, level: 0 },
    { id: "budget-actual", title: "Budget vs Actual", required: false, enabled: true, order: 5, level: 0 },
    { id: "capex-tracker", title: "Capex Tracker & Approvals Pending", required: false, enabled: true, order: 6, level: 0 },
    { id: "controls", title: "Internal Controls / Audit Findings", required: false, enabled: true, order: 7, level: 0 },
    { id: "risks", title: "Risks & Mitigations", required: false, enabled: true, order: 8, level: 0 },
    { id: "actions", title: "Action Items & Approvals Required", required: false, enabled: true, order: 9, level: 0 },
    { id: "appendices", title: "Appendices", required: false, enabled: true, order: 10, level: 0 },
  ],
  "OSH Report": [
    { id: "safety-summary", title: "Safety Executive Summary", required: false, enabled: true, order: 0, level: 0 },
    { id: "incidents", title: "Incidents & Near Misses", required: false, enabled: true, order: 1, level: 0 },
    { id: "investigations", title: "Investigations & Corrective Actions", required: false, enabled: true, order: 2, level: 0 },
    { id: "audits", title: "Safety Audits & Inspections", required: false, enabled: true, order: 3, level: 0 },
    { id: "regulatory", title: "Regulatory Notifications / Enforcement Activity", required: false, enabled: true, order: 4, level: 0 },
    { id: "training", title: "Training, Competency & Toolbox Talks", required: false, enabled: true, order: 5, level: 0 },
    { id: "risk-assessment", title: "Risk Assessment Updates", required: false, enabled: true, order: 6, level: 0 },
    { id: "health-wellbeing", title: "Health & Wellbeing Programs", required: false, enabled: true, order: 7, level: 0 },
    { id: "environmental", title: "Environmental Incidents / Sustainability KPIs", required: false, enabled: true, order: 8, level: 0 },
    { id: "improvement", title: "Improvement Plan & Resources Required", required: false, enabled: true, order: 9, level: 0 },
    { id: "appendices", title: "Appendices", required: false, enabled: true, order: 10, level: 0 },
  ],
  "S&M Report": [
    { id: "exec-summary", title: "Executive Summary", required: false, enabled: true, order: 0, level: 0 },
    { id: "sales-performance", title: "Sales Performance", required: false, enabled: true, order: 1, level: 0 },
    { id: "pipeline", title: "Sales Pipeline & Forecast", required: false, enabled: true, order: 2, level: 0 },
    { id: "key-accounts", title: "Key Account Updates & Strategic Deals", required: false, enabled: true, order: 3, level: 0 },
    { id: "marketing", title: "Marketing Performance", required: false, enabled: true, order: 4, level: 0 },
    { id: "customer-metrics", title: "Customer Metrics", required: false, enabled: true, order: 5, level: 0 },
    { id: "pricing", title: "Product / Pricing Changes & Promotions", required: false, enabled: true, order: 6, level: 0 },
    { id: "competitor", title: "Competitor & Market Intelligence", required: false, enabled: true, order: 7, level: 0 },
    { id: "risks", title: "Risks & Mitigation", required: false, enabled: true, order: 8, level: 0 },
    { id: "actions", title: "Actions / Approvals Required", required: false, enabled: true, order: 9, level: 0 },
    { id: "appendices", title: "Appendices", required: false, enabled: true, order: 10, level: 0 },
  ],
  "HR Report": [
    { id: "exec-summary", title: "Executive Summary", required: false, enabled: true, order: 0, level: 0 },
    { id: "headcount", title: "Headcount & Org Chart", required: false, enabled: true, order: 1, level: 0 },
    { id: "recruitment", title: "Recruitment & Onboarding", required: false, enabled: true, order: 2, level: 0 },
    { id: "attrition", title: "Attrition & Retention Metrics", required: false, enabled: true, order: 3, level: 0 },
    { id: "remuneration", title: "Remuneration & Benefits", required: false, enabled: true, order: 4, level: 0 },
    { id: "performance", title: "Performance Management & Talent Reviews", required: false, enabled: true, order: 5, level: 0 },
    { id: "learning", title: "Learning & Development", required: false, enabled: true, order: 6, level: 0 },
    { id: "wellbeing", title: "Health & Wellbeing", required: false, enabled: true, order: 7, level: 0 },
    { id: "dei", title: "Diversity, Equity & Inclusion", required: false, enabled: true, order: 8, level: 0 },
    { id: "succession", title: "Succession Planning & Critical Roles", required: false, enabled: true, order: 9, level: 0 },
    { id: "compliance", title: "HR Compliance / Employment Litigations", required: false, enabled: true, order: 10, level: 0 },
    { id: "approvals", title: "Requests for Approval", required: false, enabled: true, order: 11, level: 0 },
    { id: "appendices", title: "Appendices", required: false, enabled: true, order: 12, level: 0 },
  ],
  "KPIs Report": [
    { id: "snapshot", title: "KPI Executive Snapshot", required: false, enabled: true, order: 0, level: 0 },
    { id: "financial-kpis", title: "Financial KPIs", required: false, enabled: true, order: 1, level: 0 },
    { id: "customer-kpis", title: "Customer KPIs", required: false, enabled: true, order: 2, level: 0 },
    { id: "operational-kpis", title: "Operational KPIs", required: false, enabled: true, order: 3, level: 0 },
    { id: "people-kpis", title: "People KPIs", required: false, enabled: true, order: 4, level: 0 },
    { id: "project-kpis", title: "Project KPIs", required: false, enabled: true, order: 5, level: 0 },
    { id: "trend-analysis", title: "Trend Analysis", required: false, enabled: true, order: 6, level: 0 },
    { id: "targets", title: "Targets & Forecasts", required: false, enabled: true, order: 7, level: 0 },
    { id: "data-quality", title: "Data Quality / Source Notes", required: false, enabled: true, order: 8, level: 0 },
    { id: "changes", title: "Proposed KPI changes", required: false, enabled: true, order: 9, level: 0 },
    { id: "appendices", title: "Appendices", required: false, enabled: true, order: 10, level: 0 },
  ],
  "One-Off Report": [
    { id: "purpose", title: "Purpose & Executive Summary", required: false, enabled: true, order: 0, level: 0 },
    { id: "background", title: "Background / Context", required: false, enabled: true, order: 1, level: 0 },
    { id: "analysis", title: "Detailed Analysis", required: false, enabled: true, order: 2, level: 0 },
    { id: "financial", title: "Financial Implications", required: false, enabled: true, order: 3, level: 0 },
    { id: "legal", title: "Legal / Regulatory Considerations", required: false, enabled: true, order: 4, level: 0 },
    { id: "operational", title: "Operational Impact", required: false, enabled: true, order: 5, level: 0 },
    { id: "risk", title: "Risk Assessment", required: false, enabled: true, order: 6, level: 0 },
    { id: "recommendation", title: "Recommendation", required: false, enabled: true, order: 7, level: 0 },
    { id: "implementation", title: "Implementation Plan & Next Steps", required: false, enabled: true, order: 8, level: 0 },
    { id: "consultation", title: "Consultation Summary", required: false, enabled: true, order: 9, level: 0 },
    { id: "appendices", title: "Appendices", required: false, enabled: true, order: 10, level: 0 },
  ],
  "Minutes": [
    { id: "meeting-header", title: "Meeting Header", required: false, enabled: true, order: 0, level: 0 },
    { id: "attendance", title: "Attendance", required: false, enabled: true, order: 1, level: 0 },
    { id: "declarations", title: "Declarations of Interest", required: false, enabled: true, order: 2, level: 0 },
    { id: "previous-minutes", title: "Approval of Previous Minutes", required: false, enabled: true, order: 3, level: 0 },
    { id: "matters-arising", title: "Matters Arising", required: false, enabled: true, order: 4, level: 0 },
    { id: "chair-remarks", title: "Chair's Remarks", required: false, enabled: true, order: 5, level: 0 },
    { id: "reports-received", title: "Reports Received", required: false, enabled: true, order: 6, level: 0 },
    { id: "items-discussed", title: "Items Discussed", required: false, enabled: true, order: 7, level: 0 },
    { id: "decisions", title: "Decisions / Resolutions", required: false, enabled: true, order: 8, level: 0 },
    { id: "action-items", title: "Action Items", required: false, enabled: true, order: 9, level: 0 },
    { id: "confidential", title: "Confidential Items", required: false, enabled: true, order: 10, level: 0 },
    { id: "next-meeting", title: "Date of Next Meeting & Close", required: false, enabled: true, order: 11, level: 0 },
    { id: "appendices", title: "Appendices", required: false, enabled: true, order: 12, level: 0 },
  ],
  "Special Papers": [
    { id: "purpose", title: "Purpose & Scope", required: false, enabled: true, order: 0, level: 0 },
    { id: "exec-summary", title: "Executive Summary", required: false, enabled: true, order: 1, level: 0 },
    { id: "background", title: "Background / Context", required: false, enabled: true, order: 2, level: 0 },
    { id: "findings", title: "Detailed Findings / Evidence", required: false, enabled: true, order: 3, level: 0 },
    { id: "stakeholder", title: "Stakeholder Impact / Consultation Summary", required: false, enabled: true, order: 4, level: 0 },
    { id: "legal", title: "Legal & Regulatory Implications", required: false, enabled: true, order: 5, level: 0 },
    { id: "financial", title: "Financial & Operational Impacts", required: false, enabled: true, order: 6, level: 0 },
    { id: "risk", title: "Risk & Sensitivity Analysis", required: false, enabled: true, order: 7, level: 0 },
    { id: "resolution", title: "Recommended Resolution(s) & Alternatives", required: false, enabled: true, order: 8, level: 0 },
    { id: "implementation", title: "Implementation Considerations", required: false, enabled: true, order: 9, level: 0 },
    { id: "appendices", title: "Appendices", required: false, enabled: true, order: 10, level: 0 },
  ],
  "Financial Updates": [
    { id: "snapshot", title: "Quick Snapshot", required: false, enabled: true, order: 0, level: 0 },
    { id: "movements", title: "Material Movements since last update", required: false, enabled: true, order: 1, level: 0 },
    { id: "cash-liquidity", title: "Cash & Liquidity", required: false, enabled: true, order: 2, level: 0 },
    { id: "variances", title: "Major Variances & Drivers", required: false, enabled: true, order: 3, level: 0 },
    { id: "forecast", title: "Forecast Update", required: false, enabled: true, order: 4, level: 0 },
    { id: "covenant", title: "Covenant / Funders Status", required: false, enabled: true, order: 5, level: 0 },
    { id: "cash-calls", title: "Upcoming Cash Calls / Payments", required: false, enabled: true, order: 6, level: 0 },
    { id: "mitigations", title: "Mitigations / Actions Taken", required: false, enabled: true, order: 7, level: 0 },
    { id: "ask", title: "Ask of the Board", required: false, enabled: true, order: 8, level: 0 },
    { id: "appendix", title: "Appendix", required: false, enabled: true, order: 9, level: 0 },
  ],
};

const Templates = () => {
  const { toast } = useToast();
  const [selectedType, setSelectedType] = useState<string>("");
  const [sections, setSections] = useState<TemplateSection[]>([]);

  const handleTemplateTypeChange = (type: string) => {
    setSelectedType(type);
    setSections(defaultSectionsMap[type] || []);
  };

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
    setSections([]);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      <main className="flex-1 container mx-auto px-4 py-24 max-w-4xl">
        <div className="mb-8">
          <div className="flex items-center justify-between gap-4 mb-6">
            <h1 className="text-3xl font-bold text-foreground">
              Document Templates - Create A New Document
            </h1>
            <Select value={selectedType} onValueChange={handleTemplateTypeChange}>
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
