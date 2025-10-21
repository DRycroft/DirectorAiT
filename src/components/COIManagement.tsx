import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function COIManagement() {
  const { toast } = useToast();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Conflict of Interest Management</h2>
        <p className="text-muted-foreground">Track and manage declared conflicts of interest</p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">COI management system coming soon</p>
        </CardContent>
      </Card>
    </div>
  );
}
