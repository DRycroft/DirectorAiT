/**
 * Pack Sections Page
 * 
 * View and manage sections within a board pack
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText, CheckCircle2, Clock, Edit } from 'lucide-react';
import { useBoardPacks } from '@/hooks/useBoardPacks';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PackWithSections {
  id: string;
  title: string;
  meeting_date: string;
  status: string | null;
}

export default function PackSections() {
  const { packId } = useParams<{ packId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { fetchPackSections } = useBoardPacks();
  
  const [pack, setPack] = useState<PackWithSections | null>(null);
  const [sections, setSections] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPackData();
  }, [packId]);

  // Set up realtime subscription for section updates
  useEffect(() => {
    if (!packId) return;

    const channel = supabase
      .channel('pack-sections-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pack_sections',
          filter: `pack_id=eq.${packId}`
        },
        () => {
          loadPackData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [packId]);

  const loadPackData = async () => {
    if (!packId) return;
    
    setIsLoading(true);
    try {
      // Load pack details
      const { data: packData, error: packError } = await supabase
        .from('board_packs')
        .select('id, title, meeting_date, status')
        .eq('id', packId)
        .single();

      if (packError) throw packError;
      setPack(packData);

      // Load sections
      const sectionsData = await fetchPackSections(packId);
      setSections(sectionsData || []);
    } catch (error: any) {
      toast({
        title: 'Error loading pack',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'submitted':
        return <CheckCircle2 className="h-5 w-5 text-success" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-warning" />;
      default:
        return <FileText className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const handleSectionClick = (sectionId: string) => {
    navigate(`/report-submission/${sectionId}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading pack...</p>
        </div>
      </div>
    );
  }

  if (!pack) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">Pack Not Found</h2>
          <Button onClick={() => navigate('/pack-management')}>
            Go Back
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <Button
          variant="ghost"
          onClick={() => navigate('/pack-management')}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Packs
        </Button>

        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">{pack.title}</h1>
          <p className="text-muted-foreground">
            Meeting Date: {new Date(pack.meeting_date).toLocaleDateString()}
          </p>
        </div>

        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-6">Pack Sections</h2>
          
          {sections.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No sections in this pack.
            </div>
          ) : (
            <div className="space-y-3">
              {sections.map((section) => {
                const document = section.document?.[0];
                const versionNumber = document?.version_number || null;
                const updatedAt = section.updated_at ? new Date(section.updated_at) : null;
                
                return (
                  <Card
                    key={section.id}
                    className="p-4 cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => handleSectionClick(section.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(section.status)}
                        <div>
                          <h3 className="font-semibold">{section.title}</h3>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              section.status === 'submitted' 
                                ? 'bg-success/10 text-success' 
                                : 'bg-warning/10 text-warning'
                            }`}>
                              {section.status === 'submitted' ? 'Submitted' : 'Pending'}
                            </span>
                            {versionNumber && (
                              <span>v{versionNumber}</span>
                            )}
                            {updatedAt && (
                              <span>Updated {updatedAt.toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4 mr-2" />
                        {section.status === 'submitted' ? 'Edit' : 'Add Report'}
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
