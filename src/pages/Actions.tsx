import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { AlertTriangle, ClipboardList, Clock, Edit2, Loader2, Plus, User } from "lucide-react";
import { format, isPast, isToday, differenceInCalendarDays } from "date-fns";
import { Link } from "react-router-dom";

interface ActionItem {
  id: string;
  title: string;
  description: string | null;
  owner_id: string | null;
  due_date: string | null;
  status: string | null;
  agenda_item_id: string | null;
  created_at: string;
  agenda_title?: string;
  meeting_title?: string;
  meeting_id?: string;
  meeting_date?: string | null;
  owner_name?: string | null;
}

interface OwnerOption {
  id: string;
  name: string;
}

const STATUS_OPTIONS = ["pending", "in_progress", "completed"] as const;

const isOverdue = (item: ActionItem) =>
  !!(
    item.due_date &&
    item.status !== "completed" &&
    isPast(new Date(item.due_date)) &&
    !isToday(new Date(item.due_date))
  );

const daysOverdue = (dueDate: string) =>
  differenceInCalendarDays(new Date(), new Date(dueDate));

const daysOpen = (createdAt: string) =>
  differenceInCalendarDays(new Date(), new Date(createdAt));

const statusBadge = (item: ActionItem) => {
  if (isOverdue(item)) {
    return (
      <Badge variant="destructive">
        Overdue {item.due_date ? `(${daysOverdue(item.due_date)}d)` : ""}
      </Badge>
    );
  }
  switch (item.status) {
    case "completed":
      return <Badge variant="default">Completed</Badge>;
    case "in_progress":
      return <Badge variant="secondary">In Progress</Badge>;
    default:
      return <Badge variant="outline">Pending</Badge>;
  }
};

const Actions = () => {
  const [items, setItems] = useState<ActionItem[]>([]);
  const [owners, setOwners] = useState<OwnerOption[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterOwner, setFilterOwner] = useState<string>("all");
  const [filterOverdue, setFilterOverdue] = useState(false);

  // Create/Edit dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ActionItem | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formOwnerId, setFormOwnerId] = useState("");
  const [formDueDate, setFormDueDate] = useState("");
  const [formStatus, setFormStatus] = useState("pending");
  const [formSaving, setFormSaving] = useState(false);
  const [allProfiles, setAllProfiles] = useState<OwnerOption[]>([]);

  const fetchActions = async () => {
    setLoading(true);
    try {
      const { data: actionData, error: actionErr } = await supabase
        .from("action_items")
        .select("*, agenda_items!agenda_item_id(title, agenda_id, agendas!agenda_id(id, title, meeting_date))")
        .order("created_at", { ascending: false });

      if (actionErr) throw actionErr;

      const ownerIds = [
        ...new Set(
          (actionData ?? []).map((a) => a.owner_id).filter(Boolean) as string[]
        ),
      ];

      const profileMap = new Map<string, string>();
      if (ownerIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, name")
          .in("id", ownerIds);
        (profiles ?? []).forEach((p) => profileMap.set(p.id, p.name ?? p.id));
      }

      const mapped: ActionItem[] = (actionData ?? []).map((a: any) => {
        const agendaItem = a.agenda_items;
        const agenda = agendaItem?.agendas;
        return {
          id: a.id,
          title: a.title,
          description: a.description,
          owner_id: a.owner_id,
          due_date: a.due_date,
          status: a.status,
          agenda_item_id: a.agenda_item_id,
          created_at: a.created_at,
          agenda_title: agendaItem?.title ?? null,
          meeting_title: agenda?.title ?? null,
          meeting_id: agenda?.id ?? null,
          meeting_date: agenda?.meeting_date ?? null,
          owner_name: a.owner_id ? profileMap.get(a.owner_id) ?? "Unknown" : null,
        };
      });

      setItems(mapped);

      const uniqueOwners: OwnerOption[] = [];
      const seen = new Set<string>();
      mapped.forEach((m) => {
        if (m.owner_id && !seen.has(m.owner_id)) {
          seen.add(m.owner_id);
          uniqueOwners.push({ id: m.owner_id, name: m.owner_name ?? m.owner_id });
        }
      });
      setOwners(uniqueOwners);
    } catch {
      toast.error("Failed to load actions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActions();
  }, []);

  const updateStatus = async (itemId: string, newStatus: string) => {
    const { error } = await supabase
      .from("action_items")
      .update({ status: newStatus })
      .eq("id", itemId);
    if (error) {
      toast.error("Failed to update status");
      return;
    }
    toast.success("Status updated");
    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, status: newStatus } : i))
    );
  };

  // Fetch profiles for owner picker
  const fetchProfiles = async () => {
    const { data } = await supabase.from("profiles").select("id, name").order("name");
    if (data) setAllProfiles(data.map((p) => ({ id: p.id, name: p.name ?? p.id })));
  };

  const resetForm = () => {
    setEditingItem(null);
    setFormTitle("");
    setFormDesc("");
    setFormOwnerId("");
    setFormDueDate("");
    setFormStatus("pending");
  };

  const openCreate = () => {
    resetForm();
    fetchProfiles();
    setDialogOpen(true);
  };

  const openEdit = (item: ActionItem) => {
    setEditingItem(item);
    setFormTitle(item.title);
    setFormDesc(item.description ?? "");
    setFormOwnerId(item.owner_id ?? "");
    setFormDueDate(item.due_date ?? "");
    setFormStatus(item.status ?? "pending");
    fetchProfiles();
    setDialogOpen(true);
  };

  const handleSaveAction = async () => {
    if (!formTitle.trim()) { toast.error("Title is required"); return; }
    setFormSaving(true);
    try {
      const payload = {
        title: formTitle.trim(),
        description: formDesc.trim() || null,
        owner_id: formOwnerId || null,
        due_date: formDueDate || null,
        status: formStatus,
      };
      if (editingItem) {
        const { error } = await supabase.from("action_items").update(payload).eq("id", editingItem.id);
        if (error) throw error;
        toast.success("Action updated");
      } else {
        const { error } = await supabase.from("action_items").insert(payload);
        if (error) throw error;
        toast.success("Action created");
      }
      setDialogOpen(false);
      resetForm();
      fetchActions();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save action");
    } finally {
      setFormSaving(false);
    }
  };

  // Filters
  const filtered = items.filter((item) => {
    if (filterStatus !== "all" && item.status !== filterStatus) return false;
    if (filterOwner !== "all" && item.owner_id !== filterOwner) return false;
    if (filterOverdue && !isOverdue(item)) return false;
    return true;
  });

  // Sort: overdue first, then by due date asc, then created_at desc
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aOver = isOverdue(a);
      const bOver = isOverdue(b);
      if (aOver && !bOver) return -1;
      if (!aOver && bOver) return 1;
      if (a.due_date && b.due_date) return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      if (a.due_date) return -1;
      if (b.due_date) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [filtered]);

  // Summary stats
  const stats = useMemo(() => {
    const open = items.filter((i) => i.status !== "completed");
    const overdue = open.filter(isOverdue);
    const oldest = open.reduce<ActionItem | null>((prev, cur) => {
      if (!prev) return cur;
      return new Date(cur.created_at) < new Date(prev.created_at) ? cur : prev;
    }, null);

    // Unresolved by owner
    const byOwner = new Map<string, number>();
    open.forEach((i) => {
      const name = i.owner_name ?? "Unassigned";
      byOwner.set(name, (byOwner.get(name) ?? 0) + 1);
    });
    const topOwners = [...byOwner.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);

    return { openCount: open.length, overdueCount: overdue.length, oldest, topOwners };
  }, [items]);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 pt-24 pb-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Actions</h1>
            <p className="text-muted-foreground mt-1">
              Track action items across all meetings
            </p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" /> New Action
          </Button>
        </div>

        {/* Accountability summary cards */}
        {!loading && items.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Open Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.openCount}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {items.filter((i) => i.status === "completed").length} completed
                </p>
              </CardContent>
            </Card>

            <Card className={stats.overdueCount > 0 ? "border-destructive/50" : ""}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                  Overdue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${stats.overdueCount > 0 ? "text-destructive" : ""}`}>
                  {stats.overdueCount}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Require immediate attention</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Oldest Open
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats.oldest ? (
                  <>
                    <div className="text-3xl font-bold">{daysOpen(stats.oldest.created_at)}d</div>
                    <p className="text-xs text-muted-foreground mt-1 truncate" title={stats.oldest.title}>
                      {stats.oldest.title}
                    </p>
                  </>
                ) : (
                  <div className="text-2xl font-bold text-muted-foreground">—</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  By Owner
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats.topOwners.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No open items</div>
                ) : (
                  <div className="space-y-1">
                    {stats.topOwners.map(([name, count]) => (
                      <div key={name} className="flex justify-between text-sm">
                        <span className="truncate mr-2">{name}</span>
                        <span className="font-medium">{count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterOwner} onValueChange={setFilterOwner}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Owner" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Owners</SelectItem>
              {owners.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant={filterOverdue ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterOverdue(!filterOverdue)}
          >
            Overdue Only
            {stats.overdueCount > 0 && !filterOverdue && (
              <span className="ml-1.5 bg-destructive text-destructive-foreground rounded-full px-1.5 py-0.5 text-xs">
                {stats.overdueCount}
              </span>
            )}
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-1">No action items yet</h3>
              <p className="text-muted-foreground">
                Action items created in meetings will appear here.
              </p>
            </CardContent>
          </Card>
        ) : sorted.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              No actions match the current filters.
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Origin Meeting</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[160px]">Update</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((item) => {
                  const overdue = isOverdue(item);
                  const age = daysOpen(item.created_at);
                  const meetingInPast = item.meeting_date && isPast(new Date(item.meeting_date));

                  return (
                    <TableRow
                      key={item.id}
                      className={overdue ? "bg-destructive/5" : ""}
                    >
                      <TableCell className="font-medium">
                        <div>{item.title}</div>
                        {item.agenda_title && (
                          <div className="text-xs text-muted-foreground">
                            Agenda: {item.agenda_title}
                          </div>
                        )}
                        {/* Carry-forward indicator */}
                        {meetingInPast && item.status !== "completed" && (
                          <div className="text-xs text-amber-600 dark:text-amber-400 mt-0.5 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Carried forward from {format(new Date(item.meeting_date!), "MMM d")}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.meeting_id ? (
                          <div>
                            <Link
                              to={`/meetings/${item.meeting_id}`}
                              className="text-primary hover:underline text-sm"
                            >
                              {item.meeting_title ?? "View Meeting"}
                            </Link>
                            {item.meeting_date && (
                              <div className="text-xs text-muted-foreground">
                                {format(new Date(item.meeting_date), "PP")}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {item.owner_name ?? (
                          <span className="text-muted-foreground">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.due_date ? (
                          <div>
                            <span className={overdue ? "text-destructive font-medium" : "text-sm"}>
                              {format(new Date(item.due_date), "PP")}
                            </span>
                            {overdue && (
                              <div className="text-xs text-destructive font-medium">
                                {daysOverdue(item.due_date)}d overdue
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={`text-sm ${age > 30 ? "text-amber-600 dark:text-amber-400 font-medium" : "text-muted-foreground"}`}>
                          {age}d
                        </span>
                      </TableCell>
                      <TableCell>{statusBadge(item)}</TableCell>
                      <TableCell>
                        <Select
                          value={item.status ?? "pending"}
                          onValueChange={(v) => updateStatus(item.id, v)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map((s) => (
                              <SelectItem key={s} value={s}>
                                {s.replace("_", " ").replace(/^\w/, (c) => c.toUpperCase())}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item)}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Create/Edit Action Dialog */}
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingItem ? "Edit Action" : "New Action"}</DialogTitle>
              <DialogDescription>{editingItem ? "Update this action item." : "Create a standalone action item."}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="action-title">Title *</Label>
                <Input id="action-title" placeholder="e.g. Follow up with auditor" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="action-desc">Description</Label>
                <Textarea id="action-desc" placeholder="Optional details" value={formDesc} onChange={(e) => setFormDesc(e.target.value)} rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="action-owner">Owner</Label>
                  <Select value={formOwnerId} onValueChange={setFormOwnerId}>
                    <SelectTrigger id="action-owner"><SelectValue placeholder="Select owner" /></SelectTrigger>
                    <SelectContent>
                      {allProfiles.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="action-status">Status</Label>
                  <Select value={formStatus} onValueChange={setFormStatus}>
                    <SelectTrigger id="action-status"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s}>{s.replace("_", " ").replace(/^\w/, (c) => c.toUpperCase())}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="action-due">Due Date</Label>
                <Input id="action-due" type="date" value={formDueDate} onChange={(e) => setFormDueDate(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>Cancel</Button>
              <Button onClick={handleSaveAction} disabled={formSaving}>{formSaving ? "Saving…" : editingItem ? "Update" : "Create"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
      <Footer />
    </div>
  );
};

export default Actions;
