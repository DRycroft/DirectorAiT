/**
 * Report Submission Page
 * 
 * Allows Ops Manager and other roles to submit reports for board pack sections
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Save, FileText } from 'lucide-react';
import { useBoardPacks } from '@/hooks/useBoardPacks';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface SectionDetails {
  id: string;
  title: string;
  pack_id: string;
  status: string;
  pack: {
    title: string;
    meeting_date: string;
  };
}

export default function ReportSubmission() {
  const { sectionId } = useParams<{ sectionId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { submitReport, isSubmittingReport } = useBoardPacks();
  
  const [section, setSection] = useState<SectionDetails | null>(null);
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [currentVersion, setCurrentVersion] = useState<number>(0);

  useEffect(() => {
    loadSectionDetails();
  }, [sectionId]);

  const loadSectionDetails = async () => {
    if (!sectionId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('pack_sections')
        .select(`
          id,
          title,
          pack_id,
          status,
          pack:board_packs(title, meeting_date)
        `)
        .eq('id', sectionId)
        .single();

      if (error) throw error;
      setSection(data as any);

      // Load existing document if available
      const { data: docData } = await supabase
        .from('section_documents')
        .select('content, version_number')
        .eq('section_id', sectionId)
        .order('version_number', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (docData) {
        const contentData = docData.content as any;
        setContent(contentData.text || '');
        setCurrentVersion(docData.version_number || 0);
      }
    } catch (error: any) {
      toast({
        title: 'Error loading section',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!sectionId || !content.trim()) {
      toast({
        title: 'Content required',
        description: 'Please enter your report content before submitting.',
        variant: 'destructive',
      });
      return;
    }

    try {
      submitReport({
        section_id: sectionId,
        content: {
          text: content,
          submittedAt: new Date().toISOString(),
        },
      });

      // Wait for the mutation to complete, then navigate back
      setTimeout(() => {
        toast({
          title: 'Success',
          description: 'Report submitted and pack updated.',
        });
        navigate(-1);
      }, 1500);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit report.',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading section...</p>
        </div>
      </div>
    );
  }

  if (!section) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Section Not Found</h2>
          <p className="text-muted-foreground mb-4">
            The requested section could not be found.
          </p>
          <Button onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="mb-6">
          <div className="mb-4 p-4 bg-primary/5 border-l-4 border-primary rounded">
            <p className="text-sm font-medium text-muted-foreground mb-1">Submitting content for:</p>
            <h1 className="text-3xl font-bold">{section.title}</h1>
          </div>
          <p className="text-muted-foreground mb-2">
            {section.pack.title} • {new Date(section.pack.meeting_date).toLocaleDateString()}
          </p>
          <div className="flex items-center gap-3">
            {section.status === 'submitted' && (
              <div className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-success/10 text-success">
                Previously Submitted
              </div>
            )}
            {currentVersion > 0 && (
              <div className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-muted">
                Current Version: v{currentVersion}
              </div>
            )}
          </div>
        </div>

        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="content" className="text-lg mb-2 block">
                Report Content
              </Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter your report content here..."
                rows={20}
                className="font-mono text-sm"
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => navigate(-1)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmittingReport || !content.trim()}
              >
                <Save className="h-4 w-4 mr-2" />
                {isSubmittingReport ? 'Submitting...' : 'Submit Report'}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
