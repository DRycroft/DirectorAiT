import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Mail, Copy, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { logError } from "@/lib/errorHandling";

interface Member {
  id: string;
  full_name: string;
  preferred_title: string | null;
  position: string;
  appointment_date: string | null;
  term_expiry: string | null;
  created_at: string;
  status: string;
}

interface MembersListProps {
  boardId: string;
  memberType: "board" | "executive" | "key_staff";
  onRefresh?: () => void;
}

export function MembersList({ boardId, memberType, onRefresh }: MembersListProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingInvite, setGeneratingInvite] = useState<string | null>(null);
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
      const token = crypto.randomUUID();
      const { error } = await supabase
        .from("board_members")
        .update({ 
          invite_token: token,
          invite_sent_at: new Date().toISOString(),
          status: "invited"
        })
        .eq("id", memberId);

      if (error) throw error;

      const inviteUrl = `${window.location.origin}/member-intake?token=${token}`;
      await navigator.clipboard.writeText(inviteUrl);

      toast({
        title: "Invite Link Copied",
        description: "The invite link has been copied to your clipboard",
      });

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
                  <TableCell>{member.position}</TableCell>
                  <TableCell>{format(new Date(member.created_at), "dd/MM/yyyy")}</TableCell>
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
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleGenerateInvite(member.id)}
                            disabled={generatingInvite === member.id}
                          >
                            {generatingInvite === member.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Copy className="h-4 w-4 mr-2" />
                                Resend
                              </>
                            )}
                          </Button>
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