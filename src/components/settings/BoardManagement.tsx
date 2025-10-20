import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Users, Mail, Trash2, Edit } from "lucide-react";

interface BoardManagementProps {
  memberType: 'board' | 'executive' | 'key_staff';
  title: string;
  description: string;
  positions: string[];
}

const BoardManagement = ({ memberType, title, description, positions }: BoardManagementProps) => {
  const { toast } = useToast();
  const [members, setMembers] = useState<any[]>([]);
  const [boards, setBoards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    board_id: "",
    full_name: "",
    personal_email: "",
    position: "",
  });

  useEffect(() => {
    fetchData();
  }, [memberType]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch boards
      const { data: boardsData, error: boardsError } = await supabase
        .from("boards")
        .select("*")
        .order("title");

      if (boardsError) throw boardsError;
      setBoards(boardsData || []);

      // Fetch members of this type
      const { data: membersData, error: membersError } = await supabase
        .from("board_members")
        .select("*, boards(title)")
        .eq("member_type", memberType)
        .order("full_name");

      if (membersError) throw membersError;
      setMembers(membersData || []);
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to load members",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!formData.board_id || !formData.full_name || !formData.personal_email) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: tokenData, error: tokenError } = await supabase.rpc(
        "generate_member_invite_token"
      );

      if (tokenError) throw tokenError;

      const { error } = await supabase.from("board_members").insert({
        board_id: formData.board_id,
        member_type: memberType,
        position: formData.position || null,
        full_name: formData.full_name,
        personal_email: formData.personal_email,
        status: "invited",
        invite_token: tokenData,
        invite_sent_at: new Date().toISOString(),
      });

      if (error) throw error;

      const inviteLink = `${window.location.origin}/member-invite?token=${tokenData}`;

      toast({
        title: "Member invited",
        description: `Invite sent to ${formData.personal_email}`,
      });

      console.log("Invite link:", inviteLink);

      setFormData({
        board_id: "",
        full_name: "",
        personal_email: "",
        position: "",
      });
      setDialogOpen(false);
      fetchData();
    } catch (error: any) {
      console.error("Error inviting member:", error);
      toast({
        title: "Error",
        description: "Failed to invite member",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (memberId: string) => {
    if (!confirm("Are you sure you want to remove this member?")) return;

    try {
      const { error } = await supabase
        .from("board_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;

      toast({
        title: "Member removed",
        description: "The member has been removed",
      });

      fetchData();
    } catch (error: any) {
      console.error("Error deleting member:", error);
      toast({
        title: "Error",
        description: "Failed to remove member",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "default";
      case "pending":
        return "secondary";
      case "invited":
        return "outline";
      default:
        return "secondary";
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Invite Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite {title} Member</DialogTitle>
                <DialogDescription>
                  Send an invitation to complete their profile
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="board">Board *</Label>
                  <Select
                    value={formData.board_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, board_id: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select board" />
                    </SelectTrigger>
                    <SelectContent>
                      {boards.map((board) => (
                        <SelectItem key={board.id} value={board.id}>
                          {board.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="position">Position</Label>
                  <Select
                    value={formData.position}
                    onValueChange={(value) =>
                      setFormData({ ...formData, position: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select position (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {positions.map((position) => (
                        <SelectItem key={position} value={position}>
                          {position}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={formData.full_name}
                    onChange={(e) =>
                      setFormData({ ...formData, full_name: e.target.value })
                    }
                    placeholder="Jane Smith"
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.personal_email}
                    onChange={(e) =>
                      setFormData({ ...formData, personal_email: e.target.value })
                    }
                    placeholder="jane@example.com"
                  />
                </div>

                <Button onClick={handleInvite} className="w-full">
                  <Mail className="mr-2 h-4 w-4" />
                  Send Invite
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : members.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground">No members yet</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Board</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">{member.full_name}</TableCell>
                  <TableCell>{member.position || "-"}</TableCell>
                  <TableCell>{member.boards?.title || "-"}</TableCell>
                  <TableCell>{member.personal_email}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(member.status)}>
                      {member.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {member.status === "pending" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            window.open(`/member-approval/${member.id}`, "_blank")
                          }
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(member.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default BoardManagement;
