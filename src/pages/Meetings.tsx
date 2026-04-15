import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Calendar, Edit2, CalendarDays } from "lucide-react";
import { format } from "date-fns";


interface Meeting {
  id: string;
  board_id: string;
  title: string;
  meeting_date: string;
  status: string | null;
  created_at: string;
  updated_at: string;
  board_title?: string;
}

interface BoardOption {
  id: string;
  title: string;
}

const statusColor = (status: string | null) => {
  switch (status) {
    case "finalised":
      return "default";
    case "in_progress":
      return "secondary";
    default:
      return "outline";
  }
};

const statusLabel = (status: string | null) => {
  switch (status) {
    case "finalised":
      return "Finalised";
    case "in_progress":
      return "In Progress";
    case "draft":
      return "Draft";
    default:
      return status ?? "Draft";
  }
};

const Meetings = () => {
  
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [boards, setBoards] = useState<BoardOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editMeeting, setEditMeeting] = useState<Meeting | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formBoardId, setFormBoardId] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formStatus, setFormStatus] = useState("draft");
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [agendasRes, boardsRes] = await Promise.all([
        supabase
          .from("agendas")
          .select("*")
          .order("meeting_date", { ascending: false }),
        supabase.from("boards").select("id, title").eq("status", "active"),
      ]);

      if (boardsRes.error) throw boardsRes.error;
      if (agendasRes.error) throw agendasRes.error;

      const boardMap = new Map(
        (boardsRes.data ?? []).map((b) => [b.id, b.title])
      );

      setBoards(boardsRes.data ?? []);
      setMeetings(
        (agendasRes.data ?? []).map((a) => ({
          ...a,
          board_title: boardMap.get(a.board_id) ?? "Unknown Board",
        }))
      );
    } catch (err: any) {
      toast.error("Failed to load meetings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetForm = () => {
    setFormTitle("");
    setFormBoardId("");
    setFormDate("");
    setFormStatus("draft");
    setEditMeeting(null);
  };

  const openCreate = () => {
    resetForm();
    setCreateOpen(true);
  };

  const openEdit = (m: Meeting) => {
    setEditMeeting(m);
    setFormTitle(m.title);
    setFormBoardId(m.board_id);
    setFormDate(m.meeting_date ? m.meeting_date.slice(0, 16) : "");
    setFormStatus(m.status ?? "draft");
    setCreateOpen(true);
  };

  const handleSave = async () => {
    if (!formTitle.trim() || !formBoardId || !formDate) {
      toast.error("Please fill in all required fields");
      return;
    }
    setSaving(true);
    try {
      if (editMeeting) {
        const { error } = await supabase
          .from("agendas")
          .update({
            title: formTitle.trim(),
            board_id: formBoardId,
            meeting_date: new Date(formDate).toISOString(),
            status: formStatus,
          })
          .eq("id", editMeeting.id);
        if (error) throw error;
        toast.success("Meeting updated");
      } else {
        const { error } = await supabase.from("agendas").insert({
          title: formTitle.trim(),
          board_id: formBoardId,
          meeting_date: new Date(formDate).toISOString(),
          status: formStatus,
        });
        if (error) throw error;
        toast.success("Meeting created");
      }
      setCreateOpen(false);
      resetForm();
      fetchData();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save meeting");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 pt-24 pb-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Meetings</h1>
            <p className="text-muted-foreground mt-1">
              Schedule, manage and track board meetings
            </p>
          </div>
          <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" />
                New Meeting
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editMeeting ? "Edit Meeting" : "New Meeting"}
                </DialogTitle>
                <DialogDescription>
                  {editMeeting
                    ? "Update meeting details."
                    : "Schedule a new board meeting."}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="meeting-title">Title *</Label>
                  <Input
                    id="meeting-title"
                    placeholder="e.g. Q2 Board Meeting"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="meeting-board">Board *</Label>
                  <Select value={formBoardId} onValueChange={setFormBoardId}>
                    <SelectTrigger id="meeting-board">
                      <SelectValue placeholder="Select a board" />
                    </SelectTrigger>
                    <SelectContent>
                      {boards.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="meeting-date">Date & Time *</Label>
                  <Input
                    id="meeting-date"
                    type="datetime-local"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="meeting-status">Status</Label>
                  <Select value={formStatus} onValueChange={setFormStatus}>
                    <SelectTrigger id="meeting-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="finalised">Finalised</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => { setCreateOpen(false); resetForm(); }}
                >
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving
                    ? "Saving…"
                    : editMeeting
                    ? "Update"
                    : "Create"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <CalendarDays className="h-8 w-8 animate-pulse text-muted-foreground" />
          </div>
        ) : meetings.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-1">No meetings yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first meeting to get started.
              </p>
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" />
                New Meeting
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {meetings.map((m) => (
              <Card key={m.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{m.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {m.board_title}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusColor(m.status)}>
                      {statusLabel(m.status)}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(m)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(m.meeting_date), "PPPp")}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Meetings;
