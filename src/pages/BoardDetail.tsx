import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Calendar, FileText, Users, Settings, Plus, CheckCircle2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const BoardDetail = () => {
  const { boardId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [board, setBoard] = useState<any>(null);
  const [agendas, setAgendas] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);

  useEffect(() => {
    if (boardId) {
      checkAuth();
    }
  }, [boardId]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/auth");
      return;
    }
    
    await fetchBoardData();
  };

  const fetchBoardData = async () => {
    try {
      setLoading(true);

      // Fetch board details
      const { data: boardData, error: boardError } = await supabase
        .from("boards")
        .select(`
          *,
          organizations(name),
          board_settings(*)
        `)
        .eq("id", boardId)
        .single();

      if (boardError) throw boardError;

      // Fetch agendas
      const { data: agendasData, error: agendasError } = await supabase
        .from("agendas")
        .select("*, agenda_items(count)")
        .eq("board_id", boardId)
        .order("meeting_date", { ascending: false });

      if (agendasError) throw agendasError;

      // Fetch members
      const { data: membersData, error: membersError } = await supabase
        .from("board_memberships")
        .select(`
          *,
          profiles(name, email)
        `)
        .eq("board_id", boardId);

      if (membersError) throw membersError;

      setBoard(boardData);
      setAgendas(agendasData || []);
      setMembers(membersData || []);
    } catch (error: any) {
      console.error("Error fetching board data:", error);
      toast({
        title: "Error",
        description: "Failed to load board details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8 pt-24">
          <Skeleton className="h-12 w-96 mb-8" />
          <Skeleton className="h-[500px] w-full" />
        </div>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8 pt-24">
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Board not found</h3>
                <Button onClick={() => navigate("/boards")}>Back to Boards</Button>
              </div>
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
        <div className="flex justify-between items-start mb-8">
          <div>
            <Button variant="ghost" onClick={() => navigate("/boards")} className="mb-2">
              ← Back to Boards
            </Button>
            <h1 className="text-4xl font-bold mb-2">{board.title}</h1>
            <p className="text-muted-foreground">{board.description}</p>
          </div>
          <Button>
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>

        <Tabs defaultValue="agendas" className="w-full">
          <TabsList>
            <TabsTrigger value="agendas">
              <Calendar className="h-4 w-4 mr-2" />
              Agendas
            </TabsTrigger>
            <TabsTrigger value="members">
              <Users className="h-4 w-4 mr-2" />
              Members
            </TabsTrigger>
            <TabsTrigger value="documents">
              <FileText className="h-4 w-4 mr-2" />
              Documents
            </TabsTrigger>
          </TabsList>

          <TabsContent value="agendas" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold">Meeting Agendas</h2>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Agenda
              </Button>
            </div>

            {agendas.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center">
                    <Calendar className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">No agendas yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Create your first agenda to get started
                    </p>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Agenda
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {agendas.map((agenda) => (
                  <Card key={agenda.id} className="cursor-pointer hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle>{agenda.title}</CardTitle>
                          <CardDescription>
                            {format(new Date(agenda.meeting_date), "PPP")}
                          </CardDescription>
                        </div>
                        <Badge
                          variant={
                            agenda.status === "published"
                              ? "default"
                              : agenda.status === "draft"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {agenda.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <FileText className="h-4 w-4" />
                          <span>{agenda.agenda_items?.[0]?.count || 0} items</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="members" className="space-y-4">
            <h2 className="text-2xl font-semibold mb-4">Board Members</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {members.map((member) => (
                <Card key={member.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        {member.profiles?.name || "Unknown"}
                      </CardTitle>
                      <Badge variant="outline">{member.role}</Badge>
                    </div>
                    <CardDescription>{member.profiles?.email}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {member.accepted_at ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <span>Active</span>
                        </>
                      ) : (
                        <>
                          <Calendar className="h-4 w-4" />
                          <span>Invited</span>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="documents">
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">Board Documents</h3>
                  <p className="text-muted-foreground mb-4">
                    View all documents related to this board
                  </p>
                  <Button onClick={() => navigate("/library")}>
                    Go to Document Library
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default BoardDetail;
