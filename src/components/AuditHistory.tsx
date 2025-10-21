import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface AuditHistoryProps {
  memberId?: string;
}

export default function AuditHistory({ memberId }: AuditHistoryProps) {
  const { toast } = useToast();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Audit History</h2>
        <p className="text-muted-foreground">Complete audit trail of system activities</p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">Audit history viewer coming soon</p>
        </CardContent>
      </Card>
    </div>
  );
}
