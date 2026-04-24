import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  CalendarDays,
  FileText,
  ClipboardList,
  Bell,
  BookOpen,
  MessageSquare,
  ArrowRight,
  FolderOpen,
} from "lucide-react";

interface UpcomingMeeting {
  id: string;
  title: string;
  meeting_date: string;
  board_id: string;
}

interface LatestPack {
  id: string;
  title: string;
  meeting_date: string;
  board_id: string;
  status: string | null;
}

interface ReleasedReport {
  id: string;
  company_name: string;
  period_covered: string;
  status: string;
  updated_at: string;
}

interface MyAction {
  id: string;
  title: string;
  due_date: string | null;
  status: string | null;
}

const BoardMemberInterface = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [meetings, setMeetings] = useState<UpcomingMeeting[]>([]);
  const [latestPack, setLatestPack] = useState<LatestPack | null>(null);
  const [reports, setReports] = useState<ReleasedReport[]>([]);
  const [actions, setActions] = useState<MyAction[]>([]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const todayIso = new Date().toISOString();

        const [meetingsRes, packRes, reportsRes, actionsRes] = await Promise.all([
          supabase
            .from("agendas")
            .select("id, title, meeting_date, board_id")
            .gte("meeting_date", todayIso)
            .order("meeting_date", { ascending: true })
            .limit(5),
          supabase
            .from("board_packs")
            .select("id, title, meeting_date, board_id, status")
            .order("meeting_date", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from("board_papers")
            .select("id, company_name, period_covered, status, updated_at")
            .eq("status", "released")
            .order("updated_at", { ascending: false })
            .limit(5),
          supabase
            .from("action_items")
            .select("id, title, due_date, status")
            .eq("owner_id", user.id)
            .neq("status", "completed")
            .order("due_date", { ascending: true, nullsFirst: false })
            .limit(5),
        ]);

        if (cancelled) return;

        if (meetingsRes.error) throw meetingsRes.error;
        if (packRes.error && packRes.error.code !== "PGRST116") throw packRes.error;
        if (reportsRes.error) throw reportsRes.error;
        if (actionsRes.error) throw actionsRes.error;

        setMeetings(meetingsRes.data ?? []);
        setLatestPack(packRes.data ?? null);
        setReports(reportsRes.data ?? []);
        setActions(actionsRes.data ?? []);
      } catch (err) {
        console.error("Board member interface load error", err);
        toast.error("Could not load some board data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const askQuestion = () => {
    toast.info("Q&A on sections is coming soon. Use Help & Feedback for now.");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      <main className="flex-1 container mx-auto px-4 py-6 sm:py-8 pt-24 max-w-5xl">
        <header className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">
            Board Member Interface
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Your personal hub for upcoming meetings, papers and actions
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Upcoming Meetings */}
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2 text-lg">
                <CalendarDays className="h-5 w-5" />
                Upcoming Meetings
              </CardTitle>
              <CardDescription>Next scheduled board sessions</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : meetings.length === 0 ? (
                <p className="text-sm text-muted-foreground">No upcoming meetings.</p>
              ) : (
                <ul className="space-y-2">
                  {meetings.map((m) => (
                    <li key={m.id}>
                      <Link
                        to={`/meetings/${m.id}`}
                        className="flex items-center justify-between gap-3 p-3 rounded-md border border-border hover:bg-muted/50 transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{m.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(m.meeting_date), "PPP p")}
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Latest Board Pack */}
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FolderOpen className="h-5 w-5" />
                Latest Board Pack
              </CardTitle>
              <CardDescription>Most recent compiled pack</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {loading ? (
                <Skeleton className="h-20 w-full" />
              ) : !latestPack ? (
                <p className="text-sm text-muted-foreground">No board packs yet.</p>
              ) : (
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-sm">{latestPack.title}</p>
                      {latestPack.status && (
                        <Badge variant="secondary" className="text-xs capitalize">
                          {latestPack.status}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Meeting: {format(new Date(latestPack.meeting_date), "PPP")}
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => navigate(`/pack/${latestPack.id}/sections`)}
                    >
                      <BookOpen className="h-4 w-4 mr-2" />
                      Read Papers
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={askQuestion}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Ask Question
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Released Reports */}
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5" />
                Released Reports
              </CardTitle>
              <CardDescription>Recently published board papers</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : reports.length === 0 ? (
                <p className="text-sm text-muted-foreground">No released reports.</p>
              ) : (
                <ul className="space-y-2">
                  {reports.map((r) => (
                    <li
                      key={r.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-md border border-border"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{r.company_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {r.period_covered}
                        </p>
                      </div>
                      <Link to="/pack-management">
                        <Button size="sm" variant="ghost">
                          Open
                        </Button>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* My Actions */}
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2 text-lg">
                <ClipboardList className="h-5 w-5" />
                My Actions
              </CardTitle>
              <CardDescription>Open items assigned to you</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : actions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No open actions assigned.</p>
              ) : (
                <ul className="space-y-2">
                  {actions.map((a) => (
                    <li
                      key={a.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-md border border-border"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{a.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {a.due_date
                            ? `Due ${format(new Date(a.due_date), "PPP")}`
                            : "No due date"}
                        </p>
                      </div>
                      {a.status && (
                        <Badge variant="outline" className="text-xs capitalize shrink-0">
                          {a.status.replace("_", " ")}
                        </Badge>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-3">
                <Link to="/actions">
                  <Button size="sm" variant="ghost" className="w-full">
                    View all actions
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card className="md:col-span-2">
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Bell className="h-5 w-5" />
                Notifications
              </CardTitle>
              <CardDescription>Recent alerts and reminders</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">
                You're up to date. New notifications will appear here.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default BoardMemberInterface;
