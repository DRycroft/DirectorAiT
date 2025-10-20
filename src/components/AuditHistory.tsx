import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Clock, User } from "lucide-react";
import { format } from "date-fns";

interface AuditHistoryProps {
  memberId: string;
}

const AuditHistory = ({ memberId }: AuditHistoryProps) => {
  const { toast } = useToast();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, [memberId]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("board_member_audit")
        .select("*, profiles(name)")
        .eq("member_id", memberId)
        .order("timestamp", { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (error: any) {
      console.error("Error fetching audit history:", error);
      toast({
        title: "Error",
        description: "Failed to load audit history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getChangeTypeVariant = (changeType: string) => {
    switch (changeType) {
      case "created":
        return "default";
      case "updated":
        return "secondary";
      case "published":
        return "default";
      case "unpublished":
        return "outline";
      default:
        return "secondary";
    }
  };

  const formatFieldName = (field: string) => {
    return field
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Audit History</CardTitle>
        <CardDescription>Timeline of all changes to this profile</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading history...</p>
        ) : history.length === 0 ? (
          <p className="text-sm text-muted-foreground">No history available</p>
        ) : (
          <div className="space-y-4">
            {history.map((entry) => (
              <div
                key={entry.id}
                className="flex gap-4 pb-4 border-b last:border-0 last:pb-0"
              >
                <div className="flex-shrink-0 mt-1">
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={getChangeTypeVariant(entry.change_type)}>
                      {entry.change_type}
                    </Badge>
                    <span className="text-sm font-medium">
                      {formatFieldName(entry.field_name)}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {entry.old_value && (
                      <div>
                        <span className="font-medium">From:</span> {entry.old_value}
                      </div>
                    )}
                    {entry.new_value && (
                      <div>
                        <span className="font-medium">To:</span> {entry.new_value}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <User className="h-3 w-3" />
                    <span>{entry.profiles?.name || "System"}</span>
                    <span>•</span>
                    <span>{format(new Date(entry.timestamp), "PPp")}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AuditHistory;
