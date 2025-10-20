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

const reportSections = [
  'CEO Report', 'CFO Report', 'Chair Report', 'Chair\'s Report',
  'CEO / Managing Director\'s Executive Summary',
  'Operational Performance / KPIs',
  'Sales, Marketing & Customer Metrics',
  'Product / Service Development / R&D',
  'Major Projects & Programme Status',
  'Health, Safety & Environmental (HSE) Report',
  'ESG / Sustainability / Corporate Social Responsibility',
  'People & Culture / HR Report',
  'Remuneration Committee Report',
  'Audit Committee Report',
];

const isReportSection = (title: string) => {
  return reportSections.some(section => 
    title.toLowerCase().includes(section.toLowerCase())
  );
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
            {sections.map((section, index) => (
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
                  {isReportSection(section.title) ? (
                    <div className="space-y-4">
                      <p className="text-foreground font-medium mb-3">Executive Summary</p>
                      <p className="text-foreground leading-relaxed">
                        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Maecenas vehicula nunc at magna tristique, id consequat turpis facilisis. Proin euismod lectus vel mauris dignissim, at varius leo tincidunt.
                      </p>
                      <p className="text-muted-foreground leading-relaxed">
                        Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.
                      </p>
                      <div className="mt-4 pt-4 border-t border-slate-300">
                        <p className="text-sm text-muted-foreground italic">
                          [ Detailed report to be provided by {section.title.split(' ')[0]} ]
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-foreground leading-relaxed">
                        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
                      </p>
                      <p className="text-muted-foreground leading-relaxed">
                        Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
                      </p>
                      {section.required && (
                        <p className="text-foreground leading-relaxed">
                          Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
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
