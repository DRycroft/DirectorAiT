import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Users, Briefcase, UserCog, Eye, ArrowLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { logError } from "@/lib/errorHandling";
import { BoardWithOrg, BoardMember, ViewerRole } from "@/types/database";

const BoardAndTeam = () => {
  const { boardId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [board, setBoard] = useState<BoardWithOrg | null>(null);
  const [boardMembers, setBoardMembers] = useState<BoardMember[]>([]);
  const [executives, setExecutives] = useState<BoardMember[]>([]);
  const [keyStaff, setKeyStaff] = useState<BoardMember[]>([]);
  const [selectedMember, setSelectedMember] = useState<BoardMember | null>(null);
  const [viewerRole, setViewerRole] = useState<ViewerRole>('public');

  useEffect(() => {
    if (boardId) {
      checkAuth();
    }
  }, [boardId]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      // Public view
      setViewerRole('public');
      await fetchBoardData();
      return;
    }

    // Check if user is board member or admin
    const { data: membership } = await supabase
      .from("board_memberships")
      .select("role")
      .eq("board_id", boardId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (membership) {
      setViewerRole(membership.role === "chair" || membership.role === "admin" ? "admin" : "internal");
    } else {
      setViewerRole('public');
    }

    await fetchBoardData();
  };

  const fetchBoardData = async () => {
    try {
      setLoading(true);

      // Fetch board details
      const { data: boardData, error: boardError } = await supabase
        .from("boards")
        .select("*, organizations(name)")
        .eq("id", boardId)
        .maybeSingle();

      if (boardError) throw boardError;
      setBoard(boardData);

      // Fetch all members
      const { data: allMembers, error: membersError } = await supabase
        .from("board_members")
        .select("*")
        .eq("board_id", boardId)
        .eq("status", "active")
        .order("position");

      if (membersError) throw membersError;

      // Separate by type
      const boardMembersFiltered = allMembers?.filter(m => m.member_type === "board") || [];
      const executivesFiltered = allMembers?.filter(m => m.member_type === "executive") || [];
      const keyStaffFiltered = allMembers?.filter(m => m.member_type === "key_staff") || [];
      
      setBoardMembers(boardMembersFiltered);
      setExecutives(executivesFiltered);
      setKeyStaff(keyStaffFiltered);

    } catch (error: any) {
      logError("BoardAndTeam - Fetch board data", error);
      toast({
        title: "Error",
        description: "Failed to load board data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getFilteredMember = (member: BoardMember) => {
    const publishPrefs = (member.publish_preferences as Record<string, boolean>) || {};
    
    if (viewerRole === 'admin') {
      return member; // Show everything
    }
    
    if (viewerRole === 'internal') {
      // Show public + internal fields
      return {
        ...member,
        national_id: null,
        home_address: null,
        sensitive_notes: null,
      };
    }
    
    // Public view - only show published fields
    return {
      full_name: publishPrefs.full_name ? member.full_name : null,
      preferred_title: publishPrefs.full_name ? member.preferred_title : null,
      position: member.position,
      public_job_title: publishPrefs.public_job_title ? member.public_job_title : null,
      short_bio: publishPrefs.short_bio ? member.short_bio : null,
      public_company_affiliations: publishPrefs.public_company_affiliations ? member.public_company_affiliations : null,
      professional_qualifications: publishPrefs.professional_qualifications ? member.professional_qualifications : null,
      personal_email: publishPrefs.public_contact_email ? member.personal_email : null,
    };
  };

  const MemberTable = ({ members, title, description, icon: Icon, accentColor }: { 
    members: BoardMember[], 
    title: string, 
    description: string,
    icon: React.ComponentType<{ className?: string }>,
    accentColor: string 
  }) => {
    return (
      <Card className="border-l-4 shadow-sm hover:shadow-md transition-shadow" style={{ borderLeftColor: `hsl(var(--${accentColor}))` }}>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg`} style={{ backgroundColor: `hsl(var(--${accentColor})/0.1)` }}>
                <Icon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">{title}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">{description}</p>
              </div>
            </div>
            <Badge variant="secondary" className="text-base px-3 py-1">
              {members.length} {members.length === 1 ? 'Member' : 'Members'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <div className="text-center py-12">
              <Icon className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-30" />
              <p className="text-muted-foreground text-sm">
                No members added yet. Add members in Settings to populate this section.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Position</TableHead>
                  {viewerRole !== 'public' && <TableHead>Contact</TableHead>}
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => {
                  const filtered = getFilteredMember(member);
                  return (
                    <TableRow key={member.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        {filtered.preferred_title && `${filtered.preferred_title} `}
                        {filtered.full_name || <span className="text-muted-foreground italic">Name not published</span>}
                      </TableCell>
                      <TableCell>{filtered.position || "-"}</TableCell>
                      {viewerRole !== 'public' && (
                        <TableCell className="text-sm text-muted-foreground">
                          {member.personal_email || "-"}
                        </TableCell>
                      )}
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedMember(member)}
                          className="hover:bg-primary/10"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    );
  };

  const MemberDetailDialog = () => {
    if (!selectedMember) return null;
    const filtered = getFilteredMember(selectedMember);

    return (
      <Dialog open={!!selectedMember} onOpenChange={() => setSelectedMember(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              {filtered.preferred_title && `${filtered.preferred_title} `}
              {filtered.full_name || "Member Profile"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {filtered.position && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground">Position</h3>
                <p className="text-lg">{filtered.position}</p>
              </div>
            )}
            
            {filtered.public_job_title && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground">Primary Occupation</h3>
                <p>{filtered.public_job_title}</p>
              </div>
            )}

            {filtered.short_bio && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground">Biography</h3>
                <p className="whitespace-pre-line">{filtered.short_bio}</p>
              </div>
            )}

            {filtered.professional_qualifications && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground">Qualifications</h3>
                <p>{filtered.professional_qualifications}</p>
              </div>
            )}

            {filtered.public_company_affiliations && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground">Company Affiliations</h3>
                <p>{filtered.public_company_affiliations}</p>
              </div>
            )}

            {viewerRole !== 'public' && selectedMember.personal_email && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground">Contact</h3>
                <p>{selectedMember.personal_email}</p>
                {selectedMember.personal_mobile && <p>{selectedMember.personal_mobile}</p>}
              </div>
            )}

            {viewerRole === 'internal' && (
              <>
                {selectedMember.appointment_date && (
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground">Appointment Date</h3>
                    <p>{new Date(selectedMember.appointment_date).toLocaleDateString()}</p>
                  </div>
                )}
                {selectedMember.detailed_work_history && (
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground">Work History</h3>
                    <p className="whitespace-pre-line">{selectedMember.detailed_work_history}</p>
                  </div>
                )}
              </>
            )}

            {viewerRole === 'admin' && (
              <>
                {selectedMember.legal_name && (
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground">Legal Name</h3>
                    <p>{selectedMember.legal_name}</p>
                  </div>
                )}
                {selectedMember.emergency_contact_name && (
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground">Emergency Contact</h3>
                    <p>{selectedMember.emergency_contact_name}</p>
                    {selectedMember.emergency_contact_phone && <p>{selectedMember.emergency_contact_phone}</p>}
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8 pt-24">
          <Skeleton className="h-12 w-64 mb-8" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-8 pt-24">
        <div className="mb-8">
          <Button variant="ghost" onClick={() => navigate(`/boards/${boardId}`)} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Board
          </Button>
          <h1 className="text-4xl font-bold mb-2">Board & Team</h1>
          <p className="text-muted-foreground">
            {board?.title} • {board?.organizations?.name}
          </p>
          <Badge variant="outline" className="mt-2">
            Viewing as: {viewerRole === 'admin' ? 'Administrator' : viewerRole === 'internal' ? 'Board Member' : 'Public'}
          </Badge>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="mb-8">
            <TabsTrigger value="all">All Groups</TabsTrigger>
            <TabsTrigger value="board">
              <Users className="mr-2 h-4 w-4" />
              Board Members
            </TabsTrigger>
            <TabsTrigger value="executives">
              <Briefcase className="mr-2 h-4 w-4" />
              Executive Team
            </TabsTrigger>
            <TabsTrigger value="staff">
              <UserCog className="mr-2 h-4 w-4" />
              Key Staff
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-8">
            <MemberTable 
              members={boardMembers} 
              title="Board Members" 
              description="Elected directors responsible for governance and strategic oversight"
              icon={Users}
              accentColor="primary"
            />
            <MemberTable 
              members={executives} 
              title="Executive Team" 
              description="Senior leadership responsible for day-to-day operations"
              icon={Briefcase}
              accentColor="accent"
            />
            <MemberTable 
              members={keyStaff} 
              title="Key Staff" 
              description="Essential personnel supporting organizational operations"
              icon={UserCog}
              accentColor="secondary"
            />
          </TabsContent>

          <TabsContent value="board">
            <MemberTable 
              members={boardMembers} 
              title="Board Members" 
              description="Elected directors responsible for governance and strategic oversight"
              icon={Users}
              accentColor="primary"
            />
          </TabsContent>

          <TabsContent value="executives">
            <MemberTable 
              members={executives} 
              title="Executive Team" 
              description="Senior leadership responsible for day-to-day operations"
              icon={Briefcase}
              accentColor="accent"
            />
          </TabsContent>

          <TabsContent value="staff">
            <MemberTable 
              members={keyStaff} 
              title="Key Staff" 
              description="Essential personnel supporting organizational operations"
              icon={UserCog}
              accentColor="secondary"
            />
          </TabsContent>
        </Tabs>

        <MemberDetailDialog />
      </main>
    </div>
  );
};

export default BoardAndTeam;
