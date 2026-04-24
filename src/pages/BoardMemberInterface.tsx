import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Accordion } from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Home, Vote, MessageSquare, ScrollText, Library } from "lucide-react";
import {
  LatestPack,
  MyAction,
  ReleasedReport,
  UpcomingMeeting,
  isOverdue,
  isWithinHours,
} from "@/components/board-home/sectionUtils";
import { AttentionSection } from "@/components/board-home/AttentionSection";
import { ReleasedReportsSection } from "@/components/board-home/ReleasedReportsSection";
import { BoardPacksSection } from "@/components/board-home/BoardPacksSection";
import { UpcomingMeetingsSection } from "@/components/board-home/UpcomingMeetingsSection";
import { MyActionsSection } from "@/components/board-home/MyActionsSection";
import { SettingsSection } from "@/components/board-home/SettingsSection";
import { PlaceholderSection } from "@/components/board-home/PlaceholderSection";
import { SummaryStrip } from "@/components/board-home/SummaryStrip";

const BoardMemberInterface = () => {
  const { user } = useAuth();
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

  // Default-open: Attention if it has items, else none.
  const hasAttention =
    actions.some((a) => isOverdue(a.due_date)) ||
    meetings.some((m) => isWithinHours(m.meeting_date, 48));
  const defaultValue = !loading && hasAttention ? "attention" : undefined;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      <main className="flex-1 container mx-auto px-3 sm:px-4 py-4 sm:py-6 pt-20 sm:pt-24 max-w-2xl">
        <header className="mb-4 sm:mb-6 flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Home className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">
              Board Home
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Your personal board hub
            </p>
          </div>
        </header>

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : (
          <>
            <SummaryStrip meetings={meetings} reports={reports} actions={actions} />
            <Accordion
              type="single"
              collapsible
              defaultValue={defaultValue}
              className="w-full rounded-lg border border-border bg-card px-3 sm:px-4"
            >
              <AttentionSection meetings={meetings} actions={actions} />
              <ReleasedReportsSection reports={reports} />
              <BoardPacksSection latestPack={latestPack} />
              <UpcomingMeetingsSection meetings={meetings} />
              <MyActionsSection actions={actions} />
              <SettingsSection />
              <PlaceholderSection value="decisions" icon={Vote} title="Decisions Awaiting Input" />
              <PlaceholderSection value="questions" icon={MessageSquare} title="Questions & Discussion" />
              <PlaceholderSection value="minutes" icon={ScrollText} title="Previous Minutes" />
              <PlaceholderSection value="library" icon={Library} title="Documents Library" />
            </Accordion>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default BoardMemberInterface;
