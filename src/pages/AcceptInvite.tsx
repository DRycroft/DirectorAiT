import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, UserPlus, LogIn, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { getUserFriendlyError } from "@/lib/errorHandling";

interface InviteData {
  id: string;
  full_name: string;
  public_contact_email: string | null;
  board_id: string;
  board: { title: string; org_id: string; organization: { name: string } };
}

export default function AcceptInvite() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [mode, setMode] = useState<"choose" | "signup" | "login">("choose");
  const [submitting, setSubmitting] = useState(false);
  const [awaitingVerification, setAwaitingVerification] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (!token) return;
    fetchInvite();
    // If user is already logged in, try to accept directly
    checkExistingSession();
  }, [token]);

  const fetchInvite = async () => {
    try {
      const { data, error } = await supabase
        .from("board_members")
        .select(`
          id, full_name, public_contact_email, board_id,
          board:boards!board_members_board_id_fkey(title, org_id, organization:organizations!boards_org_id_fkey(name))
        `)
        .eq("invite_token", token!)
        .eq("status", "invited")
        .maybeSingle();

      if (error) throw error;

      if (!data || !data.board) {
        setInvite(null);
      } else {
        const inviteData = data as unknown as InviteData;
        setInvite(inviteData);
        if (inviteData.public_contact_email) {
          setEmail(inviteData.public_contact_email);
        }
      }
    } catch (error) {
      console.error("Error fetching invite:", error);
      setInvite(null);
    } finally {
      setLoading(false);
    }
  };

  const checkExistingSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      // Already logged in — accept invite directly after invite loads
      // We wait for invite data via a separate effect
    }
  };

  // When invite is loaded and user is already authenticated, accept automatically
  useEffect(() => {
    if (!invite) return;
    const tryAutoAccept = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await acceptInvite(session.user.id);
      }
    };
    tryAutoAccept();
  }, [invite]);

  const acceptInvite = async (userId: string) => {
    if (!invite) return;
    try {
      // (a) Check if board_membership already exists
      const { data: existing } = await supabase
        .from("board_memberships")
        .select("id")
        .eq("user_id", userId)
        .eq("board_id", invite.board_id)
        .maybeSingle();

      // (b) Insert membership if not exists
      if (!existing) {
        const { error: membershipError } = await supabase
          .from("board_memberships")
          .insert({
            user_id: userId,
            board_id: invite.board_id,
            role: "member",
          });
        if (membershipError) throw membershipError;
      }

      // (c) Update board_members row
      const { error: updateError } = await supabase
        .from("board_members")
        .update({ status: "active", user_id: userId })
        .eq("id", invite.id);
      if (updateError) throw updateError;

      // (d) Check if user's profile has org_id; if not, link to this org
      const { data: profile } = await supabase
        .from("profiles")
        .select("org_id, onboarding_complete")
        .eq("id", userId)
        .maybeSingle();

      if (profile && !profile.org_id) {
        await supabase
          .from("profiles")
          .update({ org_id: invite.board.org_id })
          .eq("id", userId);
      }

      toast.success("Invite accepted! Welcome to " + invite.board.organization.name);

      // Navigate based on onboarding status
      if (!profile?.onboarding_complete) {
        navigate("/onboarding", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    } catch (error) {
      toast.error(getUserFriendlyError(error));
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/invite/${token}`,
          data: { name: invite?.full_name || email.split("@")[0] },
        },
      });
      if (error) throw error;
      setAwaitingVerification(true);
    } catch (error) {
      toast.error(getUserFriendlyError(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data.user) {
        await acceptInvite(data.user.id);
      }
    } catch (error) {
      toast.error(getUserFriendlyError(error));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-accent/5 to-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!invite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-accent/5 to-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <img src="/directorait-logo.png" alt="DirectorAiT" className="h-10 mx-auto mb-2" />
            <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-2" />
            <CardTitle>Invalid or Expired Invite</CardTitle>
            <CardDescription>
              This invitation link is no longer valid. It may have expired or already been used.
              Please contact the person who invited you.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (awaitingVerification) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-accent/5 to-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <img src="/directorait-logo.png" alt="DirectorAiT" className="h-10 mx-auto mb-2" />
            <CardTitle>Check Your Email</CardTitle>
            <CardDescription>
              We've sent a verification link to <strong>{email}</strong>.
              Click the link in the email, and you'll be brought back here to complete your invite.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-accent/5 to-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <img src="/directorait-logo.png" alt="DirectorAiT" className="h-10 mx-auto mb-2" />
        </div>

        <Card className="mb-4">
          <CardHeader className="text-center">
            <CardTitle>You've Been Invited</CardTitle>
            <CardDescription>
              <strong>{invite.board.organization.name}</strong> has invited you to join
              the <strong>{invite.board.title}</strong> board.
            </CardDescription>
          </CardHeader>
        </Card>

        {mode === "choose" && (
          <div className="space-y-3">
            <Button
              className="w-full h-14 text-base"
              onClick={() => setMode("signup")}
            >
              <UserPlus className="mr-2 h-5 w-5" />
              I'm new — create an account
            </Button>
            <Button
              variant="outline"
              className="w-full h-14 text-base"
              onClick={() => setMode("login")}
            >
              <LogIn className="mr-2 h-5 w-5" />
              I already have an account — log in
            </Button>
          </div>
        )}

        {mode === "signup" && (
          <Card>
            <CardHeader>
              <CardTitle>Create Your Account</CardTitle>
              <CardDescription>Set up your DirectorAiT account to accept this invitation</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-confirm">Confirm Password</Label>
                  <Input
                    id="signup-confirm"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setMode("choose")}>
                    Back
                  </Button>
                  <Button type="submit" className="flex-1" disabled={submitting}>
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Create Account
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {mode === "login" && (
          <Card>
            <CardHeader>
              <CardTitle>Log In</CardTitle>
              <CardDescription>Sign in to your existing DirectorAiT account</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setMode("choose")}>
                    Back
                  </Button>
                  <Button type="submit" className="flex-1" disabled={submitting}>
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Log In & Accept
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
