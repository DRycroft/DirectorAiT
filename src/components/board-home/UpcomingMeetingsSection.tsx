import { Link } from "react-router-dom";
import { format } from "date-fns";
import { CalendarDays, ArrowRight } from "lucide-react";
import { SectionShell } from "./SectionShell";
import { UpcomingMeeting } from "./sectionUtils";

interface Props {
  meetings: UpcomingMeeting[];
}

export const UpcomingMeetingsSection = ({ meetings }: Props) => {
  return (
    <SectionShell
      value="meetings"
      icon={CalendarDays}
      title="Upcoming Meetings"
      badgeCount={meetings.length}
      badgeVariant={meetings.length > 0 ? "default" : "secondary"}
    >
      {meetings.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">No upcoming meetings.</p>
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
    </SectionShell>
  );
};
