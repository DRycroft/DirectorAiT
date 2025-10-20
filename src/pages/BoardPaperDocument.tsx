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
          .select('*')
          .eq('name', 'Board Papers')
          .eq('scope', 'personal')
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching template:', error);
          toast({
            title: "Error",
            description: "Failed to load board paper template",
            variant: "destructive",
          });
        }

        if (template && template.sections) {
          const templateSections = template.sections as unknown as TemplateSection[];
          setSections(templateSections.filter(s => s.enabled).sort((a, b) => a.order - b.order));
        }
      } catch (error) {
        console.error('Error:', error);
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
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      <main className="flex-1 container mx-auto px-4 pt-16 pb-8 max-w-5xl">
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

        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="text-center mb-8 pb-6 border-b">
              <h1 className="text-3xl font-bold mb-2">{paperInfo.companyName}</h1>
              <h2 className="text-xl text-muted-foreground mb-1">Board Papers</h2>
              <p className="text-sm text-muted-foreground">
                {paperInfo.date} - {paperInfo.periodCovered}
              </p>
            </div>

            <div className="space-y-8">
              {sections.map((section, index) => (
                <div key={section.id} className="space-y-3">
                  <h3 
                    className="text-lg font-semibold"
                    style={{ 
                      marginLeft: `${section.level * 1.5}rem`,
                      fontSize: section.level === 0 ? '1.125rem' : '1rem'
                    }}
                  >
                    {index + 1}. {section.title}
                  </h3>
                  <div 
                    className="min-h-[80px] p-4 bg-muted/30 rounded-md border"
                    style={{ marginLeft: `${section.level * 1.5}rem` }}
                  >
                    {isReportSection(section.title) ? (
                      <p className="text-muted-foreground italic">
                        Awaiting Report
                      </p>
                    ) : (
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default BoardPaperDocument;
