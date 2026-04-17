import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Plus, Pencil, CheckCircle2 } from "lucide-react";
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
}

const COI_TYPES = [
  { value: "financial", label: "Financial" },
  { value: "personal", label: "Personal / Family" },
  { value: "professional", label: "Professional" },
  { value: "fiduciary", label: "Fiduciary / Other Directorship" },
  { value: "other", label: "Other" },
];

interface Props {
  memberId: string;
}

const emptyForm = {
  type: "financial",
  declared_interest: "",
  related_party_name: "",
  management_steps: "",
};

const logAudit = (memberId: string, changeType: string, fieldName: string, oldVal?: string, newVal?: string) => {
  supabase
    .rpc("log_board_member_audit", {
      _member_id: memberId,
      _field_name: fieldName,
      _change_type: changeType,
      _old_value: oldVal ?? undefined,
      _new_value: newVal ?? undefined,
    })
    .then(({ error }) => {
      if (error) console.error(`Audit log (${changeType}) failed:`, error);
    });
};

export const MyProfileCOI = ({ memberId }: Props) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<COIRow[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<COIRow | null>(null);
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("board_member_coi")
      .select("id, member_id, type, declared_interest, related_party_name, management_steps, status, date_declared")
      .eq("member_id", memberId)
      .order("date_declared", { ascending: false });
    if (error) {
      console.error(error);
      toast.error("Failed to load conflicts of interest");
    } else {
      setRows((data || []) as COIRow[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (memberId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberId]);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (row: COIRow) => {
    setEditing(row);
    setForm({
      type: row.type,
      declared_interest: row.declared_interest,
      related_party_name: row.related_party_name || "",
      management_steps: row.management_steps || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.declared_interest.trim()) {
      toast.error("Please describe the interest");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const { error } = await supabase
          .from("board_member_coi")
          .update({
            type: form.type,
            declared_interest: form.declared_interest.trim(),
            related_party_name: form.related_party_name.trim() || null,
            management_steps: form.management_steps.trim() || null,
          })
          .eq("id", editing.id);
        if (error) throw error;
        logAudit(memberId, "coi_updated", "board_member_coi", editing.declared_interest, form.declared_interest.trim());
        toast.success("Declaration updated");
      } else {
        const { error } = await supabase
          .from("board_member_coi")
          .insert({
            member_id: memberId,
            type: form.type,
            declared_interest: form.declared_interest.trim(),
            related_party_name: form.related_party_name.trim() || null,
            management_steps: form.management_steps.trim() || null,
            status: "active",
          });
        if (error) throw error;
        logAudit(memberId, "coi_declared", "board_member_coi", undefined, form.declared_interest.trim());
        toast.success("Declaration added");
      }
      setDialogOpen(false);
      await load();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to save declaration");
    } finally {
      setSaving(false);
    }
  };

  const handleResolve = async (row: COIRow) => {
    if (row.status === "resolved") return;
    const { error } = await supabase
      .from("board_member_coi")
      .update({ status: "resolved" })
      .eq("id", row.id);
    if (error) {
      console.error(error);
      toast.error("Failed to mark resolved");
      return;
    }
    logAudit(memberId, "coi_resolved", "board_member_coi", row.status || "active", "resolved");
    toast.success("Declaration marked resolved");
    await load();
  };

  const statusVariant = (s: string | null): "default" | "secondary" | "outline" => {
    if (s === "resolved") return "outline";
    if (s === "mitigated") return "secondary";
    return "default";
  };

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Conflicts of Interest</CardTitle>
          <CardDescription>
            Declare any financial, personal, or professional interests that may conflict with your board duties.
          </CardDescription>
        </div>
        <Button type="button" size="sm" onClick={openAdd}>
          <Plus className="h-4 w-4 mr-1" /> Add Declaration
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            No declarations yet. Add one if you have an interest to disclose.
          </p>
        ) : (
          <div className="space-y-3">
            {rows.map((row) => (
              <div
                key={row.id}
                className="border rounded-md p-3 flex items-start justify-between gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={statusVariant(row.status)}>{row.status || "active"}</Badge>
                    <span className="text-xs text-muted-foreground capitalize">{row.type}</span>
                    <span className="text-xs text-muted-foreground">
                      Declared {new Date(row.date_declared).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm mt-1 break-words">{row.declared_interest}</p>
                  {row.related_party_name && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Related party: {row.related_party_name}
                    </p>
                  )}
                  {row.management_steps && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Management: {row.management_steps}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => openEdit(row)}
                    disabled={row.status === "resolved"}
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                  </Button>
                  {row.status !== "resolved" && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleResolve(row)}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Resolve
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Declaration" : "Add Declaration"}</DialogTitle>
            <DialogDescription>
              Provide a clear description of the interest and how it will be managed.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="coi-type">Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger id="coi-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COI_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="coi-interest">Interest *</Label>
              <Textarea
                id="coi-interest"
                rows={3}
                value={form.declared_interest}
                onChange={(e) => setForm({ ...form, declared_interest: e.target.value })}
                placeholder="Describe the nature of the interest"
              />
            </div>

            <div>
              <Label htmlFor="coi-party">Related Party</Label>
              <Input
                id="coi-party"
                value={form.related_party_name}
                onChange={(e) => setForm({ ...form, related_party_name: e.target.value })}
                placeholder="Person or entity, if any"
              />
            </div>

            <div>
              <Label htmlFor="coi-mgmt">Management Steps</Label>
              <Textarea
                id="coi-mgmt"
                rows={2}
                value={form.management_steps}
                onChange={(e) => setForm({ ...form, management_steps: e.target.value })}
                placeholder="e.g., recuse from related discussions and votes"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default MyProfileCOI;
