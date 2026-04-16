/**
 * Pack View Page
 * 
 * Assembled board-pack view: renders all pack sections in order
 * with their submitted content, plus auto-populated governance data.
 * Supports finalisation, lock controls, and distribution tracking.
 */

import { useState, useEffect } from 'react';
import { useGovernanceAI } from '@/hooks/useGovernanceAI';
import AIResultPanel from '@/components/AIResultPanel';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { ArrowLeft, FileText, Download, CheckCircle2, Clock, AlertCircle, Lock, Unlock, ShieldCheck, Printer, Send, Users, ListChecks, Gavel, Shield, Sparkles, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { fetchGovernanceSnapshot, type GovernanceSnapshot } from '@/lib/packAutoPopulate';
import { toast } from "sonner";

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

interface AckRecord {
  user_id: string;
  user_name: string;
  ack_type: string;
  created_at: string;
}

export default function PackView() {
  const { packId } = useParams<{ packId: string }>();
  const navigate = useNavigate();

  const [pack, setPack] = useState<PackDetails | null>(null);
  const [sections, setSections] = useState<SectionWithContent[]>([]);
  const [supportingDocs, setSupportingDocs] = useState<SupportingDoc[]>([]);
  const [governance, setGovernance] = useState<GovernanceSnapshot | null>(null);
  const [acknowledgements, setAcknowledgements] = useState<AckRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFinalising, setIsFinalising] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [isDistributing, setIsDistributing] = useState(false);
  const [canManagePack, setCanManagePack] = useState(false);

  const isFinalised = pack?.status === 'finalised';
  const governanceAI = useGovernanceAI();

  const handleSummarisePack = async () => {
    if (!packId) return;
    await governanceAI.execute({ action: 'summarise-pack', packId });
  };

  const handleHighlightRisks = async () => {
    if (!pack?.board_id) return;
    await governanceAI.execute({ action: 'highlight-risks', boardId: pack.board_id });
  };

  const handleDirectorBriefing = async () => {
    if (!pack?.board_id) return;
    await governanceAI.execute({ action: 'director-briefing', boardId: pack.board_id });
  };

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

      // Auto-populate governance data
      const govData = await fetchGovernanceSnapshot(packData.board_id, packData.meeting_date);
      setGovernance(govData);

      // Get org for supporting docs + role check
      const { data: boardData } = await supabase
        .from('boards')
        .select('org_id')
        .eq('id', packData.board_id)
        .single();

      if (boardData?.org_id) {
        const orgId = boardData.org_id;

        // Check user roles
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user) {
          const { data: orgRoles } = await supabase
            .from('user_roles')
            .select('role, org_id')
            .eq('user_id', userData.user.id)
            .in('role', ['org_admin', 'chair', 'super_admin']);

          const canManage = (orgRoles || []).some((r: any) =>
            r.role === 'super_admin' ||
            ((r.role === 'org_admin' || r.role === 'chair') && r.org_id === orgId)
          );
          setCanManagePack(canManage);
        }

        // Load supporting docs
        const [execRes, minutesRes, specialRes] = await Promise.all([
          supabase.from('executive_reports').select('id, file_name, file_path, uploaded_at, report_type, status').eq('org_id', orgId).order('uploaded_at', { ascending: false }).limit(10),
          supabase.from('meeting_minutes').select('id, file_name, file_path, uploaded_at, meeting_type, status').eq('org_id', orgId).order('uploaded_at', { ascending: false }).limit(10),
          supabase.from('special_papers').select('id, file_name, file_path, uploaded_at, category, status').eq('org_id', orgId).order('uploaded_at', { ascending: false }).limit(10),
        ]);

        const docs: SupportingDoc[] = [
          ...(execRes.data || []).map((d: any) => ({ id: d.id, file_name: d.file_name, file_path: d.file_path, uploaded_at: d.uploaded_at, source: 'executive_reports' as const, type_label: `Executive Report – ${d.report_type || 'General'}`, status: d.status })),
          ...(minutesRes.data || []).map((d: any) => ({ id: d.id, file_name: d.file_name, file_path: d.file_path, uploaded_at: d.uploaded_at, source: 'meeting_minutes' as const, type_label: `Meeting Minutes – ${d.meeting_type || 'General'}`, status: d.status })),
          ...(specialRes.data || []).map((d: any) => ({ id: d.id, file_name: d.file_name, file_path: d.file_path, uploaded_at: d.uploaded_at, source: 'special_papers' as const, type_label: `Special Paper – ${d.category || 'General'}`, status: d.status })),
        ];
        setSupportingDocs(docs);

        // Load acknowledgements
        const { data: ackData } = await supabase
          .from('document_acknowledgements')
          .select('user_id, ack_type, created_at')
          .eq('pack_id', packId)
          .eq('org_id', orgId);

        if (ackData && ackData.length > 0) {
          const userIds = [...new Set(ackData.map(a => a.user_id))];
          const { data: profiles } = await supabase.from('profiles').select('id, name').in('id', userIds);
          const nameMap = new Map((profiles || []).map(p => [p.id, p.name || 'Unknown']));
          setAcknowledgements(ackData.map(a => ({
            user_id: a.user_id,
            user_name: nameMap.get(a.user_id) || 'Unknown',
            ack_type: a.ack_type,
            created_at: a.created_at,
          })));
        }
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinalisePack = async () => {
    if (!packId) return;
    setIsFinalising(true);
    try {
      const { error } = await supabase.rpc('finalise_board_pack', { _pack_id: packId });
      if (error) throw error;
      toast.success("This board pack is now locked and ready for distribution.");
      loadAssembledPack();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsFinalising(false);
    }
  };

  const handleUnlockPack = async () => {
    if (!packId) return;
    setIsUnlocking(true);
    try {
      const { error } = await supabase.rpc('unlock_board_pack', { _pack_id: packId });
      if (error) throw error;
      toast.success("This board pack has been returned to draft status.");
      loadAssembledPack();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleDistribute = async () => {
    if (!packId || !pack) return;
    setIsDistributing(true);
    try {
      // Get board members for this board
      const { data: memberships } = await supabase
        .from('board_memberships')
        .select('user_id')
        .eq('board_id', pack.board_id);

      if (!memberships || memberships.length === 0) {
        toast.error("No board members to distribute to.");
        return;
      }

      const { data: boardData } = await supabase
        .from('boards')
        .select('org_id')
        .eq('id', pack.board_id)
        .single();

      if (!boardData?.org_id) throw new Error('Board org not found');

      // Create acknowledgement records for each member (type = 'distributed')
      const acks = memberships.map(m => ({
        user_id: m.user_id,
        pack_id: packId,
        org_id: boardData.org_id,
        ack_type: 'distributed',
      }));

      const { error } = await supabase.from('document_acknowledgements').insert(acks);
      if (error) throw error;

      toast.success(`Sent to ${memberships.length} board member(s).`);
      loadAssembledPack();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsDistributing(false);
    }
  };

  const handleAcknowledge = async () => {
    if (!packId || !pack) return;
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) return;

      const { data: boardData } = await supabase
        .from('boards')
        .select('org_id')
        .eq('id', pack.board_id)
        .single();

      if (!boardData?.org_id) return;

      const { error } = await supabase.from('document_acknowledgements').insert({
        user_id: userData.user.id,
        pack_id: packId,
        org_id: boardData.org_id,
        ack_type: 'read',
      });
      if (error) throw error;
      toast.success("You have confirmed reading this pack.");
      loadAssembledPack();
    } catch (error: any) {
      toast.error(error.message);
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
      toast.error(error.message);
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
  const distributedCount = acknowledgements.filter(a => a.ack_type === 'distributed').length;
  const readCount = acknowledgements.filter(a => a.ack_type === 'read').length;

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
    <div className={`min-h-screen bg-background ${!isFinalised ? 'print-draft-watermark' : ''}`}>
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="flex items-center justify-between mb-6 print:hidden">
          <Button variant="ghost" onClick={() => navigate(`/pack/${packId}/sections`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Sections
          </Button>
          <div className="flex items-center gap-2">
            {isFinalised && canManagePack && distributedCount === 0 && (
              <Button variant="outline" onClick={handleDistribute} disabled={isDistributing}>
                <Send className="h-4 w-4 mr-2" />
                {isDistributing ? 'Distributing…' : 'Distribute to Board'}
              </Button>
            )}
            {isFinalised && (
              <Button variant="outline" size="sm" onClick={handleAcknowledge}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Acknowledge Read
              </Button>
            )}
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>

        {/* Finalised banner */}
        {isFinalised && (
          <div className="mb-6 p-4 rounded-lg border border-success/30 bg-success/5 flex items-center gap-3 print:hidden">
            <ShieldCheck className="h-5 w-5 text-success shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-sm">This pack has been finalised</p>
              {pack.finalised_at && (
                <p className="text-xs text-muted-foreground">
                  Locked on {new Date(pack.finalised_at).toLocaleDateString()} at {new Date(pack.finalised_at).toLocaleTimeString()}
                </p>
              )}
            </div>
            {canManagePack && (
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
                      This will return the pack to draft status, allowing further edits.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleUnlockPack}>Unlock Pack</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        )}

        {/* Distribution & Acknowledgement Tracking */}
        {isFinalised && (distributedCount > 0 || readCount > 0) && (
          <Card className="p-4 mb-6 print:hidden">
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Send className="h-4 w-4" /> Distribution Status
            </h3>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-muted-foreground">Distributed: <strong>{distributedCount}</strong></span>
              <span className="text-muted-foreground">Read: <strong>{readCount}</strong></span>
            </div>
            {acknowledgements.filter(a => a.ack_type === 'read').length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {acknowledgements.filter(a => a.ack_type === 'read').map(a => (
                  <Badge key={a.user_id} variant="secondary" className="text-xs">
                    {a.user_name} • {new Date(a.created_at).toLocaleDateString()}
                  </Badge>
                ))}
              </div>
            )}
          </Card>
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

            {!isFinalised && canManagePack && (
              <div className="print:hidden">
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
                        Once finalised, sections cannot be edited until unlocked.
                        {submittedCount < sections.length && (
                          <span className="block mt-2 text-warning font-medium">
                            Warning: {sections.length - submittedCount} section(s) not submitted.
                          </span>
                        )}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleFinalisePack}>Finalise Pack</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>
        </div>

        <Separator className="mb-8" />

        {/* AI Tools */}
        <div className="mb-8 print:hidden">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">AI Governance Tools</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleSummarisePack} disabled={governanceAI.isProcessing}>
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              {governanceAI.isProcessing ? 'Processing…' : 'Summarise Pack'}
            </Button>
            <Button variant="outline" size="sm" onClick={handleHighlightRisks} disabled={governanceAI.isProcessing}>
              <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
              Highlight Risks
            </Button>
            <Button variant="outline" size="sm" onClick={handleDirectorBriefing} disabled={governanceAI.isProcessing}>
              <Users className="h-3.5 w-3.5 mr-1.5" />
              New Director Briefing
            </Button>
          </div>

          {governanceAI.result && (
            <div className="mt-4">
              <AIResultPanel
                title={governanceAI.result.action.replace(/-/g, ' ').replace(/^\w/, c => c.toUpperCase())}
                result={governanceAI.result.result}
                generatedAt={governanceAI.result.generated_at}
                disclaimer={governanceAI.result.disclaimer}
                onClose={governanceAI.clearResult}
              />
            </div>
          )}
        </div>

        {governance && (
          <div className="space-y-6 mb-8" id="pack-governance">
            {/* Attendance */}
            {governance.attendance.length > 0 && (
              <div className="break-inside-avoid">
                <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" /> Attendance
                </h2>
                <Card className="p-4">
                  <div className="grid grid-cols-3 gap-2 text-sm font-medium border-b pb-2 mb-2">
                    <span>Member</span><span>Position</span><span>Status</span>
                  </div>
                  {governance.attendance.map((a, i) => (
                    <div key={i} className="grid grid-cols-3 gap-2 text-sm py-1">
                      <span>{a.name}</span>
                      <span className="text-muted-foreground">{a.position || '—'}</span>
                      <span>{a.attended ? <Badge variant="default" className="text-xs">Present</Badge> : <Badge variant="outline" className="text-xs">{a.apologies || 'Absent'}</Badge>}</span>
                    </div>
                  ))}
                </Card>
              </div>
            )}

            {/* Previous Meeting Minutes */}
            {governance.minutes && (
              <div className="break-inside-avoid">
                <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" /> Minutes of Previous Meeting
                </h2>
                <Card className="p-4">
                  <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap">
                    {governance.minutes}
                  </div>
                </Card>
              </div>
            )}

            {/* Declarations of Interest */}
            {governance.coi.length > 0 && (
              <div className="break-inside-avoid">
                <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" /> Declarations of Interest
                </h2>
                <Card className="p-4">
                  {governance.coi.map((c, i) => (
                    <div key={i} className="flex items-start justify-between py-1 text-sm border-b last:border-0">
                      <div>
                        <span className="font-medium">{c.member_name}</span>
                        <span className="text-muted-foreground ml-2">({c.type})</span>
                      </div>
                      <span className="text-muted-foreground max-w-[50%] text-right">{c.interest}</span>
                    </div>
                  ))}
                </Card>
              </div>
            )}

            {/* Decisions & Resolutions */}
            {governance.decisions.length > 0 && (
              <div className="break-inside-avoid">
                <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
                  <Gavel className="h-5 w-5 text-primary" /> Decisions & Resolutions
                </h2>
                <Card className="p-4">
                  {governance.decisions.map((d, i) => (
                    <div key={i} className="flex items-center justify-between py-1.5 text-sm border-b last:border-0">
                      <span className="font-medium">{d.title}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant={d.outcome === 'approved' ? 'default' : 'outline'} className="text-xs capitalize">{d.outcome || 'Noted'}</Badge>
                        {d.proposer && <span className="text-xs text-muted-foreground">{d.proposer}</span>}
                      </div>
                    </div>
                  ))}
                </Card>
              </div>
            )}

            {/* Action Log */}
            {governance.actions.length > 0 && (
              <div className="break-inside-avoid">
                <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
                  <ListChecks className="h-5 w-5 text-primary" /> Action Log
                </h2>
                <Card className="p-4">
                  <div className="grid grid-cols-4 gap-2 text-sm font-medium border-b pb-2 mb-2">
                    <span>Action</span><span>Owner</span><span>Due</span><span>Status</span>
                  </div>
                  {governance.actions.map((a, i) => (
                    <div key={i} className="grid grid-cols-4 gap-2 text-sm py-1">
                      <span>{a.title}</span>
                      <span className="text-muted-foreground">{a.owner || '—'}</span>
                      <span className="text-muted-foreground">{a.due_date ? new Date(a.due_date).toLocaleDateString() : '—'}</span>
                      <Badge variant={a.status === 'completed' ? 'default' : 'outline'} className="text-xs capitalize w-fit">{a.status || 'Pending'}</Badge>
                    </div>
                  ))}
                </Card>
              </div>
            )}

            <Separator />
          </div>
        )}

        {/* Assembled Sections (manual content) */}
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
