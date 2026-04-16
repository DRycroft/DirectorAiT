import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Users, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface AttendanceRecord {
  id?: string;
  member_id: string;
  attended: boolean;
  apologies: string;
  full_name: string;
}

interface MeetingAttendanceProps {
  agendaId: string;
  boardId: string;
  isFinalised: boolean;
}

const MeetingAttendance = ({ agendaId, boardId, isFinalised }: MeetingAttendanceProps) => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [quorumPercent, setQuorumPercent] = useState<number>(50);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch board members, attendance records, and quorum setting in parallel
      const [membersRes, attendanceRes, settingsRes] = await Promise.all([
        supabase
          .from("board_members")
          .select("id, full_name")
          .eq("board_id", boardId)
          .in("status", ["active", "pending"]),
        supabase
          .from("meeting_attendance")
          .select("id, member_id, attended, apologies")
          .eq("agenda_id", agendaId),
        supabase
          .from("board_settings")
          .select("quorum_percent")
          .eq("board_id", boardId)
          .maybeSingle(),
      ]);

      if (membersRes.error) throw membersRes.error;

      if (settingsRes.data?.quorum_percent) {
        setQuorumPercent(settingsRes.data.quorum_percent);
      }

      const attendanceMap = new Map(
        (attendanceRes.data ?? []).map((a) => [a.member_id, a])
      );

      const merged: AttendanceRecord[] = (membersRes.data ?? []).map((m) => {
        const existing = attendanceMap.get(m.id);
        return {
          id: existing?.id,
          member_id: m.id,
          attended: existing?.attended ?? false,
          apologies: existing?.apologies ?? "",
          full_name: m.full_name,
        };
      });

      setRecords(merged);
    } catch {
      toast.error("Failed to load attendance data");
    } finally {
      setLoading(false);
    }
  }, [agendaId, boardId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleToggle = (index: number) => {
    if (isFinalised) return;
    setRecords((prev) =>
      prev.map((r, i) => (i === index ? { ...r, attended: !r.attended } : r))
    );
  };

  const handleApologies = (index: number, value: string) => {
    if (isFinalised) return;
    setRecords((prev) =>
      prev.map((r, i) => (i === index ? { ...r, apologies: value } : r))
    );
  };

  const saveAttendance = async () => {
    setSaving(true);
    try {
      for (const record of records) {
        const payload = {
          agenda_id: agendaId,
          member_id: record.member_id,
          attended: record.attended,
          apologies: record.apologies.trim() || null,
        };

        if (record.id) {
          const { error } = await supabase
            .from("meeting_attendance")
            .update({ attended: payload.attended, apologies: payload.apologies })
            .eq("id", record.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("meeting_attendance")
            .insert(payload);
          if (error) throw error;
        }
      }
      toast.success("Attendance saved");
      fetchData();
    } catch {
      toast.error("Failed to save attendance");
    } finally {
      setSaving(false);
    }
  };

  const attendedCount = records.filter((r) => r.attended).length;
  const totalMembers = records.length;
  const quorumNeeded = Math.ceil((quorumPercent / 100) * totalMembers);
  const quorumMet = attendedCount >= quorumNeeded;

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading attendance…
        </CardContent>
      </Card>
    );
  }

  if (records.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Users className="h-8 w-8 mx-auto mb-2" />
          No active board members found for this board.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-5 w-5" /> Attendance
        </CardTitle>
        <div className="flex items-center gap-3">
          <Badge variant={quorumMet ? "default" : "destructive"} className="flex items-center gap-1">
            {quorumMet ? (
              <CheckCircle2 className="h-3 w-3" />
            ) : (
              <AlertTriangle className="h-3 w-3" />
            )}
            {attendedCount}/{totalMembers} present — {quorumMet ? "Quorum met" : `Quorum not met (need ${quorumNeeded})`}
          </Badge>
          {!isFinalised && (
            <Button size="sm" onClick={saveAttendance} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {records.map((record, idx) => (
            <div
              key={record.member_id}
              className="flex items-center gap-3 rounded-md border px-3 py-2"
            >
              <Checkbox
                checked={record.attended}
                onCheckedChange={() => handleToggle(idx)}
                disabled={isFinalised}
                id={`attend-${record.member_id}`}
              />
              <label
                htmlFor={`attend-${record.member_id}`}
                className="flex-1 text-sm font-medium cursor-pointer"
              >
                {record.full_name}
              </label>
              {!record.attended && (
                <Input
                  placeholder="Apologies / reason"
                  value={record.apologies}
                  onChange={(e) => handleApologies(idx, e.target.value)}
                  disabled={isFinalised}
                  className="max-w-[200px] h-8 text-xs"
                />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default MeetingAttendance;
