import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { FolderOpen, BookOpen, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionShell } from "./SectionShell";
import { LatestPack, isWithinDays } from "./sectionUtils";

interface Props {
  latestPack: LatestPack | null;
}

export const BoardPacksSection = ({ latestPack }: Props) => {
  const navigate = useNavigate();
  const isNew = latestPack ? isWithinDays(latestPack.meeting_date, 7) : false;

  const askQuestion = () => {
    toast.info("Q&A on sections is coming soon. Use Help & Feedback for now.");
  };

  return (
    <SectionShell
      value="packs"
      icon={FolderOpen}
      title="Board Packs"
      badgeLabel={isNew ? "New" : undefined}
      badgeVariant="default"
    >
      {!latestPack ? (
        <p className="text-sm text-muted-foreground py-2">No board packs yet.</p>
      ) : (
        <div className="space-y-3">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
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
            <Button size="sm" variant="outline" className="flex-1" onClick={askQuestion}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Ask Question
            </Button>
          </div>
        </div>
      )}
    </SectionShell>
  );
};
