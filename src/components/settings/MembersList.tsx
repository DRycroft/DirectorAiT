import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Mail, Copy, Loader2, XCircle, Pencil } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { logError } from "@/lib/errorHandling";
import { AddPersonDialog } from "@/components/AddPersonDialog";

interface Member {
  id: string;
  full_name: string;
  preferred_title: string | null;
  position: string | null;
  appointment_date: string | null;
  term_expiry: string | null;
  created_at: string | null;
  status: string | null;
}

interface MembersListProps {
  boardId: string;
  memberType: "board" | "executive" | "key_staff";
  organizationName?: string;
  onRefresh?: () => void;
}

export function MembersList({ boardId, memberType, organizationName, onRefresh: _onRefresh }: MembersListProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingInvite, setGeneratingInvite] = useState<string | null>(null);
  const [revokingInvite, setRevokingInvite] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const { toast } = useToast();

  const loadMembers = async () => {
    try {
      const { data, error } = await supabase
        .from("board_members")
        .select("id, full_name, preferred_title, position, appointment_date, term_expiry, created_at, status")
        .eq("board_id", boardId)
        .eq("member_type", memberType)
        .order("status", { ascending: true })
        .order("appointment_date", { ascending: false });

      if (error) throw error;
      setMembers(data || []);
    } catch (error: any) {
      logError("MembersList - Load members", error);
      toast({
        title: "Error",
        description: "Failed to load members",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, [boardId, memberType]);

  const handleGenerateInvite = async (memberId: string) => {
    setGeneratingInvite(memberId);
    try {
      // Use cryptographically secure server-side token generation
      const { data: token, error: tokenError } = await supabase.rpc(
        "generate_member_invite_token"
      );

      if (tokenError) throw tokenError;

      // Update member with new token (trigger auto-sets invite_expires_at)
      const { error } = await supabase
        .from("board_members")
        .update({ 
          invite_token: token,
          invite_sent_at: new Date().toISOString(),
          status: "invited"
        })
        .eq("id", memberId);

      if (error) throw error;

      // Fetch member details needed for the email
      const { data: memberData } = await supabase
        .from("board_members")
        .select(`
          full_name, invite_email,
          board:boards!board_members_board_id_fkey(title, org_id, organization:organizations!boards_org_id_fkey(name))
        `)
        .eq("id", memberId)
        .single();

      const inviteEmail = (memberData as any)?.invite_email;
      const boardName = (memberData as any)?.board?.title || "a board";
      const orgName = (memberData as any)?.board?.organization?.name || "an organisation";

      // Get current user's name for the email
      let invitedByName = "An administrator";
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("name")
          .eq("id", currentUser.id)
          .single();
        if (profileData?.name) invitedByName = profileData.name;
      }

      if (inviteEmail) {
        // Send the invite email via edge function
        const { error: emailError } = await supabase.functions.invoke(
          "send-invite-email",
          {
            body: {
              invite_token: token,
              invite_email: inviteEmail,
              invitee_name: (memberData as any)?.full_name || "",
              org_name: orgName,
              board_name: boardName,
              invited_by_name: invitedByName,
            },
          }
        );

        if (emailError) {
          logError("MembersList - Resend email", emailError);
          const inviteUrl = `${window.location.origin}/invite/${token}`;
          toast({
            title: "Token refreshed — email failed",
            description: `New invite created but email failed to send. Share this link manually: ${inviteUrl}`,
          });
        } else {
          toast({
            title: "Invite resent",
            description: `Invite email sent to ${inviteEmail}. Expires in 7 days.`,
          });
        }
      } else {
        // No email on file — copy link to clipboard as fallback
        const inviteUrl = `${window.location.origin}/invite/${token}`;
        await navigator.clipboard.writeText(inviteUrl);
        toast({
          title: "Invite link copied",
          description: "No email on file. The invite link has been copied to your clipboard.",
        });
      }

      loadMembers();
    } catch (error: any) {
      logError("MembersList - Generate invite", error);
      toast({
        title: "Error",
        description: "Failed to generate invite link",
        variant: "destructive",
      });
    } finally {
      setGeneratingInvite(null);
    }
  };

  const handleRevokeInvite = async (memberId: string) => {
    setRevokingInvite(memberId);
    try {
      const { error } = await supabase
        .from("board_members")
        .update({
          status: "revoked",
          invite_token: null,
          invite_expires_at: null,
        })
        .eq("id", memberId)
        .eq("status", "invited");

      if (error) throw error;

      toast({
        title: "Invite revoked",
        description: "The invitation link is no longer valid.",
      });
      loadMembers();
    } catch (error: any) {
      logError("MembersList - Revoke invite", error);
      toast({
        title: "Error",
        description: "Failed to revoke invite",
        variant: "destructive",
      });
    } finally {
      setRevokingInvite(null);
    }
  };

  const isArchived = (member: Member) => {
    if (!member.term_expiry) return false;
    return new Date(member.term_expiry) < new Date();
  };

  const activeMembers = members.filter(m => !isArchived(m) && m.status !== "archived");
  const archivedMembers = members.filter(m => isArchived(m) || m.status === "archived");

  // Pagination logic
  const displayMembers = showArchived ? archivedMembers : activeMembers;
  const totalPages = Math.ceil(displayMembers.length / itemsPerPage);
  const paginatedMembers = displayMembers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-2">
          <Button
            variant={!showArchived ? "default" : "outline"}
            onClick={() => {
              setShowArchived(false);
              setCurrentPage(1);
            }}
          >
            Active ({activeMembers.length})
          </Button>
          <Button
            variant={showArchived ? "default" : "outline"}
            onClick={() => {
              setShowArchived(true);
              setCurrentPage(1);
            }}
          >
            Archived ({archivedMembers.length})
          </Button>
        </div>
      </div>

      {paginatedMembers.length > 0 && (
        <div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Date Added</TableHead>
                <TableHead>Starting Date</TableHead>
                <TableHead>Finishing Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedMembers.map((member) => (
                <TableRow 
                  key={member.id}
                  className={showArchived ? "opacity-50 bg-muted/30" : ""}
                >
                  <TableCell>{member.preferred_title || "-"}</TableCell>
                  <TableCell className="font-medium">{member.full_name}</TableCell>
                  <TableCell>{member.position || "-"}</TableCell>
                  <TableCell>{member.created_at ? format(new Date(member.created_at), "dd/MM/yyyy") : "-"}</TableCell>
                  <TableCell>
                    {member.appointment_date ? format(new Date(member.appointment_date), "dd/MM/yyyy") : "-"}
                  </TableCell>
                  <TableCell>
                    {member.term_expiry ? format(new Date(member.term_expiry), "dd/MM/yyyy") : "-"}
                  </TableCell>
                  {!showArchived && (
                    <>
                      <TableCell>
                        <Badge variant={member.status === "active" ? "default" : "secondary"}>
                          {member.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {member.status === "invited" ? (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleGenerateInvite(member.id)}
                              disabled={generatingInvite === member.id || revokingInvite === member.id}
                            >
                              {generatingInvite === member.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Copy className="h-4 w-4 mr-1" />
                                  Resend
                                </>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleRevokeInvite(member.id)}
                              disabled={revokingInvite === member.id || generatingInvite === member.id}
                              title="Revoke invite"
                            >
                              {revokingInvite === member.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <XCircle className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        ) : member.status === "revoked" ? (
                          <span className="text-xs text-muted-foreground">Revoked</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Active</span>
                        )}
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                {Math.min(currentPage * itemsPerPage, displayMembers.length)} of{" "}
                {displayMembers.length} members
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {members.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No members added yet</p>
        </div>
      )}
    </div>
  );
}