/**
 * Pack Sections Page
 * 
 * View and manage sections within a board pack.
 * Sections are locked when the pack is finalised.
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { ArrowLeft, FileText, CheckCircle2, Clock, Edit, Eye, Lock, ShieldCheck, Plus, Trash2, Sparkles, Loader2 } from 'lucide-react';
import { useBoardPacks } from '@/hooks/useBoardPacks';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "sonner";
import { getUserFriendlyError } from '@/lib/errorHandling';
import { autoPopulatePack } from '@/lib/autoPopulatePack';

interface PackWithSections {
  id: string;
  title: string;
  meeting_date: string;
  status: string | null;
  board_id: string;
}

export default function PackSections() {
  const { packId } = useParams<{ packId: string }>();
  const navigate = useNavigate();
  const { fetchPackSections } = useBoardPacks();
  
  const [pack, setPack] = useState<PackWithSections | null>(null);
  const [sections, setSections] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddSection, setShowAddSection] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [canAutoFill, setCanAutoFill] = useState(false);
  const [isAutoFilling, setIsAutoFilling] = useState(false);

  const isFinalised = pack?.status === 'finalised';

  useEffect(() => {
    loadPackData();
  }, [packId]);

  useEffect(() => {
    if (!packId) return;
    const channel = supabase
      .channel('pack-sections-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pack_sections', filter: `pack_id=eq.${packId}` }, () => { loadPackData(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [packId]);

  const loadPackData = async () => {
    if (!packId) return;
    setIsLoading(true);
    try {
      const { data: packData, error: packError } = await supabase
        .from('board_packs')
        .select('id, title, meeting_date, status, board_id')
        .eq('id', packId)
        .single();
      if (packError) throw packError;
      setPack(packData);

      const sectionsData = await fetchPackSections(packId);
      setSections(sectionsData || []);

      // Role check: super_admin / org_admin (org-scoped) / chair (board-scoped)
      const { data: { user } } = await supabase.auth.getUser();
      if (user && packData?.board_id) {
        const { data: board } = await supabase
          .from('boards').select('org_id').eq('id', packData.board_id).maybeSingle();
        const orgId = board?.org_id;
        const [superRes, adminRes, chairRes] = await Promise.all([
          supabase.rpc('has_role', { _user_id: user.id, _role: 'super_admin' }),
          orgId ? supabase.rpc('has_role', { _user_id: user.id, _role: 'org_admin', _org_id: orgId }) : Promise.resolve({ data: false } as any),
          orgId ? supabase.rpc('has_role', { _user_id: user.id, _role: 'chair', _org_id: orgId }) : Promise.resolve({ data: false } as any),
        ]);
        setCanAutoFill(!!(superRes.data || adminRes.data || chairRes.data));
      }
    } catch (error: any) {
      toast.error(getUserFriendlyError(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleAutoFill = async () => {
    if (!packId) return;
    setIsAutoFilling(true);
    try {
      const result = await autoPopulatePack(packId);
      const filled = result?.sections_filled ?? 0;
      const skippedHuman = result?.sections_skipped_human ?? 0;
      const skippedUnknown = result?.sections_skipped_unknown_kind ?? 0;
      const errCount = result?.errors?.length ?? 0;

      toast.success(`Auto-fill complete: ${filled} filled, ${skippedHuman + skippedUnknown} skipped${errCount ? `, ${errCount} error${errCount === 1 ? '' : 's'}` : ''}.`);

      if (skippedHuman > 0 && result?.skipped_human_titles?.length) {
        const list = result.skipped_human_titles.slice(0, 3).join(', ');
        const more = result.skipped_human_titles.length > 3 ? ` +${result.skipped_human_titles.length - 3} more` : '';
        toast.message('Sections preserved (manual content present)', { description: `${list}${more}` });
      }
      if (errCount > 0) {
        const first = result.errors[0];
        toast.error(`Some sections failed: ${first.section_title || first.section_id} — ${first.message}`);
      }
      loadPackData();
    } catch (error: any) {
      toast.error(getUserFriendlyError(error));
    } finally {
      setIsAutoFilling(false);
    }
  };

  const handleAddSection = async () => {
    if (!packId || !newSectionTitle.trim()) return;
    try {
      const maxOrder = sections.reduce((max, s) => Math.max(max, s.order_index || 0), -1);
      const { error } = await supabase.from('pack_sections').insert({
        pack_id: packId,
        title: newSectionTitle.trim(),
        order_index: maxOrder + 1,
        status: 'pending',
      });
      if (error) throw error;
      toast.success("Section added");
      setNewSectionTitle('');
      setShowAddSection(false);
      loadPackData();
    } catch (error: any) {
      toast.error(getUserFriendlyError(error));
    }
  };

  const handleRemoveSection = async (sectionId: string) => {
    try {
      const { error } = await supabase.from('pack_sections').delete().eq('id', sectionId);
      if (error) throw error;
      toast.success("Section removed");
      loadPackData();
    } catch (error: any) {
      toast.error(getUserFriendlyError(error));
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'submitted': return <CheckCircle2 className="h-5 w-5 text-success" />;
      case 'pending': return <Clock className="h-5 w-5 text-warning" />;
      default: return <FileText className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const handleSectionClick = (sectionId: string) => {
    if (isFinalised) {
      toast.success("Unlock the pack from the View Pack screen before editing sections.");
      return;
    }
    navigate(`/report-submission/${sectionId}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
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
          <Button onClick={() => navigate('/pack-management')}>Go Back</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <Button variant="ghost" onClick={() => navigate('/pack-management')} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Packs
        </Button>

        {/* Finalised banner */}
        {isFinalised && (
          <div className="mb-6 p-4 rounded-lg border border-success/30 bg-success/5 flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-success shrink-0" />
            <p className="text-sm font-semibold">This pack is finalised. Sections are locked.</p>
          </div>
        )}

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">{pack.title}</h1>
            <div className="flex items-center gap-3">
              <p className="text-muted-foreground">
                Meeting Date: {new Date(pack.meeting_date).toLocaleDateString()}
              </p>
              <span className={`px-2 py-0.5 rounded-full text-xs capitalize ${
                isFinalised ? 'bg-success/10 text-success font-medium' : 'bg-muted text-muted-foreground'
              }`}>
                {isFinalised && <Lock className="h-3 w-3 inline mr-1" />}
                {pack.status}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canAutoFill && !isFinalised && (
              <Button variant="outline" onClick={handleAutoFill} disabled={isAutoFilling}>
                {isAutoFilling ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                {isAutoFilling ? 'Auto-filling…' : 'Auto-fill from data'}
              </Button>
            )}
            <Button onClick={() => navigate(`/pack/${packId}/view`)}>
              <Eye className="h-4 w-4 mr-2" />
              View Pack
            </Button>
          </div>
        </div>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Pack Sections</h2>
            {!isFinalised && (
              <Dialog open={showAddSection} onOpenChange={setShowAddSection}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Section
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Section</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <Input
                      placeholder="Section title, e.g. CEO Report"
                      value={newSectionTitle}
                      onChange={(e) => setNewSectionTitle(e.target.value)}
                    />
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowAddSection(false)}>Cancel</Button>
                      <Button onClick={handleAddSection} disabled={!newSectionTitle.trim()}>Add</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
          
          {sections.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No sections in this pack. {!isFinalised && 'Add sections above.'}
            </div>
          ) : (
            <div className="space-y-3">
              {sections.map((section) => {
                const document = section.document?.[0];
                const versionNumber = document?.version_number || null;
                const isAutoSource = document?.source === 'auto';
                const updatedAt = section.updated_at ? new Date(section.updated_at) : null;
                
                return (
                  <Card
                    key={section.id}
                    className={`p-4 transition-colors ${isFinalised ? 'opacity-80' : 'cursor-pointer hover:bg-accent/50'}`}
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
                            {isAutoSource && (
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary inline-flex items-center gap-1">
                                <Sparkles className="h-3 w-3" /> Auto
                              </span>
                            )}
                            {versionNumber && <span>v{versionNumber}</span>}
                            {updatedAt && <span>Updated {updatedAt.toLocaleDateString()}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isFinalised ? (
                          <Lock className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <>
                            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleSectionClick(section.id); }}>
                              <Edit className="h-4 w-4 mr-2" />
                              {section.status === 'submitted' ? 'Edit' : 'Add Report'}
                            </Button>
                            {section.status !== 'submitted' && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="text-destructive" onClick={(e) => e.stopPropagation()}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Remove section?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will permanently remove "{section.title}" from the pack.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleRemoveSection(section.id)}>Remove</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </>
                        )}
                      </div>
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
