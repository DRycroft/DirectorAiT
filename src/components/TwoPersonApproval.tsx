import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function TwoPersonApproval() {
  const { toast } = useToast();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Two-Person Approval</h2>
        <p className="text-muted-foreground">Manage requests requiring dual authorization</p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">Two-person approval system coming soon</p>
        </CardContent>
      </Card>
    </div>
  );
}
