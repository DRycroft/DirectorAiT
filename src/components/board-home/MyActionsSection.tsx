import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ClipboardList, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionShell } from "./SectionShell";
import { MyAction, isOverdue } from "./sectionUtils";

interface Props {
  actions: MyAction[];
}

export const MyActionsSection = ({ actions }: Props) => {
  const hasOverdue = actions.some((a) => isOverdue(a.due_date));

  return (
    <SectionShell
      value="actions"
      icon={ClipboardList}
      title="My Actions"
      badgeCount={actions.length}
      badgeVariant={hasOverdue ? "destructive" : actions.length > 0 ? "warning" : "secondary"}
    >
      {actions.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">No open actions assigned.</p>
      ) : (
        <>
          <ul className="space-y-2">
            {actions.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between gap-3 p-3 rounded-md border border-border"
              >
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{a.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.due_date ? `Due ${format(new Date(a.due_date), "PPP")}` : "No due date"}
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
          <div className="mt-3">
            <Link to="/actions">
              <Button size="sm" variant="ghost" className="w-full">
                View all actions
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </>
      )}
    </SectionShell>
  );
};
