import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, ShieldAlert, CheckCircle2, AlertTriangle, RotateCcw } from "lucide-react";
import { toast } from "sonner";

interface COIRow {
  id: string;
  member_id: string;
  type: string;
  declared_interest: string;
  related_party_name: string | null;
  management_steps: string | null;
  status: string | null;
  date_declared: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  board_members?: {
    full_name: string;
    board_id: string;
    boards?: { id: string; title: string; org_id: string } | null;
  } | null;
}

type StatusFilter = "all" | "active" | "mitigated" | "resolved";

const statusVariant = (s: string | null): "default" | "secondary" | "outline" => {
  if (s === "resolved") return "outline";
  if (s === "mitigated") return "secondary";
  return "default";
};

const logAudit = (memberId: string, oldStatus: string | null, newStatus: string) => {
  supabase
    .rpc("log_board_member_audit", {
      _member_id: memberId,
      _field_name: "board_member_coi.status",
      _change_type: "coi_reviewed",
      _old_value: oldStatus ?? "active",
      _new_value: newStatus,
    })
    .then(({ error }) => {
      if (error) console.error("coi_reviewed audit failed:", error);
    });
};

export const COIRegister = () => {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<COIRow[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [boardFilter, setBoardFilter] = useState<string>("all");
  const [actingId, setActingId] = useState<string | null>(null);

  const checkAuthAndLoad = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setAuthorized(false);
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("org_id")
        .eq("id", user.id)
        .maybeSingle();

      const orgId = profile?.org_id;
      if (!orgId) {
        setAuthorized(false);
        return;
      }

      const [superRes, adminRes, chairRes] = await Promise.all([
        supabase.rpc("has_role", { _user_id: user.id, _role: "super_admin" }),
        supabase.rpc("has_role", { _user_id: user.id, _role: "org_admin", _org_id: orgId }),
        supabase.rpc("has_role", { _user_id: user.id, _role: "chair", _org_id: orgId }),
      ]);
      const isAuth = !!(superRes.data || adminRes.data || chairRes.data);
      setAuthorized(isAuth);
      if (!isAuth) return;

      // Load all COIs scoped to this org via the board_members → boards join.
      const { data, error } = await supabase
        .from("board_member_coi")
        .select(`
          id, member_id, type, declared_interest, related_party_name,
          management_steps, status, date_declared, reviewed_at, reviewed_by,
          board_members!inner (
            full_name,
            board_id,
            boards!inner ( id, title, org_id )
          )
        `)
        .order("date_declared", { ascending: false });

      if (error) {
        console.error(error);
        toast.error("Failed to load COI register");
        setRows([]);
        return;
      }

      const filtered = ((data || []) as unknown as COIRow[]).filter(
        (r) => r.board_members?.boards?.org_id === orgId,
      );
      setRows(filtered);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuthAndLoad();
  }, []);

  const boards = useMemo(() => {
    const map = new Map<string, string>();
    rows.forEach((r) => {
      const b = r.board_members?.boards;
      if (b) map.set(b.id, b.title);
    });
    return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
  }, [rows]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== "all" && (r.status || "active") !== statusFilter) return false;
      if (boardFilter !== "all" && r.board_members?.board_id !== boardFilter) return false;
      if (q) {
        const hay = [
          r.board_members?.full_name,
          r.declared_interest,
          r.related_party_name,
          r.type,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, search, statusFilter, boardFilter]);

  const updateStatus = async (row: COIRow, newStatus: "mitigated" | "resolved" | "active") => {
    setActingId(row.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("board_member_coi")
        .update({
          status: newStatus,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id ?? null,
        })
        .eq("id", row.id);
      if (error) throw error;
      logAudit(row.member_id, row.status, newStatus);
      toast.success(
        newStatus === "active"
          ? "Declaration reopened"
          : `Declaration marked ${newStatus}`,
      );
      await checkAuthAndLoad();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to update declaration");
    } finally {
      setActingId(null);
    }
  };

  if (loading && authorized === null) {
    return (
      <Card>
        <CardContent className="py-10 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (authorized === false) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5" /> Restricted
          </CardTitle>
          <CardDescription>
            The COI Register is available to organisation admins, chairs, and super admins only.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conflicts of Interest Register</CardTitle>
        <CardDescription>
          Review and manage all declarations across your organisation's boards.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <Input
            placeholder="Search member, interest, party…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="mitigated">Mitigated</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
          <Select value={boardFilter} onValueChange={setBoardFilter}>
            <SelectTrigger><SelectValue placeholder="Board" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All boards</SelectItem>
              {boards.map((b) => (
                <SelectItem key={b.id} value={b.id}>{b.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : visible.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No declarations match the current filters.
          </p>
        ) : (
          <div className="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Board</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Interest</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Declared</TableHead>
                  <TableHead>Reviewed</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((r) => {
                  const status = r.status || "active";
                  const busy = actingId === r.id;
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">
                        {r.board_members?.full_name || "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {r.board_members?.boards?.title || "—"}
                      </TableCell>
                      <TableCell className="capitalize text-sm">{r.type}</TableCell>
                      <TableCell className="max-w-[280px]">
                        <div className="text-sm break-words">{r.declared_interest}</div>
                        {r.related_party_name && (
                          <div className="text-xs text-muted-foreground">
                            Party: {r.related_party_name}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(status)}>{status}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {new Date(r.date_declared).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {r.reviewed_at ? new Date(r.reviewed_at).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex gap-1">
                          {status !== "mitigated" && status !== "resolved" && (
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={busy}
                              onClick={() => updateStatus(r, "mitigated")}
                            >
                              <AlertTriangle className="h-3.5 w-3.5 mr-1" /> Mitigate
                            </Button>
                          )}
                          {status !== "resolved" && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busy}
                              onClick={() => updateStatus(r, "resolved")}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Resolve
                            </Button>
                          )}
                          {status !== "active" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={busy}
                              onClick={() => updateStatus(r, "active")}
                            >
                              <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reopen
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default COIRegister;
