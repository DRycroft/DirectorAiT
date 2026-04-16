/**
 * Main Dashboard
 * 
 * Executive governance overview: surfaces actionable intelligence from
 * live structured data (actions, meetings, packs, compliance, approvals).
 */

import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useGovernanceAI } from "@/hooks/useGovernanceAI";
import AIResultPanel from "@/components/AIResultPanel";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import {
  Users, FileText, CheckCircle2, AlertCircle, Loader2,
  AlertTriangle, Clock, Gavel, ShieldCheck, BookOpen, RefreshCw, Sparkles, Send,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { logError } from "@/lib/errorHandling";
import { useAuth } from "@/contexts/AuthContext";
import { format, isPast, isToday, differenceInCalendarDays, addDays } from "date-fns";
import { toast } from "sonner";

interface UserOrg {
  org_id: string;
  org_name: string;
}

interface PriorityAlert {
  id: string;
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  link: string;
}

interface ActionRow {
  id: string;
  title: string;
  owner_name: string | null;
  due_date: string | null;
  status: string | null;
}

interface MeetingRow {
  id: string;
  title: string;
  meeting_date: string;
  board_title: string;
}

interface DecisionRow {
  id: string;
  title: string;
  outcome: string | null;
  decision_date: string;
  meeting_title: string;
  meeting_id: string;
}

interface PackRow {
  id: string;
  title: string;
  status: string | null;
  meeting_date: string;
  board_title: string;
  ack_count: number;
  member_count: number;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { isBootstrapping, user } = useAuth();
  const governanceAI = useGovernanceAI();
  const [askQuestion, setAskQuestion] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userOrgs, setUserOrgs] = useState<UserOrg[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");

  // Live data
  const [alerts, setAlerts] = useState<PriorityAlert[]>([]);
  const [overdueActions, setOverdueActions] = useState<ActionRow[]>([]);
  const [upcomingMeetings, setUpcomingMeetings] = useState<MeetingRow[]>([]);
  const [recentDecisions, setRecentDecisions] = useState<DecisionRow[]>([]);
  const [recentPacks, setRecentPacks] = useState<PackRow[]>([]);
  const [stats, setStats] = useState({
    totalBoards: 0,
    openActions: 0,
    overdueActions: 0,
    pendingApprovals: 0,
    complianceDue: 0,
    unreadPacks: 0,
  });

  const { user } = useAuth();

  useEffect(() => {
    if (isBootstrapping) return;
    if (!user) { navigate("/auth"); return; }
    fetchUserOrgs(user.id);
  }, [isBootstrapping, user]);

  const fetchUserOrgs = async (userId: string) => {
    try {
      const { data: profile } = await supabase.from("profiles").select("org_id").eq("id", userId).maybeSingle();
      const orgIds = new Set<string>();
      if (profile?.org_id) orgIds.add(profile.org_id);

      const { data: memberships } = await supabase.from("board_memberships").select("board_id").eq("user_id", userId);
      if (memberships && memberships.length > 0) {
        const { data: boardsData } = await supabase.from("boards").select("org_id").in("id", memberships.map(m => m.board_id));
        boardsData?.forEach(b => orgIds.add(b.org_id));
      }

      const orgMap = new Map<string, string>();
      if (orgIds.size > 0) {
        const { data: orgs } = await supabase.from("organizations").select("id, name").in("id", Array.from(orgIds));
        orgs?.forEach(o => orgMap.set(o.id, o.name));
      }

      const orgsArray = Array.from(orgMap.entries()).map(([id, name]) => ({ org_id: id, org_name: name }));
      setUserOrgs(orgsArray);
      const defaultOrg = profile?.org_id || (orgsArray.length > 0 ? orgsArray[0].org_id : "");
      setSelectedOrgId(defaultOrg);
      if (defaultOrg) await fetchDashboardData(defaultOrg, userId);
      else setLoading(false);
    } catch (error) {
      logError("Dashboard - fetchUserOrgs", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedOrgId && !isBootstrapping && user) {
      fetchDashboardData(selectedOrgId, user.id);
    }
  }, [selectedOrgId]);

  const fetchDashboardData = async (orgId: string, _userId: string) => {
    try {
      if (!loading) setRefreshing(true);
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const thirtyDaysOut = addDays(now, 30).toISOString().split('T')[0];

      // Get boards for this org
      const { data: boardsData } = await supabase
        .from("boards").select("id, title").eq("org_id", orgId);
      const boardMap = new Map((boardsData || []).map(b => [b.id, b.title]));

      // Parallel fetches
      const [actionsRes, meetingsRes, packsRes, decisionsRes, approvalsRes, complianceRes, acksRes, membershipsRes] = await Promise.all([
        // Open actions
        supabase.from("action_items").select("id, title, owner_id, due_date, status")
          .in("status", ["pending", "in_progress"]).order("due_date", { ascending: true }).limit(20),
        // Upcoming meetings
        supabase.from("agendas").select("id, title, meeting_date, board_id")
          .gte("meeting_date", now.toISOString()).order("meeting_date", { ascending: true }).limit(5),
        // Recent packs
        supabase.from("board_packs").select("id, title, status, meeting_date, board_id")
          .order("created_at", { ascending: false }).limit(5),
        // Recent decisions
        supabase.from("meeting_decisions").select("id, title, outcome, decision_date, agenda_id")
          .order("decision_date", { ascending: false }).limit(5),
        // Pending approvals
        supabase.from("approval_requests").select("id", { count: "exact", head: true })
          .eq("status", "pending").eq("org_id", orgId),
        // Compliance due within 30 days
        supabase.from("compliance_items").select("id", { count: "exact", head: true })
          .eq("org_id", orgId).eq("is_active", true).lte("next_due_date", thirtyDaysOut).gte("next_due_date", today),
        // Pack acknowledgements
        supabase.from("document_acknowledgements").select("pack_id, user_id, ack_type").eq("org_id", orgId),
        // Board memberships for ack gap calculation
        supabase.from("board_memberships").select("board_id, user_id"),
      ]);

      // Resolve owner names for actions
      const ownerIds = [...new Set((actionsRes.data ?? []).map(a => a.owner_id).filter(Boolean))] as string[];
      let ownerMap = new Map<string, string>();
      if (ownerIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("id, name").in("id", ownerIds);
        profiles?.forEach(p => ownerMap.set(p.id, p.name ?? "Unknown"));
      }

      // Resolve agenda titles for decisions
      const decAgendaIds = [...new Set((decisionsRes.data ?? []).map((d: any) => d.agenda_id))];
      const agendaMap = new Map<string, string>();
      if (decAgendaIds.length > 0) {
        const { data: agendas } = await supabase.from("agendas").select("id, title").in("id", decAgendaIds);
        agendas?.forEach(a => agendaMap.set(a.id, a.title));
      }

      // Map actions
      const allActions = (actionsRes.data ?? []).map(a => ({
        id: a.id, title: a.title,
        owner_name: a.owner_id ? ownerMap.get(a.owner_id) ?? "Unknown" : null,
        due_date: a.due_date, status: a.status,
      }));
      const overdue = allActions.filter(a => a.due_date && isPast(new Date(a.due_date)) && !isToday(new Date(a.due_date)));

      // Map meetings
      const meetings: MeetingRow[] = (meetingsRes.data ?? []).map(m => ({
        id: m.id, title: m.title, meeting_date: m.meeting_date,
        board_title: boardMap.get(m.board_id) ?? "Board",
      }));

      // Map packs with ack gaps
      const acksByPack = new Map<string, Set<string>>();
      (acksRes.data ?? []).filter(a => a.ack_type === 'read').forEach(a => {
        if (!a.pack_id) return;
        if (!acksByPack.has(a.pack_id)) acksByPack.set(a.pack_id, new Set());
        acksByPack.get(a.pack_id)!.add(a.user_id);
      });

      const membersByBoard = new Map<string, number>();
      (membershipsRes.data ?? []).forEach(m => {
        membersByBoard.set(m.board_id, (membersByBoard.get(m.board_id) ?? 0) + 1);
      });

      // Resolve extra board names for packs
      const packBoardIds = [...new Set((packsRes.data ?? []).map(p => p.board_id).filter(id => !boardMap.has(id)))];
      if (packBoardIds.length > 0) {
        const { data: extraBoards } = await supabase.from("boards").select("id, title").in("id", packBoardIds);
        extraBoards?.forEach(b => boardMap.set(b.id, b.title));
      }

      const packs: PackRow[] = (packsRes.data ?? []).map(p => ({
        id: p.id, title: p.title, status: p.status, meeting_date: p.meeting_date,
        board_title: boardMap.get(p.board_id) ?? "Board",
        ack_count: acksByPack.get(p.id)?.size ?? 0,
        member_count: membersByBoard.get(p.board_id) ?? 0,
      }));

      const unreadPacks = packs.filter(p => p.status === 'finalised' && p.ack_count < p.member_count).length;

      // Map decisions
      const decisions: DecisionRow[] = (decisionsRes.data ?? []).map((d: any) => ({
        id: d.id, title: d.title, outcome: d.outcome, decision_date: d.decision_date,
        meeting_title: agendaMap.get(d.agenda_id) ?? "Meeting",
        meeting_id: d.agenda_id,
      }));

      // Build priority alerts
      const newAlerts: PriorityAlert[] = [];
      if (overdue.length > 0) {
        newAlerts.push({
          id: 'overdue-actions', severity: 'high',
          title: `${overdue.length} overdue action${overdue.length > 1 ? 's' : ''}`,
          description: `Action items past their due date requiring immediate attention`,
          link: '/actions',
        });
      }
      const urgentMeetings = meetings.filter(m => differenceInCalendarDays(new Date(m.meeting_date), now) <= 7);
      if (urgentMeetings.length > 0) {
        newAlerts.push({
          id: 'upcoming-meetings', severity: 'medium',
          title: `${urgentMeetings.length} meeting${urgentMeetings.length > 1 ? 's' : ''} within 7 days`,
          description: urgentMeetings.map(m => `${m.title} (${format(new Date(m.meeting_date), "EEE d MMM")})`).join(', '),
          link: '/meetings',
        });
      }
      if (unreadPacks > 0) {
        newAlerts.push({
          id: 'unread-packs', severity: 'medium',
          title: `${unreadPacks} pack${unreadPacks > 1 ? 's' : ''} with unread acknowledgements`,
          description: 'Finalised board packs not yet read by all members',
          link: '/pack-management',
        });
      }
      const complianceDueCount = complianceRes.count ?? 0;
      if (complianceDueCount > 0) {
        newAlerts.push({
          id: 'compliance-due', severity: 'medium',
          title: `${complianceDueCount} compliance item${complianceDueCount > 1 ? 's' : ''} due within 30 days`,
          description: 'Review upcoming compliance obligations',
          link: '/compliance',
        });
      }
      const pendingApprovalCount = approvalsRes.count ?? 0;
      if (pendingApprovalCount > 0) {
        newAlerts.push({
          id: 'pending-approvals', severity: 'low',
          title: `${pendingApprovalCount} pending approval${pendingApprovalCount > 1 ? 's' : ''}`,
          description: 'Approval requests awaiting review',
          link: '/compliance',
        });
      }

      setAlerts(newAlerts);
      setOverdueActions(overdue);
      setUpcomingMeetings(meetings);
      setRecentDecisions(decisions);
      setRecentPacks(packs);
      setStats({
        totalBoards: boardsData?.length ?? 0,
        openActions: allActions.length,
        overdueActions: overdue.length,
        pendingApprovals: pendingApprovalCount,
        complianceDue: complianceDueCount,
        unreadPacks,
      });
    } catch (error: any) {
      logError("Dashboard - fetchDashboardData", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    if (user && selectedOrgId) await fetchDashboardData(selectedOrgId, user.id);
  };

  const severityStyles = {
    high: 'border-l-destructive bg-destructive/5',
    medium: 'border-l-warning bg-warning/5',
    low: 'border-l-primary bg-primary/5',
  };

  const severityIcons = {
    high: <AlertTriangle className="h-4 w-4 text-destructive" />,
    medium: <AlertCircle className="h-4 w-4 text-warning" />,
    low: <Clock className="h-4 w-4 text-primary" />,
  };

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
              <Card key={i}><CardHeader><Skeleton className="h-4 w-24" /></CardHeader><CardContent><Skeleton className="h-8 w-16" /></CardContent></Card>
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
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-4xl font-bold mb-1">Dashboard</h1>
            <p className="text-muted-foreground">Governance overview</p>
          </div>
          <div className="flex items-center gap-3">
            {userOrgs.length > 1 && (
              <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                <SelectTrigger className="w-[240px]">
                  <SelectValue placeholder="Select organisation" />
                </SelectTrigger>
                <SelectContent>
                  {userOrgs.map(org => (
                    <SelectItem key={org.org_id} value={org.org_id}>{org.org_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Priority Alerts */}
        {alerts.length > 0 && (
          <div className="mb-6 space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Priority Alerts</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {alerts.map(alert => (
                <Card
                  key={alert.id}
                  className={`border-l-4 cursor-pointer transition-all hover:shadow-md ${severityStyles[alert.severity]}`}
                  onClick={() => navigate(alert.link)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {severityIcons[alert.severity]}
                      <div className="min-w-0">
                        <p className="font-semibold text-sm">{alert.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{alert.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {alerts.length === 0 && stats.totalBoards === 0 && (
          <Card className="mb-6 border border-dashed">
            <CardContent className="py-10 text-center space-y-4">
              <Users className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <div>
                <h3 className="text-lg font-semibold mb-1">Welcome to DirectorAiT</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Get started by creating your first board, inviting members, and scheduling a meeting.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 justify-center">
                <Button onClick={() => navigate("/boards-committees")}>Create a Board</Button>
                <Button variant="outline" onClick={() => navigate("/meetings")}>Schedule a Meeting</Button>
                <Button variant="outline" onClick={() => navigate("/settings")}>Organisation Settings</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {alerts.length === 0 && stats.totalBoards > 0 && (
          <Card className="mb-6 border-l-4 border-l-success bg-success/5">
            <CardContent className="p-4 flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-success" />
              <p className="text-sm font-medium">All clear — no priority issues detected</p>
            </CardContent>
          </Card>
        )}

        {/* KPI Summary Row */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/boards")}>
            <CardContent className="p-4 text-center">
              <Users className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <div className="text-2xl font-bold">{stats.totalBoards}</div>
              <p className="text-xs text-muted-foreground">Boards</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/actions")}>
            <CardContent className="p-4 text-center">
              <CheckCircle2 className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <div className="text-2xl font-bold">{stats.openActions}</div>
              <p className="text-xs text-muted-foreground">Open Actions</p>
            </CardContent>
          </Card>
          <Card className={`cursor-pointer hover:shadow-md transition-shadow ${stats.overdueActions > 0 ? 'ring-1 ring-destructive/30' : ''}`} onClick={() => navigate("/actions")}>
            <CardContent className="p-4 text-center">
              <AlertTriangle className={`h-5 w-5 mx-auto mb-1 ${stats.overdueActions > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
              <div className={`text-2xl font-bold ${stats.overdueActions > 0 ? 'text-destructive' : ''}`}>{stats.overdueActions}</div>
              <p className="text-xs text-muted-foreground">Overdue</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/compliance")}>
            <CardContent className="p-4 text-center">
              <AlertCircle className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <div className="text-2xl font-bold">{stats.pendingApprovals}</div>
              <p className="text-xs text-muted-foreground">Approvals</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/compliance")}>
            <CardContent className="p-4 text-center">
              <ShieldCheck className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <div className="text-2xl font-bold">{stats.complianceDue}</div>
              <p className="text-xs text-muted-foreground">Compliance Due</p>
            </CardContent>
          </Card>
          <Card className={`cursor-pointer hover:shadow-md transition-shadow ${stats.unreadPacks > 0 ? 'ring-1 ring-warning/30' : ''}`} onClick={() => navigate("/pack-management")}>
            <CardContent className="p-4 text-center">
              <BookOpen className={`h-5 w-5 mx-auto mb-1 ${stats.unreadPacks > 0 ? 'text-warning' : 'text-muted-foreground'}`} />
              <div className={`text-2xl font-bold ${stats.unreadPacks > 0 ? 'text-warning' : ''}`}>{stats.unreadPacks}</div>
              <p className="text-xs text-muted-foreground">Unread Packs</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Overdue Actions */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Overdue Actions</CardTitle>
                <Link to="/actions" className="text-xs text-primary hover:underline">View all →</Link>
              </div>
            </CardHeader>
            <CardContent>
              {overdueActions.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No overdue actions</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Action</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Overdue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overdueActions.slice(0, 5).map(a => {
                      const days = a.due_date ? differenceInCalendarDays(new Date(), new Date(a.due_date)) : 0;
                      return (
                        <TableRow key={a.id} className="bg-destructive/5">
                          <TableCell className="font-medium text-sm">{a.title}</TableCell>
                          <TableCell className="text-sm">{a.owner_name ?? "Unassigned"}</TableCell>
                          <TableCell>
                            <Badge variant="destructive" className="text-xs">{days}d</Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Meetings */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Upcoming Meetings</CardTitle>
                <Link to="/meetings" className="text-xs text-primary hover:underline">View all →</Link>
              </div>
            </CardHeader>
            <CardContent>
              {upcomingMeetings.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No upcoming meetings</p>
              ) : (
                <div className="space-y-3">
                  {upcomingMeetings.map(m => {
                    const daysUntil = differenceInCalendarDays(new Date(m.meeting_date), new Date());
                    return (
                      <Link key={m.id} to={`/meetings/${m.id}`} className="block p-3 border rounded-lg hover:bg-accent transition-colors">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-sm">{m.title}</p>
                            <p className="text-xs text-muted-foreground">{m.board_title}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">{format(new Date(m.meeting_date), "d MMM")}</p>
                            <p className={`text-xs ${daysUntil <= 7 ? 'text-warning font-medium' : 'text-muted-foreground'}`}>
                              {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil}d`}
                            </p>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Decisions */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Gavel className="h-4 w-4" /> Recent Decisions
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {recentDecisions.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No decisions recorded yet</p>
              ) : (
                <div className="space-y-2">
                  {recentDecisions.map(d => (
                    <div key={d.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{d.title}</p>
                        <Link to={`/meetings/${d.meeting_id}`} className="text-xs text-primary hover:underline">{d.meeting_title}</Link>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        <Badge variant={d.outcome === "approved" ? "default" : d.outcome === "rejected" ? "destructive" : "outline"} className="text-xs">
                          {(d.outcome ?? "noted").charAt(0).toUpperCase() + (d.outcome ?? "noted").slice(1)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{format(new Date(d.decision_date), "d MMM")}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Board Packs with Ack Gaps */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Board Packs
                </CardTitle>
                <Link to="/pack-management" className="text-xs text-primary hover:underline">Manage →</Link>
              </div>
            </CardHeader>
            <CardContent>
              {recentPacks.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No board packs yet</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pack</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Read</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentPacks.map(p => {
                      const hasGap = p.status === 'finalised' && p.ack_count < p.member_count;
                      return (
                        <TableRow key={p.id} className={hasGap ? 'bg-warning/5' : ''}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{p.title}</p>
                              <p className="text-xs text-muted-foreground">{p.board_title}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={p.status === 'finalised' ? 'default' : 'outline'} className="text-xs capitalize">{p.status}</Badge>
                          </TableCell>
                          <TableCell>
                            {p.status === 'finalised' ? (
                              <span className={`text-xs font-medium ${hasGap ? 'text-warning' : 'text-success'}`}>
                                {p.ack_count}/{p.member_count}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Ask History */}
        <Card className="mb-8">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> Ask Governance History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. What was decided about the budget in the last meeting?"
                value={askQuestion}
                onChange={(e) => setAskQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && askQuestion.trim()) {
                    // Use first board from stats or skip
                    // Get first board for this org to scope AI query
                    // We need to get a board ID - use the boards query
                    supabase.from("boards").select("id").eq("org_id", selectedOrgId).limit(1).then(({ data }) => {
                      if (data?.[0]) {
                        governanceAI.execute({ action: 'ask-history', boardId: data[0].id, question: askQuestion });
                      }
                    });
                  }
                }}
              />
              <Button
                size="sm"
                disabled={governanceAI.isProcessing || !askQuestion.trim()}
                onClick={() => {
                  supabase.from("boards").select("id").eq("org_id", selectedOrgId).limit(1).then(({ data }) => {
                    if (data?.[0]) {
                      governanceAI.execute({ action: 'ask-history', boardId: data[0].id, question: askQuestion });
                    }
                  });
                }}
              >
                <Send className="h-4 w-4 mr-1" />
                {governanceAI.isProcessing ? 'Asking…' : 'Ask'}
              </Button>
            </div>
            {governanceAI.result && (
              <div className="mt-4">
                <AIResultPanel
                  title="Governance History Answer"
                  result={governanceAI.result.result}
                  generatedAt={governanceAI.result.generated_at}
                  disclaimer={governanceAI.result.disclaimer}
                  onClose={governanceAI.clearResult}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;