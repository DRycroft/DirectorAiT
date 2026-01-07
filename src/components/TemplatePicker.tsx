import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface Template {
  id: string;
  name: string;
  scope: string;
  tags: string[];
  is_default: boolean;
  version: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: Template[];
  onSelectTemplate: (templateId: string) => void;
  onStartBlank: () => void;
  sectionKey: string;
}

export const TemplatePicker = ({
  open,
  onOpenChange,
  templates,
  onSelectTemplate,
  onStartBlank,
  sectionKey,
}: Props) => {
  const getScopeColor = (scope: string) => {
    switch (scope) {
      case "organization":
        return "bg-purple-500/10 text-purple-500";
      case "team":
        return "bg-blue-500/10 text-blue-500";
      case "personal":
        return "bg-green-500/10 text-green-500";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Choose a Template</DialogTitle>
          <DialogDescription>
            Select a template for {sectionKey} or start from a blank page.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <Button onClick={onStartBlank} variant="outline" className="w-full">
            Start from Blank Page
          </Button>

          {templates.length > 0 && (
            <div className="border border-border rounded-lg divide-y">
              <div className="p-3 bg-muted/30">
                <h4 className="font-medium text-sm">Available Templates</h4>
              </div>
              
              <div className="divide-y">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="p-4 hover:bg-accent/5 transition-colors cursor-pointer"
                    onClick={() => onSelectTemplate(template.id)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary" />
                          <h5 className="font-medium truncate">{template.name}</h5>
                          {template.is_default && (
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <Badge variant="outline" className={getScopeColor(template.scope)}>
                            {template.scope}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            v{template.version}
                          </span>
                          {template.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <Button size="sm">
                        Use Template
                      </Button>
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
