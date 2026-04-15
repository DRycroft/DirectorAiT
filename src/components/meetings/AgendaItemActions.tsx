import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
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
  Plus,
  Edit2,
  CheckCircle2,
  Circle,
  Clock,
  User,
  CalendarDays,
} from "lucide-react";
import { format } from "date-fns";

interface ActionItem {
  id: string;
  agenda_item_id: string | null;
  title: string;
  description: string | null;
  owner_id: string | null;
  due_date: string | null;
  status: string | null;
  created_at: string;
  updated_at: string;
}

interface BoardMemberOption {
  user_id: string;
  label: string;
}

interface AgendaItemActionsProps {
  agendaItemId: string;
  boardId: string;
}

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending", icon: Circle },
  { value: "in_progress", label: "In Progress", icon: Clock },
  { value: "completed", label: "Completed", icon: CheckCircle2 },
];

const statusBadgeVariant = (s: string | null): "default" | "secondary" | "outline" => {
  switch (s) {
    case "completed":
      return "default";
    case "in_progress":
      return "secondary";
    default:
      return "outline";
  }
};

const statusLabel = (s: string | null) => {
  const opt = STATUS_OPTIONS.find((o) => o.value === s);
  return opt?.label ?? "Pending";
};

const AgendaItemActions = ({ agendaItemId, boardId }: AgendaItemActionsProps) => {
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [members, setMembers] = useState<BoardMemberOption[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<ActionItem | null>(null);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState("pending");

  const fetchActions = useCallback(async () => {
    const { data, error } = await supabase
      .from("action_items")
      .select("*")
      .eq("agenda_item_id", agendaItemId)
      .order("created_at", { ascending: true });
    if (!error && data) setActions(data);
  }, [agendaItemId]);

  const fetchMembers = useCallback(async () => {
    const { data } = await supabase
      .from("board_memberships")
      .select("user_id")
      .eq("board_id", boardId);
    if (!data) return;

    const userIds = data.map((m) => m.user_id);
    if (userIds.length === 0) return;

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, name, email")
      .in("id", userIds);

    if (profiles) {
      setMembers(
        profiles.map((p) => ({
          user_id: p.id,
          label: p.name || p.email || p.id,
        }))
      );
    }
  }, [boardId]);

  useEffect(() => {
    fetchActions();
    fetchMembers();
  }, [fetchActions, fetchMembers]);

  const resetForm = () => {
    setEditItem(null);
    setTitle("");
    setDescription("");
    setOwnerId("");
    setDueDate("");
    setStatus("pending");
  };

  const openAdd = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (item: ActionItem) => {
    setEditItem(item);
    setTitle(item.title);
    setDescription(item.description ?? "");
    setOwnerId(item.owner_id ?? "");
    setDueDate(item.due_date ?? "");
    setStatus(item.status ?? "pending");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        owner_id: ownerId || null,
        due_date: dueDate || null,
        status,
      };

      if (editItem) {
        const { error } = await supabase
          .from("action_items")
          .update(payload)
          .eq("id", editItem.id);
        if (error) throw error;
        toast.success("Action item updated");
      } else {
        const { error } = await supabase.from("action_items").insert({
          ...payload,
          agenda_item_id: agendaItemId,
        });
        if (error) throw error;
        toast.success("Action item created");
      }
      setDialogOpen(false);
      resetForm();
      fetchActions();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save action item");
    } finally {
      setSaving(false);
    }
  };

  const toggleComplete = async (item: ActionItem) => {
    const newStatus = item.status === "completed" ? "pending" : "completed";
    try {
      const { error } = await supabase
        .from("action_items")
        .update({ status: newStatus })
        .eq("id", item.id);
      if (error) throw error;
      fetchActions();
    } catch {
      toast.error("Failed to update status");
    }
  };

  const ownerName = (ownerId: string | null) => {
    if (!ownerId) return null;
    const m = members.find((m) => m.user_id === ownerId);
    return m?.label ?? "Unknown";
  };

  if (actions.length === 0) {
    return (
      <div className="mt-2 ml-8">
        <Button
          variant="ghost"
          size="sm"
          className="text-xs h-6 px-2 text-muted-foreground"
          onClick={openAdd}
        >
          <Plus className="h-3 w-3 mr-1" /> Add Action
        </Button>
        <ActionDialog
          open={dialogOpen}
          onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}
          editItem={editItem}
          title={title}
          setTitle={setTitle}
          description={description}
          setDescription={setDescription}
          ownerId={ownerId}
          setOwnerId={setOwnerId}
          dueDate={dueDate}
          setDueDate={setDueDate}
          status={status}
          setStatus={setStatus}
          members={members}
          saving={saving}
          onSave={handleSave}
          onCancel={() => { setDialogOpen(false); resetForm(); }}
        />
      </div>
    );
  }

  return (
    <div className="mt-2 ml-8 space-y-1">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-muted-foreground">
          Actions ({actions.length})
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs h-6 px-2"
          onClick={openAdd}
        >
          <Plus className="h-3 w-3 mr-1" /> Add
        </Button>
      </div>
      {actions.map((item) => (
        <div
          key={item.id}
          className="flex items-start gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm"
        >
          <button
            onClick={() => toggleComplete(item)}
            className="mt-0.5 shrink-0"
            title={item.status === "completed" ? "Reopen" : "Complete"}
          >
            {item.status === "completed" ? (
              <CheckCircle2 className="h-4 w-4 text-primary" />
            ) : (
              <Circle className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          <div className="flex-1 min-w-0">
            <span
              className={
                item.status === "completed"
                  ? "line-through text-muted-foreground"
                  : ""
              }
            >
              {item.title}
            </span>
            <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
              {item.owner_id && (
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {ownerName(item.owner_id)}
                </span>
              )}
              {item.due_date && (
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" />
                  {format(new Date(item.due_date), "dd MMM yyyy")}
                </span>
              )}
              <Badge variant={statusBadgeVariant(item.status)} className="text-[10px] px-1.5 py-0">
                {statusLabel(item.status)}
              </Badge>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={() => openEdit(item)}
          >
            <Edit2 className="h-3 w-3" />
          </Button>
        </div>
      ))}
      <ActionDialog
        open={dialogOpen}
        onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}
        editItem={editItem}
        title={title}
        setTitle={setTitle}
        description={description}
        setDescription={setDescription}
        ownerId={ownerId}
        setOwnerId={setOwnerId}
        dueDate={dueDate}
        setDueDate={setDueDate}
        status={status}
        setStatus={setStatus}
        members={members}
        saving={saving}
        onSave={handleSave}
        onCancel={() => { setDialogOpen(false); resetForm(); }}
      />
    </div>
  );
};

// Extracted dialog component
interface ActionDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editItem: ActionItem | null;
  title: string;
  setTitle: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  ownerId: string;
  setOwnerId: (v: string) => void;
  dueDate: string;
  setDueDate: (v: string) => void;
  status: string;
  setStatus: (v: string) => void;
  members: BoardMemberOption[];
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
}

const ActionDialog = ({
  open,
  onOpenChange,
  editItem,
  title,
  setTitle,
  description,
  setDescription,
  ownerId,
  setOwnerId,
  dueDate,
  setDueDate,
  status,
  setStatus,
  members,
  saving,
  onSave,
  onCancel,
}: ActionDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>
          {editItem ? "Edit Action Item" : "Add Action Item"}
        </DialogTitle>
        <DialogDescription>
          {editItem
            ? "Update this action item."
            : "Create an action item linked to this agenda item."}
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-2">
        <div className="space-y-2">
          <Label htmlFor="action-title">Title *</Label>
          <Input
            id="action-title"
            placeholder="e.g. Follow up with auditor"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="action-desc">Description</Label>
          <Textarea
            id="action-desc"
            placeholder="Optional details"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="action-owner">Owner</Label>
            <Select value={ownerId} onValueChange={setOwnerId}>
              <SelectTrigger id="action-owner">
                <SelectValue placeholder="Select owner" />
              </SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.user_id} value={m.user_id}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="action-status">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="action-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="action-due">Due Date</Label>
          <Input
            id="action-due"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onSave} disabled={saving}>
          {saving ? "Saving…" : editItem ? "Update" : "Add"}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export default AgendaItemActions;
