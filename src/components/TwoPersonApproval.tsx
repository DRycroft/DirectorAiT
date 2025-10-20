import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, AlertCircle, Users } from "lucide-react";

interface TwoPersonApprovalProps {
  memberId: string;
  actionType: "publish_confidential" | "delete_profile";
  onApprovalComplete?: () => void;
}

const TwoPersonApproval = ({ memberId, actionType, onApprovalComplete }: TwoPersonApprovalProps) => {
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [approvalStatus, setApprovalStatus] = useState<{
    firstApprover: string | null;
    secondApprover: string | null;
    status: "pending" | "first_approved" | "completed";
  }>({
    firstApprover: null,
    secondApprover: null,
    status: "pending",
  });

  useEffect(() => {
    getCurrentUser();
    checkApprovalStatus();
  }, [memberId]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
  };

  const checkApprovalStatus = async () => {
    // Check if there's a pending approval record
    const { data } = await supabase
      .from("board_member_audit")
      .select("*")
      .eq("member_id", memberId)
      .eq("field_name", `two_person_approval_${actionType}`)
      .order("timestamp", { ascending: false })
      .limit(1)
      .single();

    if (data) {
      const metadata = JSON.parse(data.new_value || "{}");
      setApprovalStatus({
        firstApprover: metadata.first_approver || null,
        secondApprover: metadata.second_approver || null,
        status: metadata.second_approver ? "completed" : "first_approved",
      });
    }
  };

  const handleApprove = async () => {
    if (!currentUser) return;

    try {
      if (approvalStatus.status === "pending") {
        // First approval
        await supabase.from("board_member_audit").insert({
          member_id: memberId,
          changed_by: currentUser.id,
          field_name: `two_person_approval_${actionType}`,
          new_value: JSON.stringify({
            first_approver: currentUser.id,
            first_approved_at: new Date().toISOString(),
          }),
          change_type: "updated",
        });

        toast({
          title: "First approval recorded",
          description: "Waiting for second approver",
        });

        setApprovalStatus({
          ...approvalStatus,
          firstApprover: currentUser.id,
          status: "first_approved",
        });
      } else if (approvalStatus.status === "first_approved") {
        // Second approval
        if (approvalStatus.firstApprover === currentUser.id) {
          toast({
            title: "Error",
            description: "The same person cannot provide both approvals",
            variant: "destructive",
          });
          return;
        }

        await supabase.from("board_member_audit").insert({
          member_id: memberId,
          changed_by: currentUser.id,
          field_name: `two_person_approval_${actionType}`,
          new_value: JSON.stringify({
            first_approver: approvalStatus.firstApprover,
            second_approver: currentUser.id,
            second_approved_at: new Date().toISOString(),
            status: "completed",
          }),
          change_type: "published",
        });

        toast({
          title: "Action approved",
          description: "Two-person approval completed",
        });

        setApprovalStatus({
          ...approvalStatus,
          secondApprover: currentUser.id,
          status: "completed",
        });

        if (onApprovalComplete) {
          onApprovalComplete();
        }
      }
    } catch (error: any) {
      console.error("Error recording approval:", error);
      toast({
        title: "Error",
        description: "Failed to record approval",
        variant: "destructive",
      });
    }
  };

  const getActionLabel = () => {
    switch (actionType) {
      case "publish_confidential":
        return "Publish Confidential Information";
      case "delete_profile":
        return "Delete Profile";
      default:
        return "Sensitive Action";
    }
  };

  return (
    <Card className="border-orange-500/50">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-orange-500" />
          <CardTitle>Two-Person Approval Required</CardTitle>
        </div>
        <CardDescription>
          This action requires approval from two different administrators
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-muted p-4 rounded-lg">
          <p className="text-sm font-medium mb-2">Action: {getActionLabel()}</p>
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4" />
            <span>
              {approvalStatus.status === "pending" && "Awaiting first approval"}
              {approvalStatus.status === "first_approved" && "Awaiting second approval"}
              {approvalStatus.status === "completed" && "Approval complete"}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {approvalStatus.firstApprover ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : (
              <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />
            )}
            <span className="text-sm">First Approver</span>
            {approvalStatus.firstApprover && (
              <Badge variant="outline">Approved</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {approvalStatus.secondApprover ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : (
              <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />
            )}
            <span className="text-sm">Second Approver</span>
            {approvalStatus.secondApprover && (
              <Badge variant="outline">Approved</Badge>
            )}
          </div>
        </div>

        {approvalStatus.status !== "completed" && (
          <Button
            onClick={handleApprove}
            className="w-full"
            disabled={
              approvalStatus.status === "first_approved" &&
              approvalStatus.firstApprover === currentUser?.id
            }
          >
            {approvalStatus.status === "pending"
              ? "Provide First Approval"
              : "Provide Second Approval"}
          </Button>
        )}

        {approvalStatus.status === "first_approved" &&
          approvalStatus.firstApprover === currentUser?.id && (
            <p className="text-sm text-muted-foreground text-center">
              Waiting for a different administrator to provide second approval
            </p>
          )}
      </CardContent>
    </Card>
  );
};

export default TwoPersonApproval;
