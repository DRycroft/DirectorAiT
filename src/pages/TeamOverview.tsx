import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Users, Briefcase, UserCog, Eye, FileText, GitBranch, Clock, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { getPositionsByType } from "@/config/positions";
import { AddPersonDialog } from "@/components/AddPersonDialog";
import { logError } from "@/lib/errorHandling";
import { BoardWithOrg, BoardMemberWithBoard } from "@/types/database";

const TeamOverview = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [boards, setBoards] = useState<BoardWithOrg[]>([]);
  const [allBoardMembers, setAllBoardMembers] = useState<BoardMemberWithBoard[]>([]);
  const [allExecutives, setAllExecutives] = useState<BoardMemberWithBoard[]>([]);
  const [allKeyStaff, setAllKeyStaff] = useState<BoardMemberWithBoard[]>([]);
  const [selectedMember, setSelectedMember] = useState<BoardMemberWithBoard | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [organizationName, setOrganizationName] = useState<string>("");

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/auth");
      return;
    }
    
    await fetchAllTeamData();
  };

  const fetchAllTeamData = async () => {
    try {
      setLoading(true);

      // Fetch user's boards
      const { data: boardsData, error: boardsError } = await supabase
        .from("boards")
        .select(`
          *,
          board_memberships!inner(role),
          organizations(name)
        `)
        .order("created_at", { ascending: false });

      if (boardsError) throw boardsError;
      setBoards(boardsData || []);
      
      // Set organization name from first board
      if (boardsData && boardsData.length > 0 && boardsData[0].organizations) {
        setOrganizationName(boardsData[0].organizations.name);
      }

      // Fetch all team members from all boards user has access to
      const boardIds = boardsData?.map(b => b.id) || [];
      
      if (boardIds.length > 0) {
        const { data: membersData, error: membersError } = await supabase
          .from("board_members")
          .select("*, boards(title)")
          .in("board_id", boardIds)
          .eq("status", "active")
          .order("full_name");

        if (membersError) throw membersError;

        // Separate by type
        setAllBoardMembers(membersData?.filter(m => m.member_type === "board") || []);
        setAllExecutives(membersData?.filter(m => m.member_type === "executive") || []);
        setAllKeyStaff(membersData?.filter(m => m.member_type === "key_staff") || []);
      }

    } catch (error: any) {
      logError("TeamOverview - Fetch team data", error);
      toast({
        title: "Error",
        description: "Failed to load team data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (member: BoardMemberWithBoard) => {
    setSelectedMember(member);
    setDetailDialogOpen(true);
  };

  const MemberDetailDialog = () => {
    if (!selectedMember) return null;

    return (
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              {selectedMember.preferred_title && `${selectedMember.preferred_title} `}
              {selectedMember.full_name}
            </DialogTitle>
            <p className="text-muted-foreground">{selectedMember.position}</p>
          </DialogHeader>

          <Tabs defaultValue="bio" className="w-full mt-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="bio">
                <FileText className="h-4 w-4 mr-2" />
                Bio
              </TabsTrigger>
              <TabsTrigger value="responsibilities">
                <Briefcase className="h-4 w-4 mr-2" />
                Responsibilities
              </TabsTrigger>
              <TabsTrigger value="reports">
                <GitBranch className="h-4 w-4 mr-2" />
                Reports
              </TabsTrigger>
              <TabsTrigger value="history">
                <Clock className="h-4 w-4 mr-2" />
                History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="bio" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Biography</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <h4 className="font-medium mb-1">Short Bio</h4>
                    <p className="text-sm text-muted-foreground">
                      {selectedMember.short_bio || "No biography available"}
                    </p>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="font-medium mb-1">Professional Qualifications</h4>
                    <p className="text-sm text-muted-foreground">
                      {selectedMember.professional_qualifications || "Not specified"}
                    </p>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="font-medium mb-1">Company Affiliations</h4>
                    <p className="text-sm text-muted-foreground">
                      {selectedMember.public_company_affiliations || "None listed"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="responsibilities" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Role & Responsibilities</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <h4 className="font-medium mb-1">Position</h4>
                    <p className="text-sm text-muted-foreground">{selectedMember.position}</p>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="font-medium mb-1">Skills & Competencies</h4>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedMember.skills_competencies && Array.isArray(selectedMember.skills_competencies) && selectedMember.skills_competencies.length > 0 ? (
                        (selectedMember.skills_competencies as string[]).map((skill) => (
                          <Badge key={`${selectedMember.id}-skill-${skill}`} variant="secondary">{skill}</Badge>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No skills listed</p>
                      )}
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="font-medium mb-1">Work History</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">
                      {selectedMember.detailed_work_history || "No work history available"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reports" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Reporting Structure</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                <div>
                    <h4 className="font-medium mb-1">Reports To</h4>
                    <p className="text-sm text-muted-foreground">
                      {selectedMember.reports_to || "Not specified"}
                    </p>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="font-medium mb-1">Direct Reports</h4>
                    <p className="text-sm text-muted-foreground">
                      Information about team members reporting to this person will be shown here
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Appointment History</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <h4 className="font-medium mb-1">Appointment Date</h4>
                    <p className="text-sm text-muted-foreground">
                      {selectedMember.appointment_date 
                        ? new Date(selectedMember.appointment_date).toLocaleDateString()
                        : "Not specified"}
                    </p>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="font-medium mb-1">Term Expiry</h4>
                    <p className="text-sm text-muted-foreground">
                      {selectedMember.term_expiry 
                        ? new Date(selectedMember.term_expiry).toLocaleDateString()
                        : "Not specified"}
                    </p>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="font-medium mb-1">Reappointment History</h4>
                    {selectedMember.reappointment_history && Array.isArray(selectedMember.reappointment_history) && selectedMember.reappointment_history.length > 0 ? (
                      <ul className="space-y-2 mt-2">
                        {(selectedMember.reappointment_history as unknown[]).map((record: unknown, index: number) => (
                          <li key={`${selectedMember.id}-reappointment-${index}`} className="text-sm text-muted-foreground">
                            {JSON.stringify(record)}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">No reappointment history</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    );
  };

  // Get default positions from the shared config (source of truth from Settings)
  const getDefaultPositions = (memberType: 'board' | 'executive' | 'staff') => {
    // Map 'staff' to 'key_staff' for the config
    const configType = memberType === 'staff' ? 'key_staff' : memberType;
    return getPositionsByType(configType);
  };

  const MemberTable = ({ 
    members, 
    title, 
    description, 
    icon: Icon, 
    accentColor,
    memberType 
  }: { 
    members: BoardMemberWithBoard[], 
    title: string, 
    description: string,
    icon: React.ComponentType<{ className?: string }>,
    accentColor: string,
    memberType: 'board' | 'executive' | 'staff'
  }) => {
    const defaultPositions = getDefaultPositions(memberType);
    
    // Create a map of positions to members
    const positionMap = new Map<string, any>();
    members.forEach(member => {
      if (member.position) {
        positionMap.set(member.position, member);
      }
    });

    //Build display rows: default positions with actual members where they exist
    let displayIndex = 0;
    const displayRows = defaultPositions.map((position) => {
      const member = positionMap.get(position) || members.find(m => m.position && !defaultPositions.includes(m.position));
      if (member && positionMap.has(member.position)) {
        positionMap.delete(member.position);
      }
      return { position, member, index: displayIndex++ };
    });

    // Add any members with non-standard positions that weren't matched
    Array.from(positionMap.values()).forEach((member, index) => {
      displayRows.push({ 
        position: member.position || 'Additional Member', 
        member, 
        index: displayRows.length + index 
      });
    });

    const filledCount = displayRows.filter(row => row.member).length;

    return (
      <Card className="border-l-4 shadow-sm" style={{ borderLeftColor: `hsl(var(--${accentColor}))` }}>
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
              {filledCount} / {displayRows.length} Filled
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>{memberType === 'board' ? 'Board' : 'Reports To'}</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayRows.map((row) => (
                <TableRow 
                  key={`${row.position}-${row.index}`} 
                  className={row.member ? "hover:bg-muted/50" : "opacity-40"}
                >
                  <TableCell className="font-medium">
                    {row.member ? (
                      <>
                        {row.member.preferred_title && `${row.member.preferred_title} `}
                        {row.member.full_name}
                      </>
                    ) : (
                      <span className="text-muted-foreground italic">Position available</span>
                    )}
                  </TableCell>
                  <TableCell>{row.position}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {memberType === 'board' 
                      ? (row.member?.boards?.title || "-")
                      : (row.member?.reports_to || "-")
                    }
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {row.member?.public_contact_email || "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    {row.member && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetails(row.member)}
                        className="h-8"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
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
      <MemberDetailDialog />
      <main className="container mx-auto px-4 py-8 pt-24">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Board & Team</h1>
          <p className="text-muted-foreground">
            View all team members across your boards
          </p>
          <Badge variant="outline" className="mt-2">
            {boards.length} {boards.length === 1 ? 'Board' : 'Boards'}
          </Badge>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <div className="flex items-center justify-between mb-8">
            <TabsList>
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
            {boards.length > 0 && (
              <AddPersonDialog 
                boardId={boards[0].id} 
                organizationName={organizationName}
                onSuccess={fetchAllTeamData}
              />
            )}
          </div>

          <TabsContent value="all" className="space-y-8">
            <MemberTable 
              members={allBoardMembers} 
              title="Board Members" 
              description="Elected directors responsible for governance and strategic oversight"
              icon={Users}
              accentColor="primary"
              memberType="board"
            />
            <MemberTable 
              members={allExecutives} 
              title="Executive Team" 
              description="Senior leadership responsible for day-to-day operations"
              icon={Briefcase}
              accentColor="accent"
              memberType="executive"
            />
            <MemberTable 
              members={allKeyStaff} 
              title="Key Staff" 
              description="Essential personnel supporting organizational operations"
              icon={UserCog}
              accentColor="secondary"
              memberType="staff"
            />
          </TabsContent>

          <TabsContent value="board">
            <MemberTable 
              members={allBoardMembers} 
              title="Board Members" 
              description="Elected directors responsible for governance and strategic oversight"
              icon={Users}
              accentColor="primary"
              memberType="board"
            />
          </TabsContent>

          <TabsContent value="executives">
            <MemberTable 
              members={allExecutives} 
              title="Executive Team" 
              description="Senior leadership responsible for day-to-day operations"
              icon={Briefcase}
              accentColor="accent"
              memberType="executive"
            />
          </TabsContent>

          <TabsContent value="staff">
            <MemberTable 
              members={allKeyStaff} 
              title="Key Staff" 
              description="Essential personnel supporting organizational operations"
              icon={UserCog}
              accentColor="secondary"
              memberType="staff"
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default TeamOverview;
