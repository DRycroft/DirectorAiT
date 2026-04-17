import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";

interface InviteData {
  id: string;
  invite_type: string;
  target_type: string;
  recipient_name: string | null;
  recipient_email: string | null;
  status: string;
  expires_at: string | null;
  completed_at: string | null;
  effective_status: "pending" | "expired" | "completed";
}

export default function ActionLink() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    async function loadInvite() {
      if (!token) {
        setError("No token provided");
        setLoading(false);
        return;
      }
      try {
        const { data, error: rpcError } = await supabase.rpc("lookup_action_invite", {
          _token: token,
        });
        if (rpcError || !data || (Array.isArray(data) && data.length === 0)) {
          setError("This link is invalid or has expired.");
          setLoading(false);
          return;
        }
        const row = (Array.isArray(data) ? data[0] : data) as InviteData;
        setInvite(row);
        setName(row.recipient_name ?? "");
        setEmail(row.recipient_email ?? "");
      } catch (err) {
        console.error("Error loading invite:", err);
        setError("Failed to load action details.");
      } finally {
        setLoading(false);
      }
    }
    loadInvite();
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    if (message.trim().length === 0) {
      toast({ title: "Please enter a response", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { error: rpcError } = await supabase.rpc("submit_action_response", {
        _token: token,
        _payload: { message: message.trim() },
        _respondent_name: name.trim() || null,
        _respondent_email: email.trim() || null,
      });
      if (rpcError) {
        toast({
          title: "Submission failed",
          description: rpcError.message || "Please try again.",
          variant: "destructive",
        });
        return;
      }
      setSubmitted(true);
    } catch (err) {
      console.error("Submit error:", err);
      toast({ title: "Submission failed", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

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
              <AlertDescription>{error ?? "Link not found."}</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted || invite.effective_status === "completed") {
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
              Thank you. Your response has been recorded.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (invite.effective_status === "expired") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <CardTitle>Link Expired</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>
                This action link has expired. Please request a new one from the sender.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="capitalize">{invite.invite_type.replace(/_/g, " ")}</CardTitle>
          <CardDescription>
            {invite.recipient_name ? `For: ${invite.recipient_name}` : "Please complete this action."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="name">Your name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={200}
                placeholder="Full name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={255}
                placeholder="you@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Response</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={5000}
                rows={5}
                required
                placeholder="Type your response here..."
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Submitting..." : "Submit"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
