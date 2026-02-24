import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Users, FileText, CheckCircle2, AlertCircle, TrendingUp, Calendar, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { logError } from "@/lib/errorHandling";
import { LucideIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface DashboardStats {
  totalBoards: number;
  activeAgendas: number;
  pendingActions: number;
  documentCount: number;
  pendingApprovals: number;
}

interface UserOrg {
  org_id: string;
  org_name: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isBootstrapping } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalBoards: 0,
    activeAgendas: 0,
    pendingActions: 0,
    documentCount: 0,
    pendingApprovals: 0,
  });
  const [boards, setBoards] = useState<any[]>([]);
  const [userOrgs, setUserOrgs] = useState<UserOrg[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");

  useEffect(() => {
    if (isBootstrapping) return;
    checkAuth();
  }, [isBootstrapping]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }
    await fetchUserOrgs(user.id);
  };

  const fetchUserOrgs = async (userId: string) => {
    try {
      // Get all orgs the user belongs to via their profile + board_memberships
      const { data: profile } = await supabase
        .from("profiles")
        .select("org_id")
        .eq("id", userId)
        .maybeSingle();

      const orgIds = new Set<string>();
      const orgMap = new Map<string, string>();

      // Add profile org
      if (profile?.org_id) {
        orgIds.add(profile.org_id);
      }

      // Get orgs from board memberships
      const { data: memberships } = await supabase
        .from("board_memberships")
        .select("board_id")
        .eq("user_id", userId);

      if (memberships && memberships.length > 0) {
        const boardIds = memberships.map((m) => m.board_id);
        const { data: boardsData } = await supabase
          .from("boards")
          .select("org_id")
          .in("id", boardIds);

        if (boardsData) {
          boardsData.forEach((b) => orgIds.add(b.org_id));
        }
      }

      // Fetch org names
      if (orgIds.size > 0) {
        const { data: orgs } = await supabase
          .from("organizations")
          .select("id, name")
          .in("id", Array.from(orgIds));

        if (orgs) {
          orgs.forEach((o) => orgMap.set(o.id, o.name));
        }
      }

      const orgsArray: UserOrg[] = Array.from(orgMap.entries()).map(([id, name]) => ({
        org_id: id,
        org_name: name,
      }));

      setUserOrgs(orgsArray);

      // Default to profile org or first available
      const defaultOrg = profile?.org_id || (orgsArray.length > 0 ? orgsArray[0].org_id : "");
      setSelectedOrgId(defaultOrg);

      if (defaultOrg) {
        await fetchDashboardData(defaultOrg);
      } else {
        setLoading(false);
      }
    } catch (error) {
      logError("Dashboard - fetchUserOrgs", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedOrgId && !isBootstrapping) {
      fetchDashboardData(selectedOrgId);
    }
  }, [selectedOrgId]);

  const fetchDashboardData = async (orgId: string) => {
    try {
      setLoading(true);

      // Fetch boards for selected org
      const { data: boardsData, error: boardsError } = await supabase
        .from("boards")
        .select("*, board_memberships!inner(role)")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false });

      if (boardsError) throw boardsError;

      // Fetch agendas for boards in this org
      const boardIds = boardsData?.map((b) => b.id) || [];

      let agendasCount = 0;
      let actionsCount = 0;

      if (boardIds.length > 0) {
        const { count: ac } = await supabase
          .from("agendas")
          .select("*", { count: "exact", head: true })
          .eq("status", "draft")
          .in("board_id", boardIds);
        agendasCount = ac || 0;

        const { count: actc } = await supabase
          .from("action_items")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending");
        actionsCount = actc || 0;
      }

      // Fetch documents
      const { count: documentsCount } = await supabase
        .from("archived_documents")
        .select("*", { count: "exact", head: true })
        .eq("org_id", orgId);

      // Fetch pending approvals
      const { count: approvalsCount } = await supabase
        .from("document_submissions")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      setStats({
        totalBoards: boardsData?.length || 0,
        activeAgendas: agendasCount,
        pendingActions: actionsCount,
        documentCount: documentsCount || 0,
        pendingApprovals: approvalsCount || 0,
      });

      setBoards(boardsData || []);
    } catch (error: any) {
      logError("Dashboard - Fetch dashboard data", error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({
    title,
    value,
    icon: Icon,
    description,
    onClick,
  }: {
    title: string;
    value: number;
    icon: LucideIcon;
    description?: string;
    onClick?: () => void;
  }) => (
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

  if (isBootstrapping) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-lg">Setting up your organisation…</p>
        </div>
      </div>
    );
  }

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
            <p className="text-muted-foreground">Welcome back to DirectorAiT</p>
          </div>
          {/* Org switcher */}
          <div>
            {userOrgs.length > 1 ? (
              <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                <SelectTrigger className="w-[240px]">
                  <SelectValue placeholder="Select organisation" />
                </SelectTrigger>
                <SelectContent>
                  {userOrgs.map((org) => (
                    <SelectItem key={org.org_id} value={org.org_id}>
                      {org.org_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : userOrgs.length === 1 ? (
              <span className="text-sm font-medium text-muted-foreground">
                {userOrgs[0].org_name}
              </span>
            ) : null}
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
            value={0}
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
