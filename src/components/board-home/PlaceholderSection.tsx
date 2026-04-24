import { LucideIcon } from "lucide-react";
import { SectionShell } from "./SectionShell";

interface Props {
  value: string;
  icon: LucideIcon;
  title: string;
}

export const PlaceholderSection = ({ value, icon, title }: Props) => {
  return (
    <SectionShell value={value} icon={icon} title={title} muted>
      <p className="text-xs text-muted-foreground/70 py-1 italic">Coming soon</p>
    </SectionShell>
  );
};
