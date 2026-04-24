import { Link } from "react-router-dom";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionShell } from "./SectionShell";
import { ReleasedReport } from "./sectionUtils";

interface Props {
  reports: ReleasedReport[];
}

export const ReleasedReportsSection = ({ reports }: Props) => {
  return (
    <SectionShell
      value="reports"
      icon={FileText}
      title="Released Reports"
      badgeCount={reports.length}
      badgeVariant={reports.length > 0 ? "default" : "secondary"}
    >
      {reports.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">No released reports.</p>
      ) : (
        <ul className="space-y-2">
          {reports.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between gap-3 p-3 rounded-md border border-border"
            >
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{r.company_name}</p>
                <p className="text-xs text-muted-foreground">{r.period_covered}</p>
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
    </SectionShell>
  );
};
