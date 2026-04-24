import { Link } from "react-router-dom";
import { format } from "date-fns";
import { AlertCircle, CalendarDays, ClipboardList } from "lucide-react";
import { SectionShell } from "./SectionShell";
import { MyAction, UpcomingMeeting, isOverdue, isWithinHours } from "./sectionUtils";

interface Props {
  meetings: UpcomingMeeting[];
  actions: MyAction[];
}

export const AttentionSection = ({ meetings, actions }: Props) => {
  const overdueActions = actions.filter((a) => isOverdue(a.due_date));
  const imminentMeetings = meetings.filter((m) => isWithinHours(m.meeting_date, 48));
  const total = overdueActions.length + imminentMeetings.length;

  return (
    <SectionShell
      value="attention"
      icon={AlertCircle}
      title="Attention Required"
      badgeCount={total}
      badgeVariant={total > 0 ? "destructive" : "secondary"}
    >
      {total === 0 ? (
        <p className="text-sm text-muted-foreground py-2">Nothing urgent. You're all caught up.</p>
      ) : (
        <ul className="space-y-2">
          {imminentMeetings.map((m) => (
            <li key={`m-${m.id}`}>
              <Link
                to={`/meetings/${m.id}`}
                className="flex items-center gap-3 p-3 rounded-md border border-border hover:bg-muted/50 transition-colors"
              >
                <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{m.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(m.meeting_date), "PPP p")}
                  </p>
                </div>
              </Link>
            </li>
          ))}
          {overdueActions.map((a) => (
            <li
              key={`a-${a.id}`}
              className="flex items-center gap-3 p-3 rounded-md border border-destructive/40 bg-destructive/5"
            >
              <ClipboardList className="h-4 w-4 text-destructive shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{a.title}</p>
                <p className="text-xs text-destructive">
                  Overdue{a.due_date ? ` · ${format(new Date(a.due_date), "PPP")}` : ""}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionShell>
  );
};
