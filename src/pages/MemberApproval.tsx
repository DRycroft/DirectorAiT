import { useEffect, useState } from "react";
import { logError } from "@/lib/errorHandling";
import { useNavigate, useParams } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle, Loader2, ArrowLeft } from "lucide-react";
import MemberProfileTabs from "@/components/MemberProfileTabs";
import COIManagement from "@/components/COIManagement";
import AuditHistory from "@/components/AuditHistory";
import { Badge } from "@/components/ui/badge";

const MemberApproval = () => {
  const { memberId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [member, setMember] = useState<any>(null);
  const [sensitiveData, setSensitiveData] = useState<any>(null);
  const [comments, setComments] = useState("");
  const [unauthorized, setUnauthorized] = useState(false);

  useEffect(() => {
    if (memberId) {
      checkAuthAndAuthorize();
    } else {
      navigate(-1);
    }
  }, [memberId]);

  const checkAuthAndAuthorize = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/auth");
      return;
    }

    // Verify admin/chair/super_admin authorization
    const isAuthorized = await verifyAdminAccess(user.id);
    if (!isAuthorized) {
      setUnauthorized(true);
      setLoading(false);
      return;
    }
    
    await fetchMember();
  };

  const verifyAdminAccess = async (userId: string): Promise<boolean> => {
    if (!memberId) return false;

    // Check if user is board admin for this member (chair/admin role)
    const { data: isBoardAdmin } = await supabase.rpc("is_board_admin_for_member", {
      _user_id: userId,
      _member_id: memberId,
    });
    if (isBoardAdmin) return true;

    // Check org_admin or super_admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("org_id")
      .eq("id", userId)
      .single();

    if (profile?.org_id) {
      const { data: isOrgAdmin } = await supabase.rpc("has_role", {
        _user_id: userId,
        _role: "org_admin",
        _org_id: profile.org_id,
      });
      if (isOrgAdmin) return true;
    }

    const { data: isSuperAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "super_admin",
    });
    return !!isSuperAdmin;
  };

  const fetchMember = async () => {
    if (!memberId) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("board_members")
        .select("*, boards(title)")
        .eq("id", memberId)
        .maybeSingle();

      if (error) throw error;
      setMember(data);

      // Fetch sensitive data
      if (data) {
        const { data: sensitive } = await supabase
          .from("board_members_sensitive")
          .select("*")
          .eq("member_id", memberId)
          .maybeSingle();
        setSensitiveData(sensitive);
      }
    } catch (error: any) {
      console.error("Error fetching member:", error);
      toast({
        title: "Error",
        description: "Failed to load member details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!memberId) return;
    
    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Update member status
      const { error: updateError } = await supabase
        .from("board_members")
        .update({
          status: "active",
        })
        .eq("id", memberId);

      if (updateError) throw updateError;

      // Create audit log
      if (user?.id) {
        await supabase.from("board_member_audit").insert({
          member_id: memberId,
          changed_by: user.id,
          field_name: "status",
          old_value: member.status,
          new_value: "active",
          change_type: "published",
        });
      }

      toast({
        title: "Member approved",
        description: "The member profile has been approved and is now active",
      });

      navigate(-1);
    } catch (error: any) {
      console.error("Error approving member:", error);
      toast({
        title: "Error",
        description: "Failed to approve member",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!memberId) return;
    
    if (!comments.trim()) {
      toast({
        title: "Comments required",
        description: "Please provide feedback for rejection",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Update member status back to invited
      const { error: updateError } = await supabase
        .from("board_members")
        .update({
          status: "invited",
        })
        .eq("id", memberId);

      if (updateError) throw updateError;

      // Write rejection notes to the correct sensitive table
      const { error: sensitiveWriteError } = await supabase
        .from("board_members_sensitive")
        .upsert({
          member_id: memberId,
          sensitive_notes: `Rejected: ${comments}`,
        }, { onConflict: "member_id" });

      if (sensitiveWriteError) {
        logError("MemberApproval - Write rejection notes", sensitiveWriteError);
      }

      if (updateError) throw updateError;

      // Create audit log
      if (user?.id) {
        await supabase.from("board_member_audit").insert({
          member_id: memberId,
          changed_by: user.id,
          field_name: "status",
          old_value: member.status,
          new_value: "invited",
          change_type: "updated",
        });
      }

      toast({
        title: "Profile rejected",
        description: "The member will be notified to make changes",
      });

      navigate(-1);
    } catch (error: any) {
      console.error("Error rejecting member:", error);
      toast({
        title: "Error",
        description: "Failed to reject profile",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (unauthorized) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8 pt-24">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-destructive font-medium">Access Denied</p>
              <p className="text-muted-foreground mt-2">You do not have permission to review this member profile.</p>
              <Button onClick={() => navigate(-1)} className="mt-4">
                Go Back
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8 pt-24">
          <Card>
            <CardContent className="py-12 text-center">
              <p>Member not found</p>
              <Button onClick={() => navigate(-1)} className="mt-4">
                Go Back
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-8 pt-24">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Review Member Profile</h1>
            <p className="text-muted-foreground">
              {member.boards?.title} • {member.full_name}
            </p>
          </div>
          <Badge variant={member.status === "pending" ? "secondary" : "default"}>
            {member.status}
          </Badge>
        </div>

        <div className="space-y-6">
          <MemberProfileTabs member={member} sensitiveData={sensitiveData} isAdmin={true} />
          
          <COIManagement memberId={member.id} isEditable={false} />
          
          <AuditHistory memberId={member.id} />

          {member.status === "pending" && (
            <Card>
              <CardHeader>
                <CardTitle>Approval Decision</CardTitle>
                <CardDescription>
                  Review the profile and approve or request changes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="comments">Comments (required for rejection)</Label>
                  <Textarea
                    id="comments"
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    placeholder="Provide feedback or reasons for rejection..."
                    rows={4}
                  />
                </div>

                <div className="flex gap-4">
                  <Button
                    onClick={handleApprove}
                    disabled={processing}
                    className="flex-1"
                  >
                    {processing ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                    )}
                    Approve Profile
                  </Button>
                  <Button
                    onClick={handleReject}
                    disabled={processing}
                    variant="destructive"
                    className="flex-1"
                  >
                    {processing ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <XCircle className="mr-2 h-4 w-4" />
                    )}
                    Request Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default MemberApproval;
