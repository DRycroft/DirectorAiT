import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { TemplateSectionEditor, TemplateSection } from "@/components/TemplateSectionEditor";
import { StaffFormTemplateEditor, FormField } from "@/components/StaffFormTemplateEditor";
import { MembersList } from "@/components/settings/MembersList";
import { AddPersonDialog } from "@/components/AddPersonDialog";
import RoleManagement from "@/components/settings/RoleManagement";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Save, Users, Briefcase, UserCog, Building2, Clock, AlertCircle, CheckCircle, Plus, X, Shield } from "lucide-react";
import { toast as sonnerToast } from "sonner";
import BoardManagement from "@/components/settings/BoardManagement";
import { BOARD_POSITIONS, EXECUTIVE_POSITIONS, KEY_STAFF_POSITIONS } from "@/config/positions";
import { Combobox } from "@/components/ui/combobox";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

// Industry to business category mapping
const industryCategories: Record<string, string[]> = {
  "Food & Beverage": [
    "Restaurant", "Cafe", "Bar/Pub", "Fast Food", "Catering Service", "Food Truck",
    "Bakery", "Food Manufacturing", "Brewery/Winery", "Food Retail"
  ],
  "Retail": [
    "General Retail", "Supermarket/Grocery", "Specialty Store", "Online Retail",
    "Wholesale", "Fashion Retail", "Electronics Retail", "Furniture Retail"
  ],
  "Healthcare": [
    "Medical Practice", "Dental Practice", "Pharmacy", "Hospital/Clinic",
    "Aged Care Facility", "Medical Laboratory", "Allied Health Services", "Mental Health Services"
  ],
  "Technology": [
    "Software Development", "IT Services", "Telecommunications", "Data Services",
    "Cybersecurity", "Cloud Services", "Hardware/Electronics", "Tech Consulting"
  ],
  "Professional Services": [
    "Accounting/Bookkeeping", "Legal Services", "Consulting", "Marketing/Advertising",
    "Architecture", "Engineering", "Real Estate", "Financial Services"
  ],
  "Construction & Trades": [
    "Building Construction", "Civil Construction", "Electrical Services", "Plumbing",
    "Carpentry", "Painting", "Landscaping", "Renovation/Maintenance"
  ],
  "Manufacturing": [
    "Light Manufacturing", "Heavy Manufacturing", "Food Processing", "Textiles/Clothing",
    "Metal Fabrication", "Chemical Manufacturing", "Pharmaceutical Manufacturing"
  ],
  "Education & Training": [
    "Primary/Secondary School", "Tertiary Education", "Early Childhood Education",
    "Training Provider", "Private Tutoring", "Online Education"
  ],
  "Transportation & Logistics": [
    "Freight/Courier", "Passenger Transport", "Warehousing", "Logistics Services",
    "Moving Services", "Vehicle Rental"
  ],
  "Hospitality & Tourism": [
    "Hotel/Motel", "Holiday Park", "Tourist Attraction", "Travel Agency",
    "Event Management", "Tour Operator"
  ],
  "Agriculture & Primary Industries": [
    "Dairy Farming", "Sheep/Beef Farming", "Horticulture", "Viticulture",
    "Forestry", "Fishing/Aquaculture", "Agricultural Services"
  ],
  "Personal Services": [
    "Hair/Beauty Salon", "Fitness/Gym", "Spa/Wellness", "Cleaning Services",
    "Childcare", "Pet Services", "Funeral Services"
  ],
  "Creative & Media": [
    "Graphic Design", "Photography", "Video Production", "Printing",
    "Publishing", "Advertising Agency", "Arts & Entertainment"
  ],
  "Other": [
    "Charitable Organization", "Community Services", "Religious Organization",
    "Sports Club", "Other Services", "Other Manufacturing", "Other Retail"
  ]
};

const Settings = () => {
  const { toast } = useToast();
  const [selectedType, setSelectedType] = useState<string>("");
  const [sections, setSections] = useState<TemplateSection[]>([]);
  const [selectedStaffFormType, setSelectedStaffFormType] = useState<string>("");
  const [staffFormFields, setStaffFormFields] = useState<any[]>([]);
  const [loadingStaffForm, setLoadingStaffForm] = useState(false);
  const [selectedBoard, setSelectedBoard] = useState<string>("");
  const [boards, setBoards] = useState<any[]>([]);
  const [refreshMembers, setRefreshMembers] = useState(0);
  const [organizationName, setOrganizationName] = useState("");
  const [activeTab, setActiveTab] = useState("company");
  const [businessDescription, setBusinessDescription] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<{
    recommended_industry: string;
    recommended_categories: string[];
    all_categories: string[];
    alternative_industries: string[];
    reasoning: string;
  } | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [pendingTemplateChange, setPendingTemplateChange] = useState<{type: 'board' | 'staff', value: string} | null>(null);
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
    industry_sector: [] as string[],
    business_category: [] as string[],
    compliance_scan_completed: false,
  });
  const [countryCode, setCountryCode] = useState("+64");

  const countryCodes = [
    { code: "+64", country: "New Zealand" },
    { code: "+61", country: "Australia" },
    { code: "+1", country: "USA/Canada" },
    { code: "+44", country: "United Kingdom" },
    { code: "+91", country: "India" },
    { code: "+86", country: "China" },
    { code: "+81", country: "Japan" },
    { code: "+49", country: "Germany" },
    { code: "+33", country: "France" },
  ];

  // Helper function to strip country code from phone number
  const stripCountryCode = (phoneNumber: string): string => {
    if (!phoneNumber) return "";
    // Remove any country code prefix (e.g., "+64 ", "+64")
    const stripped = phoneNumber.replace(/^\+\d{1,4}\s*/, "").trim();
    return stripped;
  };

  // Helper function to detect country code from phone number
  const detectCountryCode = (phoneNumber: string): string => {
    if (!phoneNumber) return "+64";
    const match = phoneNumber.match(/^(\+\d{1,4})/);
    return match ? match[1] : "+64";
  };

  // Phone validation based on country code
  const validatePhoneNumber = (phoneNumber: string, countryCode: string): { valid: boolean; message: string } => {
    if (!phoneNumber || !phoneNumber.trim()) {
      return { valid: true, message: "" }; // Empty is valid (optional field)
    }

    const cleanNumber = phoneNumber.replace(/[\s\-()]/g, "");
    
    // Validation rules by country code
    const validationRules: Record<string, { pattern: RegExp; message: string }> = {
      "+64": { // New Zealand
        pattern: /^[2-9]\d{6,7}$/,
        message: "NZ numbers should be 7-8 digits (mobile: typically starts with 2, 7)"
      },
      "+61": { // Australia
        pattern: /^[2-9]\d{8}$/,
        message: "AU numbers should be 9 digits"
      },
      "+1": { // US/Canada
        pattern: /^[2-9]\d{9}$/,
        message: "US/CA numbers should be 10 digits"
      },
      "+44": { // UK
        pattern: /^[1-9]\d{9}$/,
        message: "UK numbers should be 10 digits"
      },
      "+33": { // France
        pattern: /^[1-9]\d{8}$/,
        message: "FR numbers should be 9 digits"
      },
    };

    const rule = validationRules[countryCode];
    if (!rule) {
      // For unknown country codes, just check it's numeric and reasonable length
      if (!/^\d{7,15}$/.test(cleanNumber)) {
        return { valid: false, message: "Phone number should be 7-15 digits" };
      }
      return { valid: true, message: "" };
    }

    if (!rule.pattern.test(cleanNumber)) {
      return { valid: false, message: rule.message };
    }

    return { valid: true, message: "" };
  };

  const [phoneErrors, setPhoneErrors] = useState({
    company_phone: "",
    primary_contact_phone: "",
    admin_phone: "",
  });

  useEffect(() => {
    fetchCompanyData();
    fetchBoards();
  }, []);

  const fetchBoards = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("org_id")
        .eq("id", user.id)
        .single();

      if (!profile?.org_id) return;

      const { data: org } = await supabase
        .from("organizations")
        .select("name")
        .eq("id", profile.org_id)
        .single();

      setOrganizationName(org?.name || "");

      const { data: boardsData } = await supabase
        .from("boards")
        .select("*")
        .eq("org_id", profile.org_id)
        .order("title");

      setBoards(boardsData || []);
      if (boardsData && boardsData.length > 0) {
        setSelectedBoard(boardsData[0].id);
      }
    } catch (error) {
      console.error("Error fetching boards:", error);
    }
  };

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
          // Detect country code from any phone number that has one
          const detectedCode = detectCountryCode(org.company_phone || org.primary_contact_phone || org.admin_phone || "");
          setCountryCode(detectedCode);

          setCompanyData({
            name: org.name || "",
            domain: org.domain || "",
            logo_url: org.logo_url || "",
            business_number: org.business_number || "",
            company_phone: stripCountryCode(org.company_phone || ""),
            primary_contact_name: org.primary_contact_name || "",
            primary_contact_role: org.primary_contact_role || "",
            primary_contact_email: org.primary_contact_email || "",
            primary_contact_phone: stripCountryCode(org.primary_contact_phone || ""),
            admin_name: org.admin_name || "",
            admin_role: org.admin_role || "",
            admin_email: org.admin_email || "",
            admin_phone: stripCountryCode(org.admin_phone || ""),
            reporting_frequency: org.reporting_frequency || "quarterly",
            gst_period: org.gst_period || "quarterly",
            financial_year_end: org.financial_year_end || "",
            agm_date: org.agm_date || "",
            industry_sector: org.industry_sector || [],
            business_category: org.business_category || [],
            compliance_scan_completed: org.compliance_scan_completed || false,
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

      // Validate phone numbers before saving
      const companyPhoneValidation = validatePhoneNumber(companyData.company_phone || "", countryCode);
      const primaryPhoneValidation = validatePhoneNumber(companyData.primary_contact_phone || "", countryCode);
      const adminPhoneValidation = validatePhoneNumber(companyData.admin_phone || "", countryCode);

      const newPhoneErrors = {
        company_phone: companyPhoneValidation.message,
        primary_contact_phone: primaryPhoneValidation.message,
        admin_phone: adminPhoneValidation.message,
      };

      setPhoneErrors(newPhoneErrors);

      // Don't save if there are validation errors
      if (!companyPhoneValidation.valid || !primaryPhoneValidation.valid || !adminPhoneValidation.valid) {
        toast({
          title: "Validation Error",
          description: "Please fix phone number formatting errors before saving",
          variant: "destructive",
        });
        return;
      }

      // Format phone numbers with country code - only add if there's a number
      const formattedData = {
        ...companyData,
        company_phone: companyData.company_phone?.trim() ? `${countryCode} ${companyData.company_phone.trim()}` : "",
        primary_contact_phone: companyData.primary_contact_phone?.trim() ? `${countryCode} ${companyData.primary_contact_phone.trim()}` : "",
        admin_phone: companyData.admin_phone?.trim() ? `${countryCode} ${companyData.admin_phone.trim()}` : "",
      };

      // Now update the organization with the provided data
      const { error } = await supabase
        .from("organizations")
        .update(formattedData)
        .eq("id", orgId);

      if (error) {
        console.error("Update error:", error);
        throw error;
      }
      
      // Check if industry/business category changed - trigger compliance scan
      const previousIndustrySector = companyData.industry_sector;
      const previousBusinessCategory = companyData.business_category;
      const industryChanged = JSON.stringify(previousIndustrySector) !== JSON.stringify(formattedData.industry_sector) || 
                              JSON.stringify(previousBusinessCategory) !== JSON.stringify(formattedData.business_category);
      
      sonnerToast.success("Company details saved successfully!");
      
      // Clear AI suggestions after save
      setAiSuggestions(null);
      setBusinessDescription("");
      
      // Refresh the data
      await fetchCompanyData();
      
      // If industry changed and we have at least one sector and category, trigger compliance scan
      if (industryChanged && formattedData.industry_sector && formattedData.industry_sector.length > 0 && 
          formattedData.business_category && formattedData.business_category.length > 0) {
        sonnerToast.info("Scanning compliance requirements for your industries...");
        try {
          const { data: scanData, error: scanError } = await supabase.functions.invoke("scan-compliance", {
            body: { org_id: orgId }
          });
          
          if (scanError) throw scanError;
          
          sonnerToast.success(`Found ${scanData.mandatory_count} mandatory and ${scanData.optional_count} optional compliance requirements across your industries!`);
          fetchComplianceItems(); // Fetch the new items
        } catch (scanError: any) {
          console.error("Error scanning compliance:", scanError);
          sonnerToast.error("Failed to scan compliance requirements. You can manually scan from the Compliance page.");
        }
      }
    } catch (error) {
      console.error("Error updating company data:", error);
      sonnerToast.error("Failed to save company details. Please try again.");
    }
  };

  const [complianceItems, setComplianceItems] = useState<any[]>([]);
  const [loadingCompliance, setLoadingCompliance] = useState(false);
  
  const fetchComplianceItems = async () => {
    setLoadingCompliance(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("org_id")
        .eq("id", user.id)
        .single();

      if (profile?.org_id) {
        const { data: items } = await supabase
          .from("compliance_items")
          .select("*")
          .eq("org_id", profile.org_id)
          .order("notes", { ascending: false }); // Mandatory items first
        
        setComplianceItems(items || []);
      }
    } catch (error) {
      console.error("Error fetching compliance items:", error);
    } finally {
      setLoadingCompliance(false);
    }
  };
  
  useEffect(() => {
    if (companyData.industry_sector.length > 0 && companyData.compliance_scan_completed) {
      fetchComplianceItems();
    }
  }, [companyData.industry_sector, companyData.compliance_scan_completed]);
  
  const handleToggleCompliance = async (itemId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("compliance_items")
        .update({ is_active: !currentStatus })
        .eq("id", itemId);
      
      if (error) throw error;
      
      sonnerToast.success("Compliance item updated");
      fetchComplianceItems();
    } catch (error: any) {
      console.error("Error toggling compliance:", error);
      sonnerToast.error("Failed to update compliance item");
    }
  };

  const handleAnalyzeBusiness = async () => {
    if (!businessDescription.trim()) {
      toast({
        title: "Description required",
        description: "Please describe what your business does",
        variant: "destructive",
      });
      return;
    }

    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-business", {
        body: { description: businessDescription }
      });

      if (error) throw error;

      if (data.success) {
        setAiSuggestions(data);
        // Auto-populate the fields with recommendations - include all suggested industries
        const allSuggestedIndustries = [
          data.recommended_industry,
          ...(data.alternative_industries || [])
        ].filter(Boolean);
        
        setCompanyData({
          ...companyData,
          industry_sector: allSuggestedIndustries,
          business_category: data.recommended_categories || []
        });
        toast({
          title: "Analysis complete!",
          description: data.reasoning,
        });
      }
    } catch (error: any) {
      console.error("Error analyzing business:", error);
      toast({
        title: "Analysis failed",
        description: error.message || "Failed to analyze business description",
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleTemplateTypeChange = (type: string) => {
    if (hasUnsavedChanges) {
      setPendingTemplateChange({ type: 'board', value: type });
      setShowCloseDialog(true);
      return;
    }
    
    // Close staff form if it's open
    setSelectedStaffFormType("");
    setStaffFormFields([]);
    
    setSelectedType(type);
    setSections(defaultSectionsMap[type] || []);
    setHasUnsavedChanges(false);
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
    setHasUnsavedChanges(false);
  };

  const handleStaffFormTypeChange = async (type: string) => {
    if (hasUnsavedChanges) {
      setPendingTemplateChange({ type: 'staff', value: type });
      setShowCloseDialog(true);
      return;
    }
    
    // Close board paper template if it's open
    setSelectedType("");
    setSections([]);
    
    setSelectedStaffFormType(type);
    setLoadingStaffForm(true);
    setHasUnsavedChanges(false);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("org_id")
        .eq("id", user.id)
        .single();

      if (!profile?.org_id) return;

      // Try to fetch existing template
      const { data: existingTemplate } = await supabase
        .from("staff_form_templates")
        .select("*")
        .eq("org_id", profile.org_id)
        .eq("form_type", type)
        .single();

      if (existingTemplate) {
        setStaffFormFields(existingTemplate.fields as unknown as FormField[]);
      } else {
        // Create default template if it doesn't exist
        const { data, error } = await supabase.rpc("create_default_staff_form_templates", {
          p_org_id: profile.org_id
        });

        if (error) {
          console.error("Error creating default templates:", error);
          sonnerToast.error("Failed to load form template");
          return;
        }

        // Fetch the newly created template
        const { data: newTemplate } = await supabase
          .from("staff_form_templates")
          .select("*")
          .eq("org_id", profile.org_id)
          .eq("form_type", type)
          .single();

        if (newTemplate) {
          setStaffFormFields(newTemplate.fields as unknown as FormField[]);
        }
      }
    } catch (error) {
      console.error("Error loading staff form template:", error);
      sonnerToast.error("Failed to load form template");
    } finally {
      setLoadingStaffForm(false);
    }
  };

  const handleSaveStaffFormTemplate = async () => {
    if (!selectedStaffFormType) {
      toast({
        title: "Form type required",
        description: "Please select a form type",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("org_id")
        .eq("id", user.id)
        .single();

      if (!profile?.org_id) return;

      const { error } = await supabase
        .from("staff_form_templates")
        .update({ fields: staffFormFields })
        .eq("org_id", profile.org_id)
        .eq("form_type", selectedStaffFormType);

      if (error) throw error;

      sonnerToast.success("Form template saved successfully!");
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error("Error saving staff form template:", error);
      sonnerToast.error("Failed to save form template");
    }
  };

  const handleCloseTemplate = () => {
    if (hasUnsavedChanges) {
      setShowCloseDialog(true);
    } else {
      closeCurrentTemplate();
    }
  };

  const closeCurrentTemplate = () => {
    setSelectedType("");
    setSections([]);
    setSelectedStaffFormType("");
    setStaffFormFields([]);
    setHasUnsavedChanges(false);
    setShowCloseDialog(false);
    setPendingTemplateChange(null);
  };

  const handleSaveAndClose = async () => {
    if (selectedType) {
      await handleSaveTemplate();
    } else if (selectedStaffFormType) {
      await handleSaveStaffFormTemplate();
    }
    closeCurrentTemplate();
  };

  const handleDiscardAndClose = () => {
    if (pendingTemplateChange) {
      // User wants to switch templates
      const { type, value } = pendingTemplateChange;
      setHasUnsavedChanges(false);
      setPendingTemplateChange(null);
      setShowCloseDialog(false);
      
      if (type === 'board') {
        setSelectedStaffFormType("");
        setStaffFormFields([]);
        setSelectedType(value);
        setSections(defaultSectionsMap[value] || []);
      } else {
        setSelectedType("");
        setSections([]);
        handleStaffFormTypeChange(value);
      }
    } else {
      // User just wants to close
      closeCurrentTemplate();
    }
  };

  const handleSectionsChange = (newSections: TemplateSection[]) => {
    setSections(newSections);
    setHasUnsavedChanges(true);
  };

  const handleFieldsChange = (newFields: FormField[]) => {
    setStaffFormFields(newFields);
    setHasUnsavedChanges(true);
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
          <TabsList className="grid w-full grid-cols-5 mb-8">
            <TabsTrigger value="company">Company Details</TabsTrigger>
            <TabsTrigger value="board">
              <Users className="mr-2 h-4 w-4" />
              Board Members
            </TabsTrigger>
            <TabsTrigger value="executive">
              <Briefcase className="mr-2 h-4 w-4" />
              Executive Team
            </TabsTrigger>
            <TabsTrigger value="key-staff">
              <UserCog className="mr-2 h-4 w-4" />
              Key Staff
            </TabsTrigger>
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
                          <Label htmlFor="companyPhone">Country / Phone Number</Label>
                          <div className="space-y-1">
                            <div className="flex gap-2">
                              <Select value={countryCode} onValueChange={setCountryCode}>
                                <SelectTrigger className="w-[100px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {countryCodes.map((item) => (
                                    <SelectItem key={item.code} value={item.code}>
                                      {item.code}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Input 
                                id="companyPhone"
                                type="tel"
                                placeholder="21 123 4567"
                                value={companyData.company_phone}
                                onChange={(e) => {
                                  setCompanyData({ ...companyData, company_phone: e.target.value });
                                  const validation = validatePhoneNumber(e.target.value, countryCode);
                                  setPhoneErrors({ ...phoneErrors, company_phone: validation.message });
                                }}
                                className={`flex-1 ${phoneErrors.company_phone ? "border-destructive" : ""}`}
                              />
                            </div>
                            {phoneErrors.company_phone && (
                              <p className="text-xs text-destructive">{phoneErrors.company_phone}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-6 mt-4 border-t">
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
                          <div className="space-y-1">
                            <div className="flex gap-2">
                              <Input 
                                value={countryCode}
                                disabled
                                className="w-20"
                              />
                              <Input 
                                id="primaryContactPhone" 
                                type="tel"
                                placeholder="21 123 4567"
                                value={companyData.primary_contact_phone}
                                onChange={(e) => {
                                  setCompanyData({ ...companyData, primary_contact_phone: e.target.value });
                                  const validation = validatePhoneNumber(e.target.value, countryCode);
                                  setPhoneErrors({ ...phoneErrors, primary_contact_phone: validation.message });
                                }}
                                className={`flex-1 ${phoneErrors.primary_contact_phone ? "border-destructive" : ""}`}
                              />
                            </div>
                            {phoneErrors.primary_contact_phone && (
                              <p className="text-xs text-destructive">{phoneErrors.primary_contact_phone}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="pt-6 mt-4 border-t">
                      <h3 className="text-base font-semibold mb-3">Industry & Compliance</h3>
                      <div className="grid gap-4">
                        {/* Step 1: Describe your business */}
                        <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
                          <Label htmlFor="businessDescription" className="text-base">What does your business do?</Label>
                          <p className="text-xs text-muted-foreground mb-2">
                            Describe your business in plain language (e.g., "I build custom fences", "We run a coffee shop")
                          </p>
                          <div className="flex gap-2">
                            <Input
                              id="businessDescription"
                              placeholder="e.g., I build fences, run a restaurant, develop software..."
                              value={businessDescription}
                              onChange={(e) => setBusinessDescription(e.target.value)}
                              className="flex-1"
                            />
                            <Button 
                              onClick={handleAnalyzeBusiness}
                              disabled={analyzing || !businessDescription.trim()}
                              variant="secondary"
                            >
                              {analyzing ? (
                                <>
                                  <Clock className="mr-2 h-4 w-4 animate-spin" />
                                  Analyzing...
                                </>
                              ) : (
                                "Analyze"
                              )}
                            </Button>
                          </div>
                        </div>

                        {/* Step 2: AI Suggestions */}
                        {aiSuggestions && (
                          <div className="space-y-3 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                            <div className="flex items-start gap-2">
                              <Building2 className="h-5 w-5 text-primary mt-0.5" />
                              <div className="flex-1">
                                <p className="font-medium text-sm">AI Recommendation</p>
                                <p className="text-xs text-muted-foreground mt-1">{aiSuggestions.reasoning}</p>
                              </div>
                            </div>
                            {aiSuggestions.alternative_industries.length > 0 && (
                              <div className="text-xs text-muted-foreground">
                                <span className="font-medium">Alternatives:</span> {aiSuggestions.alternative_industries.join(", ")}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Step 3 & 4: Two Column Layout */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Step 3: Select Industry Sector(s) */}
                          <div className="space-y-1.5">
                            <Label>Industry Sector(s)</Label>
                            <p className="text-xs text-muted-foreground mb-2">
                              {aiSuggestions 
                                ? "✓ AI recommended industries checked. Select all industries your business operates in." 
                                : "Select all industries your business operates in"
                              }
                            </p>
                            <div className="max-h-[300px] overflow-y-auto border rounded-md p-3 space-y-2 bg-background">
                              {Object.keys(industryCategories).map((industry) => {
                                const isSelected = companyData.industry_sector.includes(industry);
                                const isRecommended = aiSuggestions?.recommended_industry === industry || 
                                                     aiSuggestions?.alternative_industries.includes(industry);
                                return (
                                  <div key={industry} className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`industry-${industry}`}
                                      checked={isSelected}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          setCompanyData({
                                            ...companyData,
                                            industry_sector: [...companyData.industry_sector, industry],
                                            // Clear business categories when industries change
                                            business_category: []
                                          });
                                        } else {
                                          setCompanyData({
                                            ...companyData,
                                            industry_sector: companyData.industry_sector.filter(i => i !== industry),
                                            business_category: []
                                          });
                                        }
                                      }}
                                    />
                                    <Label
                                      htmlFor={`industry-${industry}`}
                                      className="text-sm font-normal cursor-pointer flex items-center gap-2"
                                    >
                                      {industry}
                                      {isRecommended && <span className="text-yellow-500">⭐</span>}
                                    </Label>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Step 4: Select Business Categories */}
                          <div className="space-y-1.5">
                            <Label>Government Business Categories</Label>
                            <p className="text-xs text-muted-foreground mb-2">
                              {companyData.industry_sector.length === 0 
                                ? "Please select industry sectors first"
                                : aiSuggestions && aiSuggestions.recommended_categories.length > 0
                                  ? "⭐ = AI recommended. Select all categories that apply to your business."
                                  : "Government classification for regulatory requirements - select all that apply"
                              }
                            </p>
                            {companyData.industry_sector.length > 0 ? (
                              <div className="max-h-[300px] overflow-y-auto border rounded-md p-3 space-y-3 bg-background">
                                {companyData.industry_sector.map((industry) => {
                                  const categories = industryCategories[industry] || [];
                                  if (categories.length === 0) return null;
                                  
                                  return (
                                    <div key={industry} className="space-y-2">
                                      <h4 className="text-sm font-semibold text-muted-foreground">{industry}</h4>
                                      <div className="space-y-2 pl-2">
                                        {categories.map((category) => {
                                          const isSelected = companyData.business_category.includes(category);
                                          const isRecommended = aiSuggestions?.recommended_categories.includes(category);
                                          return (
                                            <div key={category} className="flex items-center space-x-2">
                                              <Checkbox
                                                id={`category-${category}`}
                                                checked={isSelected}
                                                onCheckedChange={(checked) => {
                                                  if (checked) {
                                                    setCompanyData({
                                                      ...companyData,
                                                      business_category: [...companyData.business_category, category]
                                                    });
                                                  } else {
                                                    setCompanyData({
                                                      ...companyData,
                                                      business_category: companyData.business_category.filter(c => c !== category)
                                                    });
                                                  }
                                                }}
                                              />
                                              <Label
                                                htmlFor={`category-${category}`}
                                                className="text-sm font-normal cursor-pointer flex items-center gap-2"
                                              >
                                                {category}
                                                {isRecommended && <span className="text-yellow-500">⭐</span>}
                                              </Label>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="border rounded-md p-4 text-center text-sm text-muted-foreground bg-muted/20">
                                Select industry sectors above to see available business categories
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Compliance Scan Status */}
                        {companyData.compliance_scan_completed && (
                          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                            <Save className="h-4 w-4 text-green-600" />
                            <p className="text-sm text-green-700">Compliance scan completed</p>
                          </div>
                        )}
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

                    <div className="pt-6 mt-4 border-t">
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
                          <div className="space-y-1">
                            <div className="flex gap-2">
                              <Input 
                                value={countryCode}
                                disabled
                                className="w-20"
                              />
                              <Input 
                                id="adminPhone" 
                                type="tel"
                                placeholder="21 123 4567"
                                value={companyData.admin_phone}
                                onChange={(e) => {
                                  setCompanyData({ ...companyData, admin_phone: e.target.value });
                                  const validation = validatePhoneNumber(e.target.value, countryCode);
                                  setPhoneErrors({ ...phoneErrors, admin_phone: validation.message });
                                }}
                                className={`flex-1 ${phoneErrors.admin_phone ? "border-destructive" : ""}`}
                              />
                            </div>
                            {phoneErrors.admin_phone && (
                              <p className="text-xs text-destructive">{phoneErrors.admin_phone}</p>
                            )}
                          </div>
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
            
            {/* Compliance Requirements Section */}
            {companyData.industry_sector && companyData.business_category && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Compliance Requirements</CardTitle>
                  <CardDescription>
                    Based on your industry classification, here are your compliance obligations. 
                    Mandatory items are automatically enabled. Toggle optional items that you want to track.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingCompliance ? (
                    <div className="flex items-center justify-center py-8">
                      <Clock className="h-6 w-6 animate-spin text-muted-foreground mr-2" />
                      <span>Loading compliance requirements...</span>
                    </div>
                  ) : complianceItems.length === 0 ? (
                    <div className="text-center py-8">
                      <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                      <p className="text-muted-foreground mb-4">
                        No compliance items found. Click the button below to scan for requirements.
                      </p>
                      <Button
                        onClick={async () => {
                          const { data: { user } } = await supabase.auth.getUser();
                          if (!user) return;
                          const { data: profile } = await supabase.from("profiles").select("org_id").eq("id", user.id).single();
                          if (profile?.org_id) {
                            sonnerToast.info("Scanning compliance requirements...");
                            try {
                              const { data: scanData, error: scanError } = await supabase.functions.invoke("scan-compliance", {
                                body: { org_id: profile.org_id }
                              });
                              if (scanError) throw scanError;
                              sonnerToast.success(`Found ${scanData.mandatory_count} mandatory and ${scanData.optional_count} optional requirements!`);
                              fetchComplianceItems();
                            } catch (error: any) {
                              sonnerToast.error("Failed to scan compliance requirements");
                            }
                          }
                        }}
                      >
                        <Building2 className="mr-2 h-4 w-4" />
                        Scan Compliance Requirements
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Mandatory Requirements */}
                      <div>
                        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                          <AlertCircle className="h-5 w-5 text-red-500" />
                          Mandatory Requirements ({complianceItems.filter(i => i.notes?.includes('Mandatory')).length})
                        </h3>
                        <div className="space-y-2">
                          {complianceItems.filter(i => i.notes?.includes('Mandatory')).map((item) => (
                            <div key={item.id} className="flex items-start justify-between p-3 border rounded-lg bg-red-50">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium">{item.title}</span>
                                  <Badge variant="destructive" className="text-xs">Required</Badge>
                                </div>
                                <p className="text-sm text-muted-foreground mb-1">{item.description}</p>
                                <div className="flex gap-4 text-xs text-muted-foreground">
                                  <span>Authority: {item.authority}</span>
                                  <span>Frequency: {item.frequency.replace('_', ' ')}</span>
                                </div>
                              </div>
                              <div className="ml-4">
                                <CheckCircle className="h-5 w-5 text-green-600" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {/* Optional/Recommended Requirements */}
                      {complianceItems.filter(i => !i.notes?.includes('Mandatory')).length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                            <Clock className="h-5 w-5 text-blue-500" />
                            Optional Requirements ({complianceItems.filter(i => !i.notes?.includes('Mandatory')).length})
                          </h3>
                          <p className="text-sm text-muted-foreground mb-3">
                            These are recommended best practices. Toggle them on if you want to track them in your board papers.
                          </p>
                          <div className="space-y-2">
                            {complianceItems.filter(i => !i.notes?.includes('Mandatory')).map((item) => (
                              <div key={item.id} className="flex items-start justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium">{item.title}</span>
                                    <Badge variant="outline" className="text-xs">Optional</Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground mb-1">{item.description}</p>
                                  <div className="flex gap-4 text-xs text-muted-foreground">
                                    <span>Authority: {item.authority}</span>
                                    <span>Frequency: {item.frequency.replace('_', ' ')}</span>
                                  </div>
                                </div>
                                <div className="ml-4">
                                  <input
                                    type="checkbox"
                                    checked={item.is_active}
                                    onChange={() => handleToggleCompliance(item.id, item.is_active)}
                                    className="h-5 w-5 rounded border-gray-300 cursor-pointer"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="board" className="space-y-6">
            <BoardManagement
              memberType="board"
              title="Board Members"
              description="Manage board directors, chair, and deputy chair"
              positions={BOARD_POSITIONS}
            />
          </TabsContent>

          <TabsContent value="executive" className="space-y-6">
            <BoardManagement
              memberType="executive"
              title="Executive Team"
              description="Manage CEO, CFO, and other executive leadership"
              positions={EXECUTIVE_POSITIONS}
            />
          </TabsContent>

          <TabsContent value="key-staff" className="space-y-6">
            <BoardManagement
              memberType="key_staff"
              title="Key Staff"
              description="Manage key operational staff and department heads"
              positions={KEY_STAFF_POSITIONS}
            />
          </TabsContent>

          <TabsContent value="templates" className="space-y-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-foreground mb-1">
                Document Templates
              </h2>
              <p className="text-muted-foreground">Create and customize templates for your organization</p>
            </div>

            {/* Side-by-side menu cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Board Paper and Report Templates Menu */}
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader className="border-b">
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Board Paper and Report Templates
                  </CardTitle>
                  <CardDescription>
                    Customize board papers and executive reports
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div>
                    <Label htmlFor="template-type">Select Template Type</Label>
                    <Select value={selectedType} onValueChange={handleTemplateTypeChange}>
                      <SelectTrigger id="template-type" className="w-full mt-2">
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
                </CardContent>
              </Card>

              {/* Board and Staff Templates Menu */}
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader className="border-b">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Board and Staff Templates
                  </CardTitle>
                  <CardDescription>
                    Customize induction forms for team members
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div>
                    <Label htmlFor="staff-form-type">Select Form Type</Label>
                    <Select value={selectedStaffFormType} onValueChange={handleStaffFormTypeChange}>
                      <SelectTrigger id="staff-form-type" className="w-full mt-2 bg-background z-50">
                        <SelectValue placeholder="Choose a form type..." />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        <SelectItem value="board_members">Board Members</SelectItem>
                        <SelectItem value="executive_team">Executive Team</SelectItem>
                        <SelectItem value="key_staff">Key Staff</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Workspace Area - Shows selected template content */}
            {selectedType && (
              <Card className="mt-6">
                <CardHeader className="border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Editing: {selectedType}</CardTitle>
                      <CardDescription>
                        Customize the sections and structure for this template type
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleCloseTemplate}
                      className="h-8 w-8"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-6">
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <h3 className="font-semibold text-lg mb-2">{selectedType}</h3>
                      <p className="text-sm text-muted-foreground">
                        Customize the sections and structure for this template type
                      </p>
                    </div>
                    
                    <TemplateSectionEditor
                      sections={sections}
                      onSectionsChange={handleSectionsChange}
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

            {/* Form Template Editor */}
            {selectedStaffFormType && (
              <Card className="mt-6">
                <CardHeader className="border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Form Template</CardTitle>
                      <CardDescription>
                        Customize the induction form fields
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleCloseTemplate}
                      className="h-8 w-8"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  {loadingStaffForm ? (
                    <div className="flex items-center justify-center py-12">
                      <Clock className="h-6 w-6 animate-spin text-muted-foreground mr-2" />
                      <span>Loading form template...</span>
                    </div>
                  ) : staffFormFields.length > 0 ? (
                    <>
                      <StaffFormTemplateEditor
                        fields={staffFormFields}
                        onFieldsChange={handleFieldsChange}
                        formType={selectedStaffFormType}
                      />
                      <div className="flex justify-between items-center pt-6 mt-6 border-t">
                        {hasUnsavedChanges && (
                          <div className="flex items-center gap-2 text-amber-600">
                            <AlertCircle className="h-4 w-4" />
                            <span className="text-sm font-medium">You have unsaved changes</span>
                          </div>
                        )}
                        <Button onClick={handleSaveStaffFormTemplate} size="lg" className="ml-auto">
                          <Save className="h-4 w-4 mr-2" />
                          Save Form Template
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                      <p className="text-muted-foreground">
                        No form template found. Please try refreshing the page.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Role Management Tab */}
          <TabsContent value="roles">
            <RoleManagement />
          </TabsContent>

          {/* Role Management Tab */}
          <TabsContent value="roles">
            <RoleManagement />
          </TabsContent>
        </Tabs>
      </main>
      <Footer />

      {/* Save Changes Dialog */}
      <AlertDialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Would you like to save them before {pendingTemplateChange ? 'switching templates' : 'closing'}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDiscardAndClose}>
              Discard Changes
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleSaveAndClose}>
              Save Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Settings;
