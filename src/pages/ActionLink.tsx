import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface InviteData {
  id: string;
  org_id: string;
  invite_type: string;
  target_type: string;
  target_id: string;
  recipient_name: string | null;
  recipient_email: string | null;
  status: string;
  expires_at: string | null;
  completed_at: string | null;
  created_at: string;
  created_by: string;
  token: string;
  updated_at: string;
}

export default function ActionLink() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadInvite() {
      if (!token) {
        setError("No token provided");
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from("document_invites")
          .select("*")
          .eq("token", token)
          .single();

        if (fetchError || !data) {
          setError("This link is invalid or has expired.");
          setLoading(false);
          return;
        }

        setInvite(data);
      } catch (err) {
        console.error("Error loading invite:", err);
        setError("Failed to load action details.");
      } finally {
        setLoading(false);
      }
    }

    loadInvite();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center gap-2">
              <Clock className="h-5 w-5 animate-spin" />
              <p>Loading action...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !invite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <CardTitle>Invalid Link</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (invite.status === "completed") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <CardTitle>Action Completed</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              This action has already been completed.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Action for {invite.invite_type}</CardTitle>
          <CardDescription>
            {invite.recipient_name && `For: ${invite.recipient_name}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type:</span>
              <span className="font-medium">{invite.target_type}</span>
            </div>
            {invite.recipient_email && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email:</span>
                <span className="font-medium">{invite.recipient_email}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status:</span>
              <span className="font-medium capitalize">{invite.status}</span>
            </div>
          </div>

          <Alert>
            <AlertDescription>
              This is a placeholder page. Form functionality will be implemented in a future phase.
            </AlertDescription>
          </Alert>

          <Button className="w-full" disabled>
            Complete action (not wired yet)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
