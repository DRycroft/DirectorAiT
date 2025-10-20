import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Users, Briefcase, UserCog, Eye } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const TeamOverview = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [boards, setBoards] = useState<any[]>([]);
  const [allBoardMembers, setAllBoardMembers] = useState<any[]>([]);
  const [allExecutives, setAllExecutives] = useState<any[]>([]);
  const [allKeyStaff, setAllKeyStaff] = useState<any[]>([]);

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
      console.error("Error fetching team data:", error);
      toast({
        title: "Error",
        description: "Failed to load team data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Define default positions for each member type
  const getDefaultPositions = (memberType: 'board' | 'executive' | 'staff') => {
    if (memberType === 'board') {
      return [
        'Chair',
        'Deputy Chair',
        'Secretary',
        'Board Member',
        'Board Member',
        'Board Member',
        'Board Member',
        'Board Member',
        'Board Member'
      ];
    } else if (memberType === 'executive') {
      return [
        'Chief Executive Officer',
        'Chief Financial Officer',
        'Chief Operating Officer',
        'Chief Technology Officer',
        'Chief Marketing Officer',
        'Chief People Officer'
      ];
    } else {
      return [
        'Manager',
        'Manager',
        'Coordinator',
        'Coordinator',
        'Specialist',
        'Specialist'
      ];
    }
  };

  const MemberTable = ({ 
    members, 
    title, 
    description, 
    icon: Icon, 
    accentColor,
    memberType 
  }: { 
    members: any[], 
    title: string, 
    description: string,
    icon: any,
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

    // Build display rows: default positions with actual members where they exist
    const displayRows = defaultPositions.map((position, index) => {
      const member = positionMap.get(position) || members.find(m => !defaultPositions.includes(m.position));
      if (member && positionMap.has(member.position)) {
        positionMap.delete(member.position);
      }
      return { position, member, index };
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
              <div className={`p-2 rounded-lg bg-${accentColor}/10`}>
                <Icon className="h-6 w-6" style={{ color: `hsl(var(--${accentColor}))` }} />
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
                <TableHead>{memberType === 'board' ? 'Board' : 'Direct Report'}</TableHead>
                <TableHead>Contact</TableHead>
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
                      : (row.member?.sensitive_notes || "-")
                    }
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {row.member?.personal_email || "-"}
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
