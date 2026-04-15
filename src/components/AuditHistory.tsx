import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

interface AuditRecord {
  id: string;
  field_name: string;
  change_type: string;
  old_value: string | null;
  new_value: string | null;
  timestamp: string | null;
  changed_by: string | null;
}

interface AuditHistoryProps {
  memberId?: string;
}

export default function AuditHistory({ memberId }: AuditHistoryProps) {
  const [records, setRecords] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (memberId) fetchAudit();
  }, [memberId]);

  const fetchAudit = async () => {
    try {
      const { data, error } = await supabase
        .from("board_member_audit")
        .select("id, field_name, change_type, old_value, new_value, timestamp, changed_by")
        .eq("member_id", memberId!)
        .order("timestamp", { ascending: false });

      if (error) throw error;
      setRecords(data || []);
    } catch (e) {
      console.error("Failed to load audit history:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Audit History</h2>
        <p className="text-muted-foreground">Complete audit trail of profile changes</p>
      </div>
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : records.length === 0 ? (
            <p className="text-center text-muted-foreground">No audit records yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Field</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Old Value</TableHead>
                  <TableHead>New Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap">
                      {r.timestamp ? format(new Date(r.timestamp), "dd/MM/yyyy HH:mm") : "-"}
                    </TableCell>
                    <TableCell>{r.field_name}</TableCell>
                    <TableCell>{r.change_type}</TableCell>
                    <TableCell className="max-w-[150px] truncate">{r.old_value || "-"}</TableCell>
                    <TableCell className="max-w-[150px] truncate">{r.new_value || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
