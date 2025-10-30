import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Users, FileText, CheckCircle2, AlertCircle, TrendingUp, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardStats {
  totalBoards: number;
  activeAgendas: number;
  pendingActions: number;
  documentCount: number;
  pendingApprovals: number;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalBoards: 0,
    activeAgendas: 0,
    pendingActions: 0,
    documentCount: 0,
    pendingApprovals: 0,
  });
  const [user, setUser] = useState<any>(null);
  const [boards, setBoards] = useState<any[]>([]);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/auth");
      return;
    }
    
    setUser(user);
    await fetchDashboardData();
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch boards
      const { data: boardsData, error: boardsError } = await supabase
        .from("boards")
        .select("*, board_memberships!inner(role)")
        .order("created_at", { ascending: false });

      if (boardsError) throw boardsError;

      // Fetch agendas
      const { count: agendasCount } = await supabase
        .from("agendas")
        .select("*", { count: "exact", head: true })
        .eq("status", "draft");

      // Fetch action items
      const { count: actionsCount } = await supabase
        .from("action_items")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      // Fetch documents
      const { count: documentsCount } = await supabase
        .from("archived_documents")
        .select("*", { count: "exact", head: true });

      // Fetch pending approvals
      const { count: approvalsCount } = await supabase
        .from("document_submissions")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      setStats({
        totalBoards: boardsData?.length || 0,
        activeAgendas: agendasCount || 0,
        pendingActions: actionsCount || 0,
        documentCount: documentsCount || 0,
        pendingApprovals: approvalsCount || 0,
      });

      setBoards(boardsData || []);
    } catch (error: any) {
      console.error("Error fetching dashboard data:", error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, description, onClick }: any) => (
    <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={onClick}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8 pt-24">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-8 pt-24">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
            <p className="text-muted-foreground">Welcome back to BoardConnect</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="Active Boards"
            value={stats.totalBoards}
            icon={Users}
            description="Boards you're a member of"
            onClick={() => navigate("/boards")}
          />
          <StatCard
            title="Active Agendas"
            value={stats.activeAgendas}
            icon={Calendar}
            description="In draft status"
            onClick={() => navigate("/boards")}
          />
          <StatCard
            title="Pending Actions"
            value={stats.pendingActions}
            icon={CheckCircle2}
            description="Requiring attention"
          />
          <StatCard
            title="Documents"
            value={stats.documentCount}
            icon={FileText}
            description="Total archived documents"
            onClick={() => navigate("/library")}
          />
          <StatCard
            title="Pending Approvals"
            value={stats.pendingApprovals}
            icon={AlertCircle}
            description="Awaiting review"
            onClick={() => navigate("/approvals")}
          />
          <StatCard
            title="Intelligence Scans"
            value="Active"
            icon={TrendingUp}
            description="Competitor monitoring"
            onClick={() => navigate("/intelligence")}
          />
        </div>

        {/* Recent Boards */}
        <Card>
          <CardHeader>
            <CardTitle>Your Boards</CardTitle>
            <CardDescription>
              Recent board activity and quick access
            </CardDescription>
          </CardHeader>
          <CardContent>
            {boards.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No boards yet. Contact your administrator to get started.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {boards.slice(0, 5).map((board) => (
                  <div
                    key={board.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => navigate(`/boards/${board.id}`)}
                  >
                    <div>
                      <h3 className="font-semibold">{board.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {board.description || "No description"}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm">
                      View Board
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;
