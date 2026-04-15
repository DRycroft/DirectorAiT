import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
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
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
} from "lucide-react";
import { format } from "date-fns";

interface Agenda {
  id: string;
  board_id: string;
  title: string;
  meeting_date: string;
  status: string | null;
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

const MeetingDetail = () => {
  const { meetingId } = useParams<{ meetingId: string }>();
  const [agenda, setAgenda] = useState<Agenda | null>(null);
  const [boardTitle, setBoardTitle] = useState("");
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Item form state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<AgendaItem | null>(null);
  const [itemTitle, setItemTitle] = useState("");
  const [itemDesc, setItemDesc] = useState("");
  const [itemDuration, setItemDuration] = useState("");
  const [saving, setSaving] = useState(false);

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

      const [boardRes, itemsRes] = await Promise.all([
        supabase
          .from("boards")
          .select("title")
          .eq("id", agendaData.board_id)
          .single(),
        supabase
          .from("agenda_items")
          .select("*")
          .eq("agenda_id", meetingId)
          .order("item_order", { ascending: true }),
      ]);

      setBoardTitle(boardRes.data?.title ?? "Unknown Board");
      if (itemsRes.error) throw itemsRes.error;
      setItems(itemsRes.data ?? []);
    } catch (err: any) {
      toast.error("Failed to load meeting details");
    } finally {
      setLoading(false);
    }
  }, [meetingId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resetItemForm = () => {
    setEditItem(null);
    setItemTitle("");
    setItemDesc("");
    setItemDuration("");
  };

  const openAddItem = () => {
    resetItemForm();
    setDialogOpen(true);
  };

  const openEditItem = (item: AgendaItem) => {
    setEditItem(item);
    setItemTitle(item.title);
    setItemDesc(item.description ?? "");
    setItemDuration(item.estimated_duration?.toString() ?? "");
    setDialogOpen(true);
  };

  const handleSaveItem = async () => {
    if (!itemTitle.trim() || !meetingId) {
      toast.error("Title is required");
      return;
    }
    setSaving(true);
    try {
      const duration = itemDuration ? parseInt(itemDuration, 10) : null;

      if (editItem) {
        const { error } = await supabase
          .from("agenda_items")
          .update({
            title: itemTitle.trim(),
            description: itemDesc.trim() || null,
            estimated_duration: duration,
          })
          .eq("id", editItem.id);
        if (error) throw error;
        toast.success("Agenda item updated");
      } else {
        const nextOrder =
          items.length > 0
            ? Math.max(...items.map((i) => i.item_order)) + 1
            : 0;
        const { error } = await supabase.from("agenda_items").insert({
          agenda_id: meetingId,
          title: itemTitle.trim(),
          description: itemDesc.trim() || null,
          estimated_duration: duration,
          item_order: nextOrder,
        });
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
      const { error } = await supabase
        .from("agenda_items")
        .delete()
        .eq("id", itemId);
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
        supabase
          .from("agenda_items")
          .update({ item_order: b.item_order })
          .eq("id", a.id),
        supabase
          .from("agenda_items")
          .update({ item_order: a.item_order })
          .eq("id", b.id),
      ]);
      fetchData();
    } catch {
      toast.error("Failed to reorder items");
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
            <Link to="/meetings">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to Meetings
            </Link>
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  const totalDuration = items.reduce(
    (sum, i) => sum + (i.estimated_duration ?? 0),
    0
  );

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 pt-24 pb-12">
        {/* Back link */}
        <Button variant="link" asChild className="mb-4 p-0 print:hidden">
          <Link to="/meetings">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Meetings
          </Link>
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
                  <Clock className="h-4 w-4" />
                  {totalDuration} min total
                </span>
              )}
            </div>
          </div>
          <Badge variant={statusVariant(agenda.status)}>
            {statusLabel(agenda.status)}
          </Badge>
        </div>

        {/* Agenda section */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Agenda Items</h2>
          <Button size="sm" onClick={openAddItem}>
            <Plus className="h-4 w-4 mr-1" /> Add Item
          </Button>
        </div>

        {items.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <ListOrdered className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground mb-3">
                No agenda items yet. Add the first item to build your agenda.
              </p>
              <Button size="sm" onClick={openAddItem}>
                <Plus className="h-4 w-4 mr-1" /> Add Item
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {items.map((item, idx) => (
              <Card key={item.id}>
                <CardHeader className="flex flex-row items-start gap-3 space-y-0 py-3 px-4">
                  {/* Reorder controls */}
                  <div className="flex flex-col items-center gap-0.5 pt-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      disabled={idx === 0}
                      onClick={() => moveItem(idx, "up")}
                    >
                      <GripVertical className="h-3 w-3 rotate-90" />
                    </Button>
                    <span className="text-xs font-mono text-muted-foreground">
                      {idx + 1}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      disabled={idx === items.length - 1}
                      onClick={() => moveItem(idx, "down")}
                    >
                      <GripVertical className="h-3 w-3 rotate-90" />
                    </Button>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base">{item.title}</CardTitle>
                    {item.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {item.description}
                      </p>
                    )}
                    {item.estimated_duration && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Clock className="h-3 w-3" />
                        {item.estimated_duration} min
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => openEditItem(item)}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => handleDeleteItem(item.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}

        {/* Add / Edit item dialog */}
        <Dialog
          open={dialogOpen}
          onOpenChange={(o) => {
            setDialogOpen(o);
            if (!o) resetItemForm();
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editItem ? "Edit Agenda Item" : "Add Agenda Item"}
              </DialogTitle>
              <DialogDescription>
                {editItem
                  ? "Update this agenda item."
                  : "Add a new item to the meeting agenda."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="item-title">Title *</Label>
                <Input
                  id="item-title"
                  placeholder="e.g. CEO Report"
                  value={itemTitle}
                  onChange={(e) => setItemTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="item-desc">Description</Label>
                <Textarea
                  id="item-desc"
                  placeholder="Optional description or notes"
                  value={itemDesc}
                  onChange={(e) => setItemDesc(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="item-duration">
                  Estimated Duration (minutes)
                </Label>
                <Input
                  id="item-duration"
                  type="number"
                  min="1"
                  placeholder="e.g. 15"
                  value={itemDuration}
                  onChange={(e) => setItemDuration(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setDialogOpen(false);
                  resetItemForm();
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveItem} disabled={saving}>
                {saving ? "Saving…" : editItem ? "Update" : "Add"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
      <Footer />
    </div>
  );
};

export default MeetingDetail;
