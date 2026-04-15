/**
 * Pack View Page
 * 
 * Assembled board-pack view: renders all pack sections in order
 * with their submitted content. Supports finalisation and lock controls.
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { ArrowLeft, FileText, Download, CheckCircle2, Clock, AlertCircle, Lock, Unlock, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PackDetails {
  id: string;
  title: string;
  meeting_date: string;
  status: string | null;
  board_id: string;
  finalised_at: string | null;
  finalised_by: string | null;
}

interface SectionWithContent {
  id: string;
  title: string;
  order_index: number;
  status: string;
  document: {
    id: string;
    content: any;
    version_number: number;
    created_by: string;
    created_at: string;
  }[];
}

interface SupportingDoc {
  id: string;
  file_name: string;
  file_path: string;
  uploaded_at: string;
  source: 'executive_reports' | 'meeting_minutes' | 'special_papers';
  type_label: string;
  status: string;
}

export default function PackView() {
  const { packId } = useParams<{ packId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [pack, setPack] = useState<PackDetails | null>(null);
  const [sections, setSections] = useState<SectionWithContent[]>([]);
  const [supportingDocs, setSupportingDocs] = useState<SupportingDoc[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFinalising, setIsFinalising] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [canManagePack, setCanManagePack] = useState(false);

  const isFinalised = pack?.status === 'finalised';

  useEffect(() => {
    if (packId) loadAssembledPack();
  }, [packId]);

  const loadAssembledPack = async () => {
    if (!packId) return;
    setIsLoading(true);
    try {
      const { data: packData, error: packError } = await supabase
        .from('board_packs')
        .select('id, title, meeting_date, status, board_id, finalised_at, finalised_by')
        .eq('id', packId)
        .single();
      if (packError) throw packError;
      setPack(packData as PackDetails);

      const { data: sectionsData, error: sectionsError } = await supabase
        .from('pack_sections')
        .select(`
          id, title, order_index, status,
          document:section_documents(id, content, version_number, created_by, created_at)
        `)
        .eq('pack_id', packId)
        .order('order_index');
      if (sectionsError) throw sectionsError;
      setSections((sectionsData as any[]) || []);

      const { data: boardData } = await supabase
        .from('boards')
        .select('org_id')
        .eq('id', packData.board_id)
        .single();

      if (boardData?.org_id) {
        const orgId = boardData.org_id;
        const [execRes, minutesRes, specialRes] = await Promise.all([
          supabase.from('executive_reports').select('id, file_name, file_path, uploaded_at, report_type, status').eq('org_id', orgId).order('uploaded_at', { ascending: false }).limit(10),
          supabase.from('meeting_minutes').select('id, file_name, file_path, uploaded_at, meeting_type, status').eq('org_id', orgId).order('uploaded_at', { ascending: false }).limit(10),
          supabase.from('special_papers').select('id, file_name, file_path, uploaded_at, paper_type, status').eq('org_id', orgId).order('uploaded_at', { ascending: false }).limit(10),
        ]);

        const docs: SupportingDoc[] = [
          ...(execRes.data || []).map((d: any) => ({ id: d.id, file_name: d.file_name, file_path: d.file_path, uploaded_at: d.uploaded_at, source: 'executive_reports' as const, type_label: `Executive Report – ${d.report_type || 'General'}`, status: d.status })),
          ...(minutesRes.data || []).map((d: any) => ({ id: d.id, file_name: d.file_name, file_path: d.file_path, uploaded_at: d.uploaded_at, source: 'meeting_minutes' as const, type_label: `Meeting Minutes – ${d.meeting_type || 'General'}`, status: d.status })),
          ...(specialRes.data || []).map((d: any) => ({ id: d.id, file_name: d.file_name, file_path: d.file_path, uploaded_at: d.uploaded_at, source: 'special_papers' as const, type_label: `Special Paper – ${d.paper_type || 'General'}`, status: d.status })),
        ];
        setSupportingDocs(docs);
      }
    } catch (error: any) {
      toast({ title: 'Error loading pack', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinalisePack = async () => {
    if (!packId) return;
    setIsFinalising(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('board_packs')
        .update({
          status: 'finalised',
          finalised_at: new Date().toISOString(),
          finalised_by: user.id,
        })
        .eq('id', packId);

      if (error) throw error;

      toast({ title: 'Pack finalised', description: 'This board pack is now locked and ready for distribution.' });
      loadAssembledPack();
    } catch (error: any) {
      toast({ title: 'Error finalising pack', description: error.message, variant: 'destructive' });
    } finally {
      setIsFinalising(false);
    }
  };

  const handleUnlockPack = async () => {
    if (!packId) return;
    setIsUnlocking(true);
    try {
      const { error } = await supabase
        .from('board_packs')
        .update({
          status: 'draft',
          finalised_at: null,
          finalised_by: null,
        })
        .eq('id', packId);

      if (error) throw error;

      toast({ title: 'Pack unlocked', description: 'This board pack has been returned to draft status.' });
      loadAssembledPack();
    } catch (error: any) {
      toast({ title: 'Error unlocking pack', description: error.message, variant: 'destructive' });
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleDownload = async (filePath: string, fileName: string, bucket: string) => {
    try {
      const { data, error } = await supabase.storage.from(bucket).download(filePath);
      if (error) throw error;
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({ title: 'Download failed', description: error.message, variant: 'destructive' });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'submitted': return <CheckCircle2 className="h-4 w-4 text-success" />;
      case 'pending': return <Clock className="h-4 w-4 text-warning" />;
      default: return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getBucketForSource = (source: string) => {
    switch (source) {
      case 'executive_reports': return 'executive-reports';
      case 'meeting_minutes': return 'meeting-minutes';
      case 'special_papers': return 'special-papers';
      default: return 'board-documents';
    }
  };

  const submittedCount = sections.filter(s => s.status === 'submitted').length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Assembling pack…</p>
        </div>
      </div>
    );
  }

  if (!pack) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">Pack Not Found</h2>
          <Button onClick={() => navigate('/pack-management')}>Go Back</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <Button variant="ghost" onClick={() => navigate(`/pack/${packId}/sections`)} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Sections
        </Button>

        {/* Finalised banner */}
        {isFinalised && (
          <div className="mb-6 p-4 rounded-lg border border-success/30 bg-success/5 flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-success shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-sm">This pack has been finalised</p>
              {pack.finalised_at && (
                <p className="text-xs text-muted-foreground">
                  Locked on {new Date(pack.finalised_at).toLocaleDateString()} at {new Date(pack.finalised_at).toLocaleTimeString()}
                </p>
              )}
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={isUnlocking}>
                  <Unlock className="h-3 w-3 mr-1" />
                  Unlock
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Unlock this pack?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will return the pack to draft status, allowing further edits. Any distributed copies will no longer match the current version.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleUnlockPack}>
                    Unlock Pack
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        {/* Pack Header */}
        <div className="mb-8 print:mb-4" id="pack-header">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-1">{pack.title}</h1>
              <p className="text-muted-foreground">
                Meeting Date: {new Date(pack.meeting_date).toLocaleDateString()}
              </p>
              <div className="flex items-center gap-3 mt-2 text-sm">
                <span className={`px-2 py-0.5 rounded-full capitalize ${
                  isFinalised ? 'bg-success/10 text-success font-medium' : 'bg-muted'
                }`}>
                  {isFinalised && <Lock className="h-3 w-3 inline mr-1" />}
                  {pack.status}
                </span>
                <span className="text-muted-foreground">
                  {submittedCount}/{sections.length} sections submitted
                </span>
              </div>
            </div>

            {!isFinalised && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button disabled={isFinalising}>
                    <Lock className="h-4 w-4 mr-2" />
                    {isFinalising ? 'Finalising…' : 'Finalise Pack'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Finalise this board pack?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Once finalised, sections cannot be edited until the pack is unlocked by an administrator.
                      {submittedCount < sections.length && (
                        <span className="block mt-2 text-warning font-medium">
                          Warning: {sections.length - submittedCount} section(s) have not been submitted yet.
                        </span>
                      )}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleFinalisePack}>
                      Finalise Pack
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        <Separator className="mb-8" />

        {/* Assembled Sections */}
        <div className="space-y-8" id="pack-content">
          {sections.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              No sections in this pack.
            </Card>
          ) : (
            sections.map((section, idx) => {
              const latestDoc = section.document?.length
                ? section.document.reduce((a, b) =>
                    (a.version_number || 0) >= (b.version_number || 0) ? a : b
                  )
                : null;

              return (
                <div key={section.id} className="break-inside-avoid">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm font-mono text-muted-foreground w-8">{idx + 1}.</span>
                    {getStatusIcon(section.status)}
                    <h2 className="text-2xl font-semibold">{section.title}</h2>
                    {latestDoc && (
                      <span className="text-xs text-muted-foreground ml-auto">v{latestDoc.version_number}</span>
                    )}
                  </div>

                  <Card className="p-6">
                    {latestDoc ? (
                      <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap">
                        {(latestDoc.content as any)?.text || JSON.stringify(latestDoc.content, null, 2)}
                      </div>
                    ) : (
                      <p className="text-muted-foreground italic">
                        No content submitted yet for this section.
                      </p>
                    )}
                  </Card>

                  {idx < sections.length - 1 && <Separator className="mt-8" />}
                </div>
              );
            })
          )}
        </div>

        {/* Supporting Documents */}
        {supportingDocs.length > 0 && (
          <>
            <Separator className="my-8" />
            <div id="pack-supporting-docs">
              <h2 className="text-2xl font-semibold mb-4">Supporting Documents</h2>
              <div className="space-y-2">
                {supportingDocs.map(doc => (
                  <Card key={`${doc.source}-${doc.id}`} className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{doc.file_name}</p>
                        <p className="text-xs text-muted-foreground">{doc.type_label} • {new Date(doc.uploaded_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleDownload(doc.file_path, doc.file_name, getBucketForSource(doc.source))}>
                      <Download className="h-4 w-4" />
                    </Button>
                  </Card>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
