import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getUserFriendlyError, logError } from "@/lib/errorHandling";
import { z } from "zod";
import { Plus, Mail } from "lucide-react";
import { MembersList } from "./MembersList";
import { AddPersonDialog } from "../AddPersonDialog";

interface BoardManagementProps {
  memberType: 'board' | 'executive' | 'key_staff';
  title: string;
  description: string;
  positions: string[];
}

const memberInviteSchema = z.object({
  board_id: z.string().min(1, "Board is required"),
  full_name: z.string().trim().min(1, "Full name is required").max(100, "Name must be less than 100 characters"),
  personal_email: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters"),
  position: z.string().trim().max(100, "Position must be less than 100 characters").optional().or(z.literal("")),
});

const BoardManagement = ({ memberType, title, description, positions }: BoardManagementProps) => {
  const { toast } = useToast();
  const [boards, setBoards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedBoard, setSelectedBoard] = useState<string>("");
  const [organizationName, setOrganizationName] = useState<string>("");
  const [refreshMembers, setRefreshMembers] = useState(0);
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

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("org_id")
        .eq("id", user.id)
        .single();

      if (!profile?.org_id) return;

      const { data: org } = await supabase
        .from("organizations")
        .select("name")
        .eq("id", profile.org_id)
        .single();

      if (org) {
        setOrganizationName(org.name);
      }

      // Fetch boards
      const { data: boardsData, error: boardsError } = await supabase
        .from("boards")
        .select("*")
        .order("title");

      if (boardsError) throw boardsError;
      setBoards(boardsData || []);
      
      // Set first board as default if not already selected
      if (boardsData && boardsData.length > 0 && !selectedBoard) {
        setSelectedBoard(boardsData[0].id);
      }
    } catch (error: any) {
      logError("BoardManagement.fetchData", error);
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    // Validate input
    try {
      memberInviteSchema.parse(formData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
        return;
      }
    }

    try {
      const { data: tokenData, error: tokenError } = await supabase.rpc(
        "generate_member_invite_token"
      );

      if (tokenError) throw tokenError;

      const { error } = await supabase.from("board_members").insert({
        board_id: formData.board_id,
        member_type: memberType,
        position: formData.position?.trim() || null,
        full_name: formData.full_name.trim(),
        personal_email: formData.personal_email.trim(),
        status: "invited",
        invite_token: tokenData,
        invite_sent_at: new Date().toISOString(),
      });

      if (error) throw error;

      toast({
        title: "Member invited",
        description: `Invite sent to ${formData.personal_email}`,
      });

      setFormData({
        board_id: "",
        full_name: "",
        personal_email: "",
        position: "",
      });
      setDialogOpen(false);
      setRefreshMembers(prev => prev + 1);
    } catch (error: any) {
      logError("BoardManagement.handleInvite", error);
      toast({
        title: "Error",
        description: getUserFriendlyError(error),
        variant: "destructive",
      });
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
          <div className="flex gap-2">
            <AddPersonDialog 
              boardId={selectedBoard}
              organizationName={organizationName}
              onSuccess={() => setRefreshMembers(prev => prev + 1)}
              defaultMemberType={memberType}
              trigger={
                <Button variant="default">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Member
                </Button>
              }
            />
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Mail className="mr-2 h-4 w-4" />
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
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : selectedBoard ? (
          <MembersList
            boardId={selectedBoard}
            memberType={memberType}
            key={refreshMembers}
          />
        ) : (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">Please select a board first</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BoardManagement;
