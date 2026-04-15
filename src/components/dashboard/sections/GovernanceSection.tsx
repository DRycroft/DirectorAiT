import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardGrid, DashboardSection } from "../DashboardLayout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, FileText, Calendar, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format, isPast, isToday, differenceInCalendarDays } from "date-fns";

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

interface PackRow {
  id: string;
  title: string;
  status: string | null;
  meeting_date: string;
  board_title: string;
}

export const GovernanceSection = () => {
  const [loading, setLoading] = useState(true);
  const [openActions, setOpenActions] = useState<ActionRow[]>([]);
  const [overdueCount, setOverdueCount] = useState(0);
  const [totalOpenCount, setTotalOpenCount] = useState(0);
  const [upcomingMeetings, setUpcomingMeetings] = useState<MeetingRow[]>([]);
  const [recentPacks, setRecentPacks] = useState<PackRow[]>([]);
  const [packStats, setPackStats] = useState({ total: 0, draft: 0, finalised: 0 });
  const [nextMeeting, setNextMeeting] = useState<MeetingRow | null>(null);

  useEffect(() => {
    fetchGovernanceData();
  }, []);

  const fetchGovernanceData = async () => {
    setLoading(true);
    try {
      const now = new Date().toISOString();

      // Fetch open action items (pending / in_progress)
      const { data: actions } = await supabase
        .from("action_items")
        .select("id, title, owner_id, due_date, status")
        .in("status", ["pending", "in_progress"])
        .order("due_date", { ascending: true })
        .limit(10);

      // Resolve owner names
      const ownerIds = [...new Set((actions ?? []).map(a => a.owner_id).filter(Boolean))] as string[];
      let ownerMap = new Map<string, string>();
      if (ownerIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, name")
          .in("id", ownerIds);
        (profiles ?? []).forEach(p => ownerMap.set(p.id, p.name ?? "Unknown"));
      }

      const mappedActions: ActionRow[] = (actions ?? []).map(a => ({
        id: a.id,
        title: a.title,
        owner_name: a.owner_id ? ownerMap.get(a.owner_id) ?? "Unknown" : null,
        due_date: a.due_date,
        status: a.status,
      }));

      const overdue = mappedActions.filter(a =>
        a.due_date && a.status !== "completed" && isPast(new Date(a.due_date)) && !isToday(new Date(a.due_date))
      ).length;

      setOpenActions(mappedActions);
      setTotalOpenCount(mappedActions.length);
      setOverdueCount(overdue);

      // Fetch upcoming meetings
      const { data: meetings } = await supabase
        .from("agendas")
        .select("id, title, meeting_date, board_id")
        .gte("meeting_date", now)
        .order("meeting_date", { ascending: true })
        .limit(5);

      const boardIds = [...new Set((meetings ?? []).map(m => m.board_id))];
      let boardMap = new Map<string, string>();
      if (boardIds.length > 0) {
        const { data: boards } = await supabase
          .from("boards")
          .select("id, title")
          .in("id", boardIds);
        (boards ?? []).forEach(b => boardMap.set(b.id, b.title));
      }

      const mappedMeetings: MeetingRow[] = (meetings ?? []).map(m => ({
        id: m.id,
        title: m.title,
        meeting_date: m.meeting_date,
        board_title: boardMap.get(m.board_id) ?? "Unknown Board",
      }));

      setUpcomingMeetings(mappedMeetings);
      setNextMeeting(mappedMeetings.length > 0 ? mappedMeetings[0] : null);

      // Fetch recent board packs
      const { data: packs } = await supabase
        .from("board_packs")
        .select("id, title, status, meeting_date, board_id")
        .order("created_at", { ascending: false })
        .limit(5);

      const packBoardIds = [...new Set((packs ?? []).map(p => p.board_id))];
      if (packBoardIds.length > 0 && packBoardIds.some(id => !boardMap.has(id))) {
        const { data: extraBoards } = await supabase
          .from("boards")
          .select("id, title")
          .in("id", packBoardIds.filter(id => !boardMap.has(id)));
        (extraBoards ?? []).forEach(b => boardMap.set(b.id, b.title));
      }

      const mappedPacks: PackRow[] = (packs ?? []).map(p => ({
        id: p.id,
        title: p.title,
        status: p.status,
        meeting_date: p.meeting_date,
        board_title: boardMap.get(p.board_id) ?? "Unknown Board",
      }));

      setRecentPacks(mappedPacks);
      setPackStats({
        total: mappedPacks.length,
        draft: mappedPacks.filter(p => p.status === "draft").length,
        finalised: mappedPacks.filter(p => p.status === "finalised").length,
      });
    } catch {
      // Fail silently on dashboard — widgets show empty state
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const nextMeetingDays = nextMeeting
    ? differenceInCalendarDays(new Date(nextMeeting.meeting_date), new Date())
    : null;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold mb-1">Governance & Board Actions</h2>
        <p className="text-sm text-muted-foreground">Board effectiveness and meeting preparation</p>
      </div>

      <DashboardGrid>
        {/* KPI: Open Actions */}
        <DashboardSection width="third">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Open Board Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalOpenCount}</div>
              {overdueCount > 0 ? (
                <div className="flex items-center gap-2 mt-1">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <span className="text-sm text-destructive">{overdueCount} overdue</span>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground mt-1">All on track</div>
              )}
              <Link to="/actions" className="text-xs text-primary hover:underline mt-2 inline-block">
                View all actions →
              </Link>
            </CardContent>
          </Card>
        </DashboardSection>

        {/* KPI: Board Packs */}
        <DashboardSection width="third">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Board Packs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{packStats.total}</div>
              <div className="flex items-center gap-2 mt-1">
                <FileText className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">Recent packs</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {packStats.finalised} finalised • {packStats.draft} draft
              </div>
              <Link to="/pack-management" className="text-xs text-primary hover:underline mt-2 inline-block">
                Manage packs →
              </Link>
            </CardContent>
          </Card>
        </DashboardSection>

        {/* KPI: Next Meeting */}
        <DashboardSection width="third">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Next Board Meeting</CardTitle>
            </CardHeader>
            <CardContent>
              {nextMeeting ? (
                <>
                  <div className="text-2xl font-bold">
                    {format(new Date(nextMeeting.meeting_date), "MMM d")}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span className="text-sm text-muted-foreground">
                      {nextMeetingDays === 0
                        ? "Today"
                        : nextMeetingDays === 1
                        ? "Tomorrow"
                        : `${nextMeetingDays} days away`}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{nextMeeting.board_title}</div>
                </>
              ) : (
                <>
                  <div className="text-2xl font-bold text-muted-foreground">—</div>
                  <div className="text-xs text-muted-foreground mt-1">No upcoming meetings</div>
                </>
              )}
              <Link to="/meetings" className="text-xs text-primary hover:underline mt-2 inline-block">
                View meetings →
              </Link>
            </CardContent>
          </Card>
        </DashboardSection>

        {/* Open Actions Table */}
        <DashboardSection width="full">
          <Card>
            <CardHeader>
              <CardTitle>Open Board Actions</CardTitle>
            </CardHeader>
            <CardContent>
              {openActions.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No open action items.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Action</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Age</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {openActions.map((action) => {
                      const overdue =
                        action.due_date &&
                        action.status !== "completed" &&
                        isPast(new Date(action.due_date)) &&
                        !isToday(new Date(action.due_date));
                      const overdueD = overdue && action.due_date
                        ? differenceInCalendarDays(new Date(), new Date(action.due_date))
                        : 0;
                      return (
                        <TableRow key={action.id} className={overdue ? "bg-destructive/5" : ""}>
                          <TableCell className="font-medium">{action.title}</TableCell>
                          <TableCell>{action.owner_name ?? "Unassigned"}</TableCell>
                          <TableCell>
                            {action.due_date ? (
                              <div>
                                <span className={overdue ? "text-destructive font-medium" : ""}>
                                  {format(new Date(action.due_date), "PP")}
                                </span>
                                {overdue && (
                                  <div className="text-xs text-destructive">{overdueD}d overdue</div>
                                )}
                              </div>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-muted-foreground">
                              {differenceInCalendarDays(new Date(), new Date(action.due_date || new Date()))}d
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                overdue
                                  ? "destructive"
                                  : action.status === "in_progress"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {overdue
                                ? `Overdue (${overdueD}d)`
                                : action.status === "in_progress"
                                ? "In Progress"
                                : "Pending"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </DashboardSection>

        {/* Recent Board Packs */}
        <DashboardSection width="half">
          <Card>
            <CardHeader>
              <CardTitle>Recent Board Packs</CardTitle>
            </CardHeader>
            <CardContent>
              {recentPacks.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No board packs yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pack</TableHead>
                      <TableHead>Board</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentPacks.map((pack) => (
                      <TableRow key={pack.id}>
                        <TableCell className="font-medium">{pack.title}</TableCell>
                        <TableCell className="text-sm">{pack.board_title}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              pack.status === "finalised"
                                ? "default"
                                : "outline"
                            }
                          >
                            {pack.status === "finalised" ? "Finalised" : "Draft"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </DashboardSection>

        {/* Upcoming Meetings */}
        <DashboardSection width="half">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Meetings</CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingMeetings.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No upcoming meetings.</p>
              ) : (
                <div className="space-y-3">
                  {upcomingMeetings.map((meeting) => (
                    <Link
                      key={meeting.id}
                      to={`/meetings/${meeting.id}`}
                      className="block p-3 border rounded hover:bg-accent transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">{meeting.title}</div>
                          <div className="text-sm text-muted-foreground">{meeting.board_title}</div>
                        </div>
                        <div className="text-sm font-medium">
                          {format(new Date(meeting.meeting_date), "PPP")}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </DashboardSection>
      </DashboardGrid>
    </div>
  );
};
