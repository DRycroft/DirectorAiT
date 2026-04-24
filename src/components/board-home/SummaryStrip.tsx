import { format } from "date-fns";
import { CalendarDays, FileText, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import { MyAction, ReleasedReport, UpcomingMeeting, isOverdue } from "./sectionUtils";

interface Props {
  meetings: UpcomingMeeting[];
  reports: ReleasedReport[];
  actions: MyAction[];
}

interface TileProps {
  icon: typeof CalendarDays;
  label: string;
  value: string;
  tone: "muted" | "primary" | "warning" | "destructive";
}

const toneClasses: Record<TileProps["tone"], string> = {
  muted: "text-muted-foreground",
  primary: "text-primary",
  warning: "text-warning",
  destructive: "text-destructive",
};

const Tile = ({ icon: Icon, label, value, tone }: TileProps) => (
  <div className="flex-1 min-w-0 rounded-md border border-border bg-card/50 px-3 py-2">
    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
      <Icon className={cn("h-3 w-3", toneClasses[tone])} />
      <span className="truncate">{label}</span>
    </div>
    <p className={cn("mt-0.5 text-sm font-semibold truncate", toneClasses[tone])}>{value}</p>
  </div>
);

export const SummaryStrip = ({ meetings, reports, actions }: Props) => {
  const nextMeeting = meetings[0];
  const nextMeetingValue = nextMeeting
    ? format(new Date(nextMeeting.meeting_date), "MMM d")
    : "—";
  const nextMeetingTone: TileProps["tone"] = nextMeeting ? "primary" : "muted";

  const unreadReports = reports.length;
  const reportsTone: TileProps["tone"] = unreadReports > 0 ? "primary" : "muted";

  const overdueCount = actions.filter((a) => isOverdue(a.due_date)).length;
  const actionsTone: TileProps["tone"] =
    overdueCount > 0 ? "destructive" : actions.length > 0 ? "warning" : "muted";
  const actionsValue =
    actions.length === 0
      ? "0"
      : overdueCount > 0
        ? `${actions.length} (${overdueCount} overdue)`
        : String(actions.length);

  return (
    <div className="mb-4 flex gap-2" role="group" aria-label="Board summary">
      <Tile icon={CalendarDays} label="Next meeting" value={nextMeetingValue} tone={nextMeetingTone} />
      <Tile icon={FileText} label="Reports" value={String(unreadReports)} tone={reportsTone} />
      <Tile icon={ClipboardList} label="Actions due" value={actionsValue} tone={actionsTone} />
    </div>
  );
};
