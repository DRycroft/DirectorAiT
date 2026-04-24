import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SectionShellProps {
  value: string;
  icon: LucideIcon;
  title: string;
  badgeCount?: number;
  badgeLabel?: string;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
  muted?: boolean;
  children: ReactNode;
}

export const SectionShell = ({
  value,
  icon: Icon,
  title,
  badgeCount,
  badgeLabel,
  badgeVariant = "secondary",
  muted = false,
  children,
}: SectionShellProps) => {
  const showBadge = badgeLabel ?? (typeof badgeCount === "number" && badgeCount > 0 ? String(badgeCount) : null);

  return (
    <AccordionItem value={value} className="border-b border-border">
      <AccordionTrigger className="py-4 px-1 hover:no-underline">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Icon className={cn("h-5 w-5 shrink-0", muted ? "text-muted-foreground" : "text-foreground")} />
          <span className={cn("font-medium text-sm sm:text-base text-left", muted && "text-muted-foreground")}>
            {title}
          </span>
          {showBadge && (
            <Badge variant={badgeVariant} className="ml-auto mr-2 text-xs">
              {showBadge}
            </Badge>
          )}
        </div>
      </AccordionTrigger>
      <AccordionContent className="pb-4 pt-1 px-1">{children}</AccordionContent>
    </AccordionItem>
  );
};
