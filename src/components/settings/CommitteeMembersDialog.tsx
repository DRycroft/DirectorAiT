import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CommitteeMember {
  id: string;
  member_id: string;
  committee_role: string;
  full_name: string;
  position: string;
  member_type: string;
}

interface CommitteeMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  committeeId: string;
  committeeName: string;
}

const COMMITTEE_ROLES = [
  "Chair",
  "Deputy Chair", 
  "Secretary",
  "Member",
];

export default function CommitteeMembersDialog({
  open,
  onOpenChange,
  committeeId,
  committeeName,
}: CommitteeMembersDialogProps) {
  const [committeeMembers, setCommitteeMembers] = useState<CommitteeMember[]>([]);
  const [availableMembers, setAvailableMembers] = useState<any[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, committeeId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Get org_id first
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("org_id")
        .eq("id", userData.user.id)
        .single();

      if (!profile?.org_id) return;

      // Get current committee members
      const { data: members, error: membersError } = await supabase
        .from("committee_memberships")
        .select(`
          id,
          member_id,
          committee_role,
          board_members!inner(
            full_name,
            position,
            member_type
          )
        `)
        .eq("committee_id", committeeId);

      if (membersError) throw membersError;

      setCommitteeMembers(
        members?.map((m: any) => ({
          id: m.id,
          member_id: m.member_id,
          committee_role: m.committee_role,
          full_name: m.board_members.full_name,
          position: m.board_members.position,
          member_type: m.board_members.member_type,
        })) || []
      );

      // Get all available members from the org
      const { data: orgBoards } = await supabase
        .from("boards")
        .select("id")
        .eq("org_id", profile.org_id);

      const boardIds = orgBoards?.map(b => b.id) || [];

      const { data: allMembers, error: allMembersError } = await supabase
        .from("board_members")
        .select("id, full_name, position, member_type, board_id")
        .eq("status", "active")
        .in("board_id", boardIds);

      if (allMembersError) throw allMembersError;

      setAvailableMembers(allMembers || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load members");
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async () => {
    if (!selectedMemberId || !selectedRole) {
      toast.error("Please select a member and role");
      return;
    }

    try {
      const { error } = await supabase
        .from("committee_memberships")
        .insert({
          committee_id: committeeId,
          member_id: selectedMemberId,
          committee_role: selectedRole,
        });

      if (error) throw error;

      toast.success("Member added to committee");
      setSelectedMemberId("");
      setSelectedRole("");
      fetchData();
    } catch (error: any) {
      console.error("Error adding member:", error);
      toast.error(error.message || "Failed to add member");
    }
  };

  const handleRemoveMember = async (membershipId: string) => {
    try {
      const { error } = await supabase
        .from("committee_memberships")
        .delete()
        .eq("id", membershipId);

      if (error) throw error;

      toast.success("Member removed from committee");
      fetchData();
    } catch (error: any) {
      console.error("Error removing member:", error);
      toast.error(error.message || "Failed to remove member");
    }
  };

  const unassignedMembers = availableMembers.filter(
    m => !committeeMembers.some(cm => cm.member_id === m.id)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{committeeName} - Members</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add Member Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Add Member</h3>
            <div className="grid grid-cols-2 gap-4">
              <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select member" />
                </SelectTrigger>
                <SelectContent>
                  {unassignedMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.full_name} ({member.member_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {COMMITTEE_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAddMember} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add to Committee
            </Button>
          </div>

          {/* Current Members */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Current Members ({committeeMembers.length})</h3>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : committeeMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No members assigned yet</p>
            ) : (
              <div className="space-y-2">
                {committeeMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{member.full_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {member.position} • {member.member_type}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{member.committee_role}</Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMember(member.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
