import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { CheckCircle2, ClipboardList, Loader2 } from "lucide-react";
import { format, isPast, isToday } from "date-fns";
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
  // joined
  agenda_title?: string;
  meeting_title?: string;
  meeting_id?: string;
  owner_name?: string;
}

interface OwnerOption {
  id: string;
  name: string;
}

const STATUS_OPTIONS = ["pending", "in_progress", "completed"] as const;

const statusBadge = (status: string | null) => {
  switch (status) {
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

  // Filters
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterOwner, setFilterOwner] = useState<string>("all");
  const [filterOverdue, setFilterOverdue] = useState(false);

  const fetchActions = async () => {
    setLoading(true);
    try {
      // Fetch action items with agenda_item -> agenda context
      const { data: actionData, error: actionErr } = await supabase
        .from("action_items")
        .select("*, agenda_items!agenda_item_id(title, agenda_id, agendas!agenda_id(id, title))")
        .order("created_at", { ascending: false });

      if (actionErr) throw actionErr;

      // Collect unique owner IDs
      const ownerIds = [
        ...new Set(
          (actionData ?? [])
            .map((a) => a.owner_id)
            .filter(Boolean) as string[]
        ),
      ];

      let profileMap = new Map<string, string>();
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
          owner_name: a.owner_id ? profileMap.get(a.owner_id) ?? "Unknown" : null,
        };
      });

      setItems(mapped);

      // Build owner filter options from results
      const uniqueOwners: OwnerOption[] = [];
      const seen = new Set<string>();
      mapped.forEach((m) => {
        if (m.owner_id && !seen.has(m.owner_id)) {
          seen.add(m.owner_id);
          uniqueOwners.push({ id: m.owner_id, name: m.owner_name ?? m.owner_id });
        }
      });
      setOwners(uniqueOwners);
    } catch (err: any) {
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

  // Apply filters
  const filtered = items.filter((item) => {
    if (filterStatus !== "all" && item.status !== filterStatus) return false;
    if (filterOwner !== "all" && item.owner_id !== filterOwner) return false;
    if (filterOverdue) {
      if (!item.due_date) return false;
      const due = new Date(item.due_date);
      if (!isPast(due) || isToday(due)) return false;
      if (item.status === "completed") return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 pt-24 pb-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Actions</h1>
          <p className="text-muted-foreground mt-1">
            Track action items across all meetings
          </p>
        </div>

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
        ) : filtered.length === 0 ? (
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
                  <TableHead>Meeting</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[160px]">Update</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item) => {
                  const overdue =
                    item.due_date &&
                    item.status !== "completed" &&
                    isPast(new Date(item.due_date)) &&
                    !isToday(new Date(item.due_date));
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        <div>{item.title}</div>
                        {item.agenda_title && (
                          <div className="text-xs text-muted-foreground">
                            Agenda: {item.agenda_title}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.meeting_id ? (
                          <Link
                            to={`/meetings/${item.meeting_id}`}
                            className="text-primary hover:underline text-sm"
                          >
                            {item.meeting_title ?? "View Meeting"}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {item.owner_name ?? <span className="text-muted-foreground">Unassigned</span>}
                      </TableCell>
                      <TableCell>
                        {item.due_date ? (
                          <span className={overdue ? "text-destructive font-medium" : "text-sm"}>
                            {format(new Date(item.due_date), "PP")}
                            {overdue && " (overdue)"}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>{statusBadge(item.status)}</TableCell>
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
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Actions;
