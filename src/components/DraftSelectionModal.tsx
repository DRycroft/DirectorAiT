import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, Clock, Trash2, Copy } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export interface Draft {
  id: string;
  title: string;
  last_saved: string;
  status: string;
  section_key: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  drafts: Draft[];
  onOpenDraft: (draftId: string) => void;
  onStartNew: () => void;
  onDuplicateDraft: (draftId: string) => void;
  onDiscardDraft: (draftId: string) => void;
}

export const DraftSelectionModal = ({
  open,
  onOpenChange,
  drafts,
  onOpenDraft,
  onStartNew,
  onDuplicateDraft,
  onDiscardDraft,
}: Props) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "in_progress":
        return "text-blue-500";
      case "awaiting_review":
        return "text-yellow-500";
      case "approved":
        return "text-green-500";
      default:
        return "text-muted-foreground";
    }
  };

  const formatStatus = (status: string) => {
    return status.split("_").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Open Existing Draft or Start New</DialogTitle>
          <DialogDescription>
            You have {drafts.length} in-progress draft{drafts.length !== 1 ? "s" : ""} for this section. 
            Open the latest draft or start a new report from the default template.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Primary actions */}
          <div className="flex gap-3">
            <Button
              onClick={() => drafts.length > 0 && onOpenDraft(drafts[0].id)}
              disabled={drafts.length === 0}
              className="flex-1"
            >
              <FileText className="h-4 w-4 mr-2" />
              Open Latest Draft
            </Button>
            <Button onClick={onStartNew} variant="outline" className="flex-1">
              Start New from Template
            </Button>
          </div>

          {/* Existing drafts list */}
          {drafts.length > 0 && (
            <div className="border border-border rounded-lg divide-y">
              <div className="p-3 bg-muted/30">
                <h4 className="font-medium text-sm">Existing Drafts</h4>
              </div>
              
              <div className="divide-y">
                {drafts.map((draft) => (
                  <div key={draft.id} className="p-4 hover:bg-accent/5 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h5 className="font-medium truncate">{draft.title}</h5>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(draft.last_saved), { addSuffix: true })}
                          </span>
                          <span className={getStatusColor(draft.status)}>
                            {formatStatus(draft.status)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => onOpenDraft(draft.id)}
                        >
                          Open
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onDuplicateDraft(draft.id)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onDiscardDraft(draft.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
