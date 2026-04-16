import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import AgendaItemActions from "@/components/meetings/AgendaItemActions";
import MeetingAttendance from "@/components/meetings/MeetingAttendance";
import Footer from "@/components/Footer";
import { useGovernanceAI } from "@/hooks/useGovernanceAI";
import AIResultPanel from "@/components/AIResultPanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  ArrowLeft,
  Plus,
  Edit2,
  Trash2,
  GripVertical,
  Calendar,
  Clock,
  ListOrdered,
  FileText,
  Gavel,
  Save,
  Lock,
  ClipboardList,
  Sparkles,
} from "lucide-react";
import { format } from "date-fns";

interface Agenda {
  id: string;
  board_id: string;
  title: string;
  meeting_date: string;
  status: string | null;
  minutes_content: string | null;
}

interface AgendaItem {
  id: string;
  agenda_id: string;
  title: string;
  description: string | null;
  item_order: number;
  estimated_duration: number | null;
  required_reading: boolean | null;
}

interface Decision {
  id: string;
  agenda_id: string;
  title: string;
  description: string | null;
  decision_date: string;
  outcome: string | null;
  proposer: string | null;
}

const statusLabel = (s: string | null) => {
  switch (s) {
    case "finalised":
      return "Finalised";
    case "in_progress":
      return "In Progress";
    default:
      return "Draft";
  }
};

const statusVariant = (s: string | null): "default" | "secondary" | "outline" => {
  switch (s) {
    case "finalised":
      return "default";
    case "in_progress":
      return "secondary";
    default:
      return "outline";
  }
};

const outcomeVariant = (o: string | null): "default" | "secondary" | "destructive" | "outline" => {
  switch (o) {
    case "approved":
      return "default";
    case "rejected":
      return "destructive";
    case "deferred":
      return "secondary";
    default:
      return "outline";
  }
};

const MeetingDetail = () => {
  const { meetingId } = useParams<{ meetingId: string }>();
  const [agenda, setAgenda] = useState<Agenda | null>(null);
  const [boardTitle, setBoardTitle] = useState("");
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);

  // Minutes state
  const [minutesContent, setMinutesContent] = useState("");
  const [minutesSaving, setMinutesSaving] = useState(false);
  const [minutesDirty, setMinutesDirty] = useState(false);
  const [transcriptInput, setTranscriptInput] = useState("");
  const [showTranscriptInput, setShowTranscriptInput] = useState(false);
  const governanceAI = useGovernanceAI();

  // Item form state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<AgendaItem | null>(null);
  const [itemTitle, setItemTitle] = useState("");
  const [itemDesc, setItemDesc] = useState("");
  const [itemDuration, setItemDuration] = useState("");
  const [saving, setSaving] = useState(false);

  // Decision form state
  const [decisionDialogOpen, setDecisionDialogOpen] = useState(false);
  const [editDecision, setEditDecision] = useState<Decision | null>(null);
  const [decTitle, setDecTitle] = useState("");
  const [decDescription, setDecDescription] = useState("");
  const [decOutcome, setDecOutcome] = useState("approved");
  const [decProposer, setDecProposer] = useState("");
  const [decDate, setDecDate] = useState("");
  const [decSaving, setDecSaving] = useState(false);

  const fetchData = useCallback(async () => {
    if (!meetingId) return;
    setLoading(true);
    try {
      const { data: agendaData, error: aErr } = await supabase
        .from("agendas")
        .select("*")
        .eq("id", meetingId)
        .single();
      if (aErr) throw aErr;
      setAgenda(agendaData);
      setMinutesContent(agendaData.minutes_content ?? "");
      setMinutesDirty(false);

      const [boardRes, itemsRes, decisionsRes] = await Promise.all([
        supabase.from("boards").select("title").eq("id", agendaData.board_id).single(),
        supabase.from("agenda_items").select("*").eq("agenda_id", meetingId).order("item_order", { ascending: true }),
        supabase.from("meeting_decisions").select("*").eq("agenda_id", meetingId).order("decision_date", { ascending: false }),
      ]);

      setBoardTitle(boardRes.data?.title ?? "Unknown Board");
      if (itemsRes.error) throw itemsRes.error;
      setItems(itemsRes.data ?? []);
      setDecisions((decisionsRes.data ?? []) as Decision[]);
    } catch {
      toast.error("Failed to load meeting details");
    } finally {
      setLoading(false);
    }
  }, [meetingId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- Minutes ---
  const saveMinutes = async () => {
    if (!meetingId) return;
    setMinutesSaving(true);
    try {
      const { error } = await supabase
        .from("agendas")
        .update({ minutes_content: minutesContent || null })
        .eq("id", meetingId);
      if (error) throw error;
      toast.success("Minutes saved");
      setMinutesDirty(false);
    } catch {
      toast.error("Failed to save minutes");
    } finally {
      setMinutesSaving(false);
    }
  };

  // --- Agenda items ---
  const resetItemForm = () => {
    setEditItem(null);
    setItemTitle("");
    setItemDesc("");
    setItemDuration("");
  };

  const openAddItem = () => { resetItemForm(); setDialogOpen(true); };

  const openEditItem = (item: AgendaItem) => {
    setEditItem(item);
    setItemTitle(item.title);
    setItemDesc(item.description ?? "");
    setItemDuration(item.estimated_duration?.toString() ?? "");
    setDialogOpen(true);
  };

  const handleSaveItem = async () => {
    if (!itemTitle.trim() || !meetingId) { toast.error("Title is required"); return; }
    setSaving(true);
    try {
      const duration = itemDuration ? parseInt(itemDuration, 10) : null;
      if (editItem) {
        const { error } = await supabase.from("agenda_items").update({ title: itemTitle.trim(), description: itemDesc.trim() || null, estimated_duration: duration }).eq("id", editItem.id);
        if (error) throw error;
        toast.success("Agenda item updated");
      } else {
        const nextOrder = items.length > 0 ? Math.max(...items.map((i) => i.item_order)) + 1 : 0;
        const { error } = await supabase.from("agenda_items").insert({ agenda_id: meetingId, title: itemTitle.trim(), description: itemDesc.trim() || null, estimated_duration: duration, item_order: nextOrder });
        if (error) throw error;
        toast.success("Agenda item added");
      }
      setDialogOpen(false);
      resetItemForm();
      fetchData();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save agenda item");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      const { error } = await supabase.from("agenda_items").delete().eq("id", itemId);
      if (error) throw error;
      toast.success("Agenda item removed");
      fetchData();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to delete agenda item");
    }
  };

  const moveItem = async (index: number, direction: "up" | "down") => {
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= items.length) return;
    const a = items[index];
    const b = items[swapIndex];
    try {
      await Promise.all([
        supabase.from("agenda_items").update({ item_order: b.item_order }).eq("id", a.id),
        supabase.from("agenda_items").update({ item_order: a.item_order }).eq("id", b.id),
      ]);
      fetchData();
    } catch {
      toast.error("Failed to reorder items");
    }
  };

  // --- Decisions ---
  const resetDecisionForm = () => {
    setEditDecision(null);
    setDecTitle("");
    setDecDescription("");
    setDecOutcome("approved");
    setDecProposer("");
    setDecDate("");
  };

  const openAddDecision = () => {
    resetDecisionForm();
    if (agenda) setDecDate(agenda.meeting_date.slice(0, 10));
    setDecisionDialogOpen(true);
  };

  const openEditDecision = (d: Decision) => {
    setEditDecision(d);
    setDecTitle(d.title);
    setDecDescription(d.description ?? "");
    setDecOutcome(d.outcome ?? "approved");
    setDecProposer(d.proposer ?? "");
    setDecDate(d.decision_date);
    setDecisionDialogOpen(true);
  };

  const handleSaveDecision = async () => {
    if (!decTitle.trim() || !meetingId) { toast.error("Decision title is required"); return; }
    setDecSaving(true);
    try {
      const payload = {
        title: decTitle.trim(),
        description: decDescription.trim() || null,
        outcome: decOutcome,
        proposer: decProposer.trim() || null,
        decision_date: decDate || new Date().toISOString().slice(0, 10),
      };
      if (editDecision) {
        const { error } = await supabase.from("meeting_decisions").update(payload).eq("id", editDecision.id);
        if (error) throw error;
        toast.success("Decision updated");
      } else {
        const { error } = await supabase.from("meeting_decisions").insert({ ...payload, agenda_id: meetingId });
        if (error) throw error;
        toast.success("Decision recorded");
      }
      setDecisionDialogOpen(false);
      resetDecisionForm();
      fetchData();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save decision");
    } finally {
      setDecSaving(false);
    }
  };

  const handleDeleteDecision = async (id: string) => {
    try {
      const { error } = await supabase.from("meeting_decisions").delete().eq("id", id);
      if (error) throw error;
      toast.success("Decision removed");
      fetchData();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to delete decision");
    }
  };

  const handleCreateActionFromDecision = async (decision: Decision) => {
    if (!meetingId) return;
    try {
      const { error } = await supabase.from("action_items").insert({
        title: `Action: ${decision.title}`,
        description: decision.description,
        extracted_decision_id: decision.id,
        status: "pending",
      });
      if (error) throw error;
      toast.success("Action created from decision");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to create action");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 pt-24 pb-12">
          <div className="flex items-center justify-center py-20">
            <ListOrdered className="h-8 w-8 animate-pulse text-muted-foreground" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!agenda) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 pt-24 pb-12">
          <p className="text-muted-foreground">Meeting not found.</p>
          <Button variant="link" asChild className="mt-2 p-0">
            <Link to="/meetings"><ArrowLeft className="h-4 w-4 mr-1" /> Back to Meetings</Link>
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  const totalDuration = items.reduce((sum, i) => sum + (i.estimated_duration ?? 0), 0);
  const isFinalised = agenda?.status === "finalised";

  const handleCloseMeeting = async () => {
    if (!agenda || !meetingId) return;
    const confirmed = window.confirm(
      "Close this meeting? This will mark it as finalised. You can still unlock it later if needed."
    );
    if (!confirmed) return;
    try {
      const { error } = await supabase
        .from("agendas")
        .update({ status: "finalised" })
        .eq("id", meetingId);
      if (error) throw error;
      toast.success("Meeting closed and finalised");
      fetchData();
    } catch {
      toast.error("Failed to close meeting");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 pt-24 pb-12">
        {/* Back link */}
        <Button variant="link" asChild className="mb-4 p-0 print:hidden">
          <Link to="/meetings"><ArrowLeft className="h-4 w-4 mr-1" /> Back to Meetings</Link>
        </Button>

        {/* Meeting header */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">{agenda.title}</h1>
            <p className="text-muted-foreground mt-1">{boardTitle}</p>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {format(new Date(agenda.meeting_date), "PPPp")}
              </span>
              {totalDuration > 0 && (
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />{totalDuration} min total
                </span>
              )}
            </div>
          </div>
          {!isFinalised && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleCloseMeeting}
            >
              <Lock className="h-4 w-4 mr-1" /> Close Meeting
            </Button>
          )}
          <Badge variant={statusVariant(agenda.status)}>{statusLabel(agenda.status)}</Badge>
        </div>

        {/* ===== ATTENDANCE & QUORUM ===== */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Attendance & Quorum</h2>
          <MeetingAttendance
            agendaId={agenda.id}
            boardId={agenda.board_id}
            isFinalised={isFinalised}
          />
        </div>

        {/* ===== AGENDA ITEMS ===== */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Agenda Items</h2>
          <Button size="sm" onClick={openAddItem}><Plus className="h-4 w-4 mr-1" /> Add Item</Button>
        </div>

        {items.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <ListOrdered className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground mb-3">No agenda items yet. Add the first item to build your agenda.</p>
              <Button size="sm" onClick={openAddItem}><Plus className="h-4 w-4 mr-1" /> Add Item</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {items.map((item, idx) => (
              <Card key={item.id}>
                <CardHeader className="flex flex-row items-start gap-3 space-y-0 py-3 px-4">
                  <div className="flex flex-col items-center gap-0.5 pt-1">
                    <Button variant="ghost" size="icon" className="h-5 w-5" disabled={idx === 0} onClick={() => moveItem(idx, "up")}>
                      <GripVertical className="h-3 w-3 rotate-90" />
                    </Button>
                    <span className="text-xs font-mono text-muted-foreground">{idx + 1}</span>
                    <Button variant="ghost" size="icon" className="h-5 w-5" disabled={idx === items.length - 1} onClick={() => moveItem(idx, "down")}>
                      <GripVertical className="h-3 w-3 rotate-90" />
                    </Button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base">{item.title}</CardTitle>
                    {item.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{item.description}</p>}
                    {item.estimated_duration && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><Clock className="h-3 w-3" />{item.estimated_duration} min</span>
                    )}
                    {agenda && <AgendaItemActions agendaItemId={item.id} boardId={agenda.board_id} />}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditItem(item)}><Edit2 className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteItem(item.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}

        {/* ===== MINUTES ===== */}
        <div className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5" /> Meeting Minutes
            </h2>
            <Button
              size="sm"
              onClick={saveMinutes}
              disabled={minutesSaving || !minutesDirty}
            >
              <Save className="h-4 w-4 mr-1" />
              {minutesSaving ? "Saving…" : "Save Minutes"}
            </Button>
          </div>
          <Card>
            <CardContent className="pt-4">
              <Textarea
                placeholder="Record meeting minutes here…"
                value={minutesContent}
                onChange={(e) => { setMinutesContent(e.target.value); setMinutesDirty(true); }}
                rows={10}
                className="resize-y min-h-[200px]"
              />
              {minutesDirty && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">Unsaved changes</p>
              )}
            </CardContent>
          </Card>

          {/* AI Transcript Tools */}
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">AI Tools</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowTranscriptInput(!showTranscriptInput)}>
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                {showTranscriptInput ? 'Hide Transcript Input' : 'Paste Transcript'}
              </Button>
              {showTranscriptInput && transcriptInput.trim() && (
                <>
                  <Button
                    variant="outline" size="sm"
                    disabled={governanceAI.isProcessing}
                    onClick={async () => {
                      const res = await governanceAI.execute({
                        action: 'transcript-to-minutes',
                        agendaId: meetingId,
                        transcript: transcriptInput,
                      });
                      if (res?.result) {
                        setMinutesContent(res.result);
                        setMinutesDirty(true);
                      }
                    }}
                  >
                    <FileText className="h-3.5 w-3.5 mr-1.5" />
                    {governanceAI.isProcessing ? 'Processing…' : 'Generate Minutes'}
                  </Button>
                  <Button
                    variant="outline" size="sm"
                    disabled={governanceAI.isProcessing}
                    onClick={() => governanceAI.execute({
                      action: 'transcript-to-actions',
                      transcript: transcriptInput,
                    })}
                  >
                    <ClipboardList className="h-3.5 w-3.5 mr-1.5" />
                    Extract Actions & Decisions
                  </Button>
                </>
              )}
            </div>
            {showTranscriptInput && (
              <Card>
                <CardContent className="pt-4">
                  <Textarea
                    placeholder="Paste your meeting transcript or notes here…"
                    value={transcriptInput}
                    onChange={(e) => setTranscriptInput(e.target.value)}
                    rows={6}
                    className="resize-y min-h-[120px]"
                  />
                </CardContent>
              </Card>
            )}
            {governanceAI.result && (
              <AIResultPanel
                title={governanceAI.result.action.replace(/-/g, ' ').replace(/^\w/, c => c.toUpperCase())}
                result={governanceAI.result.result}
                generatedAt={governanceAI.result.generated_at}
                disclaimer={governanceAI.result.disclaimer}
                onClose={governanceAI.clearResult}
              />
            )}
          </div>
        </div>

        {/* ===== DECISIONS ===== */}
        <div className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Gavel className="h-5 w-5" /> Decisions & Resolutions
            </h2>
            <Button size="sm" onClick={openAddDecision}><Plus className="h-4 w-4 mr-1" /> Record Decision</Button>
          </div>

          {decisions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Gavel className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-muted-foreground mb-3">No decisions recorded yet.</p>
                <Button size="sm" onClick={openAddDecision}><Plus className="h-4 w-4 mr-1" /> Record Decision</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {decisions.map((d) => (
                <Card key={d.id}>
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 py-3 px-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-base">{d.title}</CardTitle>
                        <Badge variant={outcomeVariant(d.outcome)}>
                          {(d.outcome ?? "recorded").charAt(0).toUpperCase() + (d.outcome ?? "recorded").slice(1)}
                        </Badge>
                      </div>
                      {d.description && <p className="text-sm text-muted-foreground mt-1">{d.description}</p>}
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>{format(new Date(d.decision_date), "PP")}</span>
                        {d.proposer && <span>Proposed by: {d.proposer}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Create action from decision" onClick={() => handleCreateActionFromDecision(d)}><ClipboardList className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDecision(d)}><Edit2 className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteDecision(d.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Agenda item dialog */}
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetItemForm(); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editItem ? "Edit Agenda Item" : "Add Agenda Item"}</DialogTitle>
              <DialogDescription>{editItem ? "Update this agenda item." : "Add a new item to the meeting agenda."}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="item-title">Title *</Label>
                <Input id="item-title" placeholder="e.g. CEO Report" value={itemTitle} onChange={(e) => setItemTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="item-desc">Description</Label>
                <Textarea id="item-desc" placeholder="Optional description or notes" value={itemDesc} onChange={(e) => setItemDesc(e.target.value)} rows={3} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="item-duration">Estimated Duration (minutes)</Label>
                <Input id="item-duration" type="number" min="1" placeholder="e.g. 15" value={itemDuration} onChange={(e) => setItemDuration(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setDialogOpen(false); resetItemForm(); }}>Cancel</Button>
              <Button onClick={handleSaveItem} disabled={saving}>{saving ? "Saving…" : editItem ? "Update" : "Add"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Decision dialog */}
        <Dialog open={decisionDialogOpen} onOpenChange={(o) => { setDecisionDialogOpen(o); if (!o) resetDecisionForm(); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editDecision ? "Edit Decision" : "Record Decision"}</DialogTitle>
              <DialogDescription>{editDecision ? "Update this decision record." : "Record a decision or resolution from this meeting."}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="dec-title">Decision Title *</Label>
                <Input id="dec-title" placeholder="e.g. Approved Q3 budget" value={decTitle} onChange={(e) => setDecTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dec-desc">Description / Wording</Label>
                <Textarea id="dec-desc" placeholder="Full wording of the decision" value={decDescription} onChange={(e) => setDecDescription(e.target.value)} rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dec-outcome">Outcome</Label>
                  <Select value={decOutcome} onValueChange={setDecOutcome}>
                    <SelectTrigger id="dec-outcome"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="deferred">Deferred</SelectItem>
                      <SelectItem value="noted">Noted</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dec-date">Decision Date</Label>
                  <Input id="dec-date" type="date" value={decDate} onChange={(e) => setDecDate(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dec-proposer">Proposer</Label>
                <Input id="dec-proposer" placeholder="e.g. Chair, CFO" value={decProposer} onChange={(e) => setDecProposer(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setDecisionDialogOpen(false); resetDecisionForm(); }}>Cancel</Button>
              <Button onClick={handleSaveDecision} disabled={decSaving}>{decSaving ? "Saving…" : editDecision ? "Update" : "Record"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
      <Footer />
    </div>
  );
};

export default MeetingDetail;
