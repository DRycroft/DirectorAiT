import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TemplateSectionEditor, TemplateSection } from "@/components/TemplateSectionEditor";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Save } from "lucide-react";
import { toast as sonnerToast } from "sonner";

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
];

const defaultSectionsMap: Record<string, TemplateSection[]> = {
  "Board Papers": [
    { id: "cover-sheet", title: "Cover Sheet", required: true, enabled: true, order: 0, level: 0 },
    { id: "agenda-toc", title: "Agenda / Table of Contents", required: true, enabled: true, order: 1, level: 0 },
    { id: "declarations", title: "Declarations of Interest (Conflicts of Interest)", required: true, enabled: true, order: 2, level: 0 },
    { id: "apologies", title: "Apologies / Attendance", required: true, enabled: true, order: 3, level: 0 },
    { id: "previous-minutes", title: "Minutes of Previous Meeting", required: false, enabled: true, order: 4, level: 0 },
    { id: "matters-arising", title: "Matters Arising / Action Log", required: false, enabled: true, order: 5, level: 0 },
    { id: "chair-report", title: "Chair's Report", required: false, enabled: true, order: 6, level: 0 },
    { id: "ceo-summary", title: "CEO / Managing Director's Executive Summary", required: false, enabled: true, order: 7, level: 0 },
    { id: "strategy-update", title: "Strategy Update / Strategic Projects", required: false, enabled: true, order: 8, level: 0 },
    { id: "business-plan", title: "Business Plan / Objectives & Key Results (OKRs)", required: false, enabled: true, order: 9, level: 0 },
    { id: "operational-kpis", title: "Operational Performance / KPIs", required: false, enabled: true, order: 10, level: 0 },
    { id: "sales-marketing", title: "Sales, Marketing & Customer Metrics", required: false, enabled: true, order: 11, level: 0 },
    { id: "product-dev", title: "Product / Service Development / R&D", required: false, enabled: true, order: 12, level: 0 },
    { id: "major-projects", title: "Major Projects & Programme Status", required: false, enabled: true, order: 13, level: 0 },
    { id: "hse-report", title: "Health, Safety & Environmental (HSE) Report", required: false, enabled: true, order: 14, level: 0 },
    { id: "esg-sustainability", title: "ESG / Sustainability / Corporate Social Responsibility", required: false, enabled: true, order: 15, level: 0 },
    { id: "people-culture", title: "People & Culture / HR Report", required: false, enabled: true, order: 16, level: 0 },
    { id: "remuneration", title: "Remuneration Committee Report", required: false, enabled: true, order: 17, level: 0 },
    { id: "audit-committee", title: "Audit Committee Report", required: false, enabled: true, order: 18, level: 0 },
    { id: "risk-register", title: "Risk Register & Top Risks", required: false, enabled: true, order: 19, level: 0 },
    { id: "compliance", title: "Compliance & Regulatory Update", required: false, enabled: true, order: 20, level: 0 },
    { id: "legal-matters", title: "Legal Matters & Litigation", required: false, enabled: true, order: 21, level: 0 },
    { id: "it-cybersecurity", title: "IT, Cybersecurity & Data Protection", required: false, enabled: true, order: 22, level: 0 },
    { id: "privacy", title: "Privacy / Data Governance", required: false, enabled: true, order: 23, level: 0 },
    { id: "financial-statements", title: "Financial Statements & Notes (Period)", required: false, enabled: true, order: 24, level: 0 },
    { id: "liquidity-cashflow", title: "Liquidity & Cashflow Forecast", required: false, enabled: true, order: 25, level: 0 },
    { id: "financial-commentary", title: "Financial Commentary & Variance Analysis", required: false, enabled: true, order: 26, level: 0 },
    { id: "capex", title: "Capital Expenditure (CapEx) Proposals", required: false, enabled: true, order: 27, level: 0 },
    { id: "contracts", title: "Major Contracts / Procurement & Supplier Issues", required: false, enabled: true, order: 28, level: 0 },
    { id: "related-party", title: "Related Party Transactions", required: false, enabled: true, order: 29, level: 0 },
    { id: "investment", title: "Investment / Financing / Fundraising Update", required: false, enabled: true, order: 30, level: 0 },
    { id: "ma", title: "Mergers, Acquisitions & Divestments (M&A)", required: false, enabled: true, order: 31, level: 0 },
    { id: "internal-audit", title: "Internal Audit / Assurance Reports", required: false, enabled: true, order: 32, level: 0 },
    { id: "external-auditor", title: "External Auditor Communications", required: false, enabled: true, order: 33, level: 0 },
    { id: "board-governance", title: "Board Governance & Board Committee Items", required: false, enabled: true, order: 34, level: 0 },
    { id: "decisions", title: "Board Papers Seeking Decisions / Resolutions", required: false, enabled: true, order: 35, level: 0 },
    { id: "summary-decisions", title: "Summary of Key Decisions & Actions", required: false, enabled: true, order: 36, level: 0 },
    { id: "aob", title: "Any Other Business (AOB)", required: false, enabled: true, order: 37, level: 0 },
    { id: "next-meeting", title: "Date, Time & Location of Next Meeting", required: false, enabled: true, order: 38, level: 0 },
    { id: "appendices", title: "Appendices & Supporting Papers", required: false, enabled: true, order: 39, level: 0 },
    { id: "glossary", title: "Glossary / Definitions / Abbreviations", required: false, enabled: true, order: 40, level: 0 },
  ],
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
};

const Settings = () => {
  const { toast } = useToast();
  const [selectedType, setSelectedType] = useState<string>("");
  const [sections, setSections] = useState<TemplateSection[]>([]);
  const [activeTab, setActiveTab] = useState("company");
  const [companyData, setCompanyData] = useState({
    name: "",
    domain: "",
    logo_url: "",
    business_number: "",
    company_phone: "",
    primary_contact_name: "",
    primary_contact_role: "",
    primary_contact_email: "",
    primary_contact_phone: "",
    admin_name: "",
    admin_role: "",
    admin_email: "",
    admin_phone: "",
    reporting_frequency: "quarterly",
    gst_period: "quarterly",
    financial_year_end: "",
    agm_date: "",
  });

  useEffect(() => {
    fetchCompanyData();
  }, []);

  const fetchCompanyData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("org_id")
        .eq("id", user.id)
        .single();

      if (profile?.org_id) {
        const { data: org } = await supabase
          .from("organizations")
          .select("*")
          .eq("id", profile.org_id)
          .single();

        if (org) {
          setCompanyData({
            name: org.name || "",
            domain: org.domain || "",
            logo_url: org.logo_url || "",
            business_number: org.business_number || "",
            company_phone: org.company_phone || "",
            primary_contact_name: org.primary_contact_name || "",
            primary_contact_role: org.primary_contact_role || "",
            primary_contact_email: org.primary_contact_email || "",
            primary_contact_phone: org.primary_contact_phone || "",
            admin_name: org.admin_name || "",
            admin_role: org.admin_role || "",
            admin_email: org.admin_email || "",
            admin_phone: org.admin_phone || "",
            reporting_frequency: org.reporting_frequency || "quarterly",
            gst_period: org.gst_period || "quarterly",
            financial_year_end: org.financial_year_end || "",
            agm_date: org.agm_date || "",
          });
        }
      }
    } catch (error) {
      console.error("Error fetching company data:", error);
      sonnerToast.error("Failed to load company details");
    }
  };

  const handleSaveCompany = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        sonnerToast.error("You must be logged in to save company details");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("org_id")
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.error("Profile error:", profileError);
        sonnerToast.error("Failed to load your profile");
        return;
      }

      let orgId = profile?.org_id;

      // If no organization exists, create one
      if (!orgId) {
        const { data: newOrg, error: orgError } = await supabase
          .from("organizations")
          .insert([{ name: companyData.name || "My Organization" }])
          .select()
          .single();

        if (orgError) {
          console.error("Error creating organization:", orgError);
          sonnerToast.error("Failed to create organization");
          return;
        }

        orgId = newOrg.id;

        // Link the organization to the user's profile
        const { error: linkError } = await supabase
          .from("profiles")
          .update({ org_id: orgId })
          .eq("id", user.id);

        if (linkError) {
          console.error("Error linking organization:", linkError);
          sonnerToast.error("Failed to link organization to your profile");
          return;
        }
      }

      // Now update the organization with the provided data
      const { error } = await supabase
        .from("organizations")
        .update(companyData)
        .eq("id", orgId);

      if (error) {
        console.error("Update error:", error);
        throw error;
      }
      
      sonnerToast.success("Company details saved successfully!");
      
      // Refresh the data
      await fetchCompanyData();
    } catch (error) {
      console.error("Error updating company data:", error);
      sonnerToast.error("Failed to save company details. Please try again.");
    }
  };

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
      <main className="flex-1 container mx-auto px-4 py-24 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
          <p className="text-muted-foreground">Manage your company details and document templates</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="company">Company Details</TabsTrigger>
            <TabsTrigger value="templates">Document Templates</TabsTrigger>
          </TabsList>

          <TabsContent value="company" className="space-y-4">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle>Company Information</CardTitle>
                <CardDescription>
                  Update your organization's details
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Left Column */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-base font-semibold mb-3">Company Details</h3>
                      <div className="grid gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="companyName">Company Name</Label>
                          <Input 
                            id="companyName" 
                            value={companyData.name}
                            onChange={(e) => setCompanyData({ ...companyData, name: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="businessNumber">GST/TAX Number</Label>
                          <Input 
                            id="businessNumber" 
                            value={companyData.business_number}
                            onChange={(e) => setCompanyData({ ...companyData, business_number: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="domain">Domain</Label>
                          <Input 
                            id="domain" 
                            value={companyData.domain}
                            onChange={(e) => setCompanyData({ ...companyData, domain: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="companyPhone">Phone Number</Label>
                          <Input 
                            id="companyPhone"
                            type="tel"
                            placeholder="+64 21 123 4567"
                            value={companyData.company_phone}
                            onChange={(e) => setCompanyData({ ...companyData, company_phone: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t">
                      <h3 className="text-base font-semibold mb-3">Primary Contact (CEO/Chair)</h3>
                      <div className="grid gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="primaryContactName">Name</Label>
                          <Input 
                            id="primaryContactName" 
                            value={companyData.primary_contact_name}
                            onChange={(e) => setCompanyData({ ...companyData, primary_contact_name: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="primaryContactRole">Role</Label>
                          <Input 
                            id="primaryContactRole" 
                            value={companyData.primary_contact_role}
                            onChange={(e) => setCompanyData({ ...companyData, primary_contact_role: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="primaryContactEmail">Email</Label>
                          <Input 
                            id="primaryContactEmail" 
                            type="email"
                            value={companyData.primary_contact_email}
                            onChange={(e) => setCompanyData({ ...companyData, primary_contact_email: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="primaryContactPhone">Phone</Label>
                          <Input 
                            id="primaryContactPhone" 
                            type="tel"
                            placeholder="+64 21 123 4567"
                            value={companyData.primary_contact_phone}
                            onChange={(e) => setCompanyData({ ...companyData, primary_contact_phone: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-base font-semibold mb-3">Board Reporting</h3>
                      <div className="grid gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="reportingFrequency">Reporting Frequency</Label>
                          <Select
                            value={companyData.reporting_frequency}
                            onValueChange={(value) => setCompanyData({ ...companyData, reporting_frequency: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="monthly">Monthly</SelectItem>
                              <SelectItem value="bi-monthly">Bi-Monthly</SelectItem>
                              <SelectItem value="quarterly">Quarterly</SelectItem>
                              <SelectItem value="biannually">Biannually</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="financialYearEnd">Financial Year End</Label>
                          <Input 
                            id="financialYearEnd" 
                            type="date"
                            value={companyData.financial_year_end}
                            onChange={(e) => setCompanyData({ ...companyData, financial_year_end: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="agmDate">AGM Date</Label>
                          <Input 
                            id="agmDate" 
                            type="date"
                            value={companyData.agm_date}
                            onChange={(e) => setCompanyData({ ...companyData, agm_date: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="gstPeriod">GST Period</Label>
                          <Select
                            value={companyData.gst_period}
                            onValueChange={(value) => setCompanyData({ ...companyData, gst_period: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="monthly">Monthly</SelectItem>
                              <SelectItem value="bi-monthly">Bi-Monthly</SelectItem>
                              <SelectItem value="quarterly">Quarterly</SelectItem>
                              <SelectItem value="six-months">Six Months</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t">
                      <h3 className="text-base font-semibold mb-3">Admin Person</h3>
                      <div className="grid gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="adminName">Name</Label>
                          <Input 
                            id="adminName" 
                            value={companyData.admin_name}
                            onChange={(e) => setCompanyData({ ...companyData, admin_name: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="adminRole">Role</Label>
                          <Input 
                            id="adminRole" 
                            value={companyData.admin_role}
                            onChange={(e) => setCompanyData({ ...companyData, admin_role: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="adminEmail">Email</Label>
                          <Input 
                            id="adminEmail" 
                            type="email"
                            value={companyData.admin_email}
                            onChange={(e) => setCompanyData({ ...companyData, admin_email: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="adminPhone">Phone</Label>
                          <Input 
                            id="adminPhone" 
                            type="tel"
                            placeholder="+64 21 123 4567"
                            value={companyData.admin_phone}
                            onChange={(e) => setCompanyData({ ...companyData, admin_phone: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4 mt-4 border-t">
                  <Button onClick={handleSaveCompany}>
                    <Save className="mr-2 h-4 w-4" />
                    Save Company Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="templates" className="space-y-6">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-1">
                  Document Templates
                </h2>
                <p className="text-muted-foreground">Create and customize document templates for your organization</p>
              </div>
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
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
};

export default Settings;
