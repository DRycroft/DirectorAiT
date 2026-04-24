import { LucideIcon } from "lucide-react";
import { SectionShell } from "./SectionShell";

interface Props {
  value: string;
  icon: LucideIcon;
  title: string;
}

export const PlaceholderSection = ({ value, icon, title }: Props) => {
  return (
    <SectionShell value={value} icon={icon} title={title} badgeLabel="Soon" badgeVariant="outline" muted>
      <p className="text-sm text-muted-foreground py-2">Coming soon.</p>
    </SectionShell>
  );
};
