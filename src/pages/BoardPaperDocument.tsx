import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TemplateSection {
  id: string;
  title: string;
  required: boolean;
  enabled: boolean;
  order: number;
  level: number;
}

// Report sections that require input from specific roles
const reportSectionConfig: Record<string, string[]> = {
  'chair': ['Executive Summary', 'Key Board Matters', 'Strategic Initiatives', 'Governance Updates'],
  'ceo': ['Executive Summary', 'Operational Overview', 'Strategic Progress', 'Key Achievements', 'Challenges & Risks'],
  'cfo': ['Financial Overview', 'Income Statement Highlights', 'Balance Sheet Summary', 'Cash Flow Analysis', 'Key Financial Ratios'],
  'operational': ['Performance Metrics', 'Key Performance Indicators', 'Targets vs Actuals', 'Trend Analysis'],
  'sales': ['Sales Performance', 'Customer Acquisition', 'Market Analysis', 'Pipeline & Forecast'],
  'product': ['Product Development Update', 'R&D Initiatives', 'Innovation Pipeline', 'Technology Roadmap'],
  'projects': ['Project Status Summary', 'Major Milestones', 'Budget & Resource Allocation', 'Risks & Issues'],
  'hse': ['Health & Safety Metrics', 'Incident Reports', 'Compliance Status', 'Environmental Initiatives'],
  'esg': ['ESG Goals & Progress', 'Sustainability Initiatives', 'Social Impact', 'Governance Framework'],
  'hr': ['Workforce Overview', 'Recruitment & Retention', 'Training & Development', 'Culture Initiatives'],
  'remuneration': ['Committee Activities', 'Remuneration Framework', 'Executive Compensation', 'Incentive Plans'],
  'audit': ['Committee Activities', 'Internal Audit Findings', 'Risk Management', 'Compliance Review'],
};

const getReportType = (title: string): string | null => {
  const lower = title.toLowerCase();
  if (lower.includes('chair')) return 'chair';
  if (lower.includes('ceo') || lower.includes('managing director')) return 'ceo';
  if (lower.includes('cfo') || lower.includes('financial statement') || lower.includes('financial commentary')) return 'cfo';
  if (lower.includes('operational') || lower.includes('kpi')) return 'operational';
  if (lower.includes('sales') || lower.includes('marketing') || lower.includes('customer')) return 'sales';
  if (lower.includes('product') || lower.includes('r&d') || lower.includes('development')) return 'product';
  if (lower.includes('project') || lower.includes('programme')) return 'projects';
  if (lower.includes('health') || lower.includes('safety') || lower.includes('hse') || lower.includes('environmental')) return 'hse';
  if (lower.includes('esg') || lower.includes('sustainability') || lower.includes('social responsibility')) return 'esg';
  if (lower.includes('people') || lower.includes('culture') || lower.includes('hr')) return 'hr';
  if (lower.includes('remuneration')) return 'remuneration';
  if (lower.includes('audit committee')) return 'audit';
  return null;
};

const BoardPaperDocument = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sections, setSections] = useState<TemplateSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [paperInfo, setPaperInfo] = useState({
    companyName: "Company Name",
    date: new Date().toLocaleDateString(),
    periodCovered: "Period"
  });

  useEffect(() => {
    const fetchTemplate = async () => {
      try {
        const { data: template, error } = await supabase
          .from('templates')
          .select('sections')
          .eq('name', 'Board Papers')
          .eq('scope', 'personal')
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching template:', error);
          // Use default sections if template fetch fails
          setSections([
            { id: "cover-sheet", title: "Cover Sheet", required: true, enabled: true, order: 0, level: 0 },
            { id: "agenda-toc", title: "Agenda / Table of Contents", required: true, enabled: true, order: 1, level: 0 },
            { id: "declarations", title: "Declarations of Interest", required: true, enabled: true, order: 2, level: 0 },
            { id: "chair-report", title: "Chair's Report", required: false, enabled: true, order: 3, level: 0 },
            { id: "ceo-summary", title: "CEO / Managing Director's Executive Summary", required: false, enabled: true, order: 4, level: 0 },
            { id: "cfo-report", title: "CFO Report", required: false, enabled: true, order: 5, level: 0 },
          ]);
        } else if (template && template.sections) {
          const templateSections = template.sections as unknown as TemplateSection[];
          setSections(templateSections.filter(s => s.enabled).sort((a, b) => a.order - b.order));
        }
      } catch (error) {
        console.error('Error:', error);
        // Use default sections on any error
        setSections([
          { id: "cover-sheet", title: "Cover Sheet", required: true, enabled: true, order: 0, level: 0 },
          { id: "agenda-toc", title: "Agenda / Table of Contents", required: true, enabled: true, order: 1, level: 0 },
          { id: "declarations", title: "Declarations of Interest", required: true, enabled: true, order: 2, level: 0 },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchTemplate();
  }, [id, toast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Loading board paper...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col">
      <Navigation />
      <main className="flex-1 container mx-auto px-4 pt-16 pb-8 max-w-4xl">
        <div className="mb-6 flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/board-papers')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Board Papers
          </Button>
        </div>

        <div className="bg-white shadow-xl rounded-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary to-accent p-8 text-white">
            <h1 className="text-4xl font-bold mb-2">{paperInfo.companyName}</h1>
            <h2 className="text-2xl font-light mb-1">Board Papers</h2>
            <p className="text-sm opacity-90">
              {paperInfo.date} | {paperInfo.periodCovered}
            </p>
          </div>

          {/* Table of Contents */}
          <div className="p-12 border-b border-slate-200 bg-slate-50/50">
            <h2 className="text-2xl font-bold mb-6 text-foreground">Table of Contents</h2>
            <div className="space-y-2">
              {sections.map((section, index) => (
                <div 
                  key={`toc-${section.id}`} 
                  className="flex justify-between items-center py-1 hover:bg-slate-100 px-2 rounded transition-colors"
                  style={{ paddingLeft: `${section.level * 2 + 0.5}rem` }}
                >
                  <span className="text-foreground">
                    {section.level === 0 && `${index + 1}. `}
                    {section.title}
                  </span>
                  <span className="text-muted-foreground text-sm">
                    Section {index + 1}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Document Sections */}
          <div className="p-12 space-y-10">
            {sections.map((section, index) => {
              const reportType = getReportType(section.title);
              const subheadings = reportType ? reportSectionConfig[reportType] : null;
              
              return (
                <div key={section.id} className="space-y-4">
                  <div 
                    className="border-l-4 border-primary pl-4"
                    style={{ marginLeft: `${section.level * 2}rem` }}
                  >
                    <h3 
                      className="font-bold text-foreground"
                      style={{ 
                        fontSize: section.level === 0 ? '1.5rem' : '1.25rem'
                      }}
                    >
                      {section.level === 0 ? `${index + 1}. ` : ''}{section.title}
                    </h3>
                  </div>
                  <div 
                    className="min-h-[100px] p-6 bg-slate-50 rounded-lg border border-slate-200"
                    style={{ marginLeft: `${section.level * 2}rem` }}
                  >
                    {reportType && subheadings ? (
                      <div className="space-y-6">
                        {subheadings.map((subheading, idx) => (
                          <div key={idx} className="space-y-2">
                            <h4 className="text-lg font-semibold text-foreground border-b border-slate-300 pb-2">
                              {subheading}
                            </h4>
                            <div className="bg-white p-4 rounded border border-slate-200">
                              <p className="text-sm text-muted-foreground italic">
                                [ Awaiting input from {section.title.includes('Committee') ? 'Committee' : section.title.split(' ')[0]} ]
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <p className="text-foreground leading-relaxed">
                          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
                        </p>
                        <p className="text-muted-foreground leading-relaxed">
                          Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
                        </p>
                        {section.required && (
                          <p className="text-foreground leading-relaxed">
                            Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-200 bg-slate-50 p-6 text-center text-sm text-muted-foreground">
            <p>Confidential - For Board Members Only</p>
            <p className="mt-1">{paperInfo.companyName} © {new Date().getFullYear()}</p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default BoardPaperDocument;
