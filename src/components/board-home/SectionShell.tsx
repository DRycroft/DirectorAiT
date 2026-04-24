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
  badgeVariant?: "default" | "secondary" | "destructive" | "outline" | "warning" | "success";
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
  const hasLabel = typeof badgeLabel === "string" && badgeLabel.length > 0;
  const hasCount = typeof badgeCount === "number";
  const badgeContent = hasLabel ? badgeLabel : hasCount ? String(badgeCount) : null;
  // Zero counts get muted styling for stable layout; explicit labels keep their variant.
  const effectiveVariant =
    !hasLabel && hasCount && badgeCount === 0 ? "secondary" : badgeVariant;

  return (
    <AccordionItem value={value} className="border-b border-border">
      <AccordionTrigger className="py-4 px-1 hover:no-underline [&>svg]:ml-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Icon className={cn("h-5 w-5 shrink-0", muted ? "text-muted-foreground" : "text-foreground")} />
          <span className={cn("font-medium text-sm sm:text-base text-left", muted && "text-muted-foreground")}>
            {title}
          </span>
          {badgeContent !== null && (
            <Badge
              variant={effectiveVariant}
              className={cn(
                "ml-auto inline-flex shrink-0 rounded-full border-0 text-xs font-semibold tabular-nums",
                "min-w-[2rem] h-6 px-2 justify-center items-center leading-none",
                effectiveVariant === "secondary" &&
                  "bg-secondary text-secondary-foreground hover:bg-secondary",
              )}
            >
              {badgeContent}
            </Badge>
          )}
        </div>
      </AccordionTrigger>
      <AccordionContent className="pb-4 pt-1 px-1">{children}</AccordionContent>
    </AccordionItem>
  );
};
